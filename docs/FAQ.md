# CaffeineCode - Häufig gestellte Fragen (FAQ)

## 📋 Inhaltsverzeichnis

1. [Allgemeine Fragen](#allgemeine-fragen)
2. [Datenbank & Persistenz](#datenbank--persistenz)
3. [Deployment & Server](#deployment--server)
4. [Netzwerk & Zugriff](#netzwerk--zugriff)
5. [Entwicklung](#entwicklung)
6. [Troubleshooting](#troubleshooting)

---

## Allgemeine Fragen

### Was macht CaffeineCode?

CaffeineCode ist eine Plattform zur automatischen Code-Dokumentation. Sie kann:
- Git-Repositories klonen und analysieren
- Mit KI (Anthropic Claude) Dokumentationen generieren
- Code-Strukturen visualisieren
- Vektor-basierte Code-Suche durchführen (pgvector)

### Welche Technologien werden verwendet?

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: FastAPI (Python 3.12) + SQLAlchemy
- **Datenbank**: PostgreSQL 16 mit pgvector-Extension
- **Task Queue**: Celery + Redis
- **Container**: Docker & Docker Compose
- **KI**: LangChain + Anthropic Claude

---

## Datenbank & Persistenz

### Wie wird die Datenbank gespeichert?

Die Datenbank wird in einem **Docker Volume** gespeichert:

```yaml
volumes:
  postgres_data:  # Named Volume
```

**Was bedeutet das praktisch?**
- Daten bleiben erhalten, auch wenn Container neu gestartet werden
- Speicherort auf Linux: `/var/lib/docker/volumes/postgres_data/_data`
- Speicherort auf Windows/Mac: In der Docker Desktop VM
- Nur löschbar mit `docker-compose down -v` oder `docker volume rm`

### Wo werden geklonte Repositories gespeichert?

Im Volume `./data/repos` (gemountet in Backend-Container):

```yaml
volumes:
  - ./data/repos:/app/data/repos
```

Diese Dateien liegen direkt auf dem Host-System und sind auch ohne Docker zugänglich.

### Wie kann ich ein Backup der Datenbank erstellen?

**Manuelles Backup**:
```bash
# PostgreSQL Container-ID herausfinden
docker ps | grep postgres

# Backup erstellen
docker exec <container_id> pg_dump -U postgres codedoc > backup.sql

# Oder mit docker-compose:
docker-compose exec postgres pg_dump -U postgres codedoc > backup.sql
```

**Backup wiederherstellen**:
```bash
docker-compose exec -T postgres psql -U postgres codedoc < backup.sql
```

**Automatisches Backup**: Siehe [Deployment Guide](./DEPLOYMENT_GUIDE.md#backup--monitoring)

### Kann ich die Datenbank auf einen anderen Server verschieben?

Ja! Zwei Möglichkeiten:

**Option 1: Backup/Restore**
```bash
# Auf Server A: Backup erstellen
docker-compose exec postgres pg_dump -U postgres codedoc > backup.sql

# Zu Server B kopieren
scp backup.sql user@server-b:/path/to/

# Auf Server B: Wiederherstellen
docker-compose exec -T postgres psql -U postgres codedoc < backup.sql
```

**Option 2: Managed Database nutzen**
- AWS RDS
- Azure Database for PostgreSQL
- DigitalOcean Managed Databases

Siehe [Deployment Guide](./DEPLOYMENT_GUIDE.md#datenbank-auf-server-auslagern)

---

## Deployment & Server

### Wie kann ich die Datenbank auf einen Server packen, dass diese durchgehend läuft?

**Empfohlen: Managed Database** (z.B. AWS RDS)

**Vorteile**:
- ✅ Automatische Backups
- ✅ High Availability
- ✅ Automatische Updates
- ✅ 99.9%+ Uptime
- ✅ Monitoring inklusive

**Setup**:
1. PostgreSQL 16 Instanz bei AWS/Azure/DigitalOcean erstellen
2. Extensions aktivieren (pgvector, citext, pgcrypto)
3. `.env` anpassen mit neuer Connection-URL
4. Backend-Container kann überall laufen (auch auf lokalem Server)

**Alternative: Selbst-gehostete PostgreSQL**

Siehe detaillierte Anleitung in [Deployment Guide](./DEPLOYMENT_GUIDE.md#option-2-selbst-gehostete-postgresql-auf-server)

### Wie könnte ich das Backend ebenfalls ausgliedern für ein durchgehendes Funktionieren?

**Option 1: Docker Compose auf Server** (Einfachste Lösung)

```bash
# Auf Server:
git clone https://github.com/sep-thm/CaffeineCode.git
cd CaffeineCode

# .env für Produktion anpassen
nano .env

# Starten
docker-compose -f docker-compose.prod.yml up -d
```

**Option 2: Systemd Services** (Maximale Kontrolle)

Backend als System-Service laufen lassen:
- Automatischer Start beim Booten
- Automatischer Neustart bei Crashes
- Integration in System-Logging

Siehe [Deployment Guide](./DEPLOYMENT_GUIDE.md#option-2-systemd-services-ohne-docker)

**Option 3: Kubernetes** (Für große Deployments)

Skalierbar und hochverfügbar, aber komplexer.

### Was sind die Server-Anforderungen?

**Minimum** (Development/Test):
- 2 GB RAM
- 2 CPU Cores
- 20 GB SSD Storage
- Ubuntu 22.04 LTS

**Empfohlen** (Produktion):
- 4-8 GB RAM
- 4 CPU Cores
- 50-100 GB SSD Storage
- Ubuntu 22.04 LTS
- Schnelle Internetverbindung

### Wie mache ich Updates?

**Mit Docker Compose**:
```bash
# Neue Version holen
git pull

# Images neu bauen
docker-compose build

# Services neu starten
docker-compose up -d
```

**Ohne Downtime** (Blue-Green Deployment):
- Zweiten Server parallel aufsetzen
- Load Balancer umschalten
- Alten Server abschalten

---

## Netzwerk & Zugriff

### Wie kann man von außen auf unser Backend zugreifen?

**Mit Nginx Reverse Proxy + SSL**:

1. **Nginx installieren**:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

2. **Domain-Namen einrichten** (DNS):
```
api.yourdomain.com  →  <Server-IP>
```

3. **Nginx konfigurieren**:
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

4. **SSL-Zertifikat beantragen**:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

**Fertig!** Backend ist jetzt über `https://api.yourdomain.com` erreichbar.

Siehe [Deployment Guide](./DEPLOYMENT_GUIDE.md#externe-zugriffe-ermöglichen)

### Müssen Kunden auch in mein Tailscale?

**NEIN!** Absolut nicht notwendig.

**Tailscale ist nur für Admins/Entwickler sinnvoll**:
- Remote-Server-Zugriff
- Datenbank-Debugging
- Sichere Admin-Interfaces

**Kunden greifen normal über Internet zu**:
```
Kunde → Internet (HTTPS) → Nginx → Backend
```

Genau wie bei jeder normalen Website!

**Hybrid-Ansatz** (Empfohlen):
- **Öffentlich**: Kunden-Interface über `https://app.yourdomain.com`
- **Tailscale**: Admin-Interface über `https://admin.yourdomain.com` (nur für Tailscale-IPs)

Siehe [Deployment Guide](./DEPLOYMENT_GUIDE.md#tailscale-integration)

### Wie schütze ich das Backend vor Missbrauch?

**1. Rate Limiting** (in Nginx):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;
```

**2. API-Authentication** (FastAPI):
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != "SECRET_TOKEN":
        raise HTTPException(status_code=401, detail="Invalid token")
```

**3. CORS richtig konfigurieren**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Nur echte Domain!
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

**4. Firewall** (ufw):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # PostgreSQL nicht öffentlich!
sudo ufw enable
```

---

## Entwicklung

### Wie starte ich das Projekt lokal?

```bash
git clone https://github.com/sep-thm/CaffeineCode.git
cd CaffeineCode
docker-compose up -d
```

Siehe [Quick Start Guide](./QUICK_START.md)

### Wie entwickle ich am Frontend?

**Im Docker-Container** (empfohlen):
```bash
# Code bearbeiten in: src/frontend/
# Vite erkennt Änderungen automatisch (Hot Module Replacement)
docker-compose logs -f frontend
```

**Lokal ohne Docker**:
```bash
cd src/frontend
npm install
npm run dev
```

### Wie entwickle ich am Backend?

**Im Docker-Container** (empfohlen):
```bash
# Code bearbeiten in: src/backend/app/
# Uvicorn reloaded automatisch bei Änderungen
docker-compose logs -f backend
```

**Lokal ohne Docker**:
```bash
cd src/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Wie füge ich eine neue API-Route hinzu?

1. **Router erstellen** (`app/api/routes_example.py`):
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/example", tags=["example"])

@router.get("/")
def get_examples():
    return {"message": "Hello World"}
```

2. **In main.py einbinden**:
```python
from app.api.routes_example import router as example_router

app.include_router(example_router)
```

3. **Testen**:
- http://localhost:8000/api/example
- http://localhost:8000/docs (Swagger UI)

### Wie füge ich eine Datenbank-Tabelle hinzu?

1. **Model definieren** (`app/db/models.py`):
```python
class Example(Base):
    __tablename__ = "examples"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
```

2. **Datenbank neu initialisieren**:
```bash
# Container neu starten (Tabelle wird automatisch erstellt)
docker-compose restart backend
```

**Für Produktions-Migrations**: Nutze Alembic (siehe SQLAlchemy-Dokumentation)

---

## Troubleshooting

### Backend startet nicht

**Symptom**: Container läuft, aber API antwortet nicht

**Lösung**:
```bash
# Logs prüfen
docker-compose logs backend

# Häufige Ursachen:
# - Datenbankverbindung fehlgeschlagen → PostgreSQL-Status prüfen
# - Fehlende Umgebungsvariablen → .env prüfen
# - Port bereits belegt → Port ändern oder Prozess beenden
```

### Celery Worker verarbeitet keine Tasks

**Symptom**: Jobs bleiben in "queued" Status

**Lösung**:
```bash
# Celery-Logs prüfen
docker-compose logs celery

# Redis-Verbindung prüfen
docker-compose exec celery redis-cli -h redis-server ping
# Sollte "PONG" zurückgeben

# Worker neu starten
docker-compose restart celery
```

### Frontend lädt nicht

**Symptom**: Weiße Seite oder "Cannot GET /"

**Lösung**:
```bash
# Logs prüfen
docker-compose logs frontend

# Vite neu starten
docker-compose restart frontend

# node_modules neu installieren
docker-compose exec frontend npm install
```

### Datenbank-Verbindung schlägt fehl

**Symptom**: `OperationalError: could not connect to server`

**Lösung**:
```bash
# PostgreSQL-Status prüfen
docker-compose ps postgres

# Healthcheck-Logs
docker-compose logs postgres | grep "ready to accept connections"

# Verbindung manuell testen
docker-compose exec postgres psql -U postgres -d codedoc -c "SELECT 1"
```

### Docker Volume füllt sich zu schnell

**Symptom**: Kein Speicherplatz mehr

**Lösung**:
```bash
# Volume-Größe prüfen
docker system df -v

# Alte Daten bereinigen
docker system prune -a --volumes

# Spezifisch: Alte Repository-Klone löschen
rm -rf ./data/repos/*
```

---

## Weitere Hilfe

- **[Projekt-Architektur](./PROJEKT_ARCHITEKTUR.md)**: Technische Details
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**: Produktions-Setup
- **[Quick Start](./QUICK_START.md)**: Schnelleinstieg

Bei weiteren Fragen: GitHub Issues erstellen!
