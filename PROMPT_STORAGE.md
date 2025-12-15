# Prompt-Speicherung und -Abruf in CaffeineCode

Diese Dokumentation erklärt, wie Prompts in CaffeineCode gespeichert und abgerufen werden.

> **WICHTIG:** Diese Dokumentation wurde aktualisiert auf die neue Struktur mit separater Speicherung von Generic und Specific Prompts (November 2025).

## Überblick

Das CaffeineCode-System verwendet zwei Arten von Prompts:

1. **Genereller Prompt** (General/Generic Prompt): Ein systemweiter Template-Prompt, der als Basis für alle Repositories dient
2. **Repository-spezifischer Prompt** (Specific Prompt): Individuelle Anweisungen für ein bestimmtes Repository

### Wie funktioniert die neue Speicherung?

**Separate Speicherung:**
1. Der generelle Prompt wird **in-memory** im Backend gespeichert
2. Bei jedem Repository-Prompt wird:
   - Der aktuelle generelle Prompt in der Spalte `generic_prompt` gespeichert
   - Der spezifische Prompt in der Spalte `specific_prompt` gespeichert
3. Bei der Dokumentationsgenerierung wird der generelle Prompt aus dem Backend aktualisiert

**Vorteile der neuen Struktur:**
- Genereller Prompt kann zentral aktualisiert werden
- Bei Dokumentationsgenerierung wird der generelle Prompt automatisch aktualisiert
- Klare Trennung zwischen generellen und spezifischen Anweisungen
- Einfachere Wartung und Versionierung

## Datenbank-Struktur

### Prompt-Tabelle (`prompt`)

Die Prompts werden in der PostgreSQL-Datenbank in der Tabelle `prompt` gespeichert. Die Tabellenstruktur ist wie folgt definiert:

```python
class Prompt(Base):
    __tablename__ = "prompt"
    id: Mapped[int]                          # Eindeutige ID (Integer)
    generic_prompt: Mapped[str | None]       # Genereller/Template Prompt
    specific_prompt: Mapped[str | None]      # Repository-spezifischer Prompt
    text: Mapped[str | None]                 # Deprecated (für Rückwärtskompatibilität)
    created_at: Mapped[datetime]             # Erstellungszeitpunkt
    repo_id: Mapped[int | None]              # Repository-ID
    docu: Mapped[str | None]                 # Generierte Dokumentation
```

**Quelle**: `src/backend/app/db/models.py`

### Speicherungsstrategie

**Genereller Prompt:**
- Wird in-memory im Backend gespeichert
- Bei jedem Speichern/Generieren eines Repository-Prompts wird er in `generic_prompt` kopiert

**Repository-spezifischer Prompt:**
- `repo_id = <repository_id>` (verknüpft mit einem Repository)
- `generic_prompt` enthält eine Kopie des aktuellen generellen Prompts
- `specific_prompt` enthält den repository-spezifischen Teil
- Bei Dokumentationsgenerierung wird `generic_prompt` automatisch aktualisiert

**Quelle**: `src/backend/app/api/routes_prompts.py`

## API-Endpunkte

Die Prompts können über REST-API-Endpunkte verwaltet werden. Alle Endpunkte befinden sich unter dem Präfix `/prompts`.

### 1. Generellen Prompt speichern

**Endpunkt**: `POST /prompts/general`

**Request Body**:
```json
{
  "prompt": "Generate comprehensive documentation with:\n- Overview section\n- API reference\n- Code examples\nUse markdown format."
}
```

**Response**:
```json
{
  "status": "ok",
  "message": "General prompt saved successfully"
}
```

**Funktionsweise**:
- Aktualisiert den in-memory gespeicherten generellen Prompt
- Dieser Prompt wird bei der nächsten Dokumentationsgenerierung verwendet
- Der Prompt wird nicht in der Datenbank gespeichert (nur in-memory)

**Quelle**: `src/backend/app/api/routes_prompts.py`

### 2. Generellen Prompt abrufen

**Endpunkt**: `GET /prompts/general`

**Response**:
```json
{
  "prompt": "Generate comprehensive documentation with:\n- Overview section\n- API reference\n- Code examples\nUse markdown format."
}
```

**Funktionsweise**:
- Gibt den aktuell in-memory gespeicherten generellen Prompt zurück
- Dieser Prompt wird als Basis für alle Repository-Prompts verwendet

**Quelle**: `src/backend/app/api/routes_prompts.py`

### 3. Repository-spezifischen Prompt speichern

**Endpunkt**: `POST /prompts/repo`

**Request Body**:
```json
{
  "repo_id": 1,
  "prompt": "Focus on REST API endpoints and include authentication examples."
}
```

**Response**:
```json
{
  "status": "ok",
  "message": "Prompt saved and documentation regenerated for repository <name>"
}
```

**Funktionsweise**:
1. Prüft, ob das Repository in der Datenbank existiert
2. Lädt den generellen Prompt aus dem Backend (in-memory)
3. Speichert den generellen Prompt im `generic_prompt` Feld
4. Speichert den spezifischen Prompt im `specific_prompt` Feld
5. Triggert automatisch eine Neugenerierung der Dokumentation

**Wichtig**: Genereller und spezifischer Prompt werden separat gespeichert und erst bei der Dokumentationsgenerierung kombiniert.

**Quelle**: `src/backend/app/api/routes_prompts.py`

### 4. Repository-spezifischen Prompt abrufen

**Endpunkt**: `GET /prompts/repo/{repo_id}`

**Response**:
```json
{
  "prompt": "Focus on REST API endpoints and include authentication examples."
}
```

**Funktionsweise**:
- Sucht nach dem Prompt für die angegebene `repo_id`
- Gibt **nur** den spezifischen Teil zurück (aus `specific_prompt` Feld)
- Dies erlaubt es Benutzern, nur ihren spezifischen Teil zu bearbeiten
- Gibt einen leeren String zurück, falls kein spezifischer Prompt vorhanden ist

**Quelle**: `src/backend/app/api/routes_prompts.py`

### 5. Dokumentation manuell neu generieren

**Endpunkt**: `POST /repos/regenerate-doc`

**Request Body**:
```json
{
  "repo_id": 1
}
```

**Response**:
```json
{
  "status": "ok",
  "message": "Documentation regenerated successfully for repository <name>"
}
```

**Funktionsweise**:
- Aktualisiert den generellen Prompt aus dem Backend
- Kombiniert generellen und spezifischen Prompt
- Generiert neue Dokumentation mit aktuellem Prompt
- Speichert die Dokumentation in der Datenbank

**Quelle**: `src/backend/app/api/routes_repo.py`

## Verwendung in der Dokumentationsgenerierung

### Dokumentationsgenerierung mit separaten Prompts

Die Funktion `generate_docu()` verwendet die separaten Prompts:

```python
def generate_docu(db: Session, repo_id: int, repo_name: str) -> dict:
    # Get prompt from database
    existing_prompt = db.query(Prompt).filter(Prompt.repo_id == repo_id).first()
    
    # Get current generic prompt from backend (in-memory)
    current_generic_prompt = get_generic_prompt()
    
    # Extract repository content
    repo_content = extract_repository_content(clone_path)
    
    # Update generic prompt if it exists
    if existing_prompt:
        if existing_prompt.generic_prompt != current_generic_prompt:
            existing_prompt.generic_prompt = current_generic_prompt
            db.commit()
        
        # Combine generic and specific prompts
        combined_prompt = existing_prompt.generic_prompt or current_generic_prompt
        if existing_prompt.specific_prompt:
            combined_prompt = f"{combined_prompt}\n\nREPOSITORY-SPECIFIC INSTRUCTIONS:\n{existing_prompt.specific_prompt}"
    else:
        # Use generic prompt from backend
        combined_prompt = current_generic_prompt
    
    # Construct the full prompt with repository content
    prompt_text = f"Generate comprehensive documentation for '{repo_name}'.\n\n{combined_prompt}\n\n{repo_content}"
    
    # Send to LLM
    docu_content = send_prompt(prompt_text)
    # ...
```

**Wichtig**: 
- Genereller Prompt wird bei jeder Dokumentationsgenerierung aus dem Backend aktualisiert
- Prompts werden zur Laufzeit kombiniert
- Der kombinierte Prompt wird mit dem Repository-Code kombiniert und an das LLM gesendet

**Quelle**: `src/backend/app/services/ai_service.py`

### Ablauf der Dokumentationsgenerierung

```
1. POST /ai/generate {repo_ids: [1, 2, 3]}
   ↓
2. Für jede repo_id:
   - Lade Prompt aus DB (repo_id = <id>)
   - Verwende `text` Feld (enthält bereits kombinierten Prompt)
   ↓
3. Klone Repository temporär
   ↓
4. Extrahiere Repository-Code
   ↓
5. Konstruiere finalen Prompt:
   "Generate documentation for '<repo_name>'.\n\n<combined_prompt>\n\n<repo_content>"
   ↓
6. Sende an LLM
   ↓
7. Speichere generierte Dokumentation in `docu` Feld
   ↓
8. Cleanup: Lösche temporäres Repository-Clone
```

**Wichtige Punkte**:
1. Der kombinierte Prompt ist bereits in der DB gespeichert
2. Keine Laufzeit-Kombination von general + specific nötig
3. Repository wird nur temporär geklont (für Code-Extraktion)
4. Dokumentation wird in demselben Prompt-Eintrag gespeichert

**Quelle**: `src/backend/app/services/ai_service.py`

## Repository-Code-Zugriff für LLM

### Überblick

Das System extrahiert automatisch den Quellcode aus dem geklonten Repository und sendet ihn zusammen mit den Prompts an das LLM. Dadurch kann das LLM Dokumentation basierend auf dem tatsächlichen Code-Inhalt generieren, anstatt nur auf Basis des Repository-Namens.

### Funktionsweise

#### 1. Repository-Struktur auslesen (`get_repository_structure`)

```python
def get_repository_structure(target_dir: str, max_depth: int = 3) -> dict
```

**Funktionen**:
- Durchläuft das Repository-Verzeichnis rekursiv
- Sammelt alle Dateien und Unterverzeichnisse
- Begrenzt die Tiefe auf 3 Ebenen (konfigurierbar)
- Ignoriert `.git` Verzeichnisse automatisch

**Quelle**: `src/backend/app/services/ai_service.py` (Zeilen 52-97)

#### 2. Repository-Inhalt extrahieren (`extract_repository_content`)

```python
def extract_repository_content(target_dir: str, max_files: int = 50, max_file_size: int = 10000) -> str
```

**Funktionen**:
- Liest Code-Dateien aus dem Repository
- Filtert nach relevanten Dateitypen (20+ unterstützte Extensions)
- Priorisiert wichtige Dateien (README, Dokumentation, Konfiguration)
- Begrenzt Anzahl und Größe der Dateien

**Parameter**:
- `max_files`: Maximale Anzahl der zu lesenden Dateien (Standard: 50)
- `max_file_size`: Maximale Dateigröße in Bytes (Standard: 10.000 = ~10KB)

**Unterstützte Dateitypen**:
- **Code**: `.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.java`, `.cpp`, `.c`, `.h`, `.cs`, `.go`, `.rs`, `.rb`, `.php`, `.swift`, `.kt`, `.scala`
- **Dokumentation**: `.md`, `.txt`
- **Konfiguration**: `.json`, `.yml`, `.yaml`, `.toml`, `.xml`

**Ignorierte Verzeichnisse**:
- `.git`, `node_modules`, `__pycache__`, `venv`, `.venv`, `dist`, `build`

**Datei-Priorisierung**:
1. README-Dateien (höchste Priorität)
2. Markdown- und Text-Dateien
3. Konfigurationsdateien (JSON, YAML, etc.)
4. Code-Dateien

**Rückgabe**:
Formatierter String mit:
- Repository-Verzeichnisstruktur
- Inhalt aller ausgewählten Dateien
- Jede Datei in einem Code-Block mit Syntax-Highlighting

**Quelle**: `src/backend/app/services/ai_service.py` (Zeilen 100-193)

#### 3. Integration in `generate_docu`

Die Funktion `generate_docu` wurde erweitert, um automatisch Repository-Inhalt zu extrahieren:

```python
# Extract repository content
repo_content = extract_repository_content(repo.target_dir)

# Construct the full prompt with repository content
prompt_parts = [general_prompt]

if repo_specific_prompt:
    prompt_parts.append(f"\n\nRepository-specific instructions:\n{repo_specific_prompt}")

prompt_parts.append(f"\n\n{repo_content}")
prompt_parts.append(f"\n\nPlease generate comprehensive documentation...")

full_prompt = "".join(prompt_parts)
```

**Ablauf**:
1. Prompts aus Datenbank laden (generell + repository-spezifisch)
2. Repository-Code aus `target_dir` extrahieren
3. Alle Teile zu einem vollständigen Prompt kombinieren
4. Prompt-Größe loggen (für Debugging)
5. An LLM senden

**Quelle**: `src/backend/app/services/ai_service.py` (Zeilen 240-264)

### Vorteile

- **Kontextbasiert**: Das LLM hat Zugriff auf den tatsächlichen Code
- **Automatisch**: Keine manuelle Konfiguration erforderlich
- **Intelligent**: Priorisiert wichtige Dateien
- **Sicher**: Größen- und Anzahlbegrenzungen verhindern Token-Overflow
- **Robust**: Fehlerbehandlung bei nicht lesbaren Dateien

### Konfigurierbare Limits

Die Funktion verwendet Standard-Limits, die bei Bedarf angepasst werden können:

```python
# In extract_repository_content():
max_files: int = 50         # Maximale Anzahl Dateien
max_file_size: int = 10000  # Maximale Dateigröße (10KB)

# In get_repository_structure():
max_depth: int = 3          # Maximale Verzeichnistiefe
```

**Hinweis**: Bei sehr großen Repositories könnten diese Limits erhöht werden müssen, jedoch sollte die Token-Limit des verwendeten LLM-Modells beachtet werden.

## Workflow-Diagramm

```
┌─────────────────────────────────────────────────────────────┐
│                    Prompt-Speicherung                        │
└─────────────────────────────────────────────────────────────┘

Frontend/Client
      │
      ├─► POST /prompts/general
      │         │
      │         ├─► Speichert in DB mit name="__GENERAL_PROMPT__"
      │         └─► Response: {status: "ok"}
      │
      └─► POST /prompts/repo
                │
                ├─► Validiert repo_id (UUID)
                ├─► Prüft Repository-Existenz
                ├─► Speichert mit name="__REPO_SPECIFIC__{repo_id}"
                └─► Response: {status: "ok"}

┌─────────────────────────────────────────────────────────────┐
│                 Dokumentationsgenerierung                     │
└─────────────────────────────────────────────────────────────┘

POST /ai/generate {repo_ids: [...]}
      │
      ├─► generate_docu(repo_id)
      │         │
      │         ├─► get_general_prompt(db)
      │         │     └─► Query: name = "__GENERAL_PROMPT__"
      │         │         └─► Return: template or default
      │         │
      │         ├─► get_repo_specific_prompt(db, repo_id)
      │         │     └─► Query: name = "__REPO_SPECIFIC__{repo_id}"
      │         │         └─► Return: template or ""
      │         │
      │         ├─► extract_repository_content(target_dir)
      │         │     ├─► Liest Repository-Verzeichnisstruktur
      │         │     ├─► Filtert Code-Dateien (max 50 Dateien, 10KB/Datei)
      │         │     ├─► Priorisiert: README → Docs → Configs → Code
      │         │     └─► Return: formatierter Code-Inhalt
      │         │
      │         ├─► Kombiniere Prompts + Code:
      │         │     general + specific + repository_content + Anfrage
      │         │
      │         └─► send_prompt(combined_prompt)
      │               └─► LLM generiert Dokumentation mit Code-Kontext
      │
      └─► Speichert Dokumentation in DB und Dateisystem
```

## Wie kann ich Prompts bearbeiten?

### Über die Web-Oberfläche (UI)

Die einfachste Methode, Prompts zu bearbeiten, ist über die Web-Oberfläche:

#### 1. Generellen Prompt bearbeiten

- **Komponente**: `GeneralSetting.jsx`
- **Pfad**: `src/frontend/components/GeneralSetting.jsx`
- **Zugriff**: Über die Admin-Seite → "General Repository Settings"
- **Funktionen**:
  - Anzeige des aktuellen generellen Prompts aus der Datenbank
  - Textarea zum Bearbeiten des Prompts (400px Höhe)
  - Speichern über "Save Changes" Button
  - Automatisches Laden des Prompts beim Öffnen

**Code-Beispiel**:
```javascript
// Laden des Prompts
const { prompt } = await getGeneralPrompt();
setGeneralPrompt(prompt);

// Speichern des Prompts
await saveGeneralPrompt(generalPrompt);
```

#### 2. Repository-spezifischen Prompt bearbeiten

- **Komponente**: `EditSpecificPromptMenu.jsx`
- **Pfad**: `src/frontend/components/EditSpecificPromptMenu.jsx`
- **Zugriff**: Über die Repository-Verwaltung → Repository auswählen → "Edit Specific Prompt"
- **Funktionen**:
  - Bearbeitung für einzelne oder mehrere Repositories gleichzeitig
  - Zeigt "Different prompts" an, wenn mehrere Repositories mit unterschiedlichen Prompts ausgewählt sind
  - Textarea zum Bearbeiten (384px Höhe)
  - Speichern über "Save Changes" Button

**Besonderheiten**:
- Wenn ein Repository ausgewählt ist: Zeigt dessen spezifischen Prompt
- Wenn mehrere Repositories mit gleichem Prompt ausgewählt sind: Zeigt den gemeinsamen Prompt
- Wenn mehrere Repositories mit unterschiedlichen Prompts ausgewählt sind: Zeigt "Different prompts"

**Code-Beispiel**:
```javascript
// Initialer Prompt-Wert
let initialPrompt = "";
if (selectedPrompts.length === 1) {
  initialPrompt = selectedPrompts[0];
} else if (selectedPrompts.every((p) => p === selectedPrompts[0])) {
  initialPrompt = selectedPrompts[0];
} else {
  initialPrompt = "Different prompts";
}
```

### Über die API (programmatisch)

Falls Sie Prompts programmatisch bearbeiten möchten:

#### Generellen Prompt bearbeiten

```bash
# Aktuellen Prompt abrufen
curl -X GET http://localhost:8000/prompts/general

# Neuen Prompt speichern
curl -X POST http://localhost:8000/prompts/general \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Ihr verbesserter genereller Prompt..."}'
```

#### Repository-spezifischen Prompt bearbeiten

```bash
# Aktuellen Prompt abrufen
curl -X GET http://localhost:8000/prompts/repo/{repo_id}

# Neuen Prompt speichern
curl -X POST http://localhost:8000/prompts/repo \
  -H "Content-Type: application/json" \
  -d '{
    "repo_id": "ihre-repo-uuid",
    "prompt": "Ihr verbesserter spezifischer Prompt..."
  }'
```

### Direkt in der Datenbank

**Nicht empfohlen**, aber möglich für fortgeschrittene Benutzer:

```sql
-- Generellen Prompt anzeigen
SELECT * FROM prompts WHERE name = '__GENERAL_PROMPT__';

-- Generellen Prompt aktualisieren
UPDATE prompts 
SET template = 'Ihr neuer Prompt...' 
WHERE name = '__GENERAL_PROMPT__';

-- Repository-spezifischen Prompt anzeigen
SELECT * FROM prompts WHERE name = '__REPO_SPECIFIC__' || 'ihre-repo-uuid';

-- Repository-spezifischen Prompt aktualisieren
UPDATE prompts 
SET template = 'Ihr neuer Prompt...' 
WHERE name = '__REPO_SPECIFIC__' || 'ihre-repo-uuid';
```

**Hinweis**: Bei direkter Datenbankbearbeitung wird `updated_at` nicht automatisch aktualisiert.

## Zusammenfassung

### Wo werden Prompts gespeichert?

- **Datenbank**: PostgreSQL-Datenbank in der Tabelle `prompts`
- **Ort**: Die Datenbank wird über die `DATABASE_URL` in der `.env`-Datei konfiguriert
- **Modell**: Definiert in `src/backend/app/db/models.py` (Klasse `Prompt`)

### Wie werden Prompts abgerufen?

1. **Über API-Endpunkte**:
   - `GET /prompts/general` - Generellen Prompt abrufen
   - `GET /prompts/repo/{repo_id}` - Repository-spezifischen Prompt abrufen

2. **Direkt durch Services**:
   - `get_general_prompt(db)` - Im AI-Service
   - `get_repo_specific_prompt(db, repo_id)` - Im AI-Service

### Wie funktionieren die Prompts?

1. **Speicherung**: Prompts werden über API-Endpunkte gespeichert (POST-Requests)
2. **Identifikation**: Durch eindeutige Namen (`__GENERAL_PROMPT__` oder `__REPO_SPECIFIC__{repo_id}`)
3. **Abruf**: Datenbankabfragen basierend auf dem Namen
4. **Verwendung**: Kombination von generellem und spezifischem Prompt für die LLM-Anfrage
5. **Flexibilität**: Falls kein Prompt gespeichert ist, werden Standardwerte verwendet

## Verwandte Dateien

### Backend
- **API Routes**: `src/backend/app/api/routes_prompts.py` - REST-API-Endpunkte für Prompt-Verwaltung
- **AI Service**: `src/backend/app/services/ai_service.py` - Service-Funktionen zum Abrufen und Kombinieren von Prompts
- **Database Models**: `src/backend/app/db/models.py` - Datenbank-Modell für die `prompts`-Tabelle
- **AI Routes**: `src/backend/app/api/routes_ai.py` - API-Endpunkte für Dokumentationsgenerierung

### Frontend
- **General Settings**: `src/frontend/components/GeneralSetting.jsx` - UI-Komponente zum Bearbeiten des generellen Prompts
- **Specific Prompt Editor**: `src/frontend/components/EditSpecificPromptMenu.jsx` - UI-Komponente zum Bearbeiten von repository-spezifischen Prompts
- **API Client**: `src/frontend/lib/api.js` - Frontend-API-Client mit Funktionen `getGeneralPrompt()` und `saveGeneralPrompt()`
