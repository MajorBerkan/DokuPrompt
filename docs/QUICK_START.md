# CaffeineCode - Quick Start Guide

## 🚀 Schnellstart (Lokale Entwicklung)

### Voraussetzungen

- **Docker** und **Docker Compose** installiert
- **Git** installiert
- Mindestens **4 GB RAM** verfügbar

### 1. Repository klonen

```bash
git clone https://github.com/sep-thm/CaffeineCode.git
cd CaffeineCode
```

### 2. Umgebungsvariablen prüfen

Die Datei `.env` ist bereits konfiguriert. Für Entwicklung sind die Standard-Werte ausreichend:

```env
POSTGRES_DB=codedoc
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
# ... weitere Konfigurationen
```

**⚠️ Wichtig**: Ändere `ANTHROPIC_API_KEY` wenn du KI-Features nutzen willst!

### 3. Anwendung starten

```bash
# Alle Services starten
docker-compose up -d

# Logs live anzeigen
docker-compose logs -f
```

**Das war's!** Nach ~1-2 Minuten sind alle Services bereit.

### 4. Anwendung öffnen

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Dokumentation**: http://localhost:8000/docs
- **Datenbank-Admin (Adminer)**: http://localhost:8081
  - System: PostgreSQL
  - Server: postgres
  - Benutzer: postgres
  - Passwort: postgres
  - Datenbank: codedoc

### 5. Entwickeln

Alle Änderungen am Code werden automatisch erkannt (Hot Reload):

- **Frontend**: Vite Dev Server mit Hot Module Replacement
- **Backend**: Uvicorn mit `--reload` Flag

```bash
# Backend-Code bearbeiten
nano src/backend/app/main.py

# Frontend-Code bearbeiten
nano src/frontend/src/App.jsx

# Änderungen werden automatisch übernommen!
```

### 6. Stoppen

```bash
# Alle Services stoppen (Daten bleiben erhalten)
docker-compose down

# Services stoppen + Datenbank löschen
docker-compose down -v
```

---

## 🔧 Häufige Befehle

### Services verwalten

```bash
# Status aller Services
docker-compose ps

# Einzelnen Service neu starten
docker-compose restart backend
docker-compose restart frontend

# Logs eines Services anzeigen
docker-compose logs backend
docker-compose logs celery

# In Container-Shell einsteigen
docker-compose exec backend bash
docker-compose exec postgres psql -U postgres -d codedoc
```

### Datenbank zurücksetzen

```bash
# Alle Daten löschen und neu starten
docker-compose down -v
docker-compose up -d
```

### Backend-Tests ausführen

```bash
# In Backend-Container
docker-compose exec backend pytest

# Oder lokal mit Python-Umgebung
cd src/backend
python -m pytest
```

---

## 🐛 Troubleshooting

### Port bereits belegt

**Problem**: `Error: Port 5432/8000/5173 is already in use`

**Lösung**:
```bash
# Port-Nutzung prüfen
sudo lsof -i :5432
sudo lsof -i :8000

# Prozess beenden oder Ports in docker-compose.yml ändern
```

### Container startet nicht

**Problem**: Backend/Celery startet nicht

**Lösung**:
```bash
# Logs prüfen
docker-compose logs backend
docker-compose logs celery

# Oft hilft Neustart
docker-compose restart backend celery
```

### Datenbank-Verbindungsfehler

**Problem**: `OperationalError: could not connect to server`

**Lösung**:
```bash
# PostgreSQL Status prüfen
docker-compose ps postgres

# Healthcheck warten
docker-compose logs postgres

# Datenbank neu starten
docker-compose restart postgres
```

### Frontend zeigt weiße Seite

**Problem**: Frontend lädt nicht

**Lösung**:
```bash
# Logs prüfen
docker-compose logs frontend

# node_modules neu installieren
docker-compose exec frontend npm install

# Frontend neu bauen
docker-compose restart frontend
```

---

## 📚 Weitere Dokumentation

- **[Projekt-Architektur](./PROJEKT_ARCHITEKTUR.md)**: Wie funktioniert das System?
- **[Deployment-Guide](./DEPLOYMENT_GUIDE.md)**: Wie bringe ich es auf einen Server?

---

## 🆘 Support

Bei Problemen:

1. Prüfe Logs: `docker-compose logs -f`
2. Schaue in die [Fehlersammlung](../Fehlersammlung) (falls vorhanden)
3. Erstelle ein Issue auf GitHub
