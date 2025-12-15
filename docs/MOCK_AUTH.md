# Mock Entra ID Authentication

Da das Team noch nicht in Entra ID (Azure AD) hinzugefügt wurde, verwendet die Anwendung ein Mock-Authentifizierungssystem, um alle Funktionen demonstrieren zu können.

## ⚠️ Sicherheitshinweis

**WICHTIG**: Diese Mock-Authentifizierung ist NUR für Entwicklung und Demonstration gedacht!

- Passwörter werden im Klartext gespeichert
- Keine echte Token-Verschlüsselung
- Kein Schutz gegen Brute-Force-Angriffe
- Session-Tokens im Speicher, gehen bei Server-Neustart verloren

**Für Produktionsumgebungen MUSS echte Entra ID Authentifizierung implementiert werden!**

## Aktivierung

### Backend
Setzen Sie in der `.env` Datei:
```env
USE_MOCK_AUTH=true
```

### Frontend
Setzen Sie in der `.env.development` oder `.env.docker` Datei:
```env
VITE_USE_MOCK_AUTH=true
```

## Mock-Benutzer für Demo-Zwecke

Die folgenden Benutzer stehen für Tests und Demonstrationen zur Verfügung:

### 1. Admin User - Romy Becker
- **Name**: Romy Becker
- **E-Mail**: `admin@caffeinecode.com`
- **Passwort**: `admin123`
- **Rolle**: `admin`
- **Entra Object ID**: `mock-admin-001`
- **Berechtigungen**: 
  - ✅ Repos hinzufügen
  - ✅ Generischen Prompt anpassen
  - ✅ Spezifischen Prompt anpassen
  - ✅ Update-Zeit anpassen
  - ✅ Dokumentationen generieren lassen
  - ✅ Repos löschen
  - ✅ Dokumentationen lesen
  - ✅ Dokumentationen löschen

### 2. Bearbeiter User - Paul Haustein
- **Name**: Paul Haustein
- **E-Mail**: `bearbeiter@caffeinecode.com`
- **Passwort**: `editor123`
- **Rolle**: `bearbeiter`
- **Entra Object ID**: `mock-editor-001`
- **Berechtigungen**:
  - ❌ Repos hinzufügen
  - ❌ Generischen Prompt anpassen
  - ✅ Spezifischen Prompt anpassen
  - ✅ Dokumentationen generieren lassen
  - ✅ Dokumentationen lesen
  - ❌ Repos löschen
  - ❌ Dokumentationen löschen

### 3. Viewer User - Paul Haustein
- **Name**: Paul Haustein
- **E-Mail**: `viewer@caffeinecode.com`
- **Passwort**: `viewer123`
- **Rolle**: `viewer`
- **Entra Object ID**: `mock-viewer-001`
- **Berechtigungen**:
  - ❌ Repos hinzufügen
  - ❌ Prompts anpassen
  - ❌ Dokumentationen generieren
  - ✅ Dokumentationen lesen
  - ❌ Repos löschen
  - ❌ Dokumentationen löschen

## API-Endpunkte

Diese Endpunkte sind nur verfügbar wenn `USE_MOCK_AUTH=true` gesetzt ist.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin@caffeinecode.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "mock-session-abc123...",
  "user": {
    "id": "mock-admin-001",
    "email": "admin@caffeinecode.com",
    "display_name": "Romy Becker",
    "entra_object_id": "mock-admin-001",
    "role": "admin"
  }
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer mock-session-abc123...
```

**Response:**
```json
{
  "sub": "mock-admin-001",
  "name": "Romy Becker",
  "email": "admin@caffeinecode.com",
  "roles": ["admin"]
}
```

### Logout
```http
POST /auth/logout?token=mock-session-abc123...
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### List Mock Users
```http
GET /auth/mock-users
```

**Response:**
```json
[
  {
    "email": "admin@caffeinecode.com",
    "display_name": "Romy Becker",
    "role": "admin",
    "password_hint": "Use the password from the documentation"
  },
  {
    "email": "bearbeiter@caffeinecode.com",
    "display_name": "Paul Haustein",
    "role": "bearbeiter",
    "password_hint": "Use the password from the documentation"
  },
  {
    "email": "viewer@caffeinecode.com",
    "display_name": "Paul Haustein",
    "role": "viewer",
    "password_hint": "Use the password from the documentation"
  }
]
```

## Frontend-Integration

### Login-Seite
Die Login-Seite (`/login`) zeigt automatisch alle verfügbaren Mock-Benutzer an wenn `VITE_USE_MOCK_AUTH=true` gesetzt ist. Benutzer können:

1. Einen Benutzer aus der Liste auswählen
2. Das entsprechende Passwort eingeben
3. Sich anmelden

Die Passwörter werden auf der Login-Seite als Hilfe angezeigt.

### Session-Management
- Nach erfolgreichem Login wird ein Session-Token im `localStorage` gespeichert
- Der Token wird für alle authentifizierten API-Anfragen verwendet
- Bei Logout wird der Token entfernt und der Benutzer zur Login-Seite weitergeleitet
- Sessions laufen nach 8 Stunden ab

### Benutzer-Anzeige
In der oberen Navigationsleiste wird der aktuell angemeldete Benutzer mit Name und Rolle angezeigt.

## Implementierungsdetails

### Backend
- **Datei**: `src/backend/app/auth/mock_auth.py`
- **Session-Storage**: In-Memory Dictionary (geht bei Neustart verloren)
- **Token-Format**: `mock-session-{uuid}`
- **Session-Dauer**: 8 Stunden

### Frontend
- **AuthProvider**: Erweitert um Mock-Authentifizierung
- **LoginPage**: Zeigt Mock-Benutzer und Passwort-Eingabe
- **API Client**: Unterstützt sowohl Entra ID als auch Mock-Tokens

### Rollenbasierte Zugriffskontrolle
Die Rollen werden im Backend in den Auth-Dependencies überprüft:
- `verify_token()` extrahiert die Rolle aus dem Mock-Token
- `require_role()` kann verwendet werden, um Endpunkte zu schützen

Im Frontend:
- Die Rolle wird im `AuthProvider` gespeichert
- UI-Komponenten können basierend auf der Rolle bedingt gerendert werden

## Übergang zu echtem Entra ID

Wenn das Team zu Entra ID hinzugefügt wird:

### 1. Backend
Setzen Sie in der `.env` Datei:
```env
USE_MOCK_AUTH=false
AZURE_TENANT_ID=ihre-tenant-id
AZURE_CLIENT_ID=ihre-client-id
```

### 2. Frontend
Setzen Sie in den `.env.development` und `.env.docker` Dateien:
```env
VITE_USE_MOCK_AUTH=false
VITE_AZURE_TENANT_ID=ihre-tenant-id
VITE_AZURE_CLIENT_ID=ihre-client-id
VITE_AZURE_BACKEND_AUDIENCE=api://ihre-client-id
VITE_AZURE_REDIRECT_URI=http://localhost:5173
```

### 3. Testen
1. Starten Sie die Anwendung neu
2. Die Login-Seite zeigt nun den "Sign In with Entra ID" Button
3. Benutzer werden zu Microsoft Login weitergeleitet
4. Nach erfolgreicher Authentifizierung werden sie zurück zur Anwendung geleitet

### 4. Rollen-Mapping
In echtem Entra ID müssen App Roles definiert werden:
- Erstellen Sie in Azure Portal App Roles für `admin`, `bearbeiter`, `viewer`
- Weisen Sie Benutzer den entsprechenden Rollen zu
- Die Rollen werden automatisch im Token zurückgegeben

Siehe auch: [ENTRA_ID_SETUP.md](./ENTRA_ID_SETUP.md)

## Troubleshooting

### Problem: Login funktioniert nicht
**Lösung**: 
- Überprüfen Sie, dass `USE_MOCK_AUTH=true` im Backend gesetzt ist
- Überprüfen Sie, dass `VITE_USE_MOCK_AUTH=true` im Frontend gesetzt ist
- Starten Sie Backend und Frontend neu

### Problem: Session-Token läuft ständig ab
**Lösung**: 
- Session-Tokens werden im Speicher gespeichert
- Bei Backend-Neustart gehen alle Sessions verloren
- Benutzer müssen sich erneut anmelden

### Problem: Berechtigungen funktionieren nicht
**Lösung**:
- Überprüfen Sie die Rolle des Benutzers in den Mock-Daten
- Überprüfen Sie die Rollen-Überprüfung in den API-Endpunkten
- Verwenden Sie die Browser-Entwicklertools, um den Token zu inspizieren

### Problem: "Mock users not loading"
**Lösung**:
- Überprüfen Sie die Browser-Konsole auf Fehler
- Stellen Sie sicher, dass das Backend läuft
- Testen Sie den `/auth/mock-users` Endpunkt direkt

## Weiterführende Links

- [Azure Entra ID Setup Guide](./ENTRA_ID_SETUP.md)
- [Quick Start Guide](./QUICK_START.md)
- [FAQ](./FAQ.md)
