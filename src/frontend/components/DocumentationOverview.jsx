/**
 * DocumentationOverview Component
 * Displays a searchable overview of all documentation entries
 * Provides selection, deletion, and update capabilities for documentation
 * Supports search with highlighted results
 * 
 * @param {Object} props - Component props
 * @param {string} props.searchTerm - Current search term
 * @param {Array} props.documentations - Array of documentation objects
 * @param {Function} props.onDelete - Callback for deleting documentation
 * @param {Function} props.onUpdate - Callback for updating documentation
 * @param {boolean} props.isDark - Dark mode state
 * @param {boolean} props.isDeleting - Whether deletion is in progress
 * @param {boolean} props.isUpdating - Whether update is in progress
 * @param {number} props.actionCount - Count of actions being performed
 * @returns {React.ReactElement} The documentation overview component
 */
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { searchDocuments, debugSearch } from "../lib/api.js";
import { useAuth } from "../lib/AuthProvider.jsx";
import Spinner from "./Spinner.jsx";
import DeleteModal from "./DeleteModal.jsx";

/**
 * Highlights search term in text by wrapping matches in mark tags
 * 
 * @param {string} text - The text to highlight
 * @param {string} term - The term to search for and highlight
 * @returns {Array|string} Array of React elements with highlighted terms or original text
 */
export const highlightText = (text, term) => {
  if (!term || !text) return text;
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedTerm})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-600">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export default function DocumentationOverview({
  searchTerm = "",
  documentations = [], // eslint-disable-line no-unused-vars
  onDelete,
  onUpdate,
  isDark,
  isDeleting = false,
  isUpdating = false,
  actionCount = 0,
}) {
  const { roles } = useAuth();
  const [selectedRows, setSelectedRows] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [actionsMenu, setActionsMenu] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const actionsButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: -300 });
  const actionsMenuRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docsToDelete, setDocsToDelete] = useState([]);

  /**
   * Fetches debug information about available documents on mount
   */
  useEffect(() => {
    (async () => {
      try {
        const debug = await debugSearch();
        console.log("[SEARCH DEBUG] Available documents:", debug);
      } catch (err) {
        console.error("[SEARCH DEBUG] Failed to get debug info:", err);
      }
    })();
  }, []);

  /**
   * Closes actions menu when clicking outside
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        actionsMenu &&
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target)
      ) {
        setActionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsMenu, actionsMenuRef]);

  /**
   * Positions actions menu portal relative to trigger button
   */
  useLayoutEffect(() => {
    if (actionsMenu && actionsButtonRef.current) {
      const rect = actionsButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY - 80,
        left: rect.left + window.scrollX + 84,
      });
    }
  }, [actionsMenu]);

  /**
   * Performs search when searchTerm changes (with debouncing)
   */
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const trimmedTerm = searchTerm.trim();
        console.log(`[SEARCH] Searching for: "${trimmedTerm}"`);
        const results = await searchDocuments(trimmedTerm);
        console.log(`[SEARCH] Got ${results.length} results:`, results);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const trimmedSearchTerm = searchTerm ? searchTerm.trim() : "";
  const filteredDocs = trimmedSearchTerm ? searchResults : [];

  /**
   * Gets content preview for a documentation entry
   * 
   * @param {Object} doc - The documentation object
   * @returns {string} Content preview text
   */
  const getContentPreview = (doc) => {
    return doc.content_snippet || "";
  };

  // Helper to render content with highlighting only if term is present
  const renderContent = (doc, term) => {
    const content = getContentPreview(doc);
    if (!content || !term) return content;

    // Check if the search term is actually in the content
    const contentLower = content.toLowerCase();
    const termLower = term.toLowerCase();
    const matchIndex = contentLower.indexOf(termLower);

    if (matchIndex !== -1) {
      // Found the term - adjust snippet to show match near the beginning
      // Take some context before the match (max 20 chars) so it reads naturally
      const contextBefore = 20;
      const start = Math.max(0, matchIndex - contextBefore);

      // Trim the content to start from the context position
      let trimmedContent = content.substring(start);

      // Add ellipsis if we trimmed from the beginning
      if (start > 0) {
        trimmedContent = "..." + trimmedContent;
      }

      return highlightText(trimmedContent, term);
    }

    // If not, just return the content without highlighting
    return content;
  };

  // Row selection handler
  const handleRowClick = (docId, event) => {
    const index = filteredDocs.findIndex((d) => d.id === docId);

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const range = filteredDocs.slice(start, end + 1).map((d) => d.id);
      setSelectedRows((prev) => Array.from(new Set([...prev, ...range])));
    } else {
      setSelectedRows((prev) =>
        prev.includes(docId)
          ? prev.filter((id) => id !== docId)
          : [...prev, docId],
      );
      setLastSelectedIndex(index);
    }
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedRows.length === filteredDocs.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredDocs.map((d) => d.id));
    }
  };

  // Hide actions menu when no rows selected
  useEffect(() => {
    if (selectedRows.length === 0 && actionsMenu === true) {
      setActionsMenu(false);
    }
  }, [selectedRows, actionsMenu]);

  // Helper function to refresh search results
  const refreshSearchResults = async () => {
    if (searchTerm && searchTerm.trim() !== "") {
      try {
        const trimmedTerm = searchTerm.trim();
        const results = await searchDocuments(trimmedTerm);
        setSearchResults(results);
      } catch (err) {
        console.error("Search refresh failed:", err);
        setSearchResults([]);
      }
    }
  };

  // Handle action selection
  const handleActionClick = async (action) => {
    setActionsMenu(false);
    const selected = [...selectedRows];
    setSelectedRows([]);

    if (action === "Delete") {
      // Get documentation titles for the modal
      const docsInfo = selected
        .map((id) => {
          const doc = filteredDocs.find((d) => d.id === id);
          return doc ? { id: doc.id, title: doc.title } : null;
        })
        .filter(Boolean);
      setDocsToDelete(docsInfo);
      setShowDeleteModal(true);
    } else if (action === "Update manually") {
      await onUpdate(selected);
      // Refresh search results after update
      await refreshSearchResults();
    }
  };

  // Handle confirm delete from modal
  const handleConfirmDelete = async () => {
    if (docsToDelete.length > 0 && onDelete) {
      const docIds = docsToDelete.map((doc) => doc.id);
      await onDelete(docIds);
    }
    setShowDeleteModal(false);
    setDocsToDelete([]);

    // Refresh search results after deletion
    await refreshSearchResults();
  };

  // Role-based action options: Admin and Editor can delete, Viewer cannot
  const isAdminOrEditor =
    roles.includes("admin") ||
    roles.includes("Team.Admin") ||
    roles.includes("bearbeiter") ||
    roles.includes("Team.Editor");
  const actionOptions = isAdminOrEditor ? ["Delete", "Update manually"] : [];
  const iconMap = {
    Delete: "delete.png",
    "Update manually": "update.png",
  };
  const darkIconMap = {
    Delete: "deleteDarkMode.png",
    "Update manually": "updateDarkMode.png",
  };

  // Show default view when no search term
  if (!trimmedSearchTerm) {
    return (
      <section className="flex flex-col items-center justify-center h-full">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Documentation Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select a documentation from the sidebar to open it.
        </p>
      </section>
    );
  }

  // Show search results
  return (
    <section className="bg-white dark:bg-dark-bg p-4 select-none flex flex-col h-full overflow-x-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-5">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Search Results
          </h3>

          {/* Select All / Deselect All Button */}
          {actionOptions.length > 0 && filteredDocs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`border px-3 py-2 w-28
                ${
                  selectedRows.length === filteredDocs.length
                    ? "bg-[#3200c8] dark:bg-[#8080ff] text-white border-[#3200c8] dark:border-[#8080ff]"
                    : "bg-white dark:bg-dark-bg text-[#3200c8] dark:text-[#8080ff] hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                }`}
            >
              {selectedRows.length === filteredDocs.length
                ? "Deselect All"
                : "Select All"}
            </button>
          )}

          {/* Actions Button */}
          {actionOptions.length > 0 && selectedRows.length > 0 && (
            <div className="relative inline-block">
              <button
                ref={actionsButtonRef}
                onClick={() => setActionsMenu(!actionsMenu)}
                className="bg-[#3200c8] dark:bg-[#8080ff] text-white border border-[#3200c8] dark:border-[#8080ff] px-3 py-2 hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Actions
              </button>

              {actionsMenu &&
                createPortal(
                  <div
                    ref={actionsMenuRef}
                    style={{
                      position: "absolute",
                      top: menuPosition.top,
                      left: menuPosition.left,
                      zIndex: 1000,
                      width: "12rem",
                    }}
                    className="dark:bg-gray-700 dark:border-gray-600 bg-white shadow-lg border border-gray-200 z-20"
                  >
                    {actionOptions.map((option) => (
                      <button
                        key={option}
                        className="flex items-center gap-4 w-full dark:bg-gray-700 text-left px-4 py-2 bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100"
                        onClick={() => handleActionClick(option)}
                      >
                        <img
                          key={option + isDark} //no cache for pictures
                          src={
                            isDark
                              ? `../img/${darkIconMap[option]}`
                              : `../img/${iconMap[option]}`
                          }
                          alt={option}
                          className="w-6 h-6"
                        />
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {isDeleting && (
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
          {actionCount} documentations are being deleted...
          <Spinner size={32} color="#3200c8" />
        </div>
      )}
      {isUpdating && (
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
          {actionCount}{" "}
          {actionCount === 1 ? "documentation is" : "documentations are"} being
          updated...
          <Spinner size={32} color="#3200c8" />
        </div>
      )}

      {actionOptions.length > 0 &&
        selectedRows.length > 0 &&
        !isDeleting &&
        !isUpdating && (
          <span className="text-gray-900 dark:text-gray-100 mb-2">
            {selectedRows.length} selected
          </span>
        )}

      {/* Table */}
      <div className="relative flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700 min-h-0">
        <div className="h-full overflow-y-auto">
          <table className="w-full min-w-max text-left">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
              <tr className="border-b bg-gray-100 dark:bg-gray-700">
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Title
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Added
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Latest Update
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Content
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100"></th>
              </tr>
            </thead>
            <tbody>
              {isSearching ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center text-gray-500 dark:text-gray-400 py-6"
                  >
                    Searching...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center text-gray-500 dark:text-gray-400 py-6"
                  >
                    No results!
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={(e) => handleRowClick(doc.id, e)}
                    className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors
                  ${
                    selectedRows.includes(doc.id)
                      ? "bg-[#00f0ff1a] dark:bg-[#00f0ff33]"
                      : "hover:bg-[#00f0ff1a] dark:hover:bg-[#00f0ff33]"
                  }`}
                  >
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {highlightText(doc.title, searchTerm)}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {doc.added ||
                        new Date(doc.created_at).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {doc.latestUpdate ||
                        new Date(doc.updated_at).toISOString().slice(0, 10)}
                    </td>
                    <td
                      style={{
                        maxWidth: "50vw",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      className="py-2 px-3 text-gray-900 dark:text-gray-100"
                    >
                      {renderContent(doc, trimmedSearchTerm)}
                    </td>
                    <td className="py-2 px-3">
                      <Link
                        to={`/documentations/${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block px-3 py-1  bg-white dark:bg-dark-bg text-[#3200c8] dark:text-[#8080ff] dark:hover:text-[#B1B1ff]  "
                      >
                        View Documentation
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDocsToDelete([]);
        }}
        onConfirm={handleConfirmDelete}
        itemType="documentation"
        itemName={
          docsToDelete.length === 1
            ? docsToDelete[0]?.title
            : `${docsToDelete.length} documentations`
        }
      />
    </section>
  );
}
