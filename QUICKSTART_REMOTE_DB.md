# Quick Start: Remote Database Testing

Fast guide to test the backend against the remote HS PostgreSQL database.

## 🚀 Quick Setup (3 Steps)

### 1. Stop Local Database
```bash
docker-compose down postgres
```

### 2. Start Backend with Remote DB
```bash
cd src/backend
DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb \
CELERY_BROKER_URL=redis://localhost:6379/0 \
USE_MOCK_AUTH=true \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Test Connection
```bash
curl http://localhost:8000/health/db
# Expected: {"db": "ok"}
```

## ✅ Quick Test

```bash
# Health check
curl http://localhost:8000/health

# Database health
curl http://localhost:8000/health/db

# List repositories
curl http://localhost:8000/repos/

# API documentation
open http://localhost:8000/docs
```

## 📝 Alternative: Use .env.test

```bash
# Copy and configure
cp .env.test .env.local

# Start backend
cd src/backend
export $(cat ../../.env.local | xargs)
uvicorn app.main:app --reload
```

## 🔧 PyCharm Setup

**Environment Variables**:
```
DATABASE_URL=postgresql+psycopg2://admin:passwort@141.19.113.165:5432/appdb
CELERY_BROKER_URL=redis://localhost:6379/0
USE_MOCK_AUTH=true
```

## 📚 Full Documentation

- **English**: See `REMOTE_DB_TESTING.md`
- **German**: See `IMPLEMENTATION_SUMMARY_DB.md`

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused | Check firewall/network access |
| Port in use | Use different port: `--port 8001` |
| Extension errors | Extensions need to be created on remote DB |
| Wrong driver | Use `postgresql+psycopg2://` not `postgresql+psycopg://` |

## ⚠️ Important Notes

- Always stop local PostgreSQL container first
- Use `psycopg2` driver for remote connections
- Keep Redis running locally for Celery
- Never commit `.env.test` or credentials

## 🎯 Testing Checklist

Quick verification after starting:
- [ ] `/health` returns OK
- [ ] `/health/db` returns OK
- [ ] Can list repositories
- [ ] Can create repository (via API docs)
- [ ] API documentation accessible at `/docs`

---

**Need more details?** Check the full documentation files mentioned above.
