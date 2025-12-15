# Azure Entra ID Authentication Setup

Diese Anleitung erklärt, wie Sie die Azure Entra ID (ehemals Azure Active Directory) Authentifizierung für CaffeineCode konfigurieren.

## Übersicht

CaffeineCode verwendet Azure Entra ID für die Benutzerauthentifizierung. Die Implementierung nutzt:

- **Frontend**: MSAL.js (Microsoft Authentication Library) für Single-Page Applications
- **Backend**: Authlib für JWT-Token-Validierung
- **Authentifizierungsfluss**: OAuth 2.0 / OpenID Connect

## Voraussetzungen

Sie benötigen:
1. Ein Azure-Konto mit Zugriff auf Azure Entra ID
2. Administratorrechte zum Erstellen von App-Registrierungen
3. Die Tenant ID und Client ID Ihrer Azure Entra ID-Anwendung

## Azure Portal Konfiguration

### 1. App-Registrierung erstellen

1. Gehen Sie zum [Azure Portal](https://portal.azure.com)
2. Navigieren Sie zu **Azure Active Directory** → **App registrations**
3. Klicken Sie auf **New registration**
4. Konfigurieren Sie die Anwendung:
   - **Name**: CaffeineCode (oder ein anderer Name Ihrer Wahl)
   - **Supported account types**: Wählen Sie die passende Option für Ihre Organisation
   - **Redirect URI**: 
     - Platform: Single-page application (SPA)
     - URI: `http://localhost:5173/auth/callback` (für Entwicklung)
     - Für Produktion: `https://ihre-domain.com/auth/callback`

### 2. Client ID und Tenant ID notieren

Nach der Erstellung finden Sie auf der **Overview**-Seite:
- **Application (client) ID** - Dies ist Ihre `AZURE_CLIENT_ID`
- **Directory (tenant) ID** - Dies ist Ihre `AZURE_TENANT_ID`

### 3. API Permissions konfigurieren

1. Gehen Sie zu **API permissions**
2. Fügen Sie folgende Berechtigungen hinzu:
   - Microsoft Graph:
     - `User.Read` (Delegated)
     - `openid` (Delegated)
     - `profile` (Delegated)
     - `email` (Delegated)

### 4. (Optional) App Roles definieren

Falls Sie rollenbasierte Zugriffskontrolle benötigen:

1. Gehen Sie zu **App roles**
2. Erstellen Sie Rollen wie z.B.:
   - **Team.Admin**: Für Administratoren
   - **Team.User**: Für normale Benutzer

## Umgebungsvariablen konfigurieren

### Frontend (.env.development und .env.docker)

Aktualisieren Sie die folgenden Variablen in beiden Dateien:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000

# Azure Entra ID Configuration
VITE_AZURE_TENANT_ID=ihre-tenant-id
VITE_AZURE_CLIENT_ID=ihre-client-id
VITE_AZURE_BACKEND_AUDIENCE=api://ihre-client-id
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Hinweis**: Für Produktion müssen Sie `VITE_AZURE_REDIRECT_URI` auf Ihre Produktions-URL ändern.

### Backend (.env im Root-Verzeichnis)

Fügen Sie folgende Zeilen hinzu:

```env
# Azure Entra ID Configuration (Backend)
AZURE_TENANT_ID=ihre-tenant-id
AZURE_CLIENT_ID=ihre-client-id

# Optional: Client Secret für Server-to-Server Kommunikation
AZURE_CLIENT_SECRET=ihr-client-secret
```

**Hinweis zum Client Secret**:
- Das Client Secret wird **nur im Backend** verwendet, niemals im Frontend
- Es ist optional und nur für Server-to-Server Szenarien erforderlich (z.B. Microsoft Graph API Aufrufe)
- Um ein Client Secret zu erstellen:
  1. Gehen Sie im Azure Portal zu Ihrer App Registration
  2. Navigieren Sie zu **Certificates & secrets**
  3. Klicken Sie auf **New client secret**
  4. Kopieren Sie den Secret Value (nur einmal sichtbar!)
  5. Fügen Sie ihn als `AZURE_CLIENT_SECRET` in Ihrer `.env` Datei hinzu

## Standardkonfiguration

Die Anwendung enthält bereits Standardwerte für die Entwicklung. Diese Werte werden automatisch verwendet, wenn keine Umgebungsvariablen gesetzt sind:

- **Tenant ID**: `8a5cc402-600d-47a4-89fb-a7032b07c373`
- **Client ID**: `5517d359-8af5-499b-928e-86887984c8d0`

**Wichtig**: Für Produktionssysteme sollten Sie eigene Credentials verwenden!

## Funktionsweise

### Authentifizierungsfluss

1. **Benutzer öffnet die Anwendung**
   - Nicht authentifizierte Benutzer werden zur Login-Seite weitergeleitet

2. **Login**
   - Benutzer klickt auf "Sign In"
   - MSAL.js öffnet ein Pop-up für Azure Entra ID Login
   - Nach erfolgreicher Authentifizierung erhält die App ein ID Token und Access Token

3. **Token Management**
   - Das Access Token wird automatisch für alle API-Aufrufe verwendet
   - Token werden im Local Storage gespeichert
   - Abgelaufene Token werden automatisch erneuert (Silent Token Acquisition)

4. **API-Aufrufe**
   - Alle API-Aufrufe enthalten automatisch das Access Token im Authorization Header
   - Backend validiert das Token bei jeder Anfrage

### Token-Validierung (Backend)

Das Backend validiert Token durch:

1. Abrufen der öffentlichen Schlüssel von Azure (JWKS)
2. Überprüfung der Token-Signatur
3. Validierung von Issuer und Audience
4. Überprüfung der Ablaufzeit (exp, nbf, iat)

## Troubleshooting

### Fehler: "Missing bearer token"

**Problem**: API-Aufrufe schlagen mit 401 Unauthorized fehl.

**Lösung**:
- Überprüfen Sie, ob Sie eingeloggt sind
- Prüfen Sie die Browser Console auf Fehler
- Stellen Sie sicher, dass das Token automatisch erworben wird

### Fehler: "Invalid issuer" oder "Invalid audience"

**Problem**: Token-Validierung schlägt fehl.

**Lösung**:
- Überprüfen Sie, dass Tenant ID und Client ID übereinstimmen
- Stellen Sie sicher, dass `AZURE_TENANT_ID` und `AZURE_CLIENT_ID` in Frontend und Backend identisch sind

### Fehler: "CORS policy"

**Problem**: Browser blockiert API-Aufrufe wegen CORS.

**Lösung**:
- Überprüfen Sie die CORS-Konfiguration in `src/backend/app/main.py`
- Fügen Sie Ihre Produktions-URL zu den erlaubten Origins hinzu

### Token läuft zu schnell ab

**Problem**: Benutzer müssen sich häufig neu einloggen.

**Lösung**:
- Azure Token haben standardmäßig eine Laufzeit von 1 Stunde
- MSAL.js erneuert Token automatisch im Hintergrund (Silent Token Acquisition)
- Überprüfen Sie, dass `cacheLocation: "localStorage"` in der MSAL-Konfiguration gesetzt ist

## Client Secret Verwendung (Optional)

Das Client Secret wird **nur im Backend** für Server-to-Server Authentifizierung verwendet. Typische Anwendungsfälle:

### Wann das Client Secret verwenden?

- **Microsoft Graph API Aufrufe**: Wenn Ihre Anwendung im Namen der Anwendung selbst (nicht im Namen eines Benutzers) auf Microsoft Graph zugreifen muss
- **Backend-to-Backend Kommunikation**: Für die Authentifizierung zwischen Diensten
- **Application Permissions**: Für Operationen, die keine Benutzerinteraktion erfordern

### Implementierungsbeispiel

Falls Sie das Client Secret verwenden möchten, können Sie es im Backend so nutzen:

```python
from msal import ConfidentialClientApplication
from app.core.azure_config import AZ_TENANT_ID, AZ_CLIENT_ID, AZ_CLIENT_SECRET

# Nur verwenden, wenn AZ_CLIENT_SECRET gesetzt ist
if AZ_CLIENT_SECRET:
    app = ConfidentialClientApplication(
        client_id=AZ_CLIENT_ID,
        client_credential=AZ_CLIENT_SECRET,
        authority=f"https://login.microsoftonline.com/{AZ_TENANT_ID}"
    )
    
    # Acquire token für Application Permissions
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    access_token = result.get("access_token")
```

**Wichtig**: Das Frontend verwendet weiterhin den Public Client Flow und benötigt kein Secret!

## Sicherheitshinweise

1. **Niemals Client Secrets im Frontend verwenden**
   - Single-Page Applications (SPAs) verwenden den OAuth 2.0 Implicit Flow oder Authorization Code Flow with PKCE
   - Client Secrets sind nicht erforderlich für die Frontend-Authentifizierung
   - Client Secrets sollten niemals im Frontend-Code oder in Git committet werden
   - Das Secret ist ausschließlich für Backend Server-to-Server Kommunikation

2. **HTTPS in Produktion**
   - Verwenden Sie immer HTTPS für Produktionssysteme
   - Aktualisieren Sie die Redirect URI in Azure auf HTTPS

3. **Token-Speicherung**
   - Token werden im Local Storage gespeichert
   - Bei sensiblen Anwendungen sollten Sie Session Storage in Betracht ziehen

4. **Rollen und Berechtigungen**
   - Verwenden Sie App Roles für granulare Zugriffskontrolle
   - Das Backend überprüft Rollen in geschützten Endpunkten

5. **Client Secret Schutz**
   - Bewahren Sie das Client Secret sicher auf (nie in Git committen)
   - Verwenden Sie Umgebungsvariablen oder Key Vaults
   - Rotieren Sie Secrets regelmäßig
   - Setzen Sie ein Ablaufdatum für Secrets in Azure

## Weitere Ressourcen

- [Microsoft Authentication Library (MSAL) Dokumentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Azure Entra ID App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth 2.0 und OpenID Connect](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols)
- [Authlib Dokumentation](https://docs.authlib.org/)

## Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Browser Console auf Fehlermeldungen
2. Prüfen Sie die Backend-Logs
3. Konsultieren Sie die Azure Entra ID Audit-Logs im Azure Portal
