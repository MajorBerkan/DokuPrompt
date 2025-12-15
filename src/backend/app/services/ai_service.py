import os
import re
import logging
import time
import tempfile
import subprocess
import shutil

from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.db.models import Prompt, Repo
from datetime import datetime
from pathlib import Path

load_dotenv()

logger = logging.getLogger(__name__)

DOCS_STORAGE_DIR = os.getenv("DOCS_STORAGE_DIR", "/app/docs_storage")

# Content extraction thresholds
CODE_STRUCTURE_EXTRACTION_THRESHOLD = 3000  # Bytes - extract structure for files larger than this
MIN_EXTRACTED_CONTENT = 100  # Minimum bytes of extracted content to be useful
TRUNCATE_LINES_HEAD = 25  # Lines to include from file start when truncating
TRUNCATE_LINES_TAIL = 25  # Lines to include from file end when truncating

# Directory filtering
SKIP_DIRECTORIES = ['.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', 'target', 'bin', 'obj']


def generate_table_of_contents(content: str) -> dict:
    """Generate a table of contents from markdown headings as a structured JSON object."""
    headings = re.findall(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
    if not headings:
        return {"headings": [], "message": "No headings found"}

    toc_entries = []
    for level, title in headings:
        toc_entries.append({
            "level": len(level),
            "title": title.strip()
        })

    return {"headings": toc_entries}


def get_repository_structure(target_dir: str, max_depth: int = 3) -> dict:
    """
    Get the directory structure of a repository.

    Args:
        target_dir: Path to the repository
        max_depth: Maximum depth to traverse

    Returns:
        Dictionary with directory structure
    """
    structure = {
        "root": target_dir,
        "files": [],
        "directories": []
    }

    try:
        repo_path = Path(target_dir)
        if not repo_path.exists():
            return structure

        # Walk through directory
        for item in repo_path.rglob("*"):
            # Skip .git directory
            if ".git" in item.parts:
                continue

            # Check depth
            relative_path = item.relative_to(repo_path)
            if len(relative_path.parts) > max_depth:
                continue

            if item.is_file():
                structure["files"].append(str(relative_path))
            elif item.is_dir():
                structure["directories"].append(str(relative_path))

        # Sort for consistency
        structure["files"].sort()
        structure["directories"].sort()

    except Exception as e:
        logger.error(f"Error reading repository structure: {e}")

    return structure


def _extract_code_structure(content: str, file_extension: str) -> str:
    """
    Extract key structural elements from code files instead of including everything.
    This helps keep prompts smaller for large repositories.

    Note: This is a heuristic approach. For production use with very large repos,
    consider using AST parsing for more robust extraction.

    Args:
        content: File content
        file_extension: File extension (e.g., '.py', '.js')

    Returns:
        Extracted structure as string
    """
    lines = content.split('\n')
    extracted_lines = []

    # If file is small enough, return as-is
    if len(content) < CODE_STRUCTURE_EXTRACTION_THRESHOLD:
        return content

    # Extract based on file type (simplified heuristics)
    if file_extension in ['.py']:
        # Python: imports, class/function definitions (simplified)
        for line in lines:
            stripped = line.strip()
            # Include imports and class/function definitions
            if (stripped.startswith('import ') or stripped.startswith('from ') or
                stripped.startswith('class ') or stripped.startswith('def ') or
                    stripped.startswith('@')):
                extracted_lines.append(line)

    elif file_extension in ['.js', '.jsx', '.ts', '.tsx']:
        # JavaScript/TypeScript: imports, exports, declarations (simplified)
        for line in lines:
            stripped = line.strip()
            # Match lines starting with keywords (beginning of line to avoid string matches)
            if (stripped.startswith('import ') or stripped.startswith('export ') or
                stripped.startswith('class ') or stripped.startswith('function ') or
                stripped.startswith('const ') or stripped.startswith('let ') or
                stripped.startswith('var ') or stripped.startswith('interface ') or
                    stripped.startswith('type ')):
                extracted_lines.append(line)

    elif file_extension in ['.java', '.cs', '.go', '.rs']:
        # Java/C#/Go/Rust: imports, class/interface/struct definitions (simplified)
        for line in lines:
            stripped = line.strip()
            if (stripped.startswith('import ') or stripped.startswith('package ') or
                stripped.startswith('class ') or stripped.startswith('interface ') or
                stripped.startswith('struct ') or stripped.startswith('enum ') or
                stripped.startswith('func ') or stripped.startswith('pub fn') or
                    stripped.startswith('impl ')):
                extracted_lines.append(line)
    else:
        # For other files, take first and last portions
        if len(lines) > TRUNCATE_LINES_HEAD + TRUNCATE_LINES_TAIL:
            extracted_lines = (lines[:TRUNCATE_LINES_HEAD] +
                               ['...', '# Content truncated for brevity', '...'] +
                               lines[-TRUNCATE_LINES_TAIL:])
        else:
            return content

    if not extracted_lines:
        # If extraction didn't work, return truncated version
        return content[:CODE_STRUCTURE_EXTRACTION_THRESHOLD] + '\n... (truncated for brevity)'

    result = '\n'.join(extracted_lines)
    if len(result) < MIN_EXTRACTED_CONTENT:  # If extraction was too aggressive
        return content[:CODE_STRUCTURE_EXTRACTION_THRESHOLD] + '\n... (truncated for brevity)'

    return result + '\n... (full implementation details omitted for brevity)'


def extract_repository_content(target_dir: str, max_files: int = 50, max_file_size: int = 10000) -> str:
    """
    Extract content from repository files for documentation generation.
    Optimized for large repositories with intelligent file selection and content extraction.

    Args:
        target_dir: Path to the repository
        max_files: Maximum number of files to include (default: 50)
        max_file_size: Maximum file size in bytes to read (default: 10000)

    Returns:
        Formatted string with repository content
    """
    # Code file extensions to prioritize
    code_extensions = {
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h',
        '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
        '.md', '.txt', '.json', '.yml', '.yaml', '.toml', '.xml'
    }

    # Files to always skip (beyond directories)
    skip_files = {
        'package-lock.json', 'yarn.lock', 'poetry.lock', 'Pipfile.lock',
        '.gitignore', '.dockerignore', 'LICENSE', 'CHANGELOG.md'
    }

    repo_path = Path(target_dir)
    if not repo_path.exists():
        return "Repository directory not found."

    content_parts = []
    content_parts.append("# Repository Structure and Content\n")

    # Get directory structure
    structure = get_repository_structure(target_dir, max_depth=2)
    content_parts.append(f"\n## Directory Structure\n")
    content_parts.append(f"Root: {target_dir}\n")

    if structure["directories"]:
        content_parts.append(f"\nDirectories ({len(structure['directories'])}):\n")
        for dir_name in structure["directories"][:20]:  # Limit to 20 directories
            content_parts.append(f"  - {dir_name}\n")

    # Collect code files with intelligent filtering
    code_files = []
    max_total_size = 500000  # 500KB total content limit for better performance

    try:
        for item in repo_path.rglob("*"):
            # Skip common build/dependency directories
            if any(skip in item.parts for skip in SKIP_DIRECTORIES):
                continue

            # Skip specific files
            if item.name in skip_files:
                continue

            if item.is_file() and item.suffix in code_extensions:
                try:
                    file_size = item.stat().st_size
                    # Only accept files up to max_file_size
                    if file_size <= max_file_size:
                        code_files.append((item, file_size))
                except BaseException:
                    pass

        # Sort by importance with enhanced prioritization
        def file_priority(file_tuple):
            file_path, file_size = file_tuple
            name = file_path.name.lower()
            path_str = str(file_path).lower()

            # Priority 0: Critical documentation files
            if 'readme' in name:
                return (0, 0, name)

            # Priority 1: Configuration and setup files
            if name in ['setup.py', 'pyproject.toml', 'package.json', 'cargo.toml', 'pom.xml', 'build.gradle']:
                return (1, 0, name)

            # Priority 2: Main/index files
            if name in ['main.py', 'index.js', 'index.ts', 'app.py', '__init__.py', 'main.go', 'main.rs']:
                return (2, 0, name)

            # Priority 3: Source code in src/app folders
            if 'src' in path_str or 'app' in path_str:
                return (3, file_size, name)

            # Priority 4: Documentation files
            if file_path.suffix in ['.md', '.txt']:
                return (4, file_size, name)

            # Priority 5: Config files
            if file_path.suffix in ['.json', '.yml', '.yaml', '.toml', '.xml']:
                return (5, file_size, name)

            # Priority 6: Test files (lower priority)
            if 'test' in path_str or 'spec' in path_str:
                return (6, file_size, name)

            # Priority 7: Everything else
            return (7, file_size, name)

        code_files.sort(key=file_priority)

        # Limit number of files and total size to ensure we get the most important ones
        # while respecting size constraints
        selected_files = []
        total_size = 0
        for file_path, file_size in code_files:
            if len(selected_files) >= max_files:
                break
            if total_size + file_size > max_total_size:
                # Skip this file if it would exceed total size limit
                continue
            selected_files.append((file_path, file_size))
            total_size += file_size

        code_files = selected_files

        content_parts.append(f"\n## Code Files ({len(code_files)} files included, ~{total_size // 1024}KB total)\n")

        # Read and include file contents with smart extraction
        for file_path, file_size in code_files:
            relative_path = file_path.relative_to(repo_path)
            content_parts.append(f"\n### File: {relative_path}\n")

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    file_content = f.read(max_file_size)

                    # For documentation and config files, include full content
                    if file_path.suffix in ['.md', '.txt', '.json', '.yml', '.yaml',
                                            '.toml', '.xml'] or 'readme' in file_path.name.lower():
                        content_parts.append(f"```{file_path.suffix[1:]}\n")
                        content_parts.append(file_content)
                        if len(file_content) >= max_file_size:
                            content_parts.append("\n... (truncated)")
                        content_parts.append("\n```\n")
                    else:
                        # For code files, extract key parts (imports, classes, functions)
                        content_parts.append(f"```{file_path.suffix[1:]}\n")
                        extracted = _extract_code_structure(file_content, file_path.suffix)
                        content_parts.append(extracted)
                        content_parts.append("\n```\n")

            except Exception as e:
                content_parts.append(f"Error reading file: {e}\n")

    except Exception as e:
        logger.error(f"Error extracting repository content: {e}")
        content_parts.append(f"\nError extracting content: {e}\n")

    return "".join(content_parts)


def generate_docu(
    db: Session,
    repo_id: int,
    repo_name: str
) -> dict:
    """
    Generate documentation for a repository using prompts from the database.

    NOTE: This function temporarily clones the repository to a temp directory
    for documentation generation only. The clone is immediately deleted after
    processing. Repositories are NOT stored locally - only URLs are saved in
    the database.

    Args:
        db: Database session
        repo_id: Repository ID (integer)
        repo_name: Repository name

    Returns:
        Dictionary with status, repository name, documentation content, and prompt_id
    """
    temp_dir = None

    try:
        # Check if repository exists
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo:
            error_msg = f"Repository not found: {repo_id}"
            logger.error(error_msg)
            print(f"ERROR: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }

        # Clone repository temporarily for documentation generation
        temp_dir = tempfile.mkdtemp(prefix=f"repo_clone_{repo_id}_")
        clone_path = temp_dir

        try:
            logger.info(f"Cloning repository {repo.repo_url} to temporary directory: {temp_dir}")
            print(f"Cloning repository temporarily: {repo.repo_url}")

            # Prepare environment for git clone
            # Inherit current environment and add SSH configuration if needed
            clone_env = os.environ.copy()

            # Configure SSH to work with git (if GIT_SSH_COMMAND is set in environment)
            # This allows SSH URLs to work properly when SSH keys are mounted
            if 'GIT_SSH_COMMAND' in clone_env:
                logger.info(f"Using GIT_SSH_COMMAND from environment: {clone_env['GIT_SSH_COMMAND']}")

            # Clone the repository
            result = subprocess.run(
                ["git", "clone", "--depth", "1", repo.repo_url, temp_dir],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                env=clone_env  # Pass environment with SSH configuration
            )

            if result.returncode != 0:
                error_msg = f"Failed to clone repository: {result.stderr}"
                logger.error(error_msg)
                print(f"ERROR: {error_msg}")
                return {
                    "status": "error",
                    "message": error_msg
                }
        except Exception as clone_exc:
            error_msg = f"Error cloning repository: {str(clone_exc)}"
            logger.error(error_msg)
            print(f"ERROR: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }

        logger.info(f"Starting documentation generation for repository: {repo_name} (ID: {repo_id})")
        print(f"Generating documentation for repository: {repo_name}")

        # Get prompt from database
        existing_prompt = db.query(Prompt).filter(Prompt.repo_id == repo_id).first()

        # Get current generic prompt from database
        from app.api.routes_prompts import get_generic_prompt
        current_generic_prompt = get_generic_prompt(db)

        # Extract repository content
        logger.info(f"Extracting repository content from: {clone_path}")
        print(f"Extracting code from: {clone_path}")
        repo_content = extract_repository_content(clone_path)

        # Construct the combined prompt
        if existing_prompt:
            # Update generic prompt from backend if it exists
            if existing_prompt.generic_prompt != current_generic_prompt:
                logger.info(f"Updating generic prompt for repository {repo_name} from backend")
                existing_prompt.generic_prompt = current_generic_prompt
                try:
                    db.commit()
                except Exception as commit_exc:
                    db.rollback()
                    logger.warning(f"Failed to update generic prompt: {str(commit_exc)}")
                    # Non-critical error, continue with documentation generation

            # Combine generic and specific prompts
            combined_prompt = existing_prompt.generic_prompt or current_generic_prompt
            if existing_prompt.specific_prompt:
                combined_prompt = f"{combined_prompt}\n\nREPOSITORY-SPECIFIC INSTRUCTIONS:\n{existing_prompt.specific_prompt}"
        else:
            # No specific prompt set yet - use generic prompt from memory
            combined_prompt = current_generic_prompt

        # Construct the full prompt with repository content
        prompt_text = f"Generate comprehensive documentation for the '{repo_name}' repository.\n\n{combined_prompt}\n\n{repo_content}"

        logger.info(f"Prompt size: {len(prompt_text)} characters")
        print(f"Sending prompt to LLM ({len(prompt_text)} characters)...")

        # Send prompt to LLM with retry logic
        try:
            docu_content = send_prompt(prompt_text)
            logger.info(f"Received documentation content from LLM for repository: {repo_name}")
            print(f"Successfully received documentation from LLM for: {repo_name}")
        except Exception as llm_exc:
            error_msg = f"Error sending prompt to LLM: {str(llm_exc)}"
            logger.error(f"LLM error for repository {repo_name}: {error_msg}", exc_info=True)
            print(f"ERROR: Failed to generate documentation via LLM for {repo_name}: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }

        # Save documentation to database in the prompt table
        # Use a separate try-catch for database operations to ensure proper rollback
        try:
            if existing_prompt:
                # Update existing prompt - update documentation
                existing_prompt.docu = docu_content
                existing_prompt.created_at = datetime.now()
                prompt_id = existing_prompt.id
                logger.info(f"Updating documentation for existing prompt: {prompt_id} for repository: {repo_name}")
                print(f"Updating documentation for existing prompt: {prompt_id}")
            else:
                # Create new prompt entry with generic prompt from memory
                new_prompt = Prompt(
                    generic_prompt=current_generic_prompt,
                    specific_prompt=None,
                    created_at=datetime.now(),
                    repo_id=repo_id,
                    docu=docu_content
                )
                db.add(new_prompt)
                db.flush()
                prompt_id = new_prompt.id
                logger.info(f"Creating new prompt: {prompt_id} for repository: {repo_name}")
                print(f"Created new prompt: {prompt_id} for repo: {repo_name}")

            db.commit()
            logger.info(f"Documentation saved successfully: {prompt_id} for repository: {repo_name}")
            print(f"Documentation saved successfully: {prompt_id}")

            return {
                "status": "documented",
                "repository": repo_name,
                "prompt_id": prompt_id,
                "documentation": {
                    "content": docu_content,
                    "format": "markdown"
                }
            }
        except Exception as db_exc:
            db.rollback()
            error_msg = f"Error saving documentation to database: {str(db_exc)}"
            logger.error(f"Database error for repository {repo_name}: {error_msg}", exc_info=True)
            print(f"ERROR: Failed to save documentation to database for {repo_name}: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"Unexpected error for repository {repo_name}: {error_msg}", exc_info=True)
        print(f"ERROR: Unexpected error while generating documentation for {repo_name}: {error_msg}")
        return {
            "status": "error",
            "message": error_msg
        }
    finally:
        # Clean up temporary clone directory - always runs, even on error
        if temp_dir:
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                    logger.info(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_exc:
                logger.warning(f"Failed to clean up temporary directory {temp_dir}: {cleanup_exc}")


def send_prompt(full_prompt: str, max_retries: int = 3) -> str:
    """
    Send a prompt to the LLM and return the response content.
    Implements retry logic with exponential backoff for transient errors.

    Args:
        full_prompt: The complete prompt to send to the LLM
        max_retries: Maximum number of retry attempts (default: 3)

    Returns:
        The LLM response content as a string

    Raises:
        Exception: If the LLM request fails after all retries
    """
    model_name = os.getenv("MODEL_NAME")  # Get model name from .env
    llm = get_model(model_name)

    last_exception = None
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                # Exponential backoff: wait 2^attempt seconds before retry
                wait_time = 2 ** attempt
                logger.info(f"Retrying LLM request (attempt {attempt + 1}/{max_retries}) after {wait_time}s...")
                time.sleep(wait_time)

            response = llm.invoke(full_prompt)
            content = response.content

            # Check if response looks like an HTML error page
            if content and (content.strip().startswith("<") or "Gateway Time-out" in content):
                error_msg = "LLM gateway returned an error response (possibly timeout)"
                logger.warning(f"{error_msg} on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    # This is a retryable error
                    last_exception = Exception(f"{error_msg}. Please try again or reduce the repository size.")
                    continue
                raise Exception(f"{error_msg}. Please try again or reduce the repository size.")

            # Success!
            if attempt > 0:
                logger.info(f"LLM request succeeded on attempt {attempt + 1}")
            return content

        except Exception as e:
            last_exception = e
            # Log the detailed error for debugging
            logger.error(f"Error invoking LLM (attempt {attempt + 1}/{max_retries}): {str(e)}", exc_info=True)

            # Get the exception type name for better error reporting
            exception_type = type(e).__name__
            error_message = str(e)

            # Check if this is a retryable error
            is_retryable = (
                "Timeout" in exception_type or
                "timeout" in error_message.lower() or
                "504" in error_message or
                "502" in error_message or
                "503" in error_message or
                "Gateway" in error_message or
                "InternalServerError" in exception_type
            )

            # If this is the last attempt or error is not retryable, raise with detailed message
            if attempt >= max_retries - 1 or not is_retryable:
                if "InternalServerError" in exception_type:
                    raise Exception(
                        "LLM gateway internal error. The prompt may be too large or the service is unavailable. Try reducing repository size or try again later.")
                elif "Timeout" in exception_type or "timeout" in error_message.lower():
                    raise Exception(
                        "LLM request timed out. The documentation generation is taking too long. Try reducing the repository size.")
                elif "<" in error_message and ">" in error_message:
                    # HTML error response (e.g., 504 Gateway Timeout)
                    if "504" in error_message or "Gateway Time-out" in error_message:
                        raise Exception("LLM gateway timeout (504). Try reducing the repository size or try again later.")
                    else:
                        raise Exception("LLM gateway error. The service may be unavailable. Try again later.")
                # Re-raise the original exception if we don't recognize it
                raise

            # Otherwise, continue to next retry
            continue

    # If we get here, all retries failed
    if last_exception:
        raise last_exception
    raise Exception("LLM request failed after all retries")


def get_model(model_name: str):
    if model_name is None:
        raise ValueError("MODEL_NAME ist nicht gesetzt. Bitte in der .env-Datei eintragen.")
    if model_name.startswith("eu.anthropic"):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY ist nicht gesetzt. Bitte in der .env-Datei eintragen.")
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://llm.srvext.ncoindev.net/v1",
            temperature=0,  # Set temperature to 0 for deterministic output
            request_timeout=300,  # 5 minutes timeout for LLM requests
            max_retries=2  # Retry up to 2 times on failure
        )
    else:
        raise ValueError(f"Unbekanntes Modell: {model_name}")


# test
if __name__ == "__main__":
    prompt = "Was ist der Sinn des Lebens?"
    print(send_prompt(prompt))
