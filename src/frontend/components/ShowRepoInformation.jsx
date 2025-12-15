import { useEffect, useState } from "react";
import {
  getRepoStatusClasses,
  getDocumentStatusClasses,
} from "../lib/statusTags.js";
import { updateRepo } from "../lib/api.js";

/**
 * ShowRepoInformation Component
 * Displays and allows editing of repository information
 * Validates repository names to prevent duplicates
 * 
 * @param {Object} props - Component props
 * @param {Array<string>} props.selectedNames - Names of selected repositories (default: empty array)
 * @param {Array} props.items - List of all repository items
 * @param {Function} props.onClose - Callback to close the information panel
 * @param {Function} props.onSave - Callback when repository information is saved
 * @returns {React.ReactElement} The repository information component
 */
export default function ShowRepoInformation({
  selectedNames = [],
  items = [],
  onClose,
  onSave,
}) {
  const repo = items.find((r) => r.name === selectedNames[0]) || {};
  const allNames = items.map((r) => r.name);

  const [repoName, setRepoName] = useState(repo.name || "");
  const [description, setDescription] = useState(repo.description || "");
  const [status, setStatus] = useState(repo.status || "PENDING");
  const [documentStatus, setDocumentStatus] = useState(
    repo.documentStatus || "Not Documented",
  );
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /**
   * Saves repository information to the backend
   * Validates for duplicate repository names before saving
   */
  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const duplicateName = allNames.some(
        (name) => name === repoName && name !== repo.name,
      );

      if (duplicateName) {
        setError("A repository with this name already exists.");
        setSaving(false);
        return;
      }
      await updateRepo(repo.id, repoName, description);
      onSave({
        originalName: repo.name,
        newName: repoName,
        originalDescription: repo.description,
        newDescription: description,
      });

      onClose();
    } catch (err) {
      console.error("Failed to save repository information:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update form fields when the selected repository changes
   */
  useEffect(() => {
    setRepoName(repo.name || "");
    setDescription(repo.description || "");
    setStatus(repo.status || "PENDING");
    setDocumentStatus(repo.documentStatus || "Not Documented");
  }, [repo]);

  return (
    <section className="mb-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-[#3200C8] dark:text-[#8080ff] dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
            aria-label="Back"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Repository Information
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            Repository Name
          </h4>
          <input
            onChange={(e) => setRepoName(e.target.value)}
            value={repoName}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 hover:border-[#3200c8] dark:hover:border-[#8080ff] focus:outline-none resize-y w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            Description
          </h4>
          <textarea
            onChange={(e) => setDescription(e.target.value)}
            value={description}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 hover:border-[#3200c8] dark:hover:border-[#8080ff] focus:outline-none resize-y w-full min-h-[12rem] max-h-[16rem] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Repository Status:
          </span>
          <span
            className={`inline-block px-2.5 py-1.5 text-sm font-semibold rounded-full ${getRepoStatusClasses(
              status,
            )}`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Documentation Status:
          </span>
          <span
            className={`inline-block px-2.5 py-1.5 text-sm font-semibold rounded-full ${getDocumentStatusClasses(
              documentStatus,
            )}`}
          >
            {documentStatus.replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#3200c8] dark:bg-[#8080ff] text-white px-4 py-2 rounded inline-flex items-center gap-2 hover:bg-[#220094] dark:hover:bg-[#6060dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="../img/save.png" alt="Save" className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
