# Windows Setup Guide für CaffeineCode

Diese Anleitung erklärt, wie Sie CaffeineCode auf einem Windows-System einrichten und die häufigsten Probleme beheben.

## Voraussetzungen

### 1. Docker Desktop Installation

CaffeineCode benötigt Docker Desktop für Windows, um die Anwendung und die Datenbanken auszuführen.

#### Installation von Docker Desktop

1. **Download Docker Desktop für Windows:**
   - Besuchen Sie https://www.docker.com/products/docker-desktop/
   - Laden Sie die Version für Windows herunter
   - Mindestanforderungen: Windows 10 64-bit (Pro, Enterprise oder Education) oder Windows 11

2. **Installation:**
   - Führen Sie das Installationsprogramm aus
   - Aktivieren Sie "Use WSL 2 instead of Hyper-V" (empfohlen)
   - Starten Sie den Computer neu, wenn Sie dazu aufgefordert werden

3. **WSL 2 Installation (falls erforderlich):**
   - Öffnen Sie PowerShell als Administrator
   - Führen Sie aus: `wsl --install`
   - Starten Sie den Computer neu
   - Weitere Informationen: https://docs.microsoft.com/de-de/windows/wsl/install

#### Docker Desktop starten

**WICHTIG:** Docker Desktop muss vor der Verwendung von `docker compose` gestartet werden.

1. **Docker Desktop starten:**
   - Suchen Sie "Docker Desktop" im Startmenü
   - Klicken Sie auf das Icon, um die Anwendung zu starten
   - Warten Sie, bis das Docker-Icon in der Taskleiste grün wird
   - Dies kann beim ersten Start einige Minuten dauern

2. **Überprüfen Sie, ob Docker läuft:**
   ```powershell
   docker --version
   docker compose version
   ```
   
   Wenn diese Befehle erfolgreich sind, ist Docker bereit.

## Häufige Fehler und Lösungen

### Fehler: "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified"

**Vollständige Fehlermeldung:**
```
unable to get image 'redis:7-alpine': error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.48/images/redis:7-alpine/json": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Ursache:** Docker Desktop ist nicht gestartet oder läuft nicht korrekt.

**Lösung:**

1. **Starten Sie Docker Desktop:**
   - Öffnen Sie Docker Desktop über das Startmenü
   - Warten Sie, bis das Icon in der Taskleiste grün ist (ca. 30-60 Sekunden)
   - Das Icon sollte zeigen: "Docker Desktop is running"

2. **Überprüfen Sie den Docker-Status:**
   ```powershell
   docker ps
   ```
   
   Wenn dieser Befehl funktioniert, läuft Docker korrekt.

3. **Versuchen Sie es erneut:**
   ```powershell
   docker compose up --build
   ```

### Fehler: WSL 2 Installation erforderlich

**Lösung:**

1. Öffnen Sie PowerShell als Administrator
2. Installieren Sie WSL 2:
   ```powershell
   wsl --install
   ```
3. Starten Sie den Computer neu
4. Starten Sie Docker Desktop erneut

### Fehler: Docker Desktop startet nicht

**Mögliche Lösungen:**

1. **Virtualisierung im BIOS aktivieren:**
   - Starten Sie den Computer neu
   - Gehen Sie ins BIOS (normalerweise F2, F10, F12 oder Del beim Start)
   - Suchen Sie nach "Virtualization Technology" oder "Intel VT-x/AMD-V"
   - Aktivieren Sie diese Option
   - Speichern und neu starten

2. **Hyper-V aktivieren (für Windows 10 Pro/Enterprise):**
   - Öffnen Sie PowerShell als Administrator
   - Führen Sie aus:
     ```powershell
     Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
     ```
   - Starten Sie den Computer neu

3. **Docker Desktop zurücksetzen:**
   - Klicken Sie mit der rechten Maustaste auf das Docker-Icon in der Taskleiste
   - Wählen Sie "Troubleshoot" → "Reset to factory defaults"
   - Warten Sie, bis der Reset abgeschlossen ist
   - Starten Sie Docker Desktop erneut

## CaffeineCode starten

Sobald Docker Desktop läuft, können Sie CaffeineCode starten:

### 1. Pre-flight Check (Empfohlen)

Bevor Sie die Anwendung starten, führen Sie den Pre-flight Check aus, um sicherzustellen, dass alle Voraussetzungen erfüllt sind:

```powershell
# Im Projektverzeichnis
.\preflight-check.ps1
```

Der Check überprüft:
- Docker Installation
- Docker Daemon Status
- .env Konfiguration
- Port-Verfügbarkeit
- WSL 2 Installation
- docker-compose.yml Validität

### 2. Terminal öffnen

Öffnen Sie PowerShell oder Command Prompt im Projektverzeichnis:
```
cd C:\Users\ERANZER\pycharm\CaffeineCode
```

### 3. Umgebungsvariablen prüfen

Stellen Sie sicher, dass die `.env`-Datei im Hauptverzeichnis existiert mit den korrekten Einstellungen:
```env
POSTGRES_DB=codedoc
POSTGRES_USER=CaffeineCode
POSTGRES_PASSWORD=password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

DATABASE_URL=postgresql+psycopg://CaffeineCode:password@postgres:5432/codedoc

CELERY_BROKER_URL=redis://redis-server:6379/0
CELERY_RESULT_BACKEND=redis://redis-server:6379/0

VITE_API_BASE_URL=http://127.0.0.1:8000
MODEL_NAME=eu.anthropic.claude-sonnet-4-20250514-v1:0
ANTHROPIC_API_KEY="your-api-key-here"
```

### 4. Anwendung starten

```powershell
# Alle Services im Hintergrund starten
docker compose up -d --build

# Oder im Vordergrund (mit Log-Ausgabe)
docker compose up --build
```

### 5. Status überprüfen

```powershell
# Alle laufenden Container anzeigen
docker compose ps

# Logs anzeigen
docker compose logs -f
```

### 6. Anwendung verwenden

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Adminer (Datenbank-Verwaltung):** http://localhost:8081

## Dienste stoppen

```powershell
# Alle Services stoppen
docker compose down

# Services stoppen und Volumes löschen (löscht Datenbank-Daten!)
docker compose down -v
```

## Troubleshooting-Checkliste

Wenn etwas nicht funktioniert, prüfen Sie Folgendes in dieser Reihenfolge:

- [ ] Ist Docker Desktop installiert?
- [ ] Läuft Docker Desktop? (Grünes Icon in der Taskleiste)
- [ ] Funktioniert `docker ps` ohne Fehler?
- [ ] Ist WSL 2 installiert? (`wsl --status`)
- [ ] Ist die Virtualisierung im BIOS aktiviert?
- [ ] Existiert die `.env`-Datei im Projektverzeichnis?
- [ ] Sind die Ports 5432, 6379, 8000, 8081, 5173 nicht bereits belegt?

### Ports prüfen

```powershell
# Prüfen, welche Ports belegt sind
netstat -ano | findstr "5432"
netstat -ano | findstr "6379"
netstat -ano | findstr "8000"
netstat -ano | findstr "5173"
```

### Alle Container und Volumes zurücksetzen

```powershell
# WARNUNG: Dies löscht alle Container, Images und Volumes
docker compose down -v
docker system prune -a --volumes
```

## Weitere Hilfe

- **Docker Desktop Dokumentation:** https://docs.docker.com/desktop/windows/
- **WSL 2 Dokumentation:** https://docs.microsoft.com/de-de/windows/wsl/
- **CaffeineCode Issues:** https://github.com/sep-thm/CaffeineCode/issues

Wenn Sie weiterhin Probleme haben:
1. Erstellen Sie ein neues Issue auf GitHub
2. Fügen Sie folgende Informationen hinzu:
   - Windows-Version (`winver`)
   - Docker Desktop Version
   - Fehlermeldung
   - Ausgabe von `docker compose config`
   - Ausgabe von `docker compose logs`
