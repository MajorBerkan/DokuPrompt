from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl, field_validator
from typing import List, Optional
from celery.result import AsyncResult
from sqlalchemy.orm import Session
import re

from app.worker.tasks_git import task_save_repo
from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Repo, Prompt

router = APIRouter(prefix="/repos", tags=["repos"])


# ---------------------------
# Schemas
# ---------------------------

class CloneRequest(BaseModel):
    repo_url: str
    branch: str | None = None
    depth: int | None = None
    overwrite: bool = False

    @field_validator('repo_url')
    @classmethod
    def validate_git_url(cls, v: str) -> str:
        """
        Validate git repository URL.
        Accepts both HTTP/HTTPS URLs and SSH URLs.

        Examples:
        - https://github.com/user/repo.git
        - http://github.com/user/repo
        - git@github.com:user/repo.git
        - ssh://git@github.com/user/repo.git
        """
        if not v or not v.strip():
            raise ValueError('Repository URL cannot be empty')

        v = v.strip()

        # Pattern for HTTP/HTTPS URLs
        http_pattern = r'^https?://.+'

        # Pattern for SSH URLs (git@host:path or ssh://git@host/path)
        ssh_pattern = r'^(ssh://)?git@[\w\.-]+[:/].+'

        if re.match(http_pattern, v) or re.match(ssh_pattern, v):
            return v

        raise ValueError(
            'Invalid git repository URL. '
            'Please use HTTP/HTTPS (e.g., https://github.com/user/repo.git) '
            'or SSH format (e.g., git@github.com:user/repo.git)'
        )


class CloneEnqueueResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    result: dict | None = None


class RepoInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    repo_url: str
    date_of_version: Optional[str] = None
    specific_prompt: Optional[str] = None


class DeleteRequest(BaseModel):
    repo_id: int


class DeleteResponse(BaseModel):
    status: str
    message: str | None = None
    target_dir: str | None = None


class UpdateRepoRequest(BaseModel):
    repo_id: int
    name: Optional[str] = None
    description: Optional[str] = None


class UpdateRepoResponse(BaseModel):
    status: str
    message: Optional[str] = None


class RegenerateDocRequest(BaseModel):
    repo_id: int


class RegenerateDocResponse(BaseModel):
    status: str
    message: Optional[str] = None


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
# Endpoints
# ---------------------------

@router.post("/clone", response_model=CloneEnqueueResponse)
def enqueue_clone(req: CloneRequest):
    job = task_save_repo.delay(
        repo_url=str(req.repo_url),
        branch=req.branch,
        depth=req.depth,
        overwrite=req.overwrite,
    )
    return CloneEnqueueResponse(task_id=job.id)


@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    try:
        res: AsyncResult = AsyncResult(task_id, app=celery_app)
        result = None
        try:
            if res.successful():
                result = res.result
            elif res.failed():
                result = {"error": str(res.info)}
            elif res.info:
                result = res.info if isinstance(res.info, dict) else {"info": str(res.info)}
        except Exception as e:
            result = {"error": str(e)}
        return TaskStatusResponse(task_id=task_id, state=res.state, result=result)
    except Exception as e:
        # If we can't get task status (e.g., Celery backend not available),
        # return a PENDING state with error info instead of raising 500
        return TaskStatusResponse(
            task_id=task_id,
            state="PENDING",
            result={"error": f"Unable to fetch task status: {str(e)}"}
        )


@router.get("/list", response_model=List[RepoInfo])
def list_repositories(db: Session = Depends(get_db)):
    """
    Liefert alle Repositories aus der Datenbank.
    """
    repos = db.query(Repo).all()
    result = []
    for repo in repos:
        # Get the specific prompt for this repository from the Prompt table
        prompt = db.query(Prompt).filter(Prompt.repo_id == repo.id).first()
        specific_prompt = prompt.specific_prompt if prompt and prompt.specific_prompt else None

        result.append(RepoInfo(
            id=repo.id,
            name=repo.repo_name,
            description=repo.description,
            repo_url=repo.repo_url,
            date_of_version=repo.date_of_version.isoformat() if repo.date_of_version else None,
            specific_prompt=specific_prompt,
        ))
    return result


@router.post("/delete", response_model=DeleteResponse)
def delete_repository(body: DeleteRequest, db: Session = Depends(get_db)):
    """
    Löscht ein Repository und alle zugehörigen Prompts aus der Datenbank.
    """
    # Find repository in database
    repo = db.query(Repo).filter(Repo.id == body.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Delete associated prompts first (CASCADE should handle this, but being explicit)
    db.query(Prompt).filter(Prompt.repo_id == body.repo_id).delete(synchronize_session=False)

    # Delete repository from database
    db.delete(repo)
    db.commit()

    return DeleteResponse(status="ok", message="Repository and associated prompts deleted", target_dir=None)


@router.post("/update", response_model=UpdateRepoResponse)
def update_repository(body: UpdateRepoRequest, db: Session = Depends(get_db)):
    """
    Updates repository information (name and/or description).
    """
    # Find repository in database
    repo = db.query(Repo).filter(Repo.id == body.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Check if new name already exists (if name is being updated)
    if body.name is not None and body.name != repo.repo_name:
        existing_repo_with_name = db.query(Repo).filter(
            Repo.repo_name == body.name,
            Repo.id != body.repo_id
        ).first()

        if existing_repo_with_name:
            raise HTTPException(
                status_code=400,
                detail=f"Repository with name '{body.name}' already exists"
            )

    # Update fields if provided
    if body.name is not None:
        repo.repo_name = body.name
    if body.description is not None:
        repo.description = body.description

    try:
        db.commit()
        return UpdateRepoResponse(status="ok", message="Repository updated successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update repository: {str(e)}")


@router.post("/regenerate-doc", response_model=RegenerateDocResponse)
def regenerate_documentation(body: RegenerateDocRequest, db: Session = Depends(get_db)):
    """
    Manually regenerates documentation for a repository.
    Updates the generic prompt from backend and regenerates the documentation.
    """
    from app.services.ai_service import generate_docu

    # Find repository in database
    repo = db.query(Repo).filter(Repo.id == body.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        # Generate documentation (this will also update the generic prompt)
        result = generate_docu(db, body.repo_id, repo.repo_name)

        if result.get("status") == "documented":
            return RegenerateDocResponse(
                status="ok",
                message=f"Documentation regenerated successfully for repository {repo.repo_name}"
            )
        else:
            return RegenerateDocResponse(
                status="error",
                message=f"Failed to regenerate documentation: {result.get('message', 'Unknown error')}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate documentation: {str(e)}")
