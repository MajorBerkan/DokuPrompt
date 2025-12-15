# 🔐 Azure Entra ID Credentials - Einfügeanleitung

Diese Anleitung zeigt Ihnen **genau**, wo Sie Ihre vom Kunden erhaltenen Azure Entra ID Credentials einfügen müssen.

## 📋 Was Sie vom Kunden erhalten haben:

- ✅ **Tenant ID** (auch: Directory ID)
- ✅ **Client ID** (auch: Application ID)
- ✅ **Client Secret** (auch: Application Secret)

---

## 📍 Wo müssen die Credentials eingefügt werden?

### 1️⃣ **Frontend Konfiguration** (für die Benutzer-Authentifizierung)

#### Datei: `src/frontend/.env.development`
**📌 Zeilen 4-5 ändern:**

```env
# Azure Entra ID Configuration
VITE_AZURE_TENANT_ID=8a5cc402-600d-47a4-89fb-a7032b07c373  ← HIER: Ihre Tenant ID einfügen
VITE_AZURE_CLIENT_ID=5517d359-8af5-499b-928e-86887984c8d0  ← HIER: Ihre Client ID einfügen
VITE_AZURE_BACKEND_AUDIENCE=api://5517d359-8af5-499b-928e-86887984c8d0  ← HIER: api:// + Ihre Client ID
VITE_AZURE_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Beispiel nach dem Einfügen:**
```env
VITE_AZURE_TENANT_ID=12345678-90ab-cdef-1234-567890abcdef
VITE_AZURE_CLIENT_ID=abcdef12-3456-7890-abcd-ef1234567890
VITE_AZURE_BACKEND_AUDIENCE=api://abcdef12-3456-7890-abcd-ef1234567890
```

---

#### Datei: `src/frontend/.env.docker`
**📌 Zeilen 4-5 ändern (identisch wie .env.development):**

```env
# Azure Entra ID Configuration
VITE_AZURE_TENANT_ID=8a5cc402-600d-47a4-89fb-a7032b07c373  ← HIER: Ihre Tenant ID einfügen
VITE_AZURE_CLIENT_ID=5517d359-8af5-499b-928e-86887984c8d0  ← HIER: Ihre Client ID einfügen
VITE_AZURE_BACKEND_AUDIENCE=api://5517d359-8af5-499b-928e-86887984c8d0  ← HIER: api:// + Ihre Client ID
```

---

### 2️⃣ **Backend Konfiguration** (für die Token-Validierung)

#### Datei: `.env` (im Root-Verzeichnis)
**📌 Zeilen 19-20 ändern:**

```env
# Azure Entra ID Configuration (Backend)
AZURE_TENANT_ID=8a5cc402-600d-47a4-89fb-a7032b07c373  ← HIER: Ihre Tenant ID einfügen
AZURE_CLIENT_ID=5517d359-8af5-499b-928e-86887984c8d0  ← HIER: Ihre Client ID einfügen
```

---

## ⚠️ Wichtige Hinweise zum Client Secret:

### Wird das Client Secret benötigt?

**Für Single-Page Applications (SPA) wie diese Frontend-Anwendung: NEIN!**

❌ Das Client Secret wird **NICHT** im Frontend verwendet
❌ Das Client Secret sollte **NIEMALS** im Frontend-Code oder .env-Dateien erscheinen

✅ Single-Page Applications verwenden den **OAuth 2.0 Authorization Code Flow with PKCE**
✅ Dies ist sicherer, da kein Secret im Browser gespeichert werden muss

### Wann würde das Secret benötigt?

Das Client Secret wird nur benötigt, wenn:
- Sie eine **Backend-to-Backend** Kommunikation implementieren
- Sie einen **Daemon** oder **Service** ohne Benutzerinteraktion authentifizieren
- Sie **Server-side** Token-Austausch durchführen

**Für Ihr Use-Case (Benutzer-Login) wird das Secret NICHT benötigt.**

Wenn Sie später das Secret dennoch benötigen, fügen Sie es in `.env` (Backend) hinzu:
```env
AZURE_CLIENT_SECRET=ihr-client-secret-hier
```

---

## 📝 Zusammenfassung - Checkliste:

- [ ] **Datei 1**: `src/frontend/.env.development` - Zeilen 4-6 ändern
- [ ] **Datei 2**: `src/frontend/.env.docker` - Zeilen 4-6 ändern  
- [ ] **Datei 3**: `.env` (Root) - Zeilen 19-20 ändern
- [ ] **Tenant ID** in allen 3 Dateien identisch
- [ ] **Client ID** in allen 3 Dateien identisch
- [ ] **BACKEND_AUDIENCE** = `api://` + Ihre Client ID

---

## 🔍 Wie finde ich die aktuellen Dateien?

### Methode 1: Im Terminal
```bash
# Frontend Development
nano src/frontend/.env.development

# Frontend Docker
nano src/frontend/.env.docker

# Backend
nano .env
```

### Methode 2: Im Code-Editor
```
📁 CaffeineCode/
├── 📄 .env                              ← Backend Credentials (Zeilen 19-20)
└── 📁 src/
    └── 📁 frontend/
        ├── 📄 .env.development          ← Frontend Development (Zeilen 4-6)
        └── 📄 .env.docker               ← Frontend Docker (Zeilen 4-6)
```

---

## ✅ Nach dem Einfügen:

1. **Speichern Sie alle 3 Dateien**
2. **Starten Sie die Anwendung neu:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```
3. **Testen Sie den Login** unter http://localhost:5173

---

## 🆘 Probleme?

Siehe `docs/ENTRA_ID_SETUP.md` für:
- Detaillierte Azure Portal Konfiguration
- Troubleshooting
- Häufige Fehler und Lösungen

---

## 🔒 Sicherheitshinweis:

⚠️ **WICHTIG:** Diese Credentials sind sensibel!

- ✅ Fügen Sie `.env*` Dateien zu `.gitignore` hinzu (bereits erledigt)
- ✅ Teilen Sie diese Werte NICHT in öffentlichen Repositories
- ✅ Verwenden Sie verschiedene Credentials für Dev/Test/Prod
