from app.worker.celery_app import celery_app
from app.services.git_service import validate_repo_url, normalize_repo_url, is_ssh_url
from app.db.session import SessionLocal
from app.db.models import Repo
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def task_save_repo(self, repo_url: str, branch: str | None = None, depth: int | None = None, overwrite: bool = False):
    self.update_state(state="STARTED", meta={"repo_url": repo_url})
    logger.info(f"Starting repository save task for: {repo_url}")

    validation_result = validate_repo_url(repo_url)

    # Check validation status
    # For SSH authentication errors, we still save the repository but return a warning
    # This allows users to add SSH repositories even when SSH keys aren't configured yet
    error_type = validation_result.get("error_type", "")
    ssh_auth_error = error_type in ("ssh_auth", "ssh_host_key")

    if validation_result.get("status") == "success" or ssh_auth_error:
        db = SessionLocal()
        try:
            # Extract repo name from URL
            repo_name = repo_url.split("/")[-1].replace(".git", "")
            logger.info(f"Saving repository to database: {repo_name}")

            # Normalize the URL for duplicate detection
            normalized_url = normalize_repo_url(repo_url)
            logger.info(f"Normalized URL for duplicate detection: {normalized_url}")

            # Check if repository with the same normalized URL already exists
            # This prevents duplicates with SSH vs HTTPS URLs
            existing_repos = db.query(Repo).all()
            for existing_repo in existing_repos:
                existing_normalized = normalize_repo_url(existing_repo.repo_url)
                if existing_normalized == normalized_url:
                    logger.info(
                        f"Repository already exists in database with ID: {
                            existing_repo.id} (URL: {
                            existing_repo.repo_url})")
                    return {
                        "status": "error",
                        "message": "Repository already exists in database (same repository with different URL format).",
                        "repo_id": existing_repo.id,
                        "repo_name": existing_repo.repo_name,
                        "existing_url": existing_repo.repo_url
                    }

            # Check if repository with the same name already exists
            existing_name = db.query(Repo).filter(
                Repo.repo_name == repo_name
            ).first()

            if existing_name:
                logger.info(f"Repository with the same name already exists in database with ID: {existing_name.id}")
                return {
                    "status": "error",
                    "message": f"Repository with name '{repo_name}' already exists in database.",
                    "repo_id": existing_name.id,
                    "repo_name": existing_name.repo_name,
                    "existing_url": existing_name.repo_url
                }

            # Create new repository entry
            auth_type = "ssh" if is_ssh_url(repo_url) else "https"
            logger.info(f"Creating new repository entry: {repo_name}")
            new_repo = Repo(
                repo_name=repo_name,
                repo_url=repo_url,
                description=None,
                date_of_version=datetime.now(),
                auth_type=auth_type,
            )

            db.add(new_repo)
            db.flush()  # Ensure new_repo.id is available
            repo_id = new_repo.id
            logger.info(f"New repository created with ID: {repo_id}")

            db.commit()
            logger.info(f"Successfully committed repository {repo_name} to database")

            # Note: Documentation is NOT generated automatically on repository add.
            # Documentation will only be generated when:
            # 1. A specific prompt is saved via POST /prompts/repo, OR
            # 2. Documentation is explicitly requested via the UI/API

            # If SSH authentication failed, include a warning in the response
            if ssh_auth_error:
                logger.info(f"Repository saved with SSH authentication warning: {repo_name}")
                return {
                    "status": "success",
                    "message": f"Repository '{repo_name}' saved successfully with ID: {repo_id}",
                    "repo_id": repo_id,
                    "repo_name": repo_name,
                    "repo_url": repo_url,
                    "warning": validation_result.get("message", "SSH authentication not configured"),
                    "warning_details": validation_result.get("details", "")
                }

            return {
                "status": "success",
                "message": f"Repository '{repo_name}' saved successfully with ID: {repo_id}",
                "repo_id": repo_id,
                "repo_name": repo_name,
                "repo_url": repo_url
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error saving repository to database: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        finally:
            db.close()
    else:
        # Validation failed with non-SSH error - return detailed error
        logger.warning(f"Repository validation failed for {repo_url}. Error type: {error_type}")
        return validation_result
