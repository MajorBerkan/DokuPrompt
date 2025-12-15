from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.ai_service import generate_docu
from app.db.models import Repo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


# ---------------------------
# Database Dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class GenerateRequest(BaseModel):
    repo_ids: List[int]


class GenerateEnqueueResponse(BaseModel):
    task_id: str


# ---------------------------
# Endpoints
# ---------------------------
@router.post("/generate")
def enqueue_generate(req: GenerateRequest, db: Session = Depends(get_db)):
    """
    Generate documentation for the specified repositories.
    Uses prompts from the database.
    """
    results = []
    errors = []
    successful_count = 0

    for repo_id in req.repo_ids:
        try:
            # Get repository info
            repo = db.query(Repo).filter(Repo.id == repo_id).first()
            if not repo:
                error_msg = f"Repository {repo_id} not found"
                logger.error(error_msg)
                errors.append(error_msg)
                continue

            # Generate documentation
            result = generate_docu(db, repo_id, repo.repo_name)
            results.append(result)

            # Check if generation was successful
            if result.get("status") == "documented":
                successful_count += 1
                logger.info(f"Successfully generated documentation for repository {repo.repo_name} (ID: {repo_id})")
            else:
                error_msg = result.get("message", f"Failed to generate documentation for repository {repo.repo_name}")
                logger.error(f"Documentation generation failed for repository {repo.repo_name} (ID: {repo_id}): {error_msg}")
                errors.append(error_msg)

        except Exception as e:
            # Log detailed error internally
            logger.error(f"Error processing repository {repo_id}: {str(e)}", exc_info=True)
            # Return generic error message to user without sensitive details
            errors.append(f"Error processing repository {repo_id}")

    # Determine overall status based on success count
    if successful_count == 0:
        return {
            "status": "error",
            "message": f"Failed to generate documentation for all {len(req.repo_ids)} repositories.",
            "results": results,
            "errors": errors,
            "successful_count": 0
        }
    elif successful_count < len(req.repo_ids):
        return {
            "status": "partial_success",
            "message": f"Documentation generated for {successful_count}/{len(req.repo_ids)} repositories.",
            "results": results,
            "errors": errors,
            "successful_count": successful_count
        }

    return {
        "status": "ok",
        "message": f"Documentation generated successfully for {successful_count} repositories.",
        "results": results,
        "successful_count": successful_count
    }
