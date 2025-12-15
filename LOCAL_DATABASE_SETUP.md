# Local Database Setup Guide

## Overview
This document describes the configuration for running a local PostgreSQL database with pgvector extension in Docker. This replaces the previous external database connection.

## Changes Made

### 1. Database Schema
Created initial database schema in `migrations/000_init_schema.sql` with:
- **users** table: Stores user information (name, email, role)
- **repo** table: Stores repository information (name, URL, description, version date)
- **prompt** table: Stores prompts and generated documentation
- **template** table: Stores prompt templates

### 2. Docker Compose Configuration (docker-compose.yml)

#### Enabled Local PostgreSQL Service
```yaml
postgres:
  image: pgvector/pgvector:pg16
  container_name: codedoc-postgres
  restart: unless-stopped
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./migrations:/docker-entrypoint-initdb.d
```

**Key Features:**
- Uses `pgvector/pgvector:pg16` image (PostgreSQL 16 with pgvector extension)
- Mounts `migrations/` directory to `/docker-entrypoint-initdb.d` for automatic initialization
- Includes health check to ensure database is ready before starting dependent services
- Backend and Celery services now wait for postgres to be healthy

#### Re-enabled postgres_data Volume
```yaml
volumes:
  postgres_data:
  frontend_node_modules:
```

### 3. Environment Configuration (.env)
Updated database connection settings:
```env
POSTGRES_HOST=postgres          # Changed from 100.82.208.68
POSTGRES_PORT=5432              # Changed from 5433
DATABASE_URL=postgresql+psycopg://CaffeineCode:password@postgres:5432/codedoc
```

### 4. Python Models (src/backend/app/db/models.py)
Updated models to match the database schema:
- Fixed User table name from "user" to "users"
- Added `created_at` field to User model
- Added Template model for prompt templates

## Database Connection Details

- **Host**: postgres (Docker service name)
- **Port**: 5432
- **Database**: codedoc
- **User**: CaffeineCode
- **Password**: password

## Required PostgreSQL Extensions

The following extensions are automatically created by the application's `init_db()` function on startup:
- `pgcrypto`
- `citext`
- `vector` (pgvector)

## Usage

### Starting the Database

```bash
# Start only the database
docker compose up -d postgres

# Start all services (database will start first and wait until healthy)
docker compose up -d
```

### Checking Database Status

```bash
# View database logs
docker compose logs postgres

# Connect to database
docker compose exec postgres psql -U CaffeineCode -d codedoc

# List tables
docker compose exec postgres psql -U CaffeineCode -d codedoc -c "\dt"

# Check installed extensions
docker compose exec postgres psql -U CaffeineCode -d codedoc -c "\dx"
```

### Verifying the Connection

```bash
# Check backend health
curl http://localhost:8000/health/db
# Expected response: {"db": "ok"}
```

### Accessing Database via Adminer

Adminer is available at http://localhost:8081:
- **System**: PostgreSQL
- **Server**: postgres:5432
- **Username**: CaffeineCode
- **Password**: password
- **Database**: codedoc

## Data Persistence

Database data is stored in the Docker volume `postgres_data`:

```bash
# List volumes
docker volume ls | grep postgres

# Inspect volume
docker volume inspect caffeinecode_postgres_data

# Remove volume (WARNING: This deletes all data!)
docker compose down -v
```

## Database Initialization

When the postgres container starts for the first time:

1. PostgreSQL initializes the database cluster
2. Creates the database specified in `POSTGRES_DB`
3. Runs SQL scripts from `/docker-entrypoint-initdb.d` in alphabetical order:
   - `0000_create_role.sql` - Creates the CaffeineCode role and grants privileges
   - `000_init_schema.sql` - Creates tables and sequences
   - `001_add_repository_description.sql` - Migration (already handled by init schema)

## Current Database State

As of initialization, all tables are empty:
- users: 0 records
- repo: 0 records
- prompt: 0 records
- template: 0 records

## Migration from External Database

If you need to migrate data from the external database:

1. Export data from external database:
```bash
pg_dump -h 100.82.208.68 -p 5433 -U CaffeineCode -d codedoc --data-only > data_export.sql
```

2. Import data to local database:
```bash
docker compose exec -T postgres psql -U CaffeineCode -d codedoc < data_export.sql
```

## Reverting to External Database

If you need to revert to the external database:

1. Update `.env`:
   ```env
   POSTGRES_HOST=100.82.208.68
   POSTGRES_PORT=5433
   DATABASE_URL=postgresql+psycopg://CaffeineCode:password@100.82.208.68:5433/codedoc
   ```

2. Comment out the postgres service in `docker-compose.yml`

3. Remove postgres dependencies from backend and celery services

4. Restart services:
   ```bash
   docker compose down
   docker compose up -d
   ```

## Troubleshooting

### Port Already in Use
If port 5432 is already in use, change the port mapping in docker-compose.yml:
```yaml
ports:
  - "5433:5432"  # Map to different host port
```

### Database Not Initializing
Check logs for initialization errors:
```bash
docker compose logs postgres
```

### Connection Refused
Ensure the postgres service is healthy:
```bash
docker compose ps postgres
```

### Permission Issues
Ensure the postgres_data volume has correct permissions:
```bash
docker compose down
docker volume rm caffeinecode_postgres_data
docker compose up -d postgres
```
