from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Repo, Prompt, History, GeneralSettings
from app.services.ai_service import generate_docu
from app.services.git_service import convert_ssh_to_https, is_ssh_url
from datetime import datetime
import logging
import re

router = APIRouter(prefix="/docs", tags=["docs"])
logger = logging.getLogger(__name__)


# ---------------------------
# Database Dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------
# Schemas
# ---------------------------


class DocumentListItem(BaseModel):
    id: str
    title: str
    repo_id: str
    repo_name: str
    status: str
    created_at: str
    updated_at: str


class DocumentDetail(BaseModel):
    id: str
    title: str
    repo_id: str
    repo_name: str
    repo_url: str
    status: str
    created_at: str
    updated_at: str
    content: str
    table_of_contents: str
    goal: Optional[str] = None


class DocumentSearchResult(BaseModel):
    id: str
    title: str
    repo_id: str
    repo_name: str
    created_at: str
    updated_at: str
    content_snippet: str  # Preview of matched content
    match_count: int  # Number of matches found


# ---------------------------
# Endpoints
# ---------------------------


@router.get("/list", response_model=List[DocumentListItem])
def list_documents(db: Session = Depends(get_db)):
    """
    List all documents (prompts with generated documentation) in the database.
    """
    try:
        # Query prompts that have documentation
        prompts = (
            db.query(Prompt)
            .filter(Prompt.docu.isnot(None), Prompt.repo_id.isnot(None))
            .order_by(Prompt.created_at.desc())
            .all()
        )

        result = []
        for prompt in prompts:
            try:
                repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
                if repo:  # Only include if repo exists
                    result.append(
                        DocumentListItem(
                            id=str(prompt.id),
                            title=repo.repo_name,
                            repo_id=str(prompt.repo_id),
                            repo_name=repo.repo_name,
                            status="ready",
                            created_at=prompt.created_at.isoformat(),
                            updated_at=prompt.created_at.isoformat(),
                        )
                    )
                else:
                    logger.warning(f"Prompt {prompt.id} references non-existent repo {prompt.repo_id}")
            except Exception as item_exc:
                logger.error(f"Error processing prompt {prompt.id}: {str(item_exc)}")
                # Continue processing other prompts

        # Sort alphabetically by repo_name
        result.sort(key=lambda x: x.repo_name.lower())

        return result
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


@router.get("/search/debug")
def debug_search(db: Session = Depends(get_db)):
    """
    Debug endpoint to check what documents are available.
    """
    try:
        # Query all prompts that have documentation
        all_prompts = (
            db.query(Prompt)
            .filter(Prompt.docu.isnot(None), Prompt.repo_id.isnot(None))
            .all()
        )

        result_docs = []
        for prompt in all_prompts:
            repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
            result_docs.append(
                {
                    "id": str(prompt.id),
                    "title": repo.repo_name if repo else "Unknown",
                    "repo_name": repo.repo_name if repo else "Unknown",
                }
            )

        return {
            "total_documents": len(result_docs),
            "ready_documents": len(result_docs),
            "all_docs": result_docs,
            "ready_docs": result_docs,
        }
    except Exception as e:
        print(f"Debug endpoint error: {e}")
        return {"error": "Failed to retrieve debug information"}


@router.get("/search", response_model=List[DocumentSearchResult])
def search_documents(query: str, db: Session = Depends(get_db)):
    """
    Search through document titles and content.
    Returns documents that match the search query with content snippets.
    """
    if not query or len(query.strip()) == 0:
        return []

    query_lower = query.lower().strip()
    results = []

    try:
        # Get all prompts with documentation
        prompts = (
            db.query(Prompt)
            .filter(Prompt.docu.isnot(None), Prompt.repo_id.isnot(None))
            .all()
        )

        logger.debug(f"Search query: '{query_lower}', Found {len(prompts)} prompts with documentation")

        for prompt in prompts:
            try:
                repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
                if not repo:
                    logger.warning(f"Prompt {prompt.id} references non-existent repo {prompt.repo_id}")
                    continue

                title = repo.repo_name
                logger.debug(f"Checking prompt: id={prompt.id}, title='{title}'")

                # Check if title matches
                title_matches = query_lower in title.lower()

                # Get content from prompt.docu field
                content = prompt.docu or ""
                content_lower = content.lower()
                content_matches = query_lower in content_lower

                logger.debug(f"  Title matches: {title_matches}, Content matches: {content_matches}")

                # If either title or content matches, include in results
                if title_matches or content_matches:
                    # Count matches
                    match_count = content_lower.count(query_lower)
                    if title_matches:
                        match_count += 1

                    # Get content snippet around first match
                    snippet = ""
                    try:
                        if content_matches and content:
                            # Find first occurrence
                            match_index = content_lower.find(query_lower)
                            # Get context around the match (150 chars before and after)
                            start = max(0, match_index - 150)
                            end = min(len(content), match_index + len(query) + 150)
                            snippet = content[start:end].strip()

                            # Add ellipsis if needed
                            if start > 0:
                                snippet = "..." + snippet
                            if end < len(content):
                                snippet = snippet + "..."
                        elif title_matches and content:
                            # If only title matches, show start of content
                            snippet = content[:200].strip()
                            if len(content) > 200:
                                snippet = snippet + "..."
                    except Exception as snippet_exc:
                        logger.warning(f"Error generating snippet for prompt {prompt.id}: {str(snippet_exc)}")
                        snippet = ""

                    results.append(
                        DocumentSearchResult(
                            id=str(prompt.id),
                            title=title,
                            repo_id=str(prompt.repo_id),
                            repo_name=repo.repo_name,
                            created_at=prompt.created_at.isoformat(),
                            updated_at=prompt.created_at.isoformat(),
                            content_snippet=snippet,
                            match_count=match_count,
                        )
                    )
                    logger.debug(f"  Added to results: match_count={match_count}")
            except Exception as item_exc:
                logger.error(f"Error processing search result for prompt {prompt.id}: {str(item_exc)}")
                # Continue processing other prompts

        # Sort by match count (most matches first)
        results.sort(key=lambda x: x.match_count, reverse=True)

        logger.debug(f"Returning {len(results)} search results")

        return results
    except Exception as e:
        logger.error(f"Error searching documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")


@router.get("/{doc_id}", response_model=DocumentDetail)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Get a specific document (prompt with documentation) by ID including its content.
    """
    try:
        doc_int_id = int(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    try:
        prompt = db.query(Prompt).filter(Prompt.id == doc_int_id).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Document not found")

        if not prompt.docu:
            raise HTTPException(
                status_code=404, detail="Document has no generated documentation"
            )

        repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
        if not repo:
            logger.warning(f"Document {doc_id} references non-existent repo {prompt.repo_id}")
            raise HTTPException(status_code=404, detail="Associated repository not found")

        # The documentation content is stored in the docu field
        content = prompt.docu if prompt.docu else "Documentation content not available."

        # Generate a simple table of contents from markdown headings
        try:
            headings = re.findall(r"^(#{1,6})\s+(.+)$", content, re.MULTILINE)
            toc_lines = []
            for level, title in headings:
                indent = "  " * (len(level) - 1)
                toc_lines.append(f"{indent}- {title.strip()}")
            toc = "\n".join(toc_lines) if toc_lines else "No headings found"
        except Exception as toc_exc:
            logger.warning(f"Error generating table of contents for document {doc_id}: {str(toc_exc)}")
            toc = "Error generating table of contents"

        # Convert SSH URL to HTTPS for display in documentation
        # SSH URLs like git@github.com:user/repo.git are not clickable
        # Convert them to https://github.com/user/repo.git
        display_url = repo.repo_url
        if is_ssh_url(repo.repo_url):
            https_url = convert_ssh_to_https(repo.repo_url)
            if https_url:
                display_url = https_url
                logger.debug(f"Converted SSH URL to HTTPS for display: {repo.repo_url} -> {display_url}")

        return DocumentDetail(
            id=str(prompt.id),
            title=repo.repo_name,
            repo_id=str(prompt.repo_id),
            repo_name=repo.repo_name,
            repo_url=display_url,
            status="ready",
            created_at=prompt.created_at.isoformat(),
            updated_at=prompt.created_at.isoformat(),
            content=content,
            table_of_contents=toc,
            goal=prompt.project_goal,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document {doc_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving document: {str(e)}")


class DeleteDocumentsRequest(BaseModel):
    doc_ids: List[str]


class UpdateDocumentsRequest(BaseModel):
    doc_ids: List[str]


class UpdateGoalRequest(BaseModel):
    goal: str


@router.put("/{doc_id}/goal")
def update_document_goal(doc_id: str, request: UpdateGoalRequest, db: Session = Depends(get_db)):
    """
    Updates the project goal for a specific document.
    """
    try:
        doc_int_id = int(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    try:
        prompt = db.query(Prompt).filter(Prompt.id == doc_int_id).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Document not found")

        # Update the project_goal field
        prompt.project_goal = request.goal.strip() or None
        db.commit()

        logger.info(f"Successfully updated project goal for document {doc_id}")
        return {
            "status": "success",
            "message": "Project goal updated successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating project goal for document {doc_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating project goal: {str(e)}")


@router.post("/update")
def update_documents(request: UpdateDocumentsRequest, db: Session = Depends(get_db)):
    """
    Manually regenerates documentation for multiple documents.
    Before regeneration, saves the old prompt dataset to history.
    Uses the old specific_prompt with the current generic_prompt from general_settings table.
    """
    from app.api.routes_prompts import get_generic_prompt

    updated_count = 0
    errors = []

    for doc_id_str in request.doc_ids:
        try:
            # Parse as integer ID
            doc_int_id = int(doc_id_str)
        except ValueError:
            errors.append(f"Invalid ID format: {doc_id_str}")
            continue

        # Use a separate transaction for each document to ensure atomicity
        # This prevents one document's failure from affecting others
        try:
            # Find the prompt (which represents a documentation)
            prompt = db.query(Prompt).filter(Prompt.id == doc_int_id).first()
            if not prompt:
                errors.append(f"Document not found: {doc_id_str}")
                continue

            if not prompt.repo_id:
                errors.append(f"Document {doc_id_str} has no associated repository")
                continue

            # Get repository
            repo = db.query(Repo).filter(Repo.id == prompt.repo_id).first()
            if not repo:
                errors.append(f"Repository not found for document {doc_id_str}")
                continue

            # Save the old prompt dataset to history before regeneration
            try:
                history_entry = History(
                    prompt_id=prompt.id,
                    generic_prompt=prompt.generic_prompt,
                    specific_prompt=prompt.specific_prompt,
                    created_at=datetime.now(),
                    repo_id=prompt.repo_id,
                    docu=prompt.docu,
                    project_goal=prompt.project_goal
                )
                db.add(history_entry)

                # Get current generic prompt from general_settings table
                settings = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
                current_generic_prompt = settings.general_prompt if settings else None

                # If no settings exist, use the default from routes_prompts
                if not current_generic_prompt:
                    current_generic_prompt = get_generic_prompt(db)

                # Update the prompt with the current generic_prompt from general_settings
                # and keep the old specific_prompt
                if current_generic_prompt:
                    prompt.generic_prompt = current_generic_prompt

                # Commit history entry and prompt update before regeneration
                # Individual commits per document ensure that if regeneration fails for one document,
                # the history is still saved and other documents can continue processing
                db.commit()
            except Exception as history_exc:
                db.rollback()
                logger.error(f"Error saving history for document {doc_id_str}: {str(history_exc)}")
                errors.append(f"Failed to save history for document {doc_id_str}")
                continue

            # Regenerate documentation
            try:
                result = generate_docu(db, prompt.repo_id, repo.repo_name)

                if result.get("status") == "documented":
                    updated_count += 1
                    logger.info(f"Successfully updated document {doc_id_str}")
                else:
                    error_msg = result.get('message', 'Unknown error')
                    logger.warning(f"Failed to update document {doc_id_str}: {error_msg}")
                    errors.append(f"Failed to update document {doc_id_str}: {error_msg}")
            except Exception as gen_exc:
                logger.error(f"Error generating documentation for {doc_id_str}: {str(gen_exc)}")
                errors.append(f"Error generating documentation for {doc_id_str}: {str(gen_exc)}")

        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error updating {doc_id_str}: {str(e)}", exc_info=True)
            errors.append(f"Error updating {doc_id_str}: {str(e)}")

    return {
        "status": "success" if updated_count > 0 else "error",
        "updated_count": updated_count,
        "errors": errors if errors else None,
    }


@router.post("/delete")
def delete_documents(request: DeleteDocumentsRequest, db: Session = Depends(get_db)):
    """
    Delete multiple documents by clearing their documentation field while preserving
    prompts and other metadata.
    Before clearing, saves the entire prompt dataset to the history table.
    Note: This only clears the documentation (docu field), keeping the specific_prompt,
    generic_prompt, and other fields intact so they can be used for future regeneration.
    """
    deleted_count = 0
    errors = []

    for doc_id_str in request.doc_ids:
        try:
            # Parse as integer ID
            doc_int_id = int(doc_id_str)
        except ValueError:
            errors.append(f"Invalid ID format: {doc_id_str}")
            continue

        # Use a separate transaction for each document to ensure atomicity
        try:
            # Find the prompt
            prompt = db.query(Prompt).filter(Prompt.id == doc_int_id).first()
            if not prompt:
                errors.append(f"Document not found: {doc_id_str}")
                continue

            try:
                # Only process if there's documentation to clear
                if not prompt.docu:
                    logger.info(f"Document {doc_id_str} already has no documentation, skipping")
                    continue

                # Save the complete prompt dataset to history table before clearing
                history_entry = History(
                    prompt_id=prompt.id,
                    generic_prompt=prompt.generic_prompt,
                    specific_prompt=prompt.specific_prompt,
                    created_at=datetime.now(),
                    repo_id=prompt.repo_id,
                    docu=prompt.docu,
                    project_goal=prompt.project_goal
                )
                db.add(history_entry)

                # Only clear the documentation, keep the specific prompt for the repository
                # The specific prompt should persist even when documentation is deleted
                prompt.docu = None

                # Commit each deletion individually to ensure atomicity per document
                # If one deletion fails, others can still succeed
                db.commit()
                deleted_count += 1
                logger.info(f"Successfully cleared documentation for {doc_id_str}, kept specific prompt")

            except Exception as delete_exc:
                db.rollback()
                logger.error(f"Error deleting document {doc_id_str}: {str(delete_exc)}", exc_info=True)
                errors.append(f"Error deleting {doc_id_str}: {str(delete_exc)}")

        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error deleting {doc_id_str}: {str(e)}", exc_info=True)
            errors.append(f"Error deleting {doc_id_str}: {str(e)}")

    return {
        "status": "success" if deleted_count > 0 else "error",
        "deleted_count": deleted_count,
        "errors": errors if errors else None,
    }
