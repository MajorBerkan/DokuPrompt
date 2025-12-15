import { useState } from "react";
import { useAuth } from "../lib/AuthProvider.jsx";

/**
 * AdminRepoHeader Component
 * Header section for repository management page
 * Provides input for adding new repositories and access to general settings
 * Only visible to admin users
 *
 * @param {Object} props - Component props
 * @param {Function} props.onSettingsClick - Callback when settings button is clicked
 * @param {Function} props.onAdd - Callback when adding new repositories
 * @returns {React.ReactElement} The admin repository header component
 */
export default function AdminRepoHeader({ onSettingsClick, onAdd }) {
  const [url, setUrl] = useState("");
  const { roles } = useAuth();
  const [sshPopUp, setSSHPopUp] = useState(false);
  const [connectionType, setConnectionType] = useState("ssh");

  // NEU: eigener State für die URL im SSH-Popup
  const [sshUrl, setSshUrl] = useState("");
  const handleAdd = () => {
    const clean = url.trim();
    if (!clean) return;

    const urls = clean.split(/\s+/).filter(Boolean);

    urls.forEach((singleUrl) => {
      onAdd?.({ url: singleUrl });
    });

    setUrl("");
  };

  // NEU: Speichern aus dem SSH-Popup
  const handleSshSave = () => {
    const clean = sshUrl.trim();
    if (!clean) {
      alert("Please enter a repository URL.");
      return;
    }

    // Für das Backend ist es egal, ob HTTPS oder SSH – URL wird validiert
    onAdd?.({ url: clean });

    // Felder zurücksetzen und Popup schließen
    setSshUrl("");
    setSSHPopUp(false);
  };

  return (
    <section className="mb-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Repository Management
        </h2>
        {(roles.includes("Team.Admin") || roles.includes("admin")) && (
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-4 px-4 py-3
             bg-gray-100 dark:bg-gray-800
             hover:bg-gray-200 dark:hover:bg-gray-700
            "
          >
            <span className="text-left text-gray-900 dark:text-gray-100 text-sm leading-tight">
              General Prompt
              <br /> & Update Time Settings
            </span>

            {/* Light mode icon */}

            <img
              src="./img/settings.png"
              alt="Settings"
              className="w-8 h-8 rounded-full object-cover
               transition-transform duration-200 hover:scale-110
               dark:hidden"
            />

            <img
              src="./img/settingsDarkMode.png"
              alt="Settings"
              className="w-8 h-8 rounded-full object-cover
               transition-transform duration-200 hover:scale-110
               hidden dark:block"
            />
          </button>
        )}
      </div>

      {(roles.includes("Team.Admin") || roles.includes("admin")) && (
        <>
          {/* Normaler HTTPS-Input oben */}
          <div className="flex flex-wrap gap-4 items-center w-full">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdd();
                }
              }}
              placeholder="Enter several public repository URLs, seperated by whitespace"
              className="border border-gray-300 dark:border-gray-600 px-3 py-2 flex-1 min-w-[15rem] hover:border-[#3200c8] dark:hover:border-[#8080ff] focus-visible:outline-[#3200c8] dark:focus-visible:outline-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleAdd}
              className="bg-[#3200c8] dark:text-black dark:focus:text-white dark:hover:text-white dark:bg-[#8080ff] text-white px-4 py-2 hover:bg-[#220094] dark:hover:bg-[#6060dd]"
            >
              Add
            </button>
            <button

              className={"text-[#3200c8] dark:bg-dark-bg dark:text-[#8080ff]"}

              onClick={() => setSSHPopUp(true)}
            >
              Add repo with SSH
            </button>
          </div>

          {/* SSH/HTTPS-Dialog */}
          {sshPopUp && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSSHPopUp(false);
              }}
            >
              <div className="bg-white dark:bg-dark-bg shadow-lg w-96 p-6 relative min-h-[370px] flex flex-col justify-between">
                {/* Close Button */}
                <button
                  onClick={() => setSSHPopUp(false)}
                  className="absolute dark:bg-dark-bg top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-200 dark:hover:text-gray-400 text-xl font-bold"
                >
                  &times;
                </button>

                <h2 className="text-xl font-semibold mb-4">Add Repository</h2>

                {/* SSH/HTTPS Toggle */}
                <div className="flex mb-4 border overflow-hidden">
                  <button
                    onClick={() => setConnectionType("ssh")}
                    className={`flex-1 py-2 ${
                      connectionType === "ssh"
                        ? "bg-[#3200c8] text-white"
                        : "bg-gray-200 dark:bg-gray-800 dark:text-gray-200 text-gray-700"
                    }`}
                  >
                    SSH
                  </button>
                  <button
                    onClick={() => setConnectionType("https")}
                    className={`flex-1 py-2 ${
                      connectionType === "https"
                        ? "bg-[#3200c8] text-white"
                        : "bg-gray-200 dark:bg-gray-800 dark:text-gray-200 text-gray-700"
                    }`}
                  >
                    HTTPS
                  </button>
                </div>

                {/* URL-Eingabe (für beide Typen) */}
                <input
                  type="text"
                  placeholder="Repository URL"
                  value={sshUrl}
                  onChange={(e) => setSshUrl(e.target.value)}

                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />

                {/* Zusätzliche Felder je nach Modus (noch nicht angebunden, nur UI) */}
                {connectionType === "ssh" && (
                  <>
                    <input
                      type="password"
                      placeholder="Passphrase (optional)"
                      className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </>
                )}

                {connectionType === "https" && (
                  <>
                    <input
                      type="text"
                      placeholder="Username"

                      className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <input
                      type="password"
                      placeholder="Personal Access Token"
                      className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={handleSshSave}
                    className="bg-[#3200c8] text-white px-4 py-2 hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setSSHPopUp(false)}
                    className="bg-gray-300 px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
