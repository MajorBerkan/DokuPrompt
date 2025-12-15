import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import SideBar from "./components/SideBar.jsx";
import { useNavigate } from "react-router-dom";
import Login from "./components/LoginPage.jsx";
import AdminRepoPage from "./pages/AdminRepoPage.jsx";
import DocumentationViewWrapper from "./components/DocumentationViewWrapper.jsx";
import AppRoutes from "./components/AppRoutes.jsx";
import { listRepos, listDocuments } from "./lib/api.js";
import { useAuth } from "./lib/AuthProvider.jsx";

/**
 * AppContent Component
 * Main content container that provides the layout structure with top bar, sidebar, and main content area
 * Handles search functionality and navigation state management
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - List of repository items
 * @param {Function} props.setItems - Function to update items list
 * @param {number} props.reposRefreshTrigger - Trigger to reload repositories
 * @param {Function} props.setReposRefreshTrigger - Function to update refresh trigger
 * @param {number} props.docsRefreshTrigger - Trigger to reload documentations
 * @param {Function} props.setDocsRefreshTrigger - Function to update docs refresh trigger
 * @param {boolean} props.isDark - Dark mode state
 * @param {Function} props.toggleTheme - Function to toggle theme
 */
function AppContent({
  items,
  setItems,
  reposRefreshTrigger,
  setReposRefreshTrigger,
  docsRefreshTrigger,
  setDocsRefreshTrigger,
  isDark,
  toggleTheme,
}) {
  const location = useLocation();
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [showEditSpecificPrompt, setShowEditSpecificPrompt] = useState(false);
  const [showInformation, setShowInformation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const showSearchField = true;

  /**
   * Handles search input changes in the top bar
   * Automatically navigates to documentations page if not already there
   * 
   * @param {string} value - The search term entered by the user
   */
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (location.pathname !== "/" && location.pathname !== "/documentations") {
      navigate("/documentations");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-dark-bg">
      <TopBar
        showSearchField={showSearchField}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />

      <div className="flex flex-1 min-h-0">
        <SideBar
          refreshTrigger={docsRefreshTrigger}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 p-6 min-h-0 flex flex-col overflow-auto">
          <AppRoutes
            items={items}
            setItems={setItems}
            showGeneralSettings={showGeneralSettings}
            setShowGeneralSettings={setShowGeneralSettings}
            showEditSpecificPrompt={showEditSpecificPrompt}
            setShowEditSpecificPrompt={setShowEditSpecificPrompt}
            showInformation={showInformation}
            setShowInformation={setShowInformation}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setDocsRefreshTrigger={setDocsRefreshTrigger}
            docsRefreshTrigger={docsRefreshTrigger}
            reposRefreshTrigger={reposRefreshTrigger}
            setReposRefreshTrigger={setReposRefreshTrigger}
            isDark={isDark}
          />
        </main>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute Component
 * Wrapper component that protects routes requiring authentication
 * Redirects unauthenticated users to the login page
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactElement} The children or a redirect to login
 */
function ProtectedRoute({ children }) {
  const { account } = useAuth();

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * App Component
 * Main application component that manages routing, authentication, theme, and repository data
 * Sets up the BrowserRouter with login and protected routes
 * 
 * @returns {React.ReactElement} The main application component
 */
export default function App() {
  const { account } = useAuth();

  const [items, setItems] = useState([]);
  const [reposRefreshTrigger, setReposRefreshTrigger] = useState(0);
  const [docsRefreshTrigger, setDocsRefreshTrigger] = useState(0);
  
  /**
   * Initialize dark mode based on saved preference or system preference
   */
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  /**
   * Apply dark mode class to document root when theme changes
   */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  /**
   * Toggles between light and dark theme
   * Saves the preference to localStorage
   */
  const toggleTheme = () => {
    setIsDark((prev) => {
      const newVal = !prev;
      localStorage.setItem("theme", newVal ? "dark" : "light");
      return newVal;
    });
  };

  /**
   * Listen to system color scheme changes
   * Only updates if user hasn't set a manual preference
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("theme")) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /**
   * Loads repositories from the server and merges with document status
   * Preserves transient UI states like "generating" status when refreshing data
   */
  const loadReposFromServer = async () => {
    try {
      const serverItems = await listRepos();

      let documentedRepoNames = new Set();
      try {
        const docs = await listDocuments();
        documentedRepoNames = new Set(docs.map(doc => doc.repo_name));
        console.log("Documented repo names:", Array.from(documentedRepoNames));
      } catch (err) {
        console.error("Failed to load documentation list:", err);
      }

      setItems((currentItems) => {
        const existingItemsMap = new Map(
          currentItems.map((item) => [item.id, item])
        );

        // Preserve repos that are currently being cloned (have taskId and non-terminal status)
        const pendingClones = currentItems.filter(
          (item) => item.taskId && !["SUCCESS", "FAILURE"].includes(item.status)
        );

        // Create a map of pending clones by URL for quick lookup
        const pendingClonesByUrl = new Map(
          pendingClones.map((item) => [item.url || item.id, item])
        );

        const mapped = serverItems.map((r) => {
          const isDocumented = documentedRepoNames.has(r.name);
          const existingItem = existingItemsMap.get(r.id);
          
          // Check if this server repo matches a pending clone by URL
          const pendingClone = pendingClonesByUrl.get(r.repo_url);

          let documentStatus = isDocumented ? "documented" : "Not Documented";
          if (existingItem && existingItem.documentStatus === "generating") {
            documentStatus = "generating";
          }

          // If there's a matching pending clone, merge it with server data
          // Preserve taskId and status from pending clone
          if (pendingClone) {
            return {
              id: r.id,
              url: r.repo_url,
              name: r.name,
              description: r.description || "",
              specificPrompt: r.specific_prompt || "",
              status: pendingClone.status, // Preserve pending status
              documentStatus: documentStatus,
              added: r.date_of_version ? r.date_of_version.split("T")[0] : "",
              taskId: pendingClone.taskId, // Preserve taskId for polling
              result: {
                target_dir: r.target_dir,
                head: r.head_commit,
                active_branch: r.default_branch,
              },
            };
          }

          return {
            id: r.id,
            url: r.repo_url,
            name: r.name,
            description: r.description || "",
            specificPrompt: r.specific_prompt || "",
            status: "SUCCESS",
            documentStatus: documentStatus,
            added: r.date_of_version ? r.date_of_version.split("T")[0] : "",
            taskId: null,
            result: {
              target_dir: r.target_dir,
              head: r.head_commit,
              active_branch: r.default_branch,
            },
          };
        });

        // Only include pending clones that are NOT already in server items
        // (i.e., those that haven't been persisted to the backend yet)
        const pendingClonesNotInServer = pendingClones.filter(
          (pendingClone) => {
            const url = pendingClone.url || pendingClone.id;
            return !serverItems.some((serverItem) => serverItem.repo_url === url);
          }
        );

        // Merge server repos with pending clones that aren't yet on the server
        // Pending clones come first so they appear at the top
        return [...pendingClonesNotInServer, ...mapped];
      });
    } catch (e) {
      console.error("Failed to load repos:", e);
    }
  };

  /**
   * Load repositories when user is authenticated or when refresh is triggered
   */
  useEffect(() => {
    if (account) {
      loadReposFromServer();
    }
  }, [reposRefreshTrigger, account]);

  /**
   * Poll for updates every 20 seconds when user is authenticated
   * This ensures all users see new documentation and repositories without manual refresh
   */
  useEffect(() => {
    if (!account) {
      return; // Don't poll if user is not logged in
    }

    // Set up polling interval
    const pollInterval = setInterval(() => {
      console.log('[App] Polling for updates...');
      setReposRefreshTrigger((prev) => prev + 1);
      setDocsRefreshTrigger((prev) => prev + 1);
    }, 20000); // Poll every 20 seconds

    // Cleanup interval on unmount or logout
    return () => {
      clearInterval(pollInterval);
    };
  }, [account]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppContent
                items={items}
                setItems={setItems}
                reposRefreshTrigger={reposRefreshTrigger}
                setReposRefreshTrigger={setReposRefreshTrigger}
                docsRefreshTrigger={docsRefreshTrigger}
                setDocsRefreshTrigger={setDocsRefreshTrigger}
                isDark={isDark}
                toggleTheme={toggleTheme}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
