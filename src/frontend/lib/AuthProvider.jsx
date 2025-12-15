import { createContext, useContext, useEffect, useState } from "react";
import { msalInstance, msalReady } from "./msal";
import { loginRequest, AZURE } from "./authConfig";
import { setAccessToken as setApiAccessToken } from "./api";

/**
 * Determines whether to use mock authentication or Entra ID
 * Set via environment variable VITE_USE_MOCK_AUTH
 */
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === "true";

const AuthCtx = createContext(null);

/**
 * Parses a JWT token and extracts its payload
 * 
 * @param {string} token - The JWT token to parse
 * @returns {Object} The parsed token payload, or empty object on error
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse token:", e);
    return {};
  }
}

/**
 * AuthProvider Component
 * Provides authentication context to the application
 * Supports both mock authentication (for development/testing) and Entra ID (for production)
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that need access to auth context
 * @returns {React.ReactElement} The auth provider component
 */
export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [roles, setRoles] = useState([]);

  /**
   * Initialize authentication on component mount
   * Restores session for mock auth or handles redirect for Entra ID
   */
  useEffect(() => {
    (async () => {
      if (USE_MOCK_AUTH) {
        const storedToken = sessionStorage.getItem("mock_session_token");
        const storedUser = sessionStorage.getItem("mock_user");

        if (storedToken && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setAccount({ username: user.email, name: user.display_name });
            setAccessToken(storedToken);
            setApiAccessToken(storedToken);
            setRoles([user.role]);
          } catch (e) {
            console.error("Failed to restore mock session:", e);
            sessionStorage.removeItem("mock_session_token");
            sessionStorage.removeItem("mock_user");
          }
        }
      } else {
        try {
          await msalReady;
          const res = await msalInstance.handleRedirectPromise();
          const acc = res?.account || msalInstance.getAllAccounts()[0] || null;
          if (acc) {
            setAccount(acc);
            try {
              await acquireTokenInternal(acc);
            } catch (e) {
              console.error("Failed to acquire token on init:", e);
            }
          }
        } catch (e) {
          console.error("MSAL init/redirect failed:", e);
        }
      }
    })();
  }, []);

  /**
   * Acquires an access token for API calls (Entra ID only)
   * Extracts user roles from the token claims
   * 
   * @param {Object} acc - The MSAL account object
   * @returns {Promise<string>} The access token
   */
  const acquireTokenInternal = async (acc) => {
    await msalReady;
    if (!acc) throw new Error("No account");
    const result = await msalInstance.acquireTokenSilent({
      account: acc,
      scopes: [`${AZURE.backendAudience}/access_as_user`],
    });
    setAccessToken(result.accessToken);
    setApiAccessToken(result.accessToken);

    const claims = parseJwt(result.accessToken);
    const tokenRoles = claims.roles || [];
    setRoles(tokenRoles);

    return result.accessToken;
  };

  /**
   * Logs in the user
   * Uses mock authentication if enabled, otherwise uses Entra ID popup
   * 
   * @param {Object|null} mockCredentials - Credentials for mock auth (username, password)
   * @returns {Promise<Object>} Login response data
   */
  const login = async (mockCredentials = null) => {
    if (USE_MOCK_AUTH && mockCredentials) {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: mockCredentials.username,
            password: mockCredentials.password,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Login failed: ${errorText}`);
        }

        const data = await response.json();

        sessionStorage.setItem("mock_session_token", data.token);
        sessionStorage.setItem("mock_user", JSON.stringify(data.user));

        setAccount({ username: data.user.email, name: data.user.display_name });
        setAccessToken(data.token);
        setApiAccessToken(data.token);
        setRoles([data.user.role]);

        return data;
      } catch (error) {
        console.error("Mock login error:", error);
        throw new Error(
          `Unable to connect to server. Please ensure the backend is running at ${API_BASE}`,
        );
      }
    } else {
      await msalReady;
      const res = await msalInstance.loginPopup(loginRequest);
      setAccount(res.account);
      setAccessToken(null);
      setRoles([]);
      try {
        await acquireTokenInternal(res.account);
      } catch (e) {
        console.error("Failed to acquire token after login:", e);
      }
    }
  };

  /**
   * Logs out the user
   * Clears session storage for mock auth or MSAL cache for Entra ID
   * Does not redirect to Microsoft logout page (app-only logout)
   */
  const logout = async () => {
    if (USE_MOCK_AUTH) {
      const token = sessionStorage.getItem("mock_session_token");
      if (token) {
        const API_BASE =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        try {
          await fetch(`${API_BASE}/auth/logout?token=${token}`, {
            method: "POST",
          });
        } catch (e) {
          console.error("Failed to logout on server:", e);
        }

        sessionStorage.removeItem("mock_session_token");
        sessionStorage.removeItem("mock_user");
      }

      setAccount(null);
      setAccessToken(null);
      setRoles([]);
      setApiAccessToken(null);
    } else {
      await msalReady;

      try {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith("msal."))
          .forEach((key) => window.localStorage.removeItem(key));
      } catch (e) {
        console.warn("Could not clear MSAL cache from localStorage:", e);
      }

      setAccount(null);
      setAccessToken(null);
      setRoles([]);
      setApiAccessToken(null);
    }
  };

  /**
   * Acquires or refreshes an access token (Entra ID only)
   * 
   * @returns {Promise<string>} The access token
   */
  const acquireToken = async () => {
    const acc = account || msalInstance.getAllAccounts()[0];
    return acquireTokenInternal(acc);
  };

  return (
    <AuthCtx.Provider
      value={{
        account,
        accessToken,
        roles,
        login,
        logout,
        acquireToken,
        useMockAuth: USE_MOCK_AUTH,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 * 
 * @returns {Object} Authentication context with account, tokens, and auth methods
 */
export function useAuth() {
  return useContext(AuthCtx);
}
