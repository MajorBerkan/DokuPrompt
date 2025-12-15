/**
 * Azure AD / Entra ID Authentication Configuration
 * Contains MSAL (Microsoft Authentication Library) configuration for authentication
 */

/**
 * Azure AD configuration
 * These values configure the connection to Microsoft Entra ID
 */
export const AZURE = {
  tenantId: "c4a314e1-4621-4689-bda2-6d86a7b535ce",
  frontendClientId: "2ffac781-b614-41c1-9425-dd409da4292c",
  backendAudience: "8c0a4ed6-c830-49ee-8cb1-05113397a04e",
  redirectUri: "http://localhost:5173",
};

/**
 * MSAL configuration object
 * Configures the MSAL library for browser-based authentication
 */
export const msalConfig = {
  auth: {
    clientId: AZURE.frontendClientId,
    authority: `https://login.microsoftonline.com/${AZURE.tenantId}`,
    redirectUri: AZURE.redirectUri,
  },
  cache: { cacheLocation: "localStorage" },
};

/**
 * Login request configuration
 * Defines the scopes requested during authentication
 */
export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    `${AZURE.backendAudience}/access_as_user`,
  ],
};
