"""
Periodic task for checking repository changes using Redis cache.
No database schema modifications - uses Redis to track commit hashes.
Uses dynamic check interval from database settings (1 minute - 7 days).
"""
from app.worker.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Repo, GeneralSettings
from app.services.ai_service import generate_docu
from app.core.config import settings
import logging
import git
from datetime import datetime, timedelta
import redis

logger = logging.getLogger(__name__)

# Redis client for caching commit hashes and last check time
redis_client = redis.from_url(settings.CELERY_BROKER_URL, decode_responses=True)

# Redis key for storing last check timestamp
LAST_CHECK_KEY = "repo_check:last_run_timestamp"

# Default check interval if not configured in database
DEFAULT_CHECK_INTERVAL_MINUTES = 60


def get_latest_commit_hash(repo_url: str) -> str | None:
    """
    Get the latest commit hash from a remote repository without cloning.
    Uses git ls-remote for efficiency.

    Args:
        repo_url: The URL of the repository

    Returns:
        str | None: The latest commit hash, or None if it couldn't be retrieved
    """
    try:
        g = git.cmd.Git()
        result = g.ls_remote(repo_url, 'HEAD')
        if result:
            # Format: "hash\tHEAD"
            commit_hash = result.split('\t')[0]
            return commit_hash
        return None
    except Exception as e:
        logger.warning(f"Failed to get latest commit hash for {repo_url}: {str(e)}")
        return None


def get_cached_commit_hash(repo_id: int) -> str | None:
    """Get cached commit hash from Redis."""
    try:
        key = f"repo_commit_hash:{repo_id}"
        return redis_client.get(key)
    except Exception as e:
        logger.error(f"Failed to get cached commit hash for repo {repo_id}: {str(e)}")
        return None


def set_cached_commit_hash(repo_id: int, commit_hash: str):
    """Store commit hash in Redis cache (no expiration - persists until explicitly cleared)."""
    try:
        key = f"repo_commit_hash:{repo_id}"
        redis_client.set(key, commit_hash)
    except Exception as e:
        logger.error(f"Failed to cache commit hash for repo {repo_id}: {str(e)}")


def get_last_check_time() -> datetime | None:
    """Get the timestamp of the last repository check from Redis."""
    try:
        timestamp_str = redis_client.get(LAST_CHECK_KEY)
        if timestamp_str:
            return datetime.fromisoformat(timestamp_str)
        return None
    except Exception as e:
        logger.error(f"Failed to get last check time: {str(e)}")
        return None


def set_last_check_time(timestamp: datetime):
    """Store the timestamp of the last repository check in Redis."""
    try:
        redis_client.set(LAST_CHECK_KEY, timestamp.isoformat())
    except Exception as e:
        logger.error(f"Failed to set last check time: {str(e)}")


@celery_app.task(bind=True)
def check_all_repositories_for_changes(self):
    """
    Periodic task to check all repositories for changes and regenerate documentation if needed.
    Uses Redis to cache commit hashes - no database modifications required.

    This task is invoked every minute by Celery Beat, but only performs the actual check
    based on the dynamic update_time interval configured in the database (1 min - 7 days).

    Performance optimizations for many repositories:
    - Uses git ls-remote (no cloning)
    - Redis caching for fast lookups
    - Skips check if updates are disabled
    - Dynamic interval from database settings
    - Batch processing with error handling
    """
    db = SessionLocal()
    try:
        # Get settings to check if updates are disabled and get the check interval
        settings_obj = db.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()

        if not settings_obj:
            logger.info("No general settings found, skipping repository check")
            return {"status": "skipped", "reason": "no_settings"}

        if settings_obj.updates_disabled:
            logger.info("Automatic updates are disabled, skipping repository check")
            return {"status": "skipped", "reason": "updates_disabled"}

        # Check if enough time has passed since last check based on configured interval
        last_check = get_last_check_time()
        check_interval = settings_obj.update_time or timedelta(minutes=DEFAULT_CHECK_INTERVAL_MINUTES)

        if last_check:
            time_since_last_check = datetime.utcnow() - last_check
            if time_since_last_check < check_interval:
                logger.debug(
                    f"Skipping check - only {time_since_last_check.total_seconds():.0f}s passed, "
                    f"need {check_interval.total_seconds():.0f}s (interval: {check_interval})"
                )
                return {
                    "status": "skipped",
                    "reason": "interval_not_reached",
                    "time_since_last_check": time_since_last_check.total_seconds(),
                    "required_interval": check_interval.total_seconds()
                }

        # Update last check time before starting the check
        set_last_check_time(datetime.utcnow())
        logger.info(f"Starting repository check (interval: {check_interval})")

        # Get all repositories
        repos = db.query(Repo).all()

        if not repos:
            logger.info("No repositories found, nothing to check")
            return {"status": "success", "checked": 0, "updated": 0}

        logger.info(f"Checking {len(repos)} repositories for changes...")

        checked_count = 0
        updated_count = 0
        errors = []

        for repo in repos:
            try:
                checked_count += 1
                logger.debug(f"Checking repository: {repo.repo_name} (ID: {repo.id})")

                # Get the latest commit hash from the remote repository
                latest_hash = get_latest_commit_hash(repo.repo_url)

                if not latest_hash:
                    logger.warning(f"Could not retrieve commit hash for {repo.repo_name}, skipping")
                    errors.append({
                        "repo_id": repo.id,
                        "repo_name": repo.repo_name,
                        "error": "Could not retrieve commit hash"
                    })
                    continue

                # Get cached commit hash from Redis
                cached_hash = get_cached_commit_hash(repo.id)

                if cached_hash is None:
                    # First time checking this repository - just cache the hash
                    logger.info(f"First check for {repo.repo_name}, caching commit hash: {latest_hash[:8]}")
                    set_cached_commit_hash(repo.id, latest_hash)
                elif cached_hash != latest_hash:
                    # Repository has changed! Regenerate documentation
                    logger.info(f"Repository {repo.repo_name} has changed! Old: {cached_hash[:8]}, New: {latest_hash[:8]}")

                    try:
                        # Generate documentation
                        result = generate_docu(db, repo.id, repo.repo_name)

                        if result.get("status") == "documented":
                            logger.info(f"Successfully regenerated documentation for {repo.repo_name}")

                            # Update the cached commit hash and date in database
                            set_cached_commit_hash(repo.id, latest_hash)
                            repo.date_of_version = datetime.now()
                            db.commit()

                            updated_count += 1
                        else:
                            logger.error(f"Failed to regenerate documentation for {repo.repo_name}: {result.get('message')}")
                            errors.append({
                                "repo_id": repo.id,
                                "repo_name": repo.repo_name,
                                "error": f"Documentation generation failed: {result.get('message')}"
                            })
                    except Exception as e:
                        logger.error(f"Error regenerating documentation for {repo.repo_name}: {str(e)}", exc_info=True)
                        errors.append({
                            "repo_id": repo.id,
                            "repo_name": repo.repo_name,
                            "error": str(e)
                        })
                else:
                    logger.debug(f"No changes detected for {repo.repo_name}")

            except Exception as e:
                logger.error(f"Error checking repository {repo.repo_name}: {str(e)}", exc_info=True)
                errors.append({
                    "repo_id": repo.id,
                    "repo_name": repo.repo_name,
                    "error": str(e)
                })

        result = {
            "status": "success",
            "checked": checked_count,
            "updated": updated_count,
            "errors": errors if errors else None
        }

        logger.info(f"Repository check complete: {result}")
        return result

    except Exception as e:
        logger.error(f"Error in check_all_repositories_for_changes: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()
