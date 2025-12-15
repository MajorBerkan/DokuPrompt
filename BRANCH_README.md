# Remote Database Testing Branch

⚠️ **IMPORTANT**: This branch is specifically configured for testing against the remote PostgreSQL database on the HS server.

## Configuration

The `.env` file in this branch is configured to connect to:
- **Host**: `141.19.113.165`
- **Port**: `5432`
- **Database**: `appdb`
- **User**: `admin`
- **Password**: `passwort`
- **Driver**: `psycopg2` (not psycopg v3)
- **Full URL**: `postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb`

## What's Different in This Branch

1. **Local PostgreSQL Disabled**: The `postgres` service in `docker-compose.yml` is commented out
2. **No PostgreSQL Dependencies**: All `depends_on: postgres` entries have been removed
3. **External Database Only**: Backend connects exclusively to the HS server database
4. **Graceful Extension Handling**: Database initialization handles missing PostgreSQL extensions gracefully

## Setup Options

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services (Redis, Backend, Celery, Frontend, Adminer)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Verify connection
curl http://localhost:8000/health/db
# Should return: {"db": "ok"}
```

**Note**: This will NOT start a local PostgreSQL database. All services connect to the external HS database.

### Option 2: Running Backend Locally (Without Docker)

1. **Ensure Redis is running**:
   ```bash
   # Option A: Using system Redis
   sudo systemctl start redis
   
   # Option B: Using Docker for Redis only
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Start the backend**:
   ```bash
   cd src/backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Verify connection**:
   ```bash
   curl http://localhost:8000/health/db
   # Should return: {"db": "ok"}
   ```

## Testing

All database operations (repositories, prompts, documents) will be saved to the remote database at `141.19.113.165:5432/appdb`.

### Verify Database Operations

1. **Using Adminer** (http://localhost:8081):
   - System: PostgreSQL
   - Server: `141.19.113.165:5432`
   - Username: `admin`
   - Password: `passwort`
   - Database: `appdb`

2. **Using API**:
   ```bash
   # Create a repository
   curl -X POST http://localhost:8000/repos/enqueue \
     -H "Content-Type: application/json" \
     -d '{"repo_url": "https://github.com/example/test-repo"}'
   
   # List repositories
   curl http://localhost:8000/repos/
   
   # Save a general prompt
   curl -X POST http://localhost:8000/prompts/general \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Test prompt"}'
   
   # Get general prompt
   curl http://localhost:8000/prompts/general
   ```

3. **Verify in Adminer**: After running the API calls above, refresh Adminer and check the `repositories` and `prompts` tables to confirm data was saved.

## Troubleshooting

### Backend can't connect to database

**Symptom**: Error like "could not connect to server" or "connection refused"

**Solutions**:
- Verify the HS server is reachable: `ping 141.19.113.165`
- Check firewall settings
- Verify DATABASE_URL in `.env` is correct
- Check backend logs: `docker-compose logs backend`

### Extensions error on startup

**Symptom**: Warnings about `pgcrypto`, `citext`, or `vector` extensions

**Solution**: This is expected and handled gracefully. The extensions might already exist or the user might not have SUPERUSER privileges to create them. The backend will continue to work.

### Redis connection error

**Symptom**: Celery can't connect to Redis

**Solutions**:
- Ensure Redis is running: `docker-compose up -d redis`
- Or start Redis standalone: `docker run -d -p 6379:6379 redis:7-alpine`

## Reverting to Local Development

If you need to switch back to local development:
1. Checkout the `main` branch: `git checkout main`
2. Restore docker-compose.yml: The `postgres` service will be active again
3. Start Docker containers: `docker-compose up -d`

## Documentation

- See `QUICKSTART_REMOTE_DB.md` for quick start guide
- See `REMOTE_DB_TESTING.md` for detailed testing instructions
- See `IMPLEMENTATION_SUMMARY_DB.md` for German implementation details

## Important Notes

⚠️ **This branch is for testing only**: Do not merge to main until all tests pass
⚠️ **Shared database**: Multiple developers might be using the same external database
⚠️ **Data persistence**: All data is stored on the external HS server, not locally
