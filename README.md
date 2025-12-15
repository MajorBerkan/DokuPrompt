# CaffeineCode

[![CI](https://github.com/sep-thm/CaffeineCode/actions/workflows/ci.yml/badge.svg)](https://github.com/sep-thm/CaffeineCode/actions/workflows/ci.yml)
[![Backend Tests](https://github.com/sep-thm/CaffeineCode/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/sep-thm/CaffeineCode/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/sep-thm/CaffeineCode/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/sep-thm/CaffeineCode/actions/workflows/frontend-tests.yml)

Eine Code-Dokumentations-Plattform mit KI-gestützter Analyse und automatischer Dokumentationsgenerierung.

## 🚀 Quick Start

```bash
# Repository klonen
git clone https://github.com/sep-thm/CaffeineCode.git
cd CaffeineCode

# Alle Services starten
docker-compose up -d

# Anwendung öffnen
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
# Adminer (DB): http://localhost:8081
```

Siehe [Quick Start Guide](./docs/QUICK_START.md) für Details.

## 📚 Dokumentation

> **📖 [Vollständiger Dokumentations-Index](./docs/INDEX.md)** - Übersicht aller verfügbaren Dokumentationen

### Für Entwickler & Verständnis

- **[Quick Start Guide](./docs/QUICK_START.md)** - Schnell loslegen mit der Entwicklung
- **[Code Quality](./CODE_QUALITY.md)** - 📊 Test-Coverage-Metriken und Qualitätsziele
- **[Mock Authentication](./docs/MOCK_AUTH.md)** - 🔧 Demo-Authentifizierung für Entwicklung (aktuell aktiviert)
- **[Azure Entra ID Setup](./docs/ENTRA_ID_SETUP.md)** - Authentifizierung mit Azure Entra ID konfigurieren
- **[Projekt-Architektur](./docs/PROJEKT_ARCHITEKTUR.md)** - Detaillierte Erklärung wie das System funktioniert:
  - Wie wird die Datenbank gespeichert?
  - Wie wird alles gestartet?
  - Wie interagieren die Komponenten?
  - Datenfluss und Beispiele
- **[System Overview](./docs/SYSTEM_OVERVIEW.md)** - Visuelle Diagramme und Architektur-Übersicht
- **[FAQ](./docs/FAQ.md)** - Häufig gestellte Fragen und Lösungen
- **[GitHub Actions](./docs/GITHUB_ACTIONS.md)** - Automatisierte Tests und CI/CD Pipeline
- **[Job Troubleshooting](./docs/JOB_TROUBLESHOOTING.md)** - Diagnose und Behebung von Job-Problemen

### Für Deployment & Produktion

- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Produktions-Deployment:
  - Datenbank auf Server auslagern
  - Backend auf Server auslagern
  - Externe Zugriffe ermöglichen
  - Tailscale-Integration
  - SSL/TLS-Konfiguration
  - Backup & Monitoring

## 🏗️ Architektur

```
Frontend (React)  →  Backend (FastAPI)  →  PostgreSQL + pgvector
                           ↓
                     Celery Worker  →  Redis
```

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: FastAPI (Python 3.12) + SQLAlchemy
- **Datenbank**: PostgreSQL 16 mit pgvector für KI-Features
- **Task Queue**: Celery + Redis für asynchrone Jobs
- **KI**: LangChain + Anthropic Claude

## 🔧 Entwicklung

### Voraussetzungen

- Docker & Docker Compose
- Git
- 4+ GB RAM

### Services

| Service | Port | Beschreibung |
|---------|------|--------------|
| Frontend | 5173 | React Development Server |
| Backend | 8000 | FastAPI REST API |
| PostgreSQL | 5432 | Datenbank |
| Redis | 6379 | Message Broker & Cache |
| Adminer | 8081 | Datenbank-Management UI |

### Häufige Befehle

```bash
# Logs anzeigen
docker-compose logs -f

# Service neu starten
docker-compose restart backend

# In Container-Shell einsteigen
docker-compose exec backend bash

# Datenbank zurücksetzen
docker-compose down -v && docker-compose up -d
```

## Frontend Testing
Befehl: cd src/frontend
npx vitest run oder npx vitest run [pfad], optional mit --ui

E2E Tests: npx playwright test optional mit --ui
Codegen wenn im ordner frontend, im TERMINAL: 
  1. npm run dev
  2. npx playwright codegen --save-storage=tests/e2e/auth.json --output tests/e2e/generated-login.spec.js http://localhost:5173/






## 🚢 Deployment

Für Produktions-Deployment siehe [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

Kurz zusammengefasst:
- Managed PostgreSQL (AWS RDS, Azure, etc.)
- Docker Compose auf Server oder Kubernetes
- Nginx als Reverse Proxy mit SSL
- Optional: Tailscale für Admin-Zugriff

## 📄 Lizenz

[Hier Lizenz einfügen]

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📧 Kontakt

[Kontaktinformationen hier einfügen]
