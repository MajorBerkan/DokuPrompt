from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "codedoc_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks_git", "app.worker.tasks_ai", "app.worker.tasks_periodic"],
)

celery_app.conf.update(
    task_track_started=True,
    result_expires=3600,
    # Beat schedule for periodic repository checking
    # The task runs every minute and checks if it should actually perform the check
    # based on the dynamic update interval configured in the database (1 min - 7 days)
    beat_schedule={
        'check-repo-changes': {
            'task': 'app.worker.tasks_periodic.check_all_repositories_for_changes',
            'schedule': 60.0,  # Run every minute (60 seconds)
        },
    },
)
