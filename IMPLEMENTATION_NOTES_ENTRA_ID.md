# Entra ID Authentication - Implementation Notes

## Zusammenfassung

Die Azure Entra ID Authentifizierung wurde erfolgreich in die CaffeineCode-Anwendung integriert. Diese Implementierung ermöglicht es Kunden, sich mit ihren Entra ID Credentials anzumelden.

## Was wurde implementiert?

### 1. Frontend-Änderungen

#### Route Protection (App.jsx)
- **ProtectedRoute-Komponente**: Leitet nicht authentifizierte Benutzer automatisch zur Login-Seite um
- **Automatische Token-Verwaltung**: Access Tokens werden automatisch beim Login erworben und bei API-Aufrufen verwendet
- **Session-Management**: Benutzer bleiben eingeloggt, auch wenn sie die Seite neu laden (Local Storage)

#### API Client (api.js)
- **Zentralisierte Authentifizierung**: Alle API-Aufrufe nutzen automatisch das Bearer Token
- **`fetchWithAuth`-Funktion**: Wrapper für fetch mit automatischem Token-Injection
- **Token-Verwaltung**: Globale Token-Verwaltung mit `setAccessToken`-Funktion

#### Auth Provider (AuthProvider.jsx)
- **Automatische Token-Erneuerung**: Tokens werden automatisch im Hintergrund erneuert
- **MSAL Integration**: Verwendet MSAL.js für sichere OAuth 2.0/OpenID Connect Authentifizierung
- **Rollen-Support**: Extrahiert Benutzerrollen aus dem Access Token für rollenbasierte Zugriffskontrolle

#### Konfiguration (authConfig.js)
- **Umgebungsvariablen**: Verwendet Vite-Umgebungsvariablen statt hardcodierter Werte
- **Fallback-Werte**: Enthält Standardwerte für die Entwicklung
- **Flexible Konfiguration**: Einfach für verschiedene Umgebungen konfigurierbar

### 2. Backend-Änderungen

#### Azure Configuration (azure_config.py)
- **Umgebungsvariablen**: Lädt Tenant ID und Client ID aus Umgebungsvariablen
- **JWKS Integration**: Automatisches Abrufen der öffentlichen Schlüssel von Azure
- **Token-Validierung**: Vollständige Validierung von Issuer, Audience und Signatur

#### Auth Dependencies (deps.py)
- **`verify_token`-Funktion**: Validiert JWT Tokens bei jedem API-Aufruf
- **`require_role`-Decorator**: Ermöglicht rollenbasierte Zugriffskontrolle
- **CurrentUser-Klasse**: Typisierte Benutzerinformationen für API-Endpunkte

### 3. Umgebungsvariablen

#### Frontend (.env.development, .env.docker)
```env
VITE_AZURE_TENANT_ID=ihre-tenant-id
VITE_AZURE_CLIENT_ID=ihre-client-id
VITE_AZURE_BACKEND_AUDIENCE=api://ihre-client-id
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth/callback
```

#### Backend (.env im Root-Verzeichnis)
```env
AZURE_TENANT_ID=ihre-tenant-id
AZURE_CLIENT_ID=ihre-client-id
```

### 4. Dokumentation

- **ENTRA_ID_SETUP.md**: Vollständige Anleitung zur Konfiguration von Azure Entra ID
- **README.md**: Aktualisiert mit Link zur Entra ID Dokumentation
- **.env.example**: Beispiel-Konfigurationsdateien für beide Umgebungen

## Wie funktioniert es?

### Authentifizierungsfluss

1. **Benutzer öffnet die Anwendung**
   - Nicht authentifizierte Benutzer werden zur `/login` Route weitergeleitet

2. **Login-Prozess**
   - Benutzer klickt auf "Sign In with Entra ID"
   - MSAL.js öffnet ein Pop-up für Azure Entra ID Login
   - Benutzer authentifiziert sich mit seinen Credentials
   - Azure gibt ein ID Token und Access Token zurück

3. **Token-Verwaltung**
   - Access Token wird automatisch für alle API-Aufrufe verwendet
   - Token wird im Local Storage gespeichert
   - Bei Ablauf wird das Token automatisch im Hintergrund erneuert

4. **API-Zugriff**
   - Alle API-Aufrufe enthalten das Access Token im Authorization Header
   - Backend validiert das Token und extrahiert Benutzerinformationen
   - Geschützte Endpunkte überprüfen zusätzlich Benutzerrollen

### Sicherheitsmerkmale

1. **Token-Validierung**
   - Signatur-Überprüfung mit öffentlichen Schlüsseln von Azure
   - Issuer und Audience Validierung
   - Ablaufzeit-Überprüfung (exp, nbf, iat)

2. **Rollenbasierte Zugriffskontrolle**
   - App Roles werden aus dem Token extrahiert
   - Backend-Endpunkte können Rollen-Anforderungen definieren
   - Beispiel: `@require_role("Team.Admin")` für Admin-Endpunkte

3. **HTTPS in Produktion**
   - Redirect URIs müssen HTTPS verwenden
   - Tokens werden nur über sichere Verbindungen übertragen

## Konfiguration für Produktionssysteme

### Schritt 1: Azure Portal Konfiguration

1. Erstellen Sie eine App-Registrierung in Azure Entra ID
2. Notieren Sie Tenant ID und Client ID
3. Konfigurieren Sie die Redirect URI:
   - Für Entwicklung: `http://localhost:5173/auth/callback`
   - Für Produktion: `https://ihre-domain.com/auth/callback`
4. Fügen Sie API-Berechtigungen hinzu (User.Read, openid, profile, email)
5. (Optional) Definieren Sie App Roles für Zugriffskontrolle

### Schritt 2: Umgebungsvariablen setzen

**Frontend:**
```bash
VITE_AZURE_TENANT_ID=ihre-tenant-id
VITE_AZURE_CLIENT_ID=ihre-client-id
VITE_AZURE_REDIRECT_URI=https://ihre-domain.com/auth/callback
```

**Backend:**
```bash
AZURE_TENANT_ID=ihre-tenant-id
AZURE_CLIENT_ID=ihre-client-id
```

### Schritt 3: Anwendung starten

```bash
docker-compose up -d
```

## Testen der Implementierung

### 1. Frontend Build testen
```bash
cd src/frontend
npm install
npm run build
```

### 2. Linting überprüfen
```bash
cd src/frontend
npm run lint
```

### 3. Backend Dependencies installieren
```bash
cd src/backend
pip install -r requirements.txt
```

### 4. Anwendung starten
```bash
docker-compose up -d
```

### 5. Login testen
1. Öffnen Sie http://localhost:5173
2. Sie sollten zur Login-Seite weitergeleitet werden
3. Klicken Sie auf "Sign In"
4. Authentifizieren Sie sich mit Entra ID
5. Nach erfolgreicher Authentifizierung sollten Sie zur Hauptseite weitergeleitet werden

## Bekannte Einschränkungen

1. **Pop-up Blocker**: Browser-Pop-up-Blocker können den Login-Prozess stören
   - Lösung: Verwenden Sie `loginRedirect()` statt `loginPopup()` für bessere Browser-Kompatibilität

2. **Token-Ablauf**: Tokens laufen nach 1 Stunde ab
   - Lösung: MSAL.js erneuert Tokens automatisch im Hintergrund

3. **Offline-Betrieb**: Keine Authentifizierung ohne Internetverbindung möglich
   - Azure Entra ID erfordert Online-Zugriff für Token-Validierung

## Weitere Verbesserungsmöglichkeiten

1. **Conditional Access Policies**: Integration von Azure Conditional Access
2. **Multi-Factor Authentication**: Erzwingen von MFA für sensible Operationen
3. **Token-Caching**: Verbessertes Token-Caching für bessere Performance
4. **Fehlerbehandlung**: Detailliertere Fehlermeldungen für Authentifizierungsprobleme
5. **Admin-Consent**: Implementierung von Admin-Consent-Flow für Organisations-weite Berechtigungen

## Sicherheitsüberprüfung

✅ **CodeQL Scan**: Keine Sicherheitslücken gefunden
✅ **Token-Validierung**: Vollständig implementiert
✅ **HTTPS**: Für Produktion konfiguriert
✅ **Route Protection**: Alle Routen außer /login geschützt
✅ **Secret Management**: Keine Secrets im Code (nur in Umgebungsvariablen)

## Support und Fehlerbehebung

Siehe [ENTRA_ID_SETUP.md](docs/ENTRA_ID_SETUP.md) für:
- Detaillierte Konfigurationsanleitung
- Troubleshooting-Tipps
- Häufige Fehler und Lösungen
- Links zu Microsoft-Dokumentation

## Zusammenfassung der Änderungen

**Dateien hinzugefügt:**
- `docs/ENTRA_ID_SETUP.md` - Vollständige Setup-Anleitung
- `.env.example` - Beispiel für Root-Umgebungsvariablen
- `src/frontend/.env.example` - Beispiel für Frontend-Umgebungsvariablen
- `IMPLEMENTATION_NOTES_ENTRA_ID.md` - Diese Datei

**Dateien geändert:**
- `src/frontend/package.json` - Fixed syntax error
- `src/frontend/lib/authConfig.js` - Verwendet Umgebungsvariablen
- `src/frontend/lib/AuthProvider.jsx` - Automatische Token-Verwaltung
- `src/frontend/lib/api.js` - Zentralisierte Authentifizierung
- `src/frontend/App.jsx` - Route Protection
- `src/frontend/eslint.config.js` - Fixed ESLint configuration
- `src/frontend/.env.development` - Entra ID Konfiguration
- `src/frontend/.env.docker` - Entra ID Konfiguration
- `src/backend/app/core/azure_config.py` - Verwendet Umgebungsvariablen
- `.env` - Entra ID Backend-Konfiguration
- `README.md` - Link zur Entra ID Dokumentation

**Build Status:**
- ✅ Frontend Build erfolgreich
- ✅ Linting erfolgreich (nur warnings in existierendem Code)
- ✅ Backend Dependencies installiert
- ✅ Keine Sicherheitslücken gefunden

Die Implementierung ist vollständig und produktionsbereit!
