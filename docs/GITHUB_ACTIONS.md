# GitHub Actions für CaffeineCode

Dieses Dokument erklärt die GitHub Actions Workflows, die für automatisierte Tests und Qualitätssicherung eingerichtet wurden.

## Übersicht

Das Projekt verwendet mehrere GitHub Actions Workflows für automatisierte Tests:

### 1. **CI Workflow** (`ci.yml`)
- **Trigger**: Bei jedem Push/PR auf `main` oder `develop`
- **Zweck**: Schnelle Syntax- und Lint-Checks
- **Läuft**:
  - Backend: Python Syntax-Check mit flake8
  - Frontend: ESLint für Code-Qualität

### 2. **Backend Tests** (`backend-tests.yml`)
- **Trigger**: Bei Änderungen in `src/backend/**`
- **Services**: PostgreSQL (pgvector), Redis
- **Läuft**:
  - Flake8 Linting
  - Pytest mit Coverage-Report
- **Umgebung**: Python 3.12, PostgreSQL 16, Redis 7

### 3. **Frontend Tests** (`frontend-tests.yml`)
- **Trigger**: Bei Änderungen in `src/frontend/**`
- **Läuft**:
  - ESLint Linting
  - Build-Test (Vite)
  - Überprüfung der Build-Ausgabe
- **Umgebung**: Node.js 20

### 4. **Docker Build** (`docker-build.yml`)
- **Trigger**: Bei Änderungen an Dockerfiles oder docker-compose.yml
- **Läuft**:
  - Backend Docker Image Build
  - Frontend Docker Image Build
- **Zweck**: Sicherstellen, dass Container erfolgreich gebaut werden

## Workflows im Detail

### Backend Tests Workflow

```yaml
# Läuft bei Änderungen in src/backend/
# Startet PostgreSQL und Redis als Services
# Führt Tests mit pytest aus
```

**Was wird getestet:**
- API Endpoints (Health Checks, Root)
- Datenbankverbindungen
- Code-Qualität mit flake8

**Services:**
- PostgreSQL 16 mit pgvector Extension
- Redis 7 für Celery

### Frontend Tests Workflow

```yaml
# Läuft bei Änderungen in src/frontend/
# Installiert Dependencies und baut die Anwendung
```

**Was wird getestet:**
- ESLint Code-Qualität
- Build-Prozess mit Vite
- Erfolgreiche Erstellung des dist-Verzeichnisses

### Docker Build Workflow

```yaml
# Läuft bei Änderungen an Dockerfiles
# Baut beide Container (Backend & Frontend)
```

**Was wird getestet:**
- Docker Image Build für Backend
- Docker Image Build für Frontend
- Verwendet Build-Cache für schnellere Builds

## Lokale Entwicklung

### Schneller Pre-Push Check

Führe alle Checks lokal aus, bevor du pushst:

```bash
# Im Repository-Root
./scripts/pre-push-check.sh
```

Dieses Script führt alle wichtigen Checks aus, die auch in CI laufen würden.

### Backend Tests lokal ausführen

```bash
# In das Backend-Verzeichnis wechseln
cd src/backend

# Entwicklungs-Dependencies installieren
pip install -r requirements-dev.txt

# Tests ausführen
pytest

# Tests mit Coverage
pytest --cov=app --cov-report=html

# Nur schnelle Tests
pytest -m "not slow"

# Linting
flake8 .
```

### Frontend Tests lokal ausführen

```bash
# In das Frontend-Verzeichnis wechseln
cd src/frontend

# Dependencies installieren
npm install

# Linting
npm run lint

# Build testen
npm run build
```

## Umgebungsvariablen für Tests

Die folgenden Umgebungsvariablen werden in den CI-Tests verwendet:

```bash
DATABASE_URL=postgresql://testuser:testpass@localhost:5432/testdb
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
SECRET_KEY=test-secret-key-for-ci
ANTHROPIC_API_KEY=sk-test-key
```

## Neue Tests hinzufügen

### Backend (Python/pytest)

1. Erstelle eine neue Datei in `src/backend/tests/`
2. Dateiname muss mit `test_` beginnen
3. Verwende die Fixtures aus `conftest.py`:

```python
def test_my_feature(client):
    """Test description"""
    response = client.get("/api/endpoint")
    assert response.status_code == 200
```

### Frontend (JavaScript)

1. Erstelle eine `.test.jsx` oder `.spec.jsx` Datei
2. Nutze ein Test-Framework wie Jest oder Vitest (noch zu implementieren)

## Workflow-Status

Die Workflows erscheinen als Checks auf Pull Requests:
- ✅ Grün: Alle Tests bestanden
- ❌ Rot: Tests fehlgeschlagen
- 🟡 Gelb: Workflow läuft

## Best Practices

1. **Führe Tests lokal aus** bevor du pushst
2. **Kleine, fokussierte Tests** schreiben
3. **Test-Namen sollten beschreibend sein**
4. **Mocking verwenden** für externe Services (API-Calls, etc.)
5. **Coverage hoch halten** (Ziel: >80%)

## Fehlersuche

### Backend Tests schlagen fehl

```bash
# Prüfe die Logs im GitHub Actions Tab
# Lokale Reproduktion:
cd src/backend
pytest -v --tb=short

# Datenbankprobleme:
docker-compose up -d postgres
pytest
```

### Frontend Build schlägt fehl

```bash
# Lokale Reproduktion:
cd src/frontend
npm ci  # Clean install
npm run build

# ESLint Fehler beheben:
npm run lint -- --fix
```

### Docker Build schlägt fehl

```bash
# Lokale Reproduktion:
docker build -t test-backend ./src/backend
docker build -t test-frontend ./src/frontend

# Logs prüfen für spezifische Fehler
```

## Zukünftige Erweiterungen

Geplante Verbesserungen:
- [ ] Integration Tests mit vollständigem Docker Compose Stack
- [ ] E2E Tests mit Playwright oder Cypress
- [ ] Security Scanning (Dependabot, CodeQL)
- [ ] Performance Tests
- [ ] Automatisches Deployment bei erfolgreichen Tests
- [ ] Test-Coverage Badges im README

## Monitoring und Metriken

- **Test-Coverage**: Wird zu Codecov hochgeladen (optional)
- **Build-Zeit**: Siehe GitHub Actions Logs
- **Erfolgsrate**: GitHub Actions History

## Weitere Ressourcen

- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [pytest Dokumentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Vite Build](https://vitejs.dev/guide/build.html)
