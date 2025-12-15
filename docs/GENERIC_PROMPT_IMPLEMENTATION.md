# Generic Prompt Feature - Implementation Documentation

## Overview

This document describes the implementation of the generic (general) prompt feature, which allows administrators to define a base template prompt that can be combined with repository-specific prompts for documentation generation.

## Feature Requirements

Based on the issue:
> Der generic propmt soll etwas anders funktionieren. er ist ein reiner text, der editiert werden kann über ein menü im frontend. er soll beinhalten: was soll getan werden, wie ist die doku aufgebaut und welches format. beim erstellen eines specific prompts soll als resultierender prompt der generic prompt + specific prompt in die datenbank gespeichert werden.

**Translation:**
The generic prompt should work differently. It should be pure text that can be edited via a menu in the frontend. It should contain: what should be done, how the documentation is structured and what format. When creating a specific prompt, the resulting prompt should be the generic prompt + specific prompt saved in the database.

## Database Schema

### New Field: `specific_text`

A new field was added to the `prompt` table via migration `003_add_specific_prompt_field.sql`:

```sql
ALTER TABLE "prompt" ADD COLUMN IF NOT EXISTS "specific_text" text;
```

### Prompt Table Structure

```sql
CREATE TABLE "prompt" (
    "id" integer PRIMARY KEY,
    "text" text NOT NULL,                    -- Combined prompt (general + specific)
    "specific_text" text,                    -- Specific prompt only, for editing
    "created_at" timestamp DEFAULT now(),
    "repo_id" integer,                       -- NULL for general prompt
    "docu" text
);
```

### Storage Strategy

1. **General Prompt:**
   - Stored with `repo_id = NULL`
   - Text prefixed with `__GENERAL_PROMPT__` identifier
   - Contains base instructions for all repositories

2. **Repository-Specific Prompt:**
   - Stored with `repo_id = <repository_id>`
   - `text` field: Combined (general + specific) prompt
   - `specific_text` field: Specific instructions only
   - Used for documentation generation

## API Endpoints

### 1. Save General Prompt

```http
POST /prompts/general
Content-Type: application/json

{
  "prompt": "Your general prompt text here..."
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "General prompt saved successfully"
}
```

### 2. Get General Prompt

```http
GET /prompts/general
```

**Response:**
```json
{
  "prompt": "Your general prompt text..."
}
```

### 3. Save Repository-Specific Prompt

```http
POST /prompts/repo
Content-Type: application/json

{
  "repo_id": 1,
  "prompt": "Specific instructions for this repository..."
}
```

**Process:**
1. Retrieves the general prompt from database
2. Combines: `general_prompt + "\n\n" + specific_prompt`
3. Saves combined version in `text` field
4. Saves specific-only version in `specific_text` field
5. Triggers documentation regeneration

**Response:**
```json
{
  "status": "ok",
  "message": "Prompt saved and documentation regenerated for repository <name>"
}
```

### 4. Get Repository-Specific Prompt

```http
GET /prompts/repo/{repo_id}
```

**Response:**
```json
{
  "prompt": "Specific instructions only..."
}
```

Note: Returns only the specific part (from `specific_text` field), not the combined prompt. This allows users to edit just their specific additions without seeing the general template.

## Implementation Details

### Backend Changes

#### 1. Database Models (`app/db/models.py`)

```python
class Prompt(Base):
    __tablename__ = "prompt"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)  # Combined prompt
    specific_text: Mapped[str | None] = mapped_column(Text)  # Specific only
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now)
    repo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("repo.id", ondelete="CASCADE"))
    docu: Mapped[str | None] = mapped_column(Text)
```

#### 2. Routes (`app/api/routes_prompts.py`)

**Save General Prompt:**
```python
def save_general_prompt(req: SaveGeneralPromptRequest, db: Session):
    prompt_text = f"{GENERAL_PROMPT_NAME}\n{req.prompt}"
    # Find or create general prompt entry with repo_id = NULL
    general_prompt = db.query(Prompt).filter(
        Prompt.repo_id == None, 
        Prompt.text.like(f"%{GENERAL_PROMPT_NAME}%")
    ).first()
    # Update or insert...
```

**Save Specific Prompt:**
```python
def save_specific_prompt(req: SaveRepoPromptRequest, db: Session):
    # Get general prompt
    general_prompt = db.query(Prompt).filter(
        Prompt.repo_id == None,
        Prompt.text.like(f"%{GENERAL_PROMPT_NAME}%")
    ).first()
    
    general_text = ""
    if general_prompt:
        general_text = general_prompt.text.replace(GENERAL_PROMPT_NAME, "").strip()
    
    # Combine prompts
    combined_prompt = general_text
    if req.prompt.strip():
        if general_text:
            combined_prompt = f"{general_text}\n\n{req.prompt}"
        else:
            combined_prompt = req.prompt
    
    # Save with both combined and specific versions
    existing_prompt.text = combined_prompt
    existing_prompt.specific_text = req.prompt
```

#### 3. AI Service (`app/services/ai_service.py`)

**Documentation Generation:**
```python
def generate_docu(db: Session, repo_id: int, repo_name: str):
    # Get the prompt for this repository
    existing_prompt = db.query(Prompt).filter(Prompt.repo_id == repo_id).first()
    
    # Use the combined prompt from the text field
    if existing_prompt and existing_prompt.text:
        combined_prompt = existing_prompt.text
    else:
        # Use default formatting instructions
        combined_prompt = "..."
    
    # Construct final prompt with repository content
    prompt_text = f"Generate documentation for '{repo_name}'.\n\n{combined_prompt}\n\n{repo_content}"
```

### Frontend Components

The frontend already has compatible components:

#### 1. GeneralSetting.jsx

- Displays textarea for editing general prompt
- Calls `getGeneralPrompt()` on mount to load current prompt
- Calls `saveGeneralPrompt(prompt)` when user clicks Save
- No changes needed - already works with new endpoints

#### 2. EditSpecificPromptMenu.jsx

- Displays textarea for editing repository-specific prompt
- Loads specific prompt via API call
- Saves specific prompt which triggers combination with general prompt
- No changes needed - already works with new endpoints

## Usage Flow

### Setting Up General Prompt

1. Admin opens General Settings in frontend
2. Edits the general prompt to include:
   - What should be done (e.g., "Generate comprehensive documentation")
   - How documentation should be structured (e.g., "Use markdown with sections for Overview, API, Examples")
   - What format to use (e.g., "Include code blocks with syntax highlighting")
3. Clicks Save
4. General prompt is stored in database with `repo_id = NULL`

### Creating Repository-Specific Prompt

1. User selects a repository
2. Opens "Edit Specific Prompt" menu
3. Enters repository-specific instructions (e.g., "Focus on REST API endpoints")
4. Clicks Save
5. Backend:
   - Retrieves general prompt
   - Combines with specific prompt
   - Stores combined version in `text` field
   - Stores specific-only in `specific_text` field
   - Triggers documentation regeneration using combined prompt

### Updating General Prompt

When the general prompt is updated:
- Existing repository prompts are NOT automatically updated
- They retain their old combined prompt
- When a repository-specific prompt is next edited/saved, it will use the NEW general prompt

This behavior ensures:
- Stability: Existing documentation doesn't change unexpectedly
- Control: Users can update specific prompts when ready to adopt new general template
- Flexibility: Each repository can be migrated to new general prompt individually

## Example Data Flow

### Step 1: Save General Prompt

**Request:**
```json
POST /prompts/general
{
  "prompt": "Generate comprehensive documentation with:\n- Overview section\n- API reference\n- Code examples\nUse markdown format."
}
```

**Database:**
```
id: 1
repo_id: NULL
text: "__GENERAL_PROMPT__\nGenerate comprehensive documentation with:\n- Overview section\n- API reference\n- Code examples\nUse markdown format."
specific_text: NULL
```

### Step 2: Save Specific Prompt for Repo ID 5

**Request:**
```json
POST /prompts/repo
{
  "repo_id": 5,
  "prompt": "Focus on REST API endpoints and include authentication examples."
}
```

**Database:**
```
id: 2
repo_id: 5
text: "Generate comprehensive documentation with:\n- Overview section\n- API reference\n- Code examples\nUse markdown format.\n\nFocus on REST API endpoints and include authentication examples."
specific_text: "Focus on REST API endpoints and include authentication examples."
```

### Step 3: Documentation Generation

When generating docs for repo ID 5:
1. Load prompt entry where `repo_id = 5`
2. Use `text` field (combined prompt)
3. Add repository content
4. Send to LLM for documentation generation

### Step 4: Edit Specific Prompt

**Request:**
```json
GET /prompts/repo/5
```

**Response:**
```json
{
  "prompt": "Focus on REST API endpoints and include authentication examples."
}
```

User sees only their specific additions, not the general template.

## Migration Path

For existing installations:

1. Run migration `003_add_specific_prompt_field.sql`
2. Existing prompts will have:
   - `text`: Current prompt content
   - `specific_text`: NULL
3. When user next edits a specific prompt:
   - System combines general + new specific
   - Both fields are populated correctly

## Benefits

1. **Consistency:** All repositories use the same base template
2. **Flexibility:** Each repository can add specific instructions
3. **Maintainability:** Update general template in one place
4. **Transparency:** Users editing specific prompts don't see template boilerplate
5. **Control:** Repositories can be updated to new general template individually

## Testing

### Manual Testing Checklist

- [ ] Save general prompt via API
- [ ] Retrieve general prompt via API
- [ ] Save specific prompt for repository
- [ ] Verify combined prompt in database
- [ ] Verify specific_text contains only specific part
- [ ] Retrieve specific prompt via API
- [ ] Update general prompt
- [ ] Save new specific prompt and verify it uses new general
- [ ] Generate documentation and verify it uses combined prompt

### Database Verification

```sql
-- Check general prompt
SELECT * FROM prompt WHERE repo_id IS NULL;

-- Check repository-specific prompts
SELECT id, repo_id, 
       LEFT(text, 50) as combined_preview,
       LEFT(specific_text, 50) as specific_preview
FROM prompt 
WHERE repo_id IS NOT NULL;
```

## Troubleshooting

### Issue: General prompt not combining with specific

**Symptom:** Specific prompt saves but doesn't include general template

**Solution:** 
- Verify general prompt is saved with `repo_id = NULL`
- Check that `text` field contains `__GENERAL_PROMPT__` prefix
- Review backend logs for errors during combination

### Issue: Cannot edit specific prompt

**Symptom:** Editing specific prompt shows empty field or combined prompt

**Solution:**
- Ensure `specific_text` field exists (run migration if needed)
- Verify API endpoint returns `specific_text` not `text` field
- Check frontend is calling correct endpoint

## Future Enhancements

Potential improvements:
1. Add versioning for general prompt changes
2. Option to bulk-update all repositories to new general template
3. Preview combined prompt before saving
4. Template variables/placeholders in general prompt
5. Multiple general templates for different documentation types
