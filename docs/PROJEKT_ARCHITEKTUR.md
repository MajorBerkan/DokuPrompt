# CaffeineCode - Projekt-Architektur und Funktionsweise

## 📋 Inhaltsverzeichnis

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Architektur-Überblick](#architektur-überblick)
3. [Komponenten im Detail](#komponenten-im-detail)
4. [Wie wird die Datenbank gespeichert?](#wie-wird-die-datenbank-gespeichert)
5. [Wie wird alles gestartet?](#wie-wird-alles-gestartet)
6. [Datenfluss und Interaktionen](#datenfluss-und-interaktionen)

---

## Projekt-Übersicht

**CaffeineCode** ist eine Code-Dokumentations-Plattform, die Repositories automatisch klonen, analysieren und mit KI-gestützten Dokumentationen versehen kann.

### Technologie-Stack

- **Backend**: FastAPI (Python 3.12)
- **Datenbank**: PostgreSQL 16 mit pgvector-Extension (für Vektorsuche)
- **Cache/Queue**: Redis 7
- **Task Queue**: Celery (für asynchrone Background-Jobs)
- **Frontend**: React + Vite
- **Container**: Docker & Docker Compose
- **KI-Integration**: LangChain + Anthropic Claude

---

## Architektur-Überblick

Das System folgt einer **Microservices-Architektur** mit folgenden Hauptkomponenten:

```
┌─────────────────────────────────────────────────────────────┐
│                         Docker Network                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ Frontend │────▶│ Backend  │────▶│PostgreSQL│            │
│  │  (React) │     │ (FastAPI)│     │   +      │            │
│  │  :5173   │     │  :8000   │     │ pgvector │            │
│  └──────────┘     └────┬─────┘     │  :5432   │            │
│                        │            └──────────┘            │
│                        │                                     │
│                        │            ┌──────────┐            │
│                        └───────────▶│  Redis   │            │
│                        │            │  :6379   │            │
│                        │            └─────┬────┘            │
│                        │                  │                 │
│                   ┌────▼─────┐            │                 │
│                   │  Celery  │◀───────────┘                 │
│                   │  Worker  │                              │
│                   └──────────┘                              │
│                                                               │
│  ┌──────────┐                                               │
│  │ Adminer  │  (DB-Management UI)                          │
│  │  :8081   │                                               │
│  └──────────┘                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Komponenten im Detail

### 1. **PostgreSQL Datenbank** (Port 5432)

**Image**: `pgvector/pgvector:pg16`

#### Funktionen:
- Speichert alle Anwendungsdaten persistent
- Nutzt **pgvector** Extension für Vektor-Embeddings (KI-gestützte Suche)
- Nutzt **citext** für case-insensitive Text
- Nutzt **pgcrypto** für Verschlüsselung

#### Datenbank-Schema:

**Haupttabellen**:
- `users` - Benutzer mit Entra-ID-Integration
- `repositories` - Geklonte Git-Repositories
- `repo_clones` - Clone-Job-Status und -Historie
- `prompts` - KI-Prompt-Templates
- `prompt_runs` - Ausgeführte Prompt-Jobs
- `documents` - Generierte Dokumentationen
- `document_files` - Dokumentationsdateien
- `user_repo_roles` - Zugriffsberechtigungen

#### Konfiguration:
```env
POSTGRES_DB=codedoc
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
```

---

### 2. **Backend (FastAPI)** (Port 8000)

**Technologie**: Python 3.12, FastAPI, SQLAlchemy, Uvicorn

#### Hauptaufgaben:
- REST-API für Frontend
- Datenbank-Operationen (CRUD)
- Git-Repository-Management
- KI-Integration (LangChain + Anthropic)
- Job-Scheduling (Celery-Tasks anstoßen)

#### API-Routen:
- `/` - Root & Healthcheck
- `/health` - Systemstatus
- `/health/db` - Datenbankverbindung prüfen
- `/api/repos/*` - Repository-Management
- `/api/ai/*` - KI-gestützte Funktionen
- `/api/prompts/*` - Prompt-Verwaltung
- `/api/docs/*` - Dokumentations-API

#### Wichtige Module:
- `app/main.py` - FastAPI-Anwendung & Startup
- `app/database.py` - Datenbank-Connection
- `app/db/models.py` - SQLAlchemy-Modelle
- `app/db/init_db.py` - DB-Initialisierung
- `app/services/` - Business-Logik
- `app/api/` - API-Routen

---

### 3. **Redis** (Port 6379)

**Image**: `redis:7-alpine`

#### Funktionen:
- **Message Broker** für Celery (Task-Queue)
- **Result Backend** für Celery (Job-Ergebnisse)
- Cache für Session-Daten (optional)

---

### 4. **Celery Worker**

**Technologie**: Celery + Redis

#### Aufgaben:
- **Asynchrone Background-Jobs**:
  - Git-Repository klonen
  - Repository analysieren
  - KI-Dokumentation generieren
  - Große Datenverarbeitungen

#### Warum Celery?
- Lange laufende Tasks blockieren nicht das Backend
- Retry-Mechanismus bei Fehlern
- Status-Tracking von Jobs
- Skalierbar (mehrere Worker möglich)

#### Konfiguration:
```python
celery_app = Celery(
    "codedoc_worker",
    broker="redis://redis-server:6379/0",
    backend="redis://redis-server:6379/0"
)
```

---

### 5. **Frontend (React + Vite)** (Port 5173)

**Technologie**: React, Vite, TailwindCSS

#### Funktionen:
- Single-Page-Application (SPA)
- Benutzeroberfläche für:
  - Repository-Verwaltung
  - Dokumentations-Ansicht
  - Prompt-Editor
  - Job-Monitoring

#### Hot-Reload:
- Vite Dev-Server mit `--host` flag für Docker
- `CHOKIDAR_USEPOLLING=true` für File-Watching in Docker

---

### 6. **Adminer** (Port 8081)

**Image**: `adminer:latest`

#### Funktionen:
- Web-basiertes Datenbank-Management-Tool
- Direkter Zugriff auf PostgreSQL
- Nützlich für:
  - Schema-Inspektion
  - Daten-Debugging
  - SQL-Queries ausführen

---

## Wie wird die Datenbank gespeichert?

### Persistenz-Mechanismus

Die Datenbank wird durch **Docker Volumes** persistent gespeichert:

```yaml
volumes:
  postgres_data:  # Named Volume
```

#### Was bedeutet das?

1. **Named Volume `postgres_data`**:
   - Docker erstellt ein Volume auf dem Host-System
   - Speicherort (Linux): `/var/lib/docker/volumes/postgres_data/_data`
   - Speicherort (Windows/Mac): In der Docker Desktop VM

2. **Gemountet in Container**:
   ```yaml
   volumes:
     - postgres_data:/var/lib/postgresql/data
   ```
   - PostgreSQL schreibt alle Daten in `/var/lib/postgresql/data`
   - Dieses Verzeichnis ist mit dem Host-Volume verbunden

3. **Persistenz garantiert**:
   - Daten bleiben erhalten, auch wenn Container gestoppt/gelöscht werden
   - Nur durch `docker-compose down -v` oder `docker volume rm` löschbar

### Datenbank-Initialisierung

Beim ersten Start:

```python
# app/db/init_db.py
def init_db():
    # 1. PostgreSQL-Extensions aktivieren
    init_extensions()  # pgvector, citext, pgcrypto
    
    # 2. Schema erstellen (Tabellen, Indizes)
    Base.metadata.create_all(bind=engine)
```

**SQLAlchemy** erstellt automatisch alle Tabellen basierend auf den Models in `app/db/models.py`.

---

## Wie wird alles gestartet?

### Start-Prozess mit Docker Compose

#### Befehl:
```bash
docker-compose up -d
```

#### Ablauf:

1. **Docker Compose liest `docker-compose.yml`**
   - Erstellt Docker-Netzwerk für alle Services
   - Erstellt Volumes (`postgres_data`, `frontend_node_modules`)

2. **Services werden in Abhängigkeitsreihenfolge gestartet**:

   **Phase 1: Basis-Services**
   ```
   ┌─────────────┐     ┌─────────────┐
   │ PostgreSQL  │     │   Redis     │
   │  (startup)  │     │  (startup)  │
   └──────┬──────┘     └──────┬──────┘
          │                   │
          ▼ (healthcheck)     ▼
       [HEALTHY]          [STARTED]
   ```

   - **PostgreSQL**: Startet und führt Healthcheck aus
     ```yaml
     healthcheck:
       test: ["CMD-SHELL", "pg_isready -U postgres"]
       interval: 5s
     ```
   - **Redis**: Startet (kein Healthcheck nötig)

   **Phase 2: Backend-Services** (warten auf PostgreSQL + Redis)
   ```
   ┌─────────────┐     ┌─────────────┐
   │   Backend   │     │   Celery    │
   │  :8000      │     │   Worker    │
   └──────┬──────┘     └──────┬──────┘
          │                   │
          ▼                   ▼
    init_db()            Wartet auf Jobs
   ```

   - **Backend**:
     - `depends_on` wartet auf PostgreSQL (healthy) und Redis (started)
     - Führt `init_db()` aus (Extensions + Schema)
     - Startet Uvicorn: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   
   - **Celery Worker**:
     - `depends_on` wartet auf PostgreSQL (healthy) und Redis (started)
     - Startet Worker: `celery -A app.worker.celery_app.celery_app worker`

   **Phase 3: Frontend & Tools** (warten auf Backend)
   ```
   ┌─────────────┐     ┌─────────────┐
   │  Frontend   │     │   Adminer   │
   │  :5173      │     │   :8081     │
   └─────────────┘     └─────────────┘
   ```

   - **Frontend**:
     - `depends_on` wartet auf Backend
     - Führt `npm install` aus
     - Startet Vite: `npm run dev -- --host`
   
   - **Adminer**:
     - `depends_on` wartet auf PostgreSQL
     - Web-UI unter `http://localhost:8081`

3. **Netzwerk-Verbindungen werden hergestellt**:
   - Alle Container können sich über Service-Namen ansprechen
   - z.B. Backend → `postgres://postgres:5432`
   - z.B. Backend → `redis://redis-server:6379`

4. **Ports werden auf Host gemappt**:
   - Frontend: `localhost:5173`
   - Backend: `localhost:8000`
   - PostgreSQL: `localhost:5432`
   - Redis: `localhost:6379`
   - Adminer: `localhost:8081`

### Start-Logs anzeigen:

```bash
# Alle Logs live anzeigen
docker-compose logs -f

# Nur Backend-Logs
docker-compose logs -f backend

# Nur Celery-Logs
docker-compose logs -f celery
```

### Services einzeln neu starten:

```bash
# Backend neu starten
docker-compose restart backend

# Celery neu starten
docker-compose restart celery

# Alle Services neu starten
docker-compose restart
```

### Komplett stoppen:

```bash
# Services stoppen (Daten bleiben erhalten)
docker-compose down

# Services stoppen + Volumes löschen (Daten werden gelöscht!)
docker-compose down -v
```

---

## Datenfluss und Interaktionen

### Beispiel: Repository klonen

1. **Benutzer klickt "Repository hinzufügen"** im Frontend
   ```
   Frontend → POST /api/repos
   ```

2. **Backend erstellt Repository-Eintrag**
   ```python
   # In PostgreSQL:
   INSERT INTO repositories (name, remote_url, status)
   VALUES ('my-repo', 'https://github.com/...', 'pending')
   ```

3. **Backend startet Celery-Task**
   ```python
   from app.worker.tasks_git import clone_repository
   
   task = clone_repository.delay(repo_id=repo.id)
   # Task wird in Redis-Queue geschrieben
   ```

4. **Celery Worker holt Task aus Redis**
   ```python
   # Worker führt aus:
   def clone_repository(repo_id):
       repo = db.query(Repository).get(repo_id)
       repo.status = "cloning"
       
       # Git-Clone durchführen
       git.Repo.clone_from(repo.remote_url, repo.target_dir)
       
       repo.status = "cloned"
       db.commit()
   ```

5. **Frontend zeigt Status**
   ```
   Frontend → GET /api/repos/{id}
   Backend → {"status": "cloned", ...}
   ```

### Beispiel: KI-Dokumentation generieren

1. **Benutzer wählt Repository und Prompt**
2. **Backend startet Celery-Task**
   ```python
   from app.worker.tasks_ai import generate_documentation
   
   task = generate_documentation.delay(
       repo_id=repo.id,
       prompt_id=prompt.id
   )
   ```

3. **Celery Worker**:
   - Lädt Repository-Code
   - Lädt Prompt-Template
   - Ruft LangChain + Claude API auf
   - Speichert generierte Dokumentation in PostgreSQL + Dateisystem

4. **Frontend zeigt Dokumentation**

---

## Umgebungsvariablen

Alle Konfigurationen sind in `.env`:

```env
# Datenbank
POSTGRES_DB=codedoc
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/codedoc

# Celery / Redis
CELERY_BROKER_URL=redis://redis-server:6379/0
CELERY_RESULT_BACKEND=redis://redis-server:6379/0

# Frontend
VITE_API_BASE_URL=http://127.0.0.1:8000

# KI
MODEL_NAME=eu.anthropic.claude-sonnet-4-20250514-v1:0
ANTHROPIC_API_KEY=sk-...
```

---

## Nächste Schritte

Siehe [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) für:
- Produktions-Deployment auf Server
- Externe Zugriffsmöglichkeiten
- Tailscale-Integration
- SSL/TLS-Konfiguration
- Backup-Strategien
