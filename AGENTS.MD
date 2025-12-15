# CaffeineCode - Agent Context Guide

This document provides essential context for AI coding assistants (like GitHub Copilot) to effectively understand and contribute to the CaffeineCode project.

## 🎯 Project Overview

**CaffeineCode** is an AI-powered code documentation platform that automatically clones, analyzes, and documents Git repositories using Claude AI via LangChain.

### Key Capabilities
- Clone and manage Git repositories
- Generate AI-powered documentation using custom prompts
- Store and retrieve documentation with vector embeddings (pgvector)
- Asynchronous task processing for long-running operations
- Dark mode support with system preference detection

## 🏗️ Architecture

### Technology Stack

**Backend:**
- FastAPI (Python 3.12) - REST API
- SQLAlchemy 2.0+ - ORM with async support
- PostgreSQL 16 with pgvector - Database and vector search
- Celery + Redis - Asynchronous task queue
- LangChain + Anthropic Claude - AI integration
- GitPython - Git operations
- Uvicorn - ASGI server

**Frontend:**
- React 18 - UI framework
- Vite 7 - Build tool and dev server
- TailwindCSS 3.4 - Styling
- React Router 7 - Navigation
- Marked.js - Markdown rendering
- Highlight.js - Code syntax highlighting

**Infrastructure:**
- Docker & Docker Compose - Containerization
- Redis 7 - Message broker and cache
- Adminer - Database management UI

### System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│ PostgreSQL  │
│  (React)    │     │  (FastAPI)  │     │ + pgvector  │
│  :5173      │     │   :8000     │     │   :5432     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           │            ┌─────────────┐
                           └───────────▶│    Redis    │
                           │            │   :6379     │
                      ┌────▼─────┐      └──────┬──────┘
                      │  Celery  │◀────────────┘
                      │  Worker  │
                      └──────────┘
```

## 📁 Project Structure

```
CaffeineCode/
├── src/
│   ├── backend/              # Python FastAPI application
│   │   ├── app/
│   │   │   ├── main.py       # FastAPI app initialization
│   │   │   ├── database.py   # Database session management
│   │   │   ├── api/          # API route handlers
│   │   │   │   ├── routes_repo.py      # Repository management
│   │   │   │   ├── routes_ai.py        # AI operations
│   │   │   │   ├── routes_prompts.py   # Prompt management
│   │   │   │   ├── routes_docs.py      # Documentation endpoints
│   │   │   │   └── routes_health.py    # Health checks
│   │   │   ├── db/           # Database models and init
│   │   │   │   ├── models.py          # SQLAlchemy models
│   │   │   │   ├── init_db.py         # DB initialization
│   │   │   │   └── migrations.py      # Schema migrations
│   │   │   ├── services/     # Business logic services
│   │   │   │   └── ai_service.py      # AI/LLM integration
│   │   │   ├── worker/       # Celery tasks
│   │   │   │   ├── celery_app.py      # Celery configuration
│   │   │   │   ├── tasks_git.py       # Git operations
│   │   │   │   └── tasks_ai.py        # AI tasks
│   │   │   └── core/         # Core utilities
│   │   │       └── config.py          # Settings management
│   │   ├── requirements.txt  # Python dependencies
│   │   └── Dockerfile
│   │
│   └── frontend/             # React application
│       ├── App.jsx           # Main app component
│       ├── main.jsx          # Entry point
│       ├── components/       # React components
│       │   ├── TopBar.jsx
│       │   ├── SideBar.jsx
│       │   ├── ShowRepoInformation.jsx
│       │   ├── DocumentationViewWrapper.jsx
│       │   └── ...
│       ├── pages/            # Page components
│       │   └── AdminRepoPage.jsx
│       ├── lib/              # Utilities
│       │   └── api.js        # API client functions
│       ├── package.json
│       └── Dockerfile
│
├── docs/                     # Documentation
│   ├── QUICK_START.md
│   ├── PROJEKT_ARCHITEKTUR.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── ...
│
├── migrations/               # SQL migrations
│   └── 001_add_repository_description.sql
│
├── docker-compose.yml        # Service orchestration
├── .env                      # Environment variables
├── README.md
└── AGENTS.MD                # This file
```

## 🗄️ Database Schema

### Key Models (SQLAlchemy)

**Enums:**
```python
class RepoStatus(PyEnum):
    pending = "pending"
    cloning = "cloning"
    cloned = "cloned"
    indexing = "indexing"
    documented = "documented"
    error = "error"

class JobStatus(PyEnum):
    queued = "queued"
    running = "running"
    success = "success"
    failure = "failure"

class DocStatus(PyEnum):
    creating = "creating"
    ready = "ready"
    error = "error"

class RepoRole(PyEnum):
    owner = "owner"
    maintainer = "maintainer"
    writer = "writer"
    reader = "reader"
```

**Repository** (`repositories` table)
- `id` (UUID) - Primary key
- `name` (String) - Repository name
- `remote_url` (String) - Git clone URL
- `description` (Text, nullable) - User-provided description
- `target_dir` (String) - Local clone path
- `default_branch` (String, nullable) - Main branch name
- `head_commit` (String, nullable) - Current commit SHA
- `size_bytes` (BigInteger, nullable) - Repository size
- `status` (RepoStatus) - Clone/processing status
- `is_archived` (Boolean) - Soft delete flag
- `created_by` (UUID, nullable) - Foreign key to User
- `created_at`, `updated_at` (DateTime)

**User** (`users` table)
- `id` (UUID) - Primary key
- `entra_object_id` (String, nullable, unique) - Azure AD integration
- `email` (CITEXT, nullable, unique) - User email
- `display_name` (String, nullable) - Display name
- `is_active` (Boolean) - Account status
- `created_at`, `last_login_at` (DateTime)

**Prompt** (`prompts` table)
- `id` (UUID) - Primary key
- `repo_id` (UUID) - Foreign key to Repository
- `prompt_text` (Text) - Custom prompt for documentation
- `is_generic` (Boolean) - Generic vs. repo-specific
- `created_at`, `updated_at` (DateTime)

**Document** (`documents` table)
- `id` (UUID) - Primary key
- `repo_id` (UUID) - Foreign key to Repository
- `prompt_id` (UUID) - Foreign key to Prompt
- `content` (Text) - Generated documentation
- `embedding` (Vector) - pgvector embedding for semantic search
- `status` (DocStatus) - Document generation status
- `created_at`, `updated_at` (DateTime)

**DocumentFile** (`document_files` table)
- Stores individual documentation files
- Links to Document with `document_id`

**RepoClone** (`repo_clones` table)
- `id` (UUID) - Primary key
- `repo_id` (UUID) - Foreign key to Repository
- `task_id` (String, nullable) - Celery task ID
- `status` (JobStatus) - Clone job status
- `message` (String, nullable) - Status/error message
- `started_at`, `finished_at` (DateTime)

**UserRepoRole** (`user_repo_roles` table)
- Junction table for user permissions
- Links Users to Repositories with specific roles

## 🔌 API Endpoints

### Repository Management (`/api/repos/`)
- `GET /repos/list` - List all repositories with descriptions and specific prompts
- `POST /repos/add` - Add a new repository
- `POST /repos/update` - Update repository name/description
- `DELETE /repos/delete/{repo_id}` - Delete a repository
- `POST /repos/clone` - Trigger repository clone (Celery task)

### AI Operations (`/api/ai/`)
- `POST /ai/generate-docs` - Generate documentation (Celery task)
- `GET /ai/task-status/{task_id}` - Check task status

### Prompts (`/api/prompts/`)
- `GET /prompts/list` - List all prompts
- `POST /prompts/create` - Create new prompt
- `PUT /prompts/update/{prompt_id}` - Update prompt
- `DELETE /prompts/delete/{prompt_id}` - Delete prompt

### Documentation (`/api/docs/`)
- `GET /docs/list` - List all documents
- `GET /docs/{doc_id}` - Get specific document

### Health Checks
- `GET /` - API info
- `GET /health` - General health check
- `GET /health/db` - Database connectivity check

## 🎨 Frontend Patterns

### State Management
- React useState for local component state
- Props drilling for global state (repos, documents)
- Refresh triggers for data reloading (`reposRefreshTrigger`, `docsRefreshTrigger`)

### API Integration
All API calls are centralized in `src/frontend/lib/api.js`:

```javascript
// Example: Fetching repositories
export async function listRepos() {
  const response = await fetch(`${BASE_URL}/repos/list`);
  return response.json();
}

// Example: Updating repository
export async function updateRepo(repo_id, name, description) {
  const response = await fetch(`${BASE_URL}/repos/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id, name, description }),
  });
  return response.json();
}
```

### Component Patterns
- Use functional components with hooks
- TailwindCSS for styling with dark mode support (`dark:` prefix)
- Modal overlays for settings and prompts
- Conditional rendering based on state

### Dark Mode
- System preference detection via `window.matchMedia('(prefers-color-scheme: dark)')`
- Manual toggle with localStorage persistence
- Applied via `dark` class on root element

## 🔧 Development Workflows

### Starting the Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart celery
```

### Making Backend Changes

1. Edit Python files in `src/backend/app/`
2. Backend auto-reloads with `--reload` flag
3. Check logs: `docker-compose logs -f backend`
4. Test API at http://localhost:8000/docs

### Making Frontend Changes

1. Edit React files in `src/frontend/`
2. Vite hot-reloads automatically
3. Check browser console for errors
4. Test at http://localhost:5173

### Database Changes

1. Modify models in `src/backend/app/db/models.py`
2. Create migration in `migrations/` directory
3. Update `src/backend/app/db/migrations.py` if needed
4. Restart backend: `docker-compose restart backend`

### Adding New Dependencies

**Backend:**
```bash
# Add to requirements.txt
echo "new-package==1.0.0" >> src/backend/requirements.txt

# Rebuild container
docker-compose up -d --build backend
```

**Frontend:**
```bash
# Add via npm (runs in container)
docker-compose exec frontend npm install package-name

# Or add to package.json and restart
docker-compose restart frontend
```

## 📝 Code Style and Conventions

### Python (Backend)

**Naming:**
- Classes: `PascalCase` (e.g., `Repository`, `DocumentFile`)
- Functions/Variables: `snake_case` (e.g., `get_repo_by_id`, `repo_list`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`, `MAX_RETRIES`)

**Structure:**
- Type hints for function parameters and returns
- Pydantic models for request/response validation
- Dependency injection for database sessions
- Docstrings for complex functions

**Example:**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()

@router.get("/repos/list")
def list_repositories(db: Session = Depends(get_db)):
    """List all repositories with their metadata."""
    repos = db.query(Repository).all()
    return [repo_to_dict(repo) for repo in repos]
```

### JavaScript/React (Frontend)

**Naming:**
- Components: `PascalCase` (e.g., `TopBar.jsx`, `ShowRepoInformation.jsx`)
- Functions/Variables: `camelCase` (e.g., `loadRepos`, `handleSave`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `BASE_URL`, `LS_KEY`)

**Structure:**
- Functional components with hooks
- Props destructuring in function parameters
- Early returns for conditional rendering
- Centralized API calls in `lib/api.js`

**ESLint Configuration:**
- Based on `@eslint/js` recommended rules
- React Hooks plugin for hooks best practices
- React Refresh plugin for Vite HMR
- Unused variables allowed if they start with uppercase or underscore
- ECMAScript latest with JSX support

**Example:**
```javascript
import { useState, useEffect } from "react";
import { listRepos } from "../lib/api.js";

function RepoList() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    try {
      const data = await listRepos();
      setRepos(data);
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      {repos.map(repo => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Manual Testing Checklist

**Repository Operations:**
- [ ] Add repository → Should appear in list after cloning
- [ ] Edit repository info → Should persist after page refresh
- [ ] Delete repository → Should remove from UI and database
- [ ] Check clone status → Should update during cloning process

**Documentation Generation:**
- [ ] Generate docs → Should create task and complete
- [ ] View documentation → Should render with proper formatting
- [ ] Edit specific prompt → Should persist and affect generation
- [ ] Check task status → Should show progress/completion

**UI/UX:**
- [ ] Dark mode toggle → Should switch themes and persist
- [ ] Search functionality → Should filter documentation
- [ ] Responsive design → Should work on different screen sizes

### Database Testing

```bash
# Access database
docker-compose exec postgres psql -U postgres -d codedoc

# Common queries
\dt                                    # List tables
\d repositories                        # Describe table
SELECT * FROM repositories LIMIT 10;   # Query data
```

### API Testing

```bash
# Using curl
curl http://localhost:8000/health
curl http://localhost:8000/repos/list

# Using httpie
http :8000/health
http :8000/repos/list

# Using the interactive docs
# Visit http://localhost:8000/docs
```

### Code Quality

**Linting:**
```bash
# Frontend linting
docker-compose exec frontend npm run lint

# Fix linting issues automatically (if available)
docker-compose exec frontend npm run lint:fix
```

**Note:** No automated tests are currently configured in the project. Testing is primarily manual using the methods described above.

## 🔍 Common Tasks

### Adding a New API Endpoint

1. **Create/Edit route file** in `src/backend/app/api/`
   ```python
   @router.get("/my-new-endpoint")
   def my_endpoint(db: Session = Depends(get_db)):
       return {"message": "Hello"}
   ```

2. **Register router** in `src/backend/app/main.py`
   ```python
   from app.api.my_routes import router as my_router
   app.include_router(my_router)
   ```

3. **Add API client function** in `src/frontend/lib/api.js`
   ```javascript
   export async function myNewEndpoint() {
     const response = await fetch(`${BASE_URL}/my-new-endpoint`);
     return response.json();
   }
   ```

### Adding a New Database Field

1. **Update model** in `src/backend/app/db/models.py`
   ```python
   class Repository(Base):
       # ... existing fields ...
       new_field: Mapped[str | None] = mapped_column(String)
   ```

2. **Create migration** in `migrations/`
   ```sql
   -- 00X_add_new_field.sql
   ALTER TABLE repositories 
   ADD COLUMN IF NOT EXISTS new_field VARCHAR;
   ```

3. **Update migration runner** in `src/backend/app/db/migrations.py`

4. **Restart backend** to apply migration
   ```bash
   docker-compose restart backend
   ```

### Adding a New React Component

1. **Create component** in `src/frontend/components/`
   ```javascript
   // MyComponent.jsx
   function MyComponent({ prop1, prop2 }) {
     return (
       <div className="p-4 bg-white dark:bg-gray-800">
         {/* Component content */}
       </div>
     );
   }
   
   export default MyComponent;
   ```

2. **Import and use** in parent component
   ```javascript
   import MyComponent from "./components/MyComponent.jsx";
   
   function Parent() {
     return <MyComponent prop1="value" prop2={data} />;
   }
   ```

### Adding a Celery Task

1. **Define task** in appropriate file in `src/backend/app/worker/`
   ```python
   from app.worker.celery_app import celery_app
   
   @celery_app.task
   def my_background_task(param1, param2):
       # Long-running operation
       return {"status": "completed"}
   ```

2. **Trigger from API endpoint**
   ```python
   from app.worker.tasks_ai import my_background_task
   
   @router.post("/trigger-task")
   def trigger_task(data: TaskRequest):
       task = my_background_task.delay(data.param1, data.param2)
       return {"task_id": task.id}
   ```

3. **Check task status**
   ```python
   from celery.result import AsyncResult
   
   task_result = AsyncResult(task_id, app=celery_app)
   status = task_result.status  # PENDING, SUCCESS, FAILURE
   ```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Check if PostgreSQL is running: `docker-compose ps`
- Verify database credentials in `.env`
- Check migrations: `docker-compose logs backend | grep migration`

**Frontend Not Loading:**
- Check if backend is running: `curl http://localhost:8000/health`
- Verify VITE_API_BASE_URL in `.env.docker`
- Check browser console for CORS errors

**Celery Tasks Not Running:**
- Verify Redis is running: `docker-compose ps redis`
- Check Celery logs: `docker-compose logs -f celery`
- Ensure task is registered in Celery app

**Hot Reload Not Working:**
- Check file watching: `CHOKIDAR_USEPOLLING=true` in frontend
- Verify volume mounts in `docker-compose.yml`
- Restart the container: `docker-compose restart frontend`

**Network/Firewall Issues (CI/CD, Testing):**
- **Symptom**: Connection blocked to external services (e.g., `llm.srvext.ncoindev.net`)
- **Common in**: GitHub Actions, pytest with coverage, CI/CD pipelines
- **Root Cause**: Firewall rules block external network calls during testing
- **Solutions**:
  - Mock external API calls in tests (recommended)
  - Configure GitHub Actions setup steps to run before firewall is enabled
  - Add required hosts to repository's allowlist (admin only)
  - Use environment variable checks to skip external calls in test mode
  - Ensure `.env` file is loaded before Pydantic `BaseSettings` initialization
- **Example Fix**: Force set `DATABASE_URL` to `sqlite:///.:memory:` before app imports in test configuration
- **Reference**: Check `conftest.py` for proper environment variable ordering

### Debug Commands

```bash
# Check all service status
docker-compose ps

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f celery
docker-compose logs -f frontend

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d

# Check database schema
docker-compose exec postgres psql -U postgres -d codedoc -c "\d repositories"

# Monitor Celery tasks
docker-compose exec celery celery -A app.worker.celery_app.celery_app inspect active
```

### CI/CD and GitHub Actions Issues

**Firewall Blocking External Connections:**

When running tests in GitHub Actions or other CI/CD environments, you may encounter firewall warnings like:
```
⚠️ Warning
Firewall rules blocked me from connecting to one or more addresses
llm.srvext.ncoindev.net
```

**Why this happens:**
- GitHub Actions enables firewall rules that block external network calls during test execution
- This is a security feature to prevent unauthorized network access
- The issue typically occurs when pytest runs with coverage reporting

**Solutions:**

1. **Mock External Services (Recommended)**
   ```python
   # In conftest.py or test files
   import pytest
   from unittest.mock import Mock, patch
   
   @pytest.fixture
   def mock_llm_service():
       with patch('app.services.ai_service.call_external_llm') as mock:
           mock.return_value = {"response": "mocked"}
           yield mock
   ```

2. **Environment Variable Configuration**
   ```python
   # In conftest.py - Set variables BEFORE importing app modules
   import os
   os.environ['DATABASE_URL'] = 'sqlite:///.:memory:'
   os.environ['SKIP_EXTERNAL_CALLS'] = 'true'
   
   # Now import app modules
   from app.main import app
   ```

3. **Conditional External Calls**
   ```python
   # In your service code
   import os
   
   def call_external_service():
       if os.getenv('SKIP_EXTERNAL_CALLS') == 'true':
           return mock_response()
       return actual_external_call()
   ```

4. **GitHub Actions Configuration**
   ```yaml
   # In .github/workflows/test.yml
   - name: Run tests
     env:
       SKIP_EXTERNAL_CALLS: "true"
       DATABASE_URL: "sqlite:///.:memory:"
     run: pytest --cov=app --cov-report=term
   ```

**For Admins Only:**
- Add required URLs to repository's Copilot coding agent settings allowlist
- Configure Actions setup steps to run before firewall is enabled

**Best Practice:**
Always mock external dependencies in tests to ensure:
- Tests run consistently across all environments
- Tests don't depend on external service availability
- Tests run faster without network calls
- CI/CD pipelines work reliably

## 🔒 Security Considerations

### Current Implementation
- CORS configured for localhost development
- No authentication/authorization (planned feature)
- SQL injection prevented by SQLAlchemy ORM
- Input validation via Pydantic models
- XSS prevention through React's built-in escaping

### Production Considerations (Future)
- Add authentication (Entra ID integration available)
- Implement API rate limiting
- Use HTTPS/TLS for all connections
- Sanitize user inputs before display
- Implement role-based access control (RBAC)
- Secure environment variables management

## 📚 Related Documentation

- **[README.md](./README.md)** - Project overview and quick start
- **[PROJEKT_ARCHITEKTUR.md](./docs/PROJEKT_ARCHITEKTUR.md)** - Detailed architecture (German)
- **[QUICK_START.md](./docs/QUICK_START.md)** - Development setup guide (German)
- **[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Production deployment (German)
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Database migration issues
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Recent changes summary

## 🤖 AI Assistant Tips

When contributing to this project:

1. **Understand the context:** Review the relevant section above before making changes
2. **Follow patterns:** Match existing code style and structure
3. **Test incrementally:** Make small changes and verify they work
4. **Check both sides:** Frontend changes often require backend updates and vice versa
5. **Mind the database:** Schema changes require migrations
6. **Consider async operations:** Long-running tasks should use Celery
7. **Document changes:** Update relevant documentation when adding features
8. **Respect conventions:** Use established naming patterns and file structure
9. **Think about errors:** Add proper error handling and user feedback
10. **Keep it minimal:** Make the smallest changes necessary to accomplish the goal

## 🔄 Recent Changes

### Latest Features
- Repository description field with persistence (Issue #121)
- Improved documentation formatting with LLM instructions
- Automatic database migrations on startup
- Dark mode with system preference detection
- Specific prompt persistence across page refreshes

### Known Limitations
- No character limit on description field
- No duplicate repository name validation
- No frontend input sanitization for HTML display
- Authentication not yet implemented

## 📬 Need Help?

If you need additional information or context:
- Check the issue tracker on GitHub
- Review the docs/ directory for detailed documentation
- Check docker-compose logs for runtime errors
- Use the Adminer UI at http://localhost:8081 for database inspection
- Review TROUBLESHOOTING.md for common issues

---

**Last Updated:** 2025-01-14
**Project Language:** Mixed (German documentation, English code)
**Maintained By:** sep-thm organization
