import git
import logging
import re
import os
import subprocess

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------
# Repository URL Validation
# ---------------------------------------------------------------
# Note: Repositories are NOT stored locally. Only the URL is saved
# in the database. Temporary cloning for documentation generation
# is handled separately in ai_service.py.
# ---------------------------------------------------------------

def is_ssh_url(url: str) -> bool:
    """
    Check if a URL is an SSH URL.

    Args:
        url: The repository URL to check

    Returns:
        bool: True if the URL is an SSH URL, False otherwise
    """
    ssh_pattern = r'^(ssh://)?git@[\w\.-]+[:/].+'
    return bool(re.match(ssh_pattern, url))


def convert_ssh_to_https(ssh_url: str) -> str | None:
    """
    Convert SSH URL to HTTPS URL for validation purposes.

    Examples:
        git@github.com:user/repo.git -> https://github.com/user/repo.git
        ssh://git@github.com/user/repo.git -> https://github.com/user/repo.git
        git@gitlab.com:group/project.git -> https://gitlab.com/group/project.git

    Args:
        ssh_url: The SSH URL to convert

    Returns:
        str | None: The HTTPS URL if conversion is successful, None otherwise
    """
    try:
        # Handle ssh://git@host/path format
        if ssh_url.startswith('ssh://git@'):
            # ssh://git@github.com/user/repo.git -> https://github.com/user/repo.git
            https_url = ssh_url.replace('ssh://git@', 'https://')
            return https_url

        # Handle git@host:path format
        if ssh_url.startswith('git@'):
            # git@github.com:user/repo.git -> https://github.com/user/repo.git
            # Remove 'git@' prefix
            without_prefix = ssh_url[4:]
            # Replace first ':' with '/'
            https_url = 'https://' + without_prefix.replace(':', '/', 1)
            return https_url

        return None
    except Exception as e:
        logger.warning(f"Failed to convert SSH URL to HTTPS: {ssh_url}, error: {str(e)}")
        return None


def normalize_repo_url(repo_url: str) -> str:
    """
    Normalize a repository URL for comparison/duplicate detection.

    This function converts all URLs to a canonical HTTPS format to enable
    detection of duplicate repositories regardless of whether they use
    SSH or HTTPS URLs.

    Examples:
        git@github.com:user/repo.git -> https://github.com/user/repo.git
        https://github.com/user/repo.git -> https://github.com/user/repo.git
        https://github.com/user/repo -> https://github.com/user/repo.git
        http://github.com/user/repo.git -> https://github.com/user/repo.git

    Args:
        repo_url: The repository URL to normalize

    Returns:
        str: The normalized HTTPS URL
    """
    url = repo_url.strip()

    # Convert SSH URLs to HTTPS
    if is_ssh_url(url):
        https_url = convert_ssh_to_https(url)
        if https_url:
            url = https_url

    # Normalize http to https
    if url.startswith('http://'):
        url = url.replace('http://', 'https://', 1)

    # Ensure .git suffix for consistency
    if not url.endswith('.git'):
        url = url + '.git'

    # Remove any trailing slashes before .git
    url = url.replace('/.git', '.git')

    return url.lower()  # Lowercase for case-insensitive comparison


def validate_repo_url(repo_url: str):
    """
    Validates if a repository URL is accessible via git ls-remote.
    This does not clone the repository, only checks if it exists.

    For SSH URLs, first attempts to convert to HTTPS and validate.
    If HTTPS validation succeeds, the repository is considered valid.
    If HTTPS validation fails, falls back to SSH validation.

    Args:
        repo_url: The URL of the git repository to validate

    Returns:
        dict: Contains 'message', 'status', and optional 'error_type' and 'details'
        - {"status": "success", "message": "valid repository url"}
        - {"status": "error", "message": "...", "error_type": "ssh_auth|not_found|network|unknown", "details": "..."}
    """
    # Prepare environment for git commands
    # Inherit current environment to include SSH configuration if set
    git_env = os.environ.copy()

    # Check if this is an SSH URL
    is_ssh = is_ssh_url(repo_url)

    # If it's an SSH URL, try converting to HTTPS first
    if is_ssh:
        https_url = convert_ssh_to_https(repo_url)
        if https_url:
            logger.info(f"SSH URL detected, attempting HTTPS validation: {repo_url} -> {https_url}")
            try:
                # Try to validate using HTTPS (environment not needed for HTTPS)
                git.cmd.Git().ls_remote(https_url)
                logger.info(f"Repository URL validation succeeded via HTTPS conversion: {repo_url}")
                return {
                    "status": "success",
                    "message": "valid repository url",
                    "validated_via": "https_conversion"
                }
            except git.exc.GitCommandError as e:
                error_output = str(e.stderr) if hasattr(e, 'stderr') and e.stderr else str(e)
                logger.info(f"HTTPS validation failed for converted URL, will try SSH: {error_output[:100]}")
                # HTTPS validation failed, fall through to try SSH validation
            except Exception as e:
                logger.info(f"HTTPS conversion validation error, will try SSH: {str(e)[:100]}")
                # Fall through to try SSH validation

    # Try validating with the original URL (HTTPS or SSH)
    # For SSH URLs, use subprocess to properly inherit environment variables like GIT_SSH_COMMAND
    # For HTTPS URLs, GitPython is fine since no SSH configuration is needed
    try:
        if is_ssh:
            # Use subprocess for SSH validation to properly support GIT_SSH_COMMAND
            logger.info(f"Attempting SSH validation with subprocess for: {repo_url}")
            logger.debug(f"Environment has GIT_SSH_COMMAND: {'GIT_SSH_COMMAND' in git_env}")
            result = subprocess.run(
                ["git", "ls-remote", repo_url],
                capture_output=True,
                text=True,
                timeout=30,
                env=git_env  # Pass environment with SSH configuration
            )
            if result.returncode == 0:
                logger.info(f"Repository URL validation succeeded (SSH): {repo_url}")
                return {"status": "success", "message": "valid repository url"}
            else:
                # Handle SSH validation failure
                error_output = result.stderr
                logger.warning(f"Repository URL validation failed for {repo_url}: {error_output}")
                logger.debug(f"Git ls-remote exit code: {result.returncode}")
                raise git.exc.GitCommandError("git ls-remote", result.returncode, stderr=error_output)
        else:
            # Use GitPython for HTTPS validation (no environment needed)
            git.cmd.Git().ls_remote(repo_url)
            logger.info(f"Repository URL validation succeeded: {repo_url}")
            return {"status": "success", "message": "valid repository url"}
    except git.exc.GitCommandError as e:
        error_output = str(e.stderr) if hasattr(e, 'stderr') and e.stderr else str(e)
        logger.warning(f"Repository URL validation failed for {repo_url}: {error_output}")

        # Parse error to determine the type
        error_lower = error_output.lower()

        if "permission denied" in error_lower and "publickey" in error_lower:
            return {
                "status": "error",
                "message": "SSH authentication failed. Please configure SSH keys for the repository.",
                "error_type": "ssh_auth",
                "details": "The repository requires SSH key authentication. See SSH_URL_SUPPORT.md for setup instructions."
            }
        elif "host key verification failed" in error_lower:
            return {
                "status": "error",
                "message": "SSH host key verification failed.",
                "error_type": "ssh_host_key",
                "details": "The SSH host key is not in known_hosts. Configure GIT_SSH_COMMAND or add the host to known_hosts."
            }
        elif "repository" in error_lower and "not found" in error_lower:
            return {
                "status": "error",
                "message": "Repository not found or access denied.",
                "error_type": "not_found",
                "details": "The repository does not exist or you don't have permission to access it."
            }
        elif "could not resolve host" in error_lower or "could not read from remote" in error_lower:
            return {
                "status": "error",
                "message": "Network error or repository unreachable.",
                "error_type": "network",
                "details": error_output[:200]
            }
        else:
            return {
                "status": "error",
                "message": "Invalid or inaccessible repository URL.",
                "error_type": "unknown",
                "details": error_output[:200]
            }
    except subprocess.TimeoutExpired:
        logger.warning(f"Repository URL validation timed out for {repo_url}")
        return {
            "status": "error",
            "message": "Repository validation timed out.",
            "error_type": "network",
            "details": "The validation request took too long to complete."
        }
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"Repository URL validation failed for {repo_url}: {error_msg}")
        return {
            "status": "error",
            "message": "Failed to validate repository URL.",
            "error_type": "unknown",
            "details": error_msg[:200]
        }
