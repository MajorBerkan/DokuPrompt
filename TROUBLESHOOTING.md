# Troubleshooting Guide

## Docker Desktop Issues (Windows)

### Error: "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified"

**Symptom:**
```
unable to get image 'redis:7-alpine': error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.48/images/redis:7-alpine/json": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Cause:** Docker Desktop is not running or not properly configured on Windows.

**Solution:**

1. **Start Docker Desktop:**
   - Open Docker Desktop from the Start menu
   - Wait until the icon in the system tray turns green
   - This may take 30-60 seconds on first start

2. **Verify Docker is running:**
   ```powershell
   docker ps
   ```
   
   If this works, Docker is running correctly.

3. **Try again:**
   ```powershell
   docker compose up --build
   ```

**For detailed Windows setup instructions, see:** [Windows Setup Guide](WINDOWS_SETUP.md)

### Error: "WSL 2 installation is incomplete"

**Solution:**
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart your computer
4. Restart Docker Desktop

### Error: "Docker Desktop failed to start"

**Solutions:**

1. **Enable Virtualization in BIOS:**
   - Restart computer and enter BIOS (usually F2, F10, F12, or Del during boot)
   - Look for "Virtualization Technology" or "Intel VT-x/AMD-V"
   - Enable it and save

2. **Reset Docker Desktop:**
   - Right-click Docker icon in system tray
   - Select "Troubleshoot" → "Reset to factory defaults"
   - Wait for reset to complete
   - Restart Docker Desktop

## Database Issues

### Error: "role 'CaffeineCode' does not exist"

**Symptom:**
```
FATAL: role "CaffeineCode" does not exist
sqlalchemy.exc.OperationalError: (psycopg.OperationalError) connection failed: 
connection to server at "172.18.0.X", port 5432 failed: FATAL: password authentication 
failed for user "CaffeineCode"
```

**Cause:** The PostgreSQL database volume was initialized with different credentials than those currently configured in `.env`. This typically happens when:
- The database was set up before the current configuration
- The database volume persists from a previous installation
- Environment variables were changed after initial setup

**Solution:**

The application now includes automatic role creation. When the backend starts, it will:
1. Detect that the CaffeineCode role doesn't exist
2. Connect as the postgres superuser
3. Create the CaffeineCode role automatically
4. Proceed with normal initialization

**Steps to apply the fix:**

1. **Ensure environment variables are set correctly** in `.env`:
   ```bash
   POSTGRES_DB=codedoc
   POSTGRES_USER=CaffeineCode
   POSTGRES_PASSWORD=password
   ```

2. **Restart the backend service:**
   ```bash
   docker-compose restart backend
   ```

3. **Check the backend logs** to confirm the role was created:
   ```bash
   docker-compose logs backend | grep -i "role"
   ```

   You should see:
   ```
   Database role does not exist, attempting to create it...
   Role CaffeineCode created successfully
   Database role 'CaffeineCode' is now ready
   ```

**Alternative solution - Reset the database:**

If you want to start fresh with a clean database:

```bash
# Stop all services
docker-compose down

# Remove the database volume
docker volume rm caffeinecode_postgres_data

# Start services again (database will be initialized fresh)
docker-compose up -d
```

**Note:** This will delete all existing data in the database!

## Issue Summary

After the recent changes, you may experience issues if your database doesn't have the new `description` column yet. The symptoms include:

1. New repositories not appearing after being added
2. Existing repositories showing but their documentations not loading
3. Delete operations only affecting the UI

## Root Cause

The Repository model was updated to include a `description` field, but existing databases don't have this column. When the backend tries to read the `description` field from the database, it causes errors that prevent proper operation.

## Solution

The latest commit (d9852cb) includes an **automatic migration** that will:
- Check if the `description` column exists
- Add it if it's missing
- Run automatically on backend startup

### Steps to Fix

1. **Restart the backend** to apply the migration:
   ```bash
   docker-compose restart backend
   ```

2. **Check the backend logs** to confirm the migration ran:
   ```bash
   docker-compose logs backend | grep -i migration
   ```

   You should see:
   ```
   INFO: Running database migrations...
   INFO: Adding 'description' column to 'repositories' table...
   INFO: Successfully added 'description' column.
   INFO: Database migrations completed.
   ```

3. **Verify the database has the column**:
   ```bash
   docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\d repositories"
   ```

   You should see a `description` column of type `text`.

4. **Refresh the frontend** in your browser (hard refresh with Ctrl+Shift+R or Cmd+Shift+R)

### If Automatic Migration Fails

If the automatic migration doesn't work, you can apply it manually:

```bash
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS description TEXT;"
```

### Verifying Everything Works

After applying the fix:

1. **Test Adding a Repository**:
   - Add a new repository
   - Wait for cloning to complete
   - Refresh the page
   - The repository should still be visible

2. **Test Repository Description**:
   - Click "Show Information" on a repository
   - Enter a description
   - Click "Save Changes"
   - Refresh the page
   - Click "Show Information" again
   - The description should be preserved

3. **Test Deleting a Repository**:
   - Select a repository
   - Click delete
   - Refresh the page
   - The repository should not reappear

4. **Test Documentation Loading**:
   - Generate documentation for a repository
   - Check the sidebar - it should show the documentation
   - Refresh the page
   - The documentation should still be listed

## What Changed

### Backend Changes (commit d9852cb)

1. **Created `migrations.py`**:
   - Automatic migration system
   - Checks if columns exist before adding them
   - Runs on every backend startup (safe to run multiple times)

2. **Updated `init_db.py`**:
   - Calls migration system after creating tables
   - Ensures database schema is always up-to-date

3. **Updated `routes_repo.py`**:
   - Added defensive code to handle missing `description` column
   - Uses `getattr(repo, 'description', None)` to safely access the field

### Why This Happened

SQLAlchemy's `create_all()` only creates new tables - it doesn't modify existing tables to add new columns. This is why existing databases needed a migration.

## Still Having Issues?

If you still experience problems after following these steps:

1. **Check if there are any error messages** in the backend logs:
   ```bash
   docker-compose logs backend --tail=100
   ```

2. **Verify database connection**:
   ```bash
   docker-compose exec backend curl http://localhost:8000/health/db
   ```

3. **Check if all services are running**:
   ```bash
   docker-compose ps
   ```

4. **Try a complete restart**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

5. **Check the frontend console** for any error messages (F12 in browser, then Console tab)

If issues persist, please provide:
- Backend logs from `docker-compose logs backend --tail=100`
- Browser console errors (F12 → Console tab)
- Database schema output from `\d repositories` command

## Frontend Build Issues

### Error: "Identifier 'openRowMenu' has already been declared"

**Symptom:**
```
[plugin:vite:react-babel] /app/components/AdminRepoDataTable.jsx: Identifier 'openRowMenu' has already been declared. (156:9)
```

**Cause:** This error can occur due to:
- Cached build artifacts from a previous version
- Browser cache holding old JavaScript files
- Docker volume cache from previous builds
- Node modules cache

**Solution:**

1. **Use the cache clearing script (easiest):**
   ```bash
   # On Linux/Mac
   cd src/frontend
   ./clear-cache.sh
   
   # On Windows
   cd src\frontend
   clear-cache.bat
   ```

2. **Or manually clear Node modules cache:**
   ```bash
   cd src/frontend
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Clear Vite build cache:**
   ```bash
   cd src/frontend
   rm -rf dist
   rm -rf .vite
   npm run build
   ```

4. **Clear Docker cache (if using Docker):**
   ```bash
   # Stop all containers
   docker-compose down
   
   # Remove frontend volumes
   docker volume rm caffeinecode_frontend_node_modules
   
   # Rebuild without cache
   docker-compose build --no-cache frontend
   docker-compose up -d
   ```

5. **Clear browser cache:**
   - Chrome/Edge: Ctrl+Shift+Del (Windows) or Cmd+Shift+Del (Mac)
   - Select "Cached images and files"
   - Click "Clear data"
   - Or do a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

6. **Restart the development server:**
   ```bash
   cd src/frontend
   npm run dev
   ```

### General Frontend Build Issues

**If you encounter any build errors:**

1. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be v18 or higher.

2. **Clean install dependencies:**
   ```bash
   cd src/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for conflicting processes:**
   ```bash
   # On Linux/Mac
   lsof -i :5173
   # On Windows
   netstat -ano | findstr :5173
   ```
   Kill any processes using port 5173 if found.

4. **Reset everything (nuclear option):**
   ```bash
   # Stop Docker
   docker-compose down -v
   
   # Clean frontend
   cd src/frontend
   rm -rf node_modules dist .vite package-lock.json
   npm install
   
   # Restart
   cd ../..
   docker-compose up --build
   ```
