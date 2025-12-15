# Database Schema Mapping Fix

## Problem
The remote PostgreSQL database had a schema with different column names than what the SQLAlchemy models expected, causing this error:

```
psycopg2.errors.UndefinedColumn: column prompt.id does not exist
```

## Root Cause
The remote database uses different column naming conventions:
- Primary keys use `{table}_id` format (e.g., `user_id`, `prompt_id`) instead of just `id`
- Some columns have table-prefixed names (e.g., `user_name`, `repo_description`)

The SQLAlchemy models were configured to expect column names like `id`, `name`, etc., which didn't match the actual database schema.

## Solution (Final)
Updated `/home/runner/work/CaffeineCode/CaffeineCode/src/backend/app/db/models.py` to map Python attributes to the correct database columns:

### User Model
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column("user_id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("user_name", Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
```

### Repo Model
```python
class Repo(Base):
    __tablename__ = "repo"
    id: Mapped[int] = mapped_column("repo_id", Integer, primary_key=True)
    repo_name: Mapped[str] = mapped_column(Text, nullable=False)
    repo_url: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column("repo_description", Text)
    date_of_version: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
```

### Prompt Model
```python
class Prompt(Base):
    __tablename__ = "prompt"
    id: Mapped[int] = mapped_column("prompt_id", Integer, primary_key=True)
    generic_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    specific_prompt: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
    repo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("repo.repo_id", ondelete="CASCADE"))
    docu: Mapped[str | None] = mapped_column(Text)
```

### Template Model
```python
class Template(Base):
    __tablename__ = "template"
    id: Mapped[int] = mapped_column("template_id", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("template_name", Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column("template_description", Text)
```

### History Model (New)
```python
class History(Base):
    __tablename__ = "history"
    id: Mapped[int] = mapped_column("history_id", Integer, primary_key=True)
    prompt_id: Mapped[int | None] = mapped_column(Integer)
    generic_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    specific_prompt: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
    repo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("repo.repo_id", ondelete="CASCADE"))
    docu: Mapped[str | None] = mapped_column(Text)
```

### Key Points
- Python code continues to use `.id`, `.name`, `.description` etc. as attributes
- SQLAlchemy ORM automatically maps these to the correct database columns
- No changes needed in routes, services, or other code that uses the models
- Foreign keys now correctly reference `repo.repo_id` instead of `repo.id`

## How to Apply

### For Local Development
Simply start the backend with your remote database connection:

```bash
cd src/backend
DATABASE_URL=******141.19.113.165:5432/appdb \
CELERY_BROKER_URL=redis://localhost:6379/0 \
USE_MOCK_AUTH=true \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The updated models will automatically work with your existing database schema. No migrations are needed because:
1. The database schema remains unchanged
2. SQLAlchemy models now map correctly to existing columns
3. All Python code continues to work as-is

## What Changed

### Column Mapping Updates

| Model | Python Attribute | Database Column (Old) | Database Column (New) |
|-------|-----------------|----------------------|----------------------|
| User | id | id | user_id |
| User | name | name | user_name |
| User | role | role (nullable) | role (non-nullable) |
| Repo | id | id | repo_id |
| Repo | description | description | repo_description |
| Prompt | id | id | prompt_id |
| Prompt | generic_prompt | generic_prompt (nullable) | generic_prompt (non-nullable) |
| Template | id | id | template_id |
| Template | name | name | template_name |
| Template | description | beschreibung | template_description |

### Foreign Key Updates
- `Prompt.repo_id` now references `repo.repo_id` (was `repo.id`)
- `History.repo_id` now references `repo.repo_id`

### New Model
- Added `History` model to match the external database schema

### Foreign Key Updates
- `Prompt.repo_id` now references `repo.repo_id` (was `repo.id`)
- `History.repo_id` now references `repo.repo_id`

### New Model
- Added `History` model to match the external database schema

## Verification

After starting the backend, verify the migration:

## Verification

After starting the backend, verify the fix works:

```bash
# Check database health
curl http://localhost:8000/health/db
# Expected: {"db": "ok"}

# List documents (this was failing before)
curl http://localhost:8000/docs/list
# Expected: [] or list of documents (not 500 error)

# Check repositories
curl http://localhost:8000/repos/list
# Expected: [] or list of repositories (not 500 error)
```

## Related Files Changed
- `/home/runner/work/CaffeineCode/CaffeineCode/src/backend/app/db/models.py`

## Testing
The model updates have been validated to:
- ✓ Map all Python attributes to correct database columns
- ✓ Support the external database schema with `{table}_id` column names
- ✓ Work with existing code without changes
- ✓ Handle foreign key references correctly
- ✓ Import successfully and allow app to start
