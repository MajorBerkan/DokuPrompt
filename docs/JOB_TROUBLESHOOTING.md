# Job Troubleshooting Guide

This guide helps diagnose and fix issues with various types of "jobs" in the CaffeineCode project.

## Types of Jobs

### 1. Celery Background Tasks

The project uses Celery for asynchronous task processing:
- `task_save_repo`: Saves repository information to the database
- `task_generate_docu`: Generates documentation for repositories

#### Common Issues

**Problem: Task appears stuck or not processing**
- Check if Redis is running: `redis-cli ping`
- Verify Celery worker is active: `celery -A app.worker.celery_app inspect active`
- Check logs for error messages

**Problem: Task fails with authentication errors**
- Verify credentials in `.env` file
- Check if API keys are valid and not expired
- Ensure proper permissions are set

### 2. GitHub Actions Workflows

GitHub Actions jobs are defined in `.github/workflows/`:
- CI workflow: Backend and frontend checks
- Backend Tests: Full Python test suite
- Frontend Tests: JavaScript linting and build
- Docker Build: Container image creation

#### Common Issues

**Problem: Workflow fails to start**
- Check workflow file syntax (YAML)
- Verify branch protection rules
- Ensure required secrets are configured

**Problem: Tests fail unexpectedly**
- Check for database connection issues
- Verify environment variables are set correctly
- Review recent code changes that might have broken tests

### 3. Scheduled Tasks

The application may have scheduled tasks that run periodically. Check:
- `general_settings` table for update scheduling configuration
- System cron jobs or Celery beat configuration

## Debugging Steps

1. **Check logs**: Application logs contain detailed error information
2. **Verify configuration**: Ensure all required environment variables are set
3. **Test dependencies**: Confirm PostgreSQL, Redis, and other services are running
4. **Review recent changes**: Use `git log` to see what changed before the issue started
5. **Run tests locally**: Execute `pytest` to identify specific failing tests

## Getting Help

If you encounter a job that's broken:
1. Note the exact job ID or task name
2. Collect relevant log output
3. Document steps to reproduce the issue
4. Open a detailed issue on GitHub with this information

## Common Error Messages

### "Job 56553354554 is broken"
If you see a generic job number that doesn't match any known job:
- Check if it's a workflow run ID from GitHub Actions
- Verify the number hasn't been mistyped
- Look in Celery task history for matching task IDs
- This may be a placeholder - check the actual error message in logs

### Database Connection Errors
```
sqlalchemy.exc.OperationalError: unable to open database file
```
**Solution**: Ensure the database path exists and has proper permissions

### Redis Connection Errors
```
redis.exceptions.ConnectionError: Error connecting to Redis
```
**Solution**: Start Redis service: `redis-server` or `systemctl start redis`

## Prevention

- Set up monitoring for critical jobs
- Implement proper error handling and retries
- Keep logs for troubleshooting
- Document job dependencies and requirements
- Test jobs in staging before production deployment
