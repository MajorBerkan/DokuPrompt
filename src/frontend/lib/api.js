const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Global access token storage
 * Set by the authentication system when a user logs in
 */
let globalAccessToken = null;

/**
 * Sets the access token for API calls
 * Should be called by the authentication system when a user logs in
 * 
 * @param {string} token - The access token to use for authenticated requests
 */
export function setAccessToken(token) {
  globalAccessToken = token;
}

/**
 * Gets the current access token
 * 
 * @returns {string|null} The current access token or null if not set
 */
export function getAccessToken() {
  return globalAccessToken;
}

/**
 * Helper function to make authenticated API calls
 * Automatically adds authentication header if token is available
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} The parsed JSON response
 * @throws {Error} If the request fails or returns non-OK status
 */
async function fetchWithAuth(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (globalAccessToken) {
    headers.Authorization = `Bearer ${globalAccessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Enqueues a repository clone operation
 * 
 * @param {Object} params - Clone parameters
 * @param {string} params.repo_url - The repository URL to clone
 * @param {number} params.depth - Clone depth (default: 1 for shallow clone)
 * @param {string} params.branch - Branch to clone
 * @returns {Promise<Object>} Task information for the clone operation
 */
export async function enqueueClone({ repo_url, depth = 1, branch }) {
  return fetchWithAuth(`${API_BASE}/repos/clone`, {
    method: "POST",
    body: JSON.stringify({ repo_url, depth, branch }),
  });
}

/**
 * Gets the status of an async task
 * 
 * @param {string} taskId - The task ID to check
 * @returns {Promise<Object>} Task status information
 */
export async function getTask(taskId) {
  return fetchWithAuth(`${API_BASE}/repos/tasks/${taskId}`);
}

/**
 * Lists all repositories
 * 
 * @returns {Promise<Array>} Array of repository objects
 */
export async function listRepos() {
  return fetchWithAuth(`${API_BASE}/repos/list`);
}

/**
 * Deletes a repository
 * 
 * @param {string} repo_id - The ID of the repository to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteRepo(repo_id) {
  return fetchWithAuth(`${API_BASE}/repos/delete`, {
    method: "POST",
    body: JSON.stringify({ repo_id }),
  });
}

/**
 * Makes an authenticated API call
 * Legacy function for authentication purposes
 * 
 * @param {string} path - API endpoint path
 * @param {string} token - Authentication token
 * @returns {Promise<any>} The API response (parsed JSON or text)
 * @throws {Error} If the request fails
 */
export async function callApi(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Updates repository metadata
 * 
 * @param {string} repo_id - The repository ID
 * @param {string} name - New repository name
 * @param {string} description - New repository description
 * @returns {Promise<Object>} Updated repository data
 */
export async function updateRepo(repo_id, name, description) {
  return fetchWithAuth(`${API_BASE}/repos/update`, {
    method: "POST",
    body: JSON.stringify({ repo_id, name, description }),
  });
}

/**
 * Triggers documentation regeneration for a repository
 * 
 * @param {string} repo_id - The repository ID
 * @returns {Promise<Object>} Regeneration status
 */
export async function regenerateDoc(repo_id) {
  const res = await fetch(`${API_BASE}/repos/regenerate-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Saves a repository-specific prompt
 * 
 * @param {string} repoId - The repository ID
 * @param {string} prompt - The prompt text to save
 * @returns {Promise<Object>} Save confirmation
 */
export async function saveSpecificPrompt(repoId, prompt) {
  return fetchWithAuth(`${API_BASE}/prompts/repo`, {
    method: "POST",
    body: JSON.stringify({ repo_id: repoId, prompt }),
  });
}

/**
 * Gets the repository-specific prompt
 * 
 * @param {string} repoId - The repository ID
 * @returns {Promise<Object>} Object containing the prompt
 */
export async function getSpecificPrompt(repoId) {
  const res = await fetch(`${API_BASE}/prompts/repo/${repoId}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Saves the general prompt used for all repositories
 * 
 * @param {string} prompt - The general prompt text
 * @returns {Promise<Object>} Save confirmation
 */
export async function saveGeneralPrompt(prompt) {
  return fetchWithAuth(`${API_BASE}/prompts/general`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

/**
 * Saves general application settings
 * 
 * @param {Object} settings - Settings object
 * @param {string} settings.prompt - General prompt text
 * @param {number} settings.checkInterval - Auto-check interval in seconds
 * @param {boolean} settings.disabled - Whether auto-checking is disabled
 * @returns {Promise<Object>} Updated settings
 */
export async function saveGeneralSettings({ prompt, checkInterval, disabled }) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/settings/general`, {
      method: "PUT",
      body: JSON.stringify({
        prompt,
        checkInterval,
        disabled,
      }),
    });

    return response;
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}

/**
 * Gets general application settings
 * 
 * @returns {Promise<Object>} Settings object with prompt, checkInterval, and disabled
 */
export async function getGeneralSettings() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/settings/general`);
    return response;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Gets the general prompt
 * 
 * @returns {Promise<Object>} Object containing the general prompt
 */
export async function getGeneralPrompt() {
  return fetchWithAuth(`${API_BASE}/prompts/general`);
}

/**
 * Saves a prompt template
 * 
 * @param {Object} template - Template object with name, description, and prompt
 * @returns {Promise<Object>} Saved template with ID
 */
export async function savePromptTemplate(template) {
  return fetchWithAuth(`${API_BASE}/prompt-templates`, {
    method: "POST",
    body: JSON.stringify(template),
  });
}

/**
 * Gets all prompt templates
 * 
 * @returns {Promise<Array>} Array of template objects
 */
export async function getPromptTemplates() {
  return fetchWithAuth(`${API_BASE}/prompt-templates`);
}

/**
 * Updates an existing prompt template
 * 
 * @param {string} templateId - The template ID
 * @param {Object} template - Updated template data
 * @returns {Promise<Object>} Updated template
 */
export async function updatePromptTemplate(templateId, template) {
  return fetchWithAuth(`${API_BASE}/prompt-templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(template),
  });
}

/**
 * Deletes a prompt template
 * 
 * @param {string} templateId - The template ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deletePromptTemplate(templateId) {
  return fetchWithAuth(`${API_BASE}/prompt-templates/${templateId}`, {
    method: "DELETE",
  });
}

/**
 * Triggers documentation generation for one or more repositories
 * 
 * @param {Array<string>} repoIds - Array of repository IDs
 * @returns {Promise<Object>} Generation task information
 */
export async function generateDocu(repoIds) {
  return fetchWithAuth(`${API_BASE}/ai/generate`, {
    method: "POST",
    body: JSON.stringify({ repo_ids: repoIds }),
  });
}

/**
 * Lists all documentation entries
 * 
 * @returns {Promise<Array>} Array of documentation objects
 */
export async function listDocuments() {
  return fetchWithAuth(`${API_BASE}/docs/list`);
}

/**
 * Gets a specific documentation entry
 * 
 * @param {string} docId - The documentation ID
 * @returns {Promise<Object>} Documentation object with content
 */
export async function getDocument(docId) {
  return fetchWithAuth(`${API_BASE}/docs/${docId}`);
}

/**
 * Deletes one or more documentation entries
 * 
 * @param {Array<string>} docIds - Array of documentation IDs to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteDocuments(docIds) {
  return fetchWithAuth(`${API_BASE}/docs/delete`, {
    method: "POST",
    body: JSON.stringify({ doc_ids: docIds }),
  });
}

/**
 * Searches documentation by query string
 * 
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching documentation entries
 */
export async function searchDocuments(query) {
  const res = await fetch(
    `${API_BASE}/docs/search?query=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Gets debug information about the search index
 * 
 * @returns {Promise<Object>} Debug information
 */
export async function debugSearch() {
  const res = await fetch(`${API_BASE}/docs/search/debug`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Triggers documentation updates for one or more repositories
 * 
 * @param {Array<string>} docIds - Array of documentation IDs to update
 * @returns {Promise<Object>} Update task information
 */
export async function updateDocumentation(docIds) {
  const res = await fetch(`${API_BASE}/docs/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_ids: docIds }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Updates the project goal for a specific document
 * 
 * @param {string} docId - The documentation ID
 * @param {string} goal - The new project goal text
 * @returns {Promise<Object>} Update confirmation
 */
export async function updateDocumentGoal(docId, goal) {
  return fetchWithAuth(`${API_BASE}/docs/${docId}/goal`, {
    method: "PUT",
    body: JSON.stringify({ goal }),
  });
}
