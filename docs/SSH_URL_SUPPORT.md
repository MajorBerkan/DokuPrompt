# SSH URL Support for Git Repositories

## Overview

CaffeineCode supports adding git repositories using SSH URLs in addition to HTTPS URLs.

**New in this version:** 
- SSH URLs are automatically converted to HTTPS for validation when possible, allowing public repositories to be validated without SSH keys
- If HTTPS validation fails, the system falls back to SSH validation
- SSH repositories can be saved to the database even when SSH authentication is not yet configured
- The original SSH URL is saved (not the converted HTTPS URL) to maintain your preference

This smart conversion means:
- ✅ Public repos with SSH URLs work immediately without SSH configuration
- ✅ Private repos can still be added with a warning to configure SSH keys later

## Supported URL Formats

### HTTPS URLs (No authentication required for public repos)
- `https://github.com/user/repo.git`
- `https://github.com/user/repo`
- `https://gitlab.com/group/project.git`
- `http://github.com/user/repo.git` (not recommended, use HTTPS)

### SSH URLs (Automatically converted to HTTPS for validation)
- `git@github.com:user/repo.git` (standard SSH format)
- `git@gitlab.com:group/project.git`
- `git@bitbucket.org:team/repo.git`
- `ssh://git@github.com/user/repo.git` (explicit SSH protocol)

**Note:** SSH URLs are automatically converted to HTTPS (e.g., `git@github.com:user/repo.git` → `https://github.com/user/repo.git`) for validation. If the repository is publicly accessible, it will be validated successfully without SSH keys. The original SSH URL is saved to the database.

## SSH URL Validation Strategy

When you add an SSH URL, the system follows this smart validation strategy:

1. **Automatic HTTPS Conversion**: The SSH URL is converted to HTTPS (e.g., `git@github.com:user/repo.git` → `https://github.com/user/repo.git`)
2. **HTTPS Validation**: The system tries to validate using the HTTPS URL
   - ✅ If successful (public repo): Repository is saved immediately, no SSH configuration needed
   - ❌ If fails: System falls back to SSH validation
3. **SSH Validation Fallback**: If HTTPS validation fails, the original SSH URL is validated
   - ✅ If successful (SSH keys configured): Repository is saved
   - ⚠️ If SSH auth fails: Repository is saved with a warning to configure SSH keys later

**Benefit**: Public repositories work immediately with SSH URLs, no configuration needed!

## SSH Authentication Setup

SSH authentication is only needed for private repositories or when HTTPS validation fails.

### For Docker Deployment (Recommended)

If you're using SSH URLs, you need to mount your SSH keys into the backend and celery containers:

1. **Generate SSH keys** (if you don't have them):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_caffeinecode
   ```

2. **Add the public key to your git provider**:
   - GitHub: Settings → SSH and GPG keys → New SSH key
   - GitLab: Preferences → SSH Keys
   - Bitbucket: Personal settings → SSH keys

3. **Update `docker-compose.yml`** to mount SSH keys:
   ```yaml
   backend:
     # ... existing configuration ...
     volumes:
       - ./src/backend:/app
       - ~/.ssh:/root/.ssh:ro  # Add this line
   
   celery:
     # ... existing configuration ...
     volumes:
       - ./src/backend:/app
       - ~/.ssh:/root/.ssh:ro  # Add this line
   ```

4. **Ensure SSH known_hosts is configured**:
   
   You can either:
   
   **Option A**: Accept host keys on first connection
   ```yaml
   backend:
     environment:
       GIT_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no"
   
   celery:
     environment:
       GIT_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no"
   ```
   
   **Option B**: Pre-populate known_hosts (more secure)
   ```bash
   ssh-keyscan github.com >> ~/.ssh/known_hosts
   ssh-keyscan gitlab.com >> ~/.ssh/known_hosts
   ssh-keyscan bitbucket.org >> ~/.ssh/known_hosts
   ```

5. **Restart the containers**:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Testing SSH Access

Before adding a repository via SSH, verify that the backend can access it:

```bash
# Access the backend container
docker compose exec backend bash

# Test SSH connection to GitHub
ssh -T git@github.com

# Test cloning a repository
git ls-remote git@github.com:user/repo.git
```

Expected output for GitHub:
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

## When to Use HTTPS vs SSH

### Use HTTPS when:
- ✅ Accessing public repositories (no authentication needed)
- ✅ Simple setup, no SSH key management required
- ✅ Working in environments where SSH is blocked/restricted

### Use SSH when:
- ✅ Accessing private repositories with SSH key authentication
- ✅ You already have SSH keys configured
- ✅ You prefer key-based authentication over tokens
- ✅ Working with repositories that require SSH (some CI/CD systems)

## Repository Save Behavior

### When Repositories ARE Saved to Database:
- ✅ **HTTPS URLs** that validate successfully (public repositories)
- ✅ **SSH URLs** that validate successfully via HTTPS conversion (public repositories)
  - SSH URL is converted to HTTPS automatically
  - Original SSH URL is saved to database
  - No SSH configuration needed!
- ✅ **SSH URLs** that validate successfully with SSH (SSH keys configured)
- ✅ **SSH URLs** with authentication errors (`Permission denied (publickey)`)
  - HTTPS conversion tried first, then SSH validation
  - Saved with a warning message
  - You can configure SSH keys later
- ✅ **SSH URLs** with host key verification errors
  - Saved with a warning message
  - You can add the host to known_hosts later

### When Repositories are NOT Saved to Database:
- ❌ **Repository not found** errors (for both HTTPS and SSH)
- ❌ **Network errors** (host unreachable, DNS failures)
- ❌ **Other validation errors** (invalid URL format, etc.)

### How SSH URL Validation Works:
1. **SSH URL Detection**: System checks if URL is SSH format (e.g., `git@github.com:user/repo.git`)
2. **HTTPS Conversion**: Converts to HTTPS (e.g., `https://github.com/user/repo.git`)
3. **HTTPS Validation**: Tries to validate via HTTPS
   - ✅ Success → Save immediately (public repo)
   - ❌ Fail → Try SSH validation
4. **SSH Validation**: Validates with original SSH URL
   - ✅ Success → Save (SSH keys configured)
   - ⚠️ Auth Error → Save with warning (configure SSH later)
   - ❌ Not Found → Don't save (invalid repo)

This smart validation means public repositories work immediately with SSH URLs, without any SSH configuration!

## Troubleshooting

### "Permission denied (publickey)" error
**What happens now:** The repository is saved to the database with a warning message indicating that SSH keys need to be configured.

**To resolve:**
- Verify SSH keys are mounted correctly in the container
- Check that the public key is added to your git provider
- Ensure the private key has correct permissions (600)
- Test SSH connection manually (see Testing SSH Access above)

**Note:** You can add repositories with this error and configure SSH keys later. The repository will remain in the database.

### "Host key verification failed" error
**What happens now:** The repository is saved to the database with a warning message.

**To resolve:**
- Add the git host to known_hosts (see SSH setup steps above)
- Or use `GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no"` (less secure)

**Note:** The repository is saved even with this error. You can configure the host key later.

### Repository validation fails (not found/network errors)
**What happens now:** The repository is NOT saved to the database.

**To resolve:**
- Verify the repository exists and you have access
- Test with `git ls-remote <url>` manually
- Check network connectivity from the container
- Ensure the URL is correct

## Security Considerations

1. **Private Keys**: Never commit private SSH keys to the repository
2. **Read-only Keys**: Consider using read-only deploy keys for repositories
3. **Key Rotation**: Regularly rotate SSH keys used for repository access
4. **Minimal Permissions**: Use keys with minimal required permissions
5. **Known Hosts**: Verify host keys instead of disabling host key checking when possible

## Examples

### Adding a Public Repository (HTTPS)
```
Input: https://github.com/torvalds/linux.git
Status: ✅ Works immediately, no configuration needed
Result: Repository saved successfully
```

### Adding a Public Repository (SSH URL)
```
Input: git@github.com:torvalds/linux.git
Status: ✅ Works immediately via automatic HTTPS conversion
Result: - SSH URL converted to HTTPS for validation
        - Validation succeeds (public repo)
        - Original SSH URL saved to database
        - No SSH configuration needed!
```

### Adding a Private Repository (SSH) - With SSH Keys Configured
```
Input: git@github.com:myorg/private-repo.git
Status: ✅ Works after SSH key configuration
Process: - Tries HTTPS conversion first (fails - private repo)
         - Falls back to SSH validation (succeeds)
Result: Repository saved successfully
```

### Adding a Private Repository (SSH) - Without SSH Keys Configured
```
Input: git@github.com:myorg/private-repo.git
Status: ⚠️ Saved with warning
Process: - Tries HTTPS conversion first (fails - private repo)
         - Falls back to SSH validation (fails - no SSH keys)
         - Still saves to database with warning
Result: Repository saved to database with warning message:
        "SSH authentication failed. Please configure SSH keys for the repository."
Action: Configure SSH keys later to access the repository content
```

### Repository Not Found
```
Input: https://github.com/nonexistent/repo.git
Status: ❌ Not saved
Result: Error message: "Repository not found or access denied."
Action: Verify the URL and try again
```

### Adding via Frontend
1. Navigate to Repository Management
2. Enter URL in the input field (HTTPS or SSH format)
3. Click "Add"
4. The system will:
   - Save the repository if validation succeeds OR if it's an SSH authentication error
   - Show a warning if SSH authentication needs to be configured
   - Show an error if the repository doesn't exist or has network issues

## Related Files Modified

- `src/backend/app/api/routes_repo.py` - Added SSH URL validation
- `src/backend/app/worker/tasks_git.py` - Enhanced to save SSH repositories even with auth errors
- `src/backend/app/services/git_service.py` - Already supports SSH via GitPython
- `src/frontend/components/AdminRepoHeader.jsx` - Updated UI to indicate SSH support
- `docs/SSH_URL_SUPPORT.md` - This documentation
- `src/backend/app/services/git_service.py` - Already supports SSH via GitPython
