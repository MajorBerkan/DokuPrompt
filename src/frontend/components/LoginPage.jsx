import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";
import { useState, useEffect } from "react";

/**
 * LoginPage Component
 * Provides authentication interface supporting both mock authentication and Entra ID
 * Displays appropriate login UI based on authentication mode
 * 
 * @returns {React.ReactElement} The login page component
 */
export default function LoginPage() {
  const { login, account, useMockAuth } = useAuth();
  const [mockUsers, setMockUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Fetch available mock users from the backend when in mock authentication mode
   * This is used to display demo account credentials to users
   */
  useEffect(() => {
    if (useMockAuth) {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      fetch(`${API_BASE}/auth/mock-users`)
        .then((res) => res.json())
        .then((data) => setMockUsers(data))
        .catch((err) => console.error("Failed to fetch mock users:", err));
    }
  }, [useMockAuth]);

  /**
   * Handles mock authentication login submission
   * Validates credentials and displays appropriate error messages
   * 
   * @param {Event} e - Form submission event
   */
  const handleMockLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({
        username: email,
        password: password,
      });
    } catch (err) {
      const errorMessage =
        err.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (account) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="flex flex-col items-center min-h-screen bg-white dark:bg-dark-bg text-center px-6 py-10 overflow-auto">
      <header className="flex flex-wrap items-center justify-center gap-4 mt-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Welcome to DokuPrompt!
        </h1>
        <img
          src={"../img/DokuPrompt.png"}
          alt="DokuPrompt"
          style={{ width: "100px", height: "100px" }}
          className={"dark:hidden"}
        />
        <img
          src={"../img/DokuPromptWhite.png"}
          alt="DokuPrompt"
          style={{ width: "100px", height: "100px" }}
          className={"hidden dark:block"}
        />
      </header>

      {useMockAuth ? (
        <div className="flex flex-col items-center justify-center mt-16 max-w-md w-full">
          {error && error.includes("Unable to connect") && (
            <div className="w-full mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              <p className="font-semibold mb-1 dark:text-gray-100">
                ⚠️ Backend Not Running
              </p>
              <p className="text-sm dark:text-gray-100">
                Start the backend server with:
              </p>
              <code className="text-xs bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded block mt-2">
                docker-compose up -d
              </code>
            </div>
          )}

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Sign In
          </h2>

          <form onSubmit={handleMockLogin} className="w-full space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3200c8] text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-[#220094] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="mb-3 font-semibold text-gray-700 dark:text-gray-300">
              Demo Accounts & Credentials:
            </p>
            <div className="space-y-3 text-left">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Admin (Full Access)
                </p>
                <p className="text-xs">
                  Email:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    admin@caffeinecode.com
                  </code>
                </p>
                <p className="text-xs">
                  Password:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    admin123
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  User: Romy Becker
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Editor (Edit Prompts & Generate Docs)
                </p>
                <p className="text-xs">
                  Email:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    bearbeiter@caffeinecode.com
                  </code>
                </p>
                <p className="text-xs">
                  Password:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    editor123
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  User: Paul Haustein
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Viewer (Read-Only)
                </p>
                <p className="text-xs">
                  Email:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    viewer@caffeinecode.com
                  </code>
                </p>
                <p className="text-xs">
                  Password:{" "}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                    viewer123
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  User: Paul Haustein
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-16">
          <p className="dark:text:white text-xl text-black dark:text-gray-100 mb-6 text-lg">
            Please sign in with your Entra ID
          </p>
          <button
            onClick={login}
            className="bg-[#3200c8] dark:bg-[8080ff] text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-[#220094] transition-colors"
          >
            Sign In
          </button>
        </div>
      )}
    </section>
  );
}
