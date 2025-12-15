# CaffeineCode - Deployment & Server-Betrieb Guide

## 📋 Inhaltsverzeichnis

1. [Datenbank auf Server auslagern](#datenbank-auf-server-auslagern)
2. [Backend auf Server auslagern](#backend-auf-server-auslagern)
3. [Externe Zugriffe ermöglichen](#externe-zugriffe-ermöglichen)
4. [Tailscale-Integration](#tailscale-integration)
5. [Produktions-Setup](#produktions-setup)
6. [Backup & Monitoring](#backup--monitoring)

---

## Datenbank auf Server auslagern

### Option 1: Managed Database (Empfohlen für Produktion)

Nutze einen **Managed PostgreSQL Service**:

#### Cloud-Anbieter:
- **AWS RDS** (PostgreSQL)
- **Azure Database for PostgreSQL**
- **Google Cloud SQL**
- **DigitalOcean Managed Databases**
- **Supabase** (spezialisiert auf PostgreSQL)

#### Vorteile:
✅ Automatische Backups
✅ High Availability
✅ Automatische Updates
✅ Monitoring & Alerting
✅ Skalierbar
✅ Keine Server-Verwaltung nötig

#### Setup-Schritte:

1. **PostgreSQL-Instanz erstellen** (z.B. AWS RDS)
   ```
   - Engine: PostgreSQL 16
   - Instanz-Typ: z.B. db.t3.micro (für Start)
   - Storage: 20 GB SSD (Auto-Scaling aktivieren)
   - Public Access: NEIN (Sicherheit!)
   - VPC: Eigenes VPC mit Backend-Server
   ```

2. **Extensions aktivieren** (nach Erstellung)
   ```sql
   -- Als Superuser verbinden und Extensions aktivieren
   CREATE EXTENSION IF NOT EXISTS pgvector;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS citext;
   ```

3. **Umgebungsvariablen anpassen** (`.env`)
   ```env
   # Managed Database Connection
   POSTGRES_HOST=your-db.region.rds.amazonaws.com
   POSTGRES_PORT=5432
   POSTGRES_DB=codedoc
   POSTGRES_USER=admin
   POSTGRES_PASSWORD=SECURE_PASSWORD_HERE
   
   DATABASE_URL=postgresql+psycopg://admin:SECURE_PASSWORD_HERE@your-db.region.rds.amazonaws.com:5432/codedoc
   ```

4. **Security Groups / Firewall konfigurieren**
   - Nur Backend-Server darf auf Port 5432 zugreifen
   - Kein öffentlicher Zugriff!

---

### Option 2: Selbst-gehostete PostgreSQL auf Server

#### Server-Anforderungen:
- **OS**: Ubuntu 22.04 LTS oder Debian 12
- **RAM**: Mindestens 2 GB (besser 4+ GB)
- **Storage**: SSD mit mindestens 50 GB
- **CPU**: 2+ Cores

#### Installation auf Ubuntu Server:

```bash
# 1. Server aktualisieren
sudo apt update && sudo apt upgrade -y

# 2. PostgreSQL 16 + pgvector installieren
sudo apt install -y postgresql-16 postgresql-contrib-16

# pgvector Extension kompilieren (falls nicht verfügbar)
sudo apt install -y build-essential git postgresql-server-dev-16
cd /tmp
git clone --branch v0.5.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# 3. PostgreSQL konfigurieren
sudo -u postgres psql

-- In psql:
CREATE DATABASE codedoc;
CREATE USER codedoc_user WITH PASSWORD 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE codedoc TO codedoc_user;

-- Extensions aktivieren
\c codedoc
CREATE EXTENSION pgvector;
CREATE EXTENSION pgcrypto;
CREATE EXTENSION citext;

\q

# 4. PostgreSQL für Remote-Zugriff konfigurieren
sudo nano /etc/postgresql/16/main/postgresql.conf
# Ändern: listen_addresses = '*'

sudo nano /etc/postgresql/16/main/pg_hba.conf
# Hinzufügen (Backend-Server IP):
# host    codedoc    codedoc_user    <BACKEND_IP>/32    scram-sha-256

# 5. PostgreSQL neu starten
sudo systemctl restart postgresql
sudo systemctl enable postgresql

# 6. Firewall konfigurieren (nur Backend-Server erlauben)
sudo ufw allow from <BACKEND_IP> to any port 5432
sudo ufw enable
```

#### Backup-Strategie:

```bash
# Automatisches Backup-Script erstellen
sudo nano /usr/local/bin/backup-postgres.sh
```

```bash
#!/bin/bash
# PostgreSQL Backup Script

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="codedoc"

mkdir -p $BACKUP_DIR

# Backup erstellen
pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

```bash
# Ausführbar machen
sudo chmod +x /usr/local/bin/backup-postgres.sh

# Cronjob für tägliches Backup (3 Uhr nachts)
sudo crontab -e
# Hinzufügen:
0 3 * * * /usr/local/bin/backup-postgres.sh
```

---

## Backend auf Server auslagern

### Option 1: Docker Compose auf Server (Einfachste Lösung)

#### Server-Anforderungen:
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4+ GB
- **Storage**: 50+ GB SSD
- **CPU**: 2+ Cores
- **Docker**: Docker & Docker Compose installiert

#### Setup-Schritte:

```bash
# 1. Server vorbereiten
sudo apt update && sudo apt upgrade -y

# 2. Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Docker Compose installieren
sudo apt install docker-compose-plugin -y

# 4. Projekt auf Server klonen
git clone https://github.com/sep-thm/CaffeineCode.git
cd CaffeineCode

# 5. .env für Produktion anpassen
nano .env
```

**Produktions-`.env`**:
```env
# Datenbank (externe PostgreSQL)
POSTGRES_HOST=your-db-server.com
POSTGRES_PORT=5432
POSTGRES_DB=codedoc
POSTGRES_USER=codedoc_user
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE

DATABASE_URL=postgresql+psycopg://codedoc_user:SECURE_PASSWORD_HERE@your-db-server.com:5432/codedoc

# Celery / Redis (lokaler Redis im Docker)
CELERY_BROKER_URL=redis://redis-server:6379/0
CELERY_RESULT_BACKEND=redis://redis-server:6379/0

# Frontend (Server-IP oder Domain)
VITE_API_BASE_URL=https://api.yourdomain.com

# KI
MODEL_NAME=eu.anthropic.claude-sonnet-4-20250514-v1:0
ANTHROPIC_API_KEY=YOUR_REAL_API_KEY
```

**Produktions-`docker-compose.yml`** anpassen:

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    container_name: redis-server
    restart: always
    ports:
      - "127.0.0.1:6379:6379"  # Nur lokal erreichbar

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile.prod  # Siehe unten
    container_name: backend
    restart: always
    env_file:
      - ./.env
    volumes:
      - ./data/repos:/app/data/repos
    depends_on:
      - redis
    ports:
      - "127.0.0.1:8000:8000"  # Nur lokal (Nginx Reverse Proxy)

  celery:
    build:
      context: ./src/backend
      dockerfile: Dockerfile.prod
    container_name: celery
    restart: always
    env_file:
      - ./.env
    volumes:
      - ./data/repos:/app/data/repos
    depends_on:
      - redis
    command: celery -A app.worker.celery_app.celery_app worker --loglevel=INFO

  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile.prod  # Siehe unten
    container_name: frontend
    restart: always
    ports:
      - "127.0.0.1:80:80"  # Nur lokal (Nginx Reverse Proxy)

volumes:
  # postgres_data nicht mehr nötig (externe DB)
```

**Produktions-Dockerfile für Backend** (`src/backend/Dockerfile.prod`):

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git build-essential libpq-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Produktions-Modus (ohne --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Produktions-Dockerfile für Frontend** (`src/frontend/Dockerfile.prod`):

```dockerfile
# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-optional

COPY . .

# Produktions-Build
RUN npm run build

# Production Stage (Nginx)
FROM nginx:alpine

# Build-Artefakte kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx-Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Frontend `nginx.conf`** (`src/frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA-Routing (alle Routen → index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Caching für statische Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 6. Starten
docker compose -f docker-compose.prod.yml up -d

# 7. Logs prüfen
docker compose -f docker-compose.prod.yml logs -f
```

---

### Option 2: Systemd Services (Ohne Docker)

Für maximale Performance und Kontrolle:

```bash
# 1. Python-Umgebung vorbereiten
sudo apt install python3.12 python3.12-venv python3-pip

# 2. Anwendungsverzeichnis
sudo mkdir -p /opt/caffeinecode
sudo chown $USER:$USER /opt/caffeinecode

# 3. Backend installieren
cd /opt/caffeinecode
python3.12 -m venv venv
source venv/bin/activate
pip install -r src/backend/requirements.txt

# 4. Systemd Service für Backend
sudo nano /etc/systemd/system/caffeinecode-backend.service
```

```ini
[Unit]
Description=CaffeineCode Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/caffeinecode/src/backend
Environment="PATH=/opt/caffeinecode/venv/bin"
EnvironmentFile=/opt/caffeinecode/.env
ExecStart=/opt/caffeinecode/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 5. Systemd Service für Celery
sudo nano /etc/systemd/system/caffeinecode-celery.service
```

```ini
[Unit]
Description=CaffeineCode Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/caffeinecode/src/backend
Environment="PATH=/opt/caffeinecode/venv/bin"
EnvironmentFile=/opt/caffeinecode/.env
ExecStart=/opt/caffeinecode/venv/bin/celery -A app.worker.celery_app.celery_app worker --loglevel=INFO
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 6. Services aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable caffeinecode-backend
sudo systemctl enable caffeinecode-celery
sudo systemctl start caffeinecode-backend
sudo systemctl start caffeinecode-celery

# 7. Status prüfen
sudo systemctl status caffeinecode-backend
sudo systemctl status caffeinecode-celery
```

---

## Externe Zugriffe ermöglichen

### Reverse Proxy mit Nginx

#### Nginx installieren und konfigurieren:

```bash
# 1. Nginx installieren
sudo apt install nginx -y

# 2. SSL-Zertifikat mit Let's Encrypt (kostenlos)
sudo apt install certbot python3-certbot-nginx -y

# 3. Nginx-Konfiguration für CaffeineCode
sudo nano /etc/nginx/sites-available/caffeinecode
```

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Backend API
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # SSL-Sicherheit
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
    
    # Backend Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket-Support (falls benötigt)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts für lange Requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTPS Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Frontend Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:5173;  # Oder :80 bei Prod-Build
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 4. Konfiguration aktivieren
sudo ln -s /etc/nginx/sites-available/caffeinecode /etc/nginx/sites-enabled/

# 5. SSL-Zertifikat beantragen
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# 6. Nginx neu starten
sudo nginx -t  # Syntax prüfen
sudo systemctl restart nginx
sudo systemctl enable nginx

# 7. Firewall konfigurieren
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### DNS-Einträge:

Erstelle bei deinem DNS-Provider (z.B. Cloudflare, AWS Route53):

```
yourdomain.com         A      <SERVER_IP>
www.yourdomain.com     A      <SERVER_IP>
api.yourdomain.com     A      <SERVER_IP>
```

---

## Tailscale-Integration

### Müssen Kunden in dein Tailscale?

**NEIN!** Tailscale ist **nur für Entwickler/Admins** sinnvoll.

### Szenario 1: Öffentlicher Zugriff (Empfohlen für Kunden)

**Kunden greifen über Internet zu**:
```
Kunde → Internet → Nginx (Port 443) → Backend/Frontend
```

✅ Keine Tailscale-Installation beim Kunden nötig
✅ Normale HTTPS-Verschlüsselung
✅ Standard-Webzugriff wie jede Website

**Setup**: Nutze Nginx Reverse Proxy (siehe oben)

---

### Szenario 2: Tailscale für Admins/Entwickler (Dev/Test)

**Tailscale-VPN für sichere Admin-Zugriffe**:

```bash
# 1. Tailscale auf Server installieren
curl -fsSL https://tailscale.com/install.sh | sh

# 2. Tailscale anmelden
sudo tailscale up

# 3. Server-IP in Tailscale anzeigen
tailscale ip -4
# Beispiel: 100.64.0.5

# 4. Zugriff über Tailscale-IP
# - Backend: http://100.64.0.5:8000
# - PostgreSQL: 100.64.0.5:5432 (für Adminer)
# - SSH: ssh user@100.64.0.5
```

**Vorteile**:
✅ Sichere Admin-Zugriffe ohne öffentliche Ports
✅ Direkte Datenbankverbindung für Debugging
✅ Kein VPN-Setup auf Firmen-Infrastruktur nötig

**Wann nutzen?**:
- Remote-Entwicklung
- Datenbank-Management
- Server-Administration
- Debugging

---

### Szenario 3: Hybrid (Öffentlich + Tailscale)

**Am besten für Produktion**:

```nginx
# Nginx-Konfiguration mit IP-Whitelisting

# Öffentlicher Zugriff für Kunden
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;
    
    # Normale API-Zugriffe
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
    }
}

# Admin-Interface nur für Tailscale-IPs
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;
    
    # Nur Tailscale-Netzwerk erlauben (100.64.0.0/10)
    allow 100.64.0.0/10;
    deny all;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

---

## Produktions-Setup Checkliste

### Sicherheit

- [ ] **PostgreSQL**: Nur Backend-Server-Zugriff
- [ ] **Redis**: Nur lokal (127.0.0.1) oder internes Netzwerk
- [ ] **Firewall**: Nur Ports 80 + 443 öffentlich
- [ ] **SSL/TLS**: Let's Encrypt Zertifikate aktiv
- [ ] **Secrets**: Starke Passwörter in `.env`
- [ ] **Secrets**: `.env` nicht in Git committen
- [ ] **Rate Limiting**: Nginx Rate Limits aktiv
- [ ] **CORS**: Nur erlaubte Domains in FastAPI

### Performance

- [ ] **Backend**: Uvicorn mit Gunicorn + mehreren Workern
  ```bash
  gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
  ```
- [ ] **Frontend**: Produktions-Build (npm run build)
- [ ] **PostgreSQL**: Connection Pool konfigurieren
- [ ] **Celery**: Mehrere Worker für parallele Jobs
- [ ] **Redis**: Persistence aktivieren (RDB + AOF)

### Monitoring

```bash
# Prometheus + Grafana für Monitoring
docker run -d --name prometheus -p 9090:9090 prom/prometheus
docker run -d --name grafana -p 3000:3000 grafana/grafana
```

### Logging

```python
# Backend: Logging konfigurieren (app/core/config.py)
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/caffeinecode/backend.log'),
        logging.StreamHandler()
    ]
)
```

---

## Backup & Monitoring

### Automatisches Backup

**PostgreSQL**:
```bash
# Siehe Backup-Script oben
# Zusätzlich: Offsite-Backup zu S3
aws s3 sync /var/backups/postgresql/ s3://my-backup-bucket/postgresql/
```

**Volumes & Dateien**:
```bash
# Docker Volumes sichern
docker run --rm -v postgres_data:/data -v /backup:/backup ubuntu tar czf /backup/postgres_data.tar.gz /data

# Repository-Daten sichern
rsync -av /opt/caffeinecode/data/repos/ /backup/repos/
```

### Monitoring-Setup

**Uptime-Monitoring** (UptimeRobot, Pingdom):
- https://yourdomain.com/health
- https://api.yourdomain.com/health

**Log-Aggregation** (ELK-Stack, Loki):
```bash
# Loki + Grafana für Logs
docker run -d --name=loki -p 3100:3100 grafana/loki
```

---

## Zusammenfassung

### Empfohlene Architektur für Produktion:

```
┌─────────────────────────────────────────────────────────┐
│                        Internet                         │
└────────────┬────────────────────────────────────────────┘
             │
       ┌─────▼─────┐
       │   Nginx   │  (Reverse Proxy + SSL)
       │ Port 80/  │
       │   443     │
       └─────┬─────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌─────▼─────┐
│Frontend│      │  Backend  │
│ React  │      │  FastAPI  │
│(Docker)│      │ (Docker)  │
└────────┘      └─────┬─────┘
                      │
           ┌──────────┼──────────┐
           │          │          │
      ┌────▼───┐  ┌──▼──┐  ┌────▼────┐
      │ Celery │  │Redis│  │PostgreSQL│
      │Worker  │  │     │  │(Managed) │
      │(Docker)│  │     │  │ AWS RDS  │
      └────────┘  └─────┘  └──────────┘
```

**Zugriffsmöglichkeiten**:
1. **Kunden**: Über Internet (HTTPS) → Keine Tailscale nötig
2. **Admins**: Über Tailscale VPN → Sicherer Zugriff für Management
3. **CI/CD**: GitHub Actions → Automatisches Deployment
