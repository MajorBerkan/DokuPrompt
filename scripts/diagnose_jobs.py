#!/usr/bin/env python3
"""
Job Diagnostic Tool for CaffeineCode

This script helps diagnose issues with various types of jobs in the system.
Usage: python scripts/diagnose_jobs.py [job_id]
"""

import sys
from pathlib import Path

# Add src/backend to path for imports
backend_path = Path(__file__).parent.parent / "src" / "backend"
sys.path.insert(0, str(backend_path))

# Configuration
CELERY_TIMEOUT = 5.0  # seconds
REDIS_TIMEOUT = 3  # seconds
MIN_GITHUB_ACTIONS_ID_LENGTH = 10  # GitHub workflow run IDs are typically 11+ digits


def check_celery_status():
    """Check if Celery worker is running"""
    print("Checking Celery Status...")
    try:
        from app.worker.celery_app import celery_app
        inspect = celery_app.control.inspect(timeout=CELERY_TIMEOUT)

        # Get active tasks
        active = inspect.active()
        if active:
            print("✓ Celery workers are active")
            for worker, tasks in active.items():
                print(f"  Worker: {worker}, Active tasks: {len(tasks)}")
        else:
            print("✗ No active Celery workers found (or connection timeout)")

    except Exception as e:
        print(f"✗ Error checking Celery: {e}")


def check_redis_connection():
    """Check if Redis is accessible"""
    print("\nChecking Redis Connection...")
    try:
        import redis
        from app.core.config import settings

        if settings.CELERY_BROKER_URL:
            r = redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=REDIS_TIMEOUT)
            r.ping()
            print("✓ Redis is accessible")
        else:
            print("✗ CELERY_BROKER_URL not configured")
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")


def check_database_connection():
    """Check if database is accessible"""
    print("\nChecking Database Connection...")
    try:
        from app.db.session import SessionLocal
        from sqlalchemy import text

        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        print("✓ Database is accessible")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")


def list_recent_tasks():
    """List recent Celery tasks"""
    print("\nRecent Celery Tasks:")
    try:
        from app.worker.celery_app import celery_app
        inspect = celery_app.control.inspect(timeout=CELERY_TIMEOUT)

        # Get scheduled tasks
        scheduled = inspect.scheduled()
        if scheduled:
            print("Scheduled tasks:")
            for worker, tasks in scheduled.items():
                for task in tasks:
                    print(f"  - {task['name']} (ID: {task['id']})")
        else:
            print("  No scheduled tasks (or connection timeout)")

        # Get registered tasks
        registered = inspect.registered()
        if registered:
            print("\nRegistered task types:")
            for worker, tasks in registered.items():
                for task in tasks:
                    print(f"  - {task}")

    except Exception as e:
        print(f"✗ Error listing tasks: {e}")


def diagnose_job_id(job_id):
    """Try to diagnose a specific job ID"""
    print(f"\nDiagnosing Job ID: {job_id}")

    # Check if it looks like a GitHub Actions workflow run ID
    # GitHub workflow run IDs are large integers (typically 11+ digits)
    if len(job_id) >= MIN_GITHUB_ACTIONS_ID_LENGTH and job_id.isdigit():
        print("  This looks like it could be a GitHub Actions workflow run ID")
        print(f"  Check: https://github.com/sep-thm/CaffeineCode/actions/runs/{job_id}")

    # Try to find it as a Celery task
    try:
        from celery.result import AsyncResult
        from app.worker.celery_app import celery_app

        result = AsyncResult(job_id, app=celery_app)
        print(f"  Task state: {result.state}")
        if result.info:
            print(f"  Task info: {result.info}")
    except Exception as e:
        print(f"  Not found as Celery task: {e}")


def main():
    print("=" * 60)
    print("CaffeineCode Job Diagnostic Tool")
    print("=" * 60)

    # Run all checks
    check_database_connection()
    check_redis_connection()
    check_celery_status()
    list_recent_tasks()

    # If a job ID was provided, try to diagnose it
    if len(sys.argv) > 1:
        job_id = sys.argv[1]
        diagnose_job_id(job_id)
    else:
        print("\nTip: Run with a job ID to diagnose a specific job:")
        print("  python scripts/diagnose_jobs.py <job_id>")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
