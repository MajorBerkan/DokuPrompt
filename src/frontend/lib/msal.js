/**
 * MSAL Instance Configuration
 * Creates and initializes the Microsoft Authentication Library instance
 */
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

/**
 * Singleton MSAL application instance
 * Used throughout the application for authentication operations
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * MSAL initialization promise
 * Ensures the instance is ready before authentication operations
 * Should be awaited before using the MSAL instance
 */
export const msalReady = msalInstance.initialize();
