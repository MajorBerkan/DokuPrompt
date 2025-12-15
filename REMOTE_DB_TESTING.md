# Remote Database Testing Guide

This guide explains how to test the backend against the remote PostgreSQL database hosted on the HS server.

## Overview

The backend has been configured to work seamlessly with both local (Docker) and remote PostgreSQL databases. All database connections are now managed through the `DATABASE_URL` environment variable, ensuring flexibility and security.

## Changes Made

### 1. Consolidated Database Configuration
- **Removed**: Duplicate `app/database.py` module
- **Updated**: All imports now use `app.db.session.SessionLocal` consistently
- **Files Updated**:
  - `app/api/routes_ai.py`
  - `app/api/routes_prompts.py`
  - `app/api/routes_docs.py`
  - `app/api/routes_repo.py`
  - `app/worker/tasks_git.py`

### 2. Environment Configuration
- **DATABASE_URL**: Now the single source of truth for database connections
- **Validation**: Clear error messages if `DATABASE_URL` is not set
- **No Hardcoded Values**: All database connections use environment variables

### 3. Configuration Files
- **`.env.example`**: Updated with remote database example
- **`.env.test`**: Created for remote database testing (gitignored)
- **`.gitignore`**: Updated to exclude `.env.test`

## Testing Against Remote Database

### Prerequisites
1. Ensure local PostgreSQL container is stopped to avoid confusion:
   ```bash
   docker-compose down postgres
   ```

2. Ensure Redis is available (if using Celery):
   ```bash
   docker-compose up -d redis
   ```

### Option 1: Using .env.test File

1. Copy and configure the `.env.test` file:
   ```bash
   cp .env.test .env.test.local
   ```

2. Edit `.env.test.local` if needed (already configured for HS server):
   ```
   DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb
   ```

3. Start the backend with the test environment:
   ```bash
   cd src/backend
   export $(cat ../../.env.test | xargs)
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option 2: Using PyCharm Run Configuration

1. Open **Run/Debug Configurations** in PyCharm
2. Select or create a configuration for `app.main:app`
3. Add environment variables:
   ```
   DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb
   CELERY_BROKER_URL=redis://localhost:6379/0
   CELERY_RESULT_BACKEND=redis://localhost:6379/0
   USE_MOCK_AUTH=true
   ```
4. Run the configuration

### Option 3: Direct Command Line

```bash
cd src/backend
DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb \
CELERY_BROKER_URL=redis://localhost:6379/0 \
CELERY_RESULT_BACKEND=redis://localhost:6379/0 \
USE_MOCK_AUTH=true \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Testing Checklist

Once the backend is running against the remote database, test the following functionalities:

### 1. Database Health Check
```bash
curl http://localhost:8000/health/db
```
Expected: `{"db": "ok"}`

### 2. Repository Management
- [ ] Create a new repository
- [ ] List all repositories
- [ ] Get repository by ID
- [ ] Update repository metadata
- [ ] Delete repository

### 3. Document Management
- [ ] Create documents
- [ ] List documents for a repository
- [ ] Update document status
- [ ] Delete documents

### 4. File Operations
- [ ] Upload files to documents
- [ ] Retrieve file content
- [ ] Delete files

### 5. AI Generation
- [ ] Trigger AI documentation generation
- [ ] Check generation status
- [ ] Verify generated content is persisted

### 6. Prompt Management
- [ ] Create custom prompts
- [ ] List prompts
- [ ] Update prompts
- [ ] Delete prompts

## API Testing Examples

### Create Repository
```bash
curl -X POST http://localhost:8000/repos/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/example/test-repo",
    "branch": "main",
    "depth": 1
  }'
```

### List Repositories
```bash
curl http://localhost:8000/repos/
```

### Health Check
```bash
curl http://localhost:8000/health
```

## Troubleshooting

### Connection Refused
- **Issue**: Cannot connect to remote database
- **Solution**: Check firewall rules and ensure the HS server is accessible from your network

### Extension Errors
- **Issue**: PostgreSQL extensions not available
- **Solution**: Ensure `pgcrypto`, `citext`, and `vector` extensions are installed on the remote database

### Session Errors
- **Issue**: Database session errors
- **Solution**: Check if `DATABASE_URL` format is correct (should use `postgresql+psycopg2://` for psycopg2 driver)

### Port Conflicts
- **Issue**: Port 8000 already in use
- **Solution**: Stop local Docker containers or use a different port: `--port 8001`

## Database Connection Formats

### Local Docker (Default)
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/codedoc
```

### Remote HS Server
```
DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb
```

### Local PostgreSQL (No Docker)
```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/codedoc
```

## Security Notes

1. **Never commit credentials**: The `.env.test` file is gitignored
2. **Use strong passwords**: Change default passwords in production
3. **Limit access**: Use firewall rules to restrict database access
4. **Use SSL**: Consider enabling SSL for remote connections in production

## Next Steps

After successful testing:
1. Document any schema incompatibilities
2. Fix any issues found during testing
3. Update migration scripts if needed
4. Prepare for deployment to HS server
5. Create pull request to merge changes to main branch

## Support

For issues or questions, please create an issue in the GitHub repository or contact the development team.
