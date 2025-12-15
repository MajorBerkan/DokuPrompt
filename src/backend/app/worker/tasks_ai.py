from app.worker.celery_app import celery_app
from app.services.ai_service import generate_docu
from app.db.session import SessionLocal


@celery_app.task(bind=True)
def task_generate_docu(self, repo_id: int, repo_name: str):
    """
    Celery task to generate documentation for a repository.

    Args:
        repo_id: Integer ID of the repository
        repo_name: Name of the repository

    Returns:
        Dictionary with status and documentation details
    """
    self.update_state(state="STARTED", meta={"repo_id": repo_id, "repo_name": repo_name})

    db = SessionLocal()
    try:
        result = generate_docu(db, repo_id, repo_name)
        return result
    finally:
        db.close()
