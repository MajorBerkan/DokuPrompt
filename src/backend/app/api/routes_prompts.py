from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import Prompt, Repo, GeneralSettings
from app.db.session import SessionLocal
from app.worker.tasks_ai import task_generate_docu
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompts", tags=["prompts"])


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

class SaveRepoPromptRequest(BaseModel):
    repo_id: int
    prompt: str


class SaveGeneralPromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    status: str
    message: Optional[str] = None
    task_id: Optional[str] = None


class GetPromptResponse(BaseModel):
    prompt: str


# ---------------------------
# Default Generic Prompt (fallback)
# ---------------------------
# This is the default generic prompt used if no settings exist in database
_DEFAULT_GENERIC_PROMPT = """Generate comprehensive documentation for this repository.

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper Markdown heading hierarchy (# for main title, ## for sections, ### for subsections)
- Add extra blank lines before and after all headings for better spacing
- Make headings stand out: add 2 blank lines before each heading (except the first) and 1 blank line after
- Use **bold** for important terms and key concepts
- Keep paragraph text consistently formatted with single spacing between lines
- Use code blocks with syntax highlighting for code examples
- Use bullet points or numbered lists for better readability where appropriate

CONTENT STRUCTURE:
- Start with an overview/introduction
- Document the main components and their purposes
- Include usage examples where relevant
- Explain configuration options if applicable
- Describe the API or main interfaces
"""


def get_generic_prompt(db: Session) -> str:
    """Returns the current generic prompt from the most recent database record."""
    settings = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    if settings and settings.general_prompt:
        return settings.general_prompt
    return _DEFAULT_GENERIC_PROMPT


def set_generic_prompt(db: Session, prompt: str) -> None:
    """Updates the generic prompt in database by creating a new record if prompt changed."""
    settings = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    if settings:
        # Check if prompt has changed
        if settings.general_prompt != prompt:
            # Create new record, copying other settings from previous
            new_settings = GeneralSettings(
                general_prompt=prompt,
                update_time=settings.update_time,
                updates_disabled=settings.updates_disabled
            )
            db.add(new_settings)
            db.commit()
        # If prompt hasn't changed, do nothing (no update or commit needed)
    else:
        # First time - create new record
        settings = GeneralSettings(general_prompt=prompt)
        db.add(settings)
        db.commit()


# ---------------------------
# Endpoints
# ---------------------------

@router.post("/repo", response_model=PromptResponse)
def save_specific_prompt(req: SaveRepoPromptRequest, db: Session = Depends(get_db)):
    """
    Saves a specific prompt for a repository and queues documentation regeneration.
    The generic and specific prompts are stored separately.
    Documentation generation happens asynchronously in the background.
    """
    try:
        # Verify repository exists
        repo = db.query(Repo).filter(Repo.id == req.repo_id).first()
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        # Get generic prompt from database
        generic_prompt = get_generic_prompt(db)

        # Check if there's an existing prompt for this repository
        existing_prompt = db.query(Prompt).filter(Prompt.repo_id == req.repo_id).first()

        if existing_prompt:
            # Update existing prompt - store generic and specific separately
            existing_prompt.generic_prompt = generic_prompt
            existing_prompt.specific_prompt = req.prompt.strip() if req.prompt.strip() else None
            logger.info(f"Updated prompts for repository {repo.repo_name} (ID: {req.repo_id})")
        else:
            # Create new prompt entry - store generic and specific separately
            new_prompt = Prompt(
                generic_prompt=generic_prompt,
                specific_prompt=req.prompt.strip() if req.prompt.strip() else None,
                repo_id=req.repo_id,
                docu=None  # Will be generated
            )
            db.add(new_prompt)
            logger.info(f"Created new prompts for repository {repo.repo_name} (ID: {req.repo_id})")

        db.commit()

        # Queue documentation regeneration asynchronously
        logger.info(f"Queueing documentation regeneration for repository {repo.repo_name} with updated prompt")
        task = task_generate_docu.delay(req.repo_id, repo.repo_name)

        return PromptResponse(
            status="ok",
            message=f"Prompt saved successfully. Documentation regeneration queued for repository {repo.repo_name}",
            task_id=task.id
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving specific prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save specific prompt: {str(e)}")


@router.get("/repo/{repo_id}", response_model=GetPromptResponse)
def get_specific_prompt(repo_id: int, db: Session = Depends(get_db)):
    """
    Gets the repository-specific prompt (without the generic part).
    Returns empty string if no specific prompt is set.
    """
    try:
        # Get the prompt for this repository
        prompt = db.query(Prompt).filter(Prompt.repo_id == repo_id).first()

        if prompt and prompt.specific_prompt:
            return GetPromptResponse(prompt=prompt.specific_prompt)
        else:
            return GetPromptResponse(prompt="")
    except Exception as e:
        logger.error(f"Error getting specific prompt for repo {repo_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get specific prompt: {str(e)}")


@router.post("/general", response_model=PromptResponse)
def save_general_prompt(req: SaveGeneralPromptRequest, db: Session = Depends(get_db)):
    """
    Updates the generic prompt in database.
    This prompt will be used as the base for all repository-specific prompts.
    """
    try:
        # Update the generic prompt in database
        set_generic_prompt(db, req.prompt)
        logger.info("Updated generic prompt in database")

        return PromptResponse(
            status="ok",
            message="General prompt updated successfully"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving general prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save general prompt: {str(e)}")


@router.get("/general", response_model=GetPromptResponse)
def get_general_prompt_endpoint(db: Session = Depends(get_db)):
    """
    Gets the current generic prompt from database.
    """
    return GetPromptResponse(prompt=get_generic_prompt(db))
