import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminRepoPage from "../pages/AdminRepoPage.jsx";
import DocumentationViewWrapper from "./DocumentationViewWrapper.jsx";
import DocumentationOverview from "./DocumentationOverview.jsx";
import NotificationPopUp from "./NotificationPopUp.jsx";
import {
  listDocuments,
  deleteDocuments,
  updateDocumentation,
} from "../lib/api.js";
import NoAccess from "./NoAccess.jsx";
import { useAuth } from "../lib/AuthProvider.jsx";

/**
 * AppRoutes Component
 * Defines and manages application routing and shared state for different views
 * Handles loading/refreshing of documentations and repositories
 * Manages notification popups and loading states across routes
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Repository items
 * @param {Function} props.setItems - Function to update repository items
 * @param {boolean} props.showGeneralSettings - Whether general settings modal is visible
 * @param {Function} props.setShowGeneralSettings - Function to toggle general settings
 * @param {boolean} props.showEditSpecificPrompt - Whether edit prompt modal is visible
 * @param {Function} props.setShowEditSpecificPrompt - Function to toggle edit prompt
 * @param {boolean} props.showInformation - Whether information modal is visible
 * @param {Function} props.setShowInformation - Function to toggle information
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.setSearchTerm - Function to update search term
 * @param {Function} props.setDocsRefreshTrigger - Function to trigger documentation refresh
 * @param {number} props.docsRefreshTrigger - Trigger value for documentation refresh
 * @param {number} props.reposRefreshTrigger - Trigger value for repository refresh
 * @param {Function} props.setReposRefreshTrigger - Function to trigger repository refresh
 * @param {boolean} props.isDark - Current dark mode state
 * @returns {React.ReactElement} The routing component
 */
export default function AppRoutes({
  items,
  setItems,
  showGeneralSettings,
  setShowGeneralSettings,
  showEditSpecificPrompt,
  setShowEditSpecificPrompt,
  showInformation,
  setShowInformation,
  searchTerm,
  setSearchTerm,
  setDocsRefreshTrigger,
  docsRefreshTrigger,
  reposRefreshTrigger, // eslint-disable-line no-unused-vars
  setReposRefreshTrigger,
  isDark,
}) {
  const location = useLocation();
  const { roles } = useAuth();

  const [popup, setPopup] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);

  const [documentations, setDocumentations] = useState([]);

  /**
   * Load documentations from API when component mounts or refresh is triggered
   */
  useEffect(() => {
    (async () => {
      try {
        const docs = await listDocuments();
        const transformed = docs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          repo_id: doc.repo_id,
          repo_name: doc.repo_name,
          content: "",
          added: new Date(doc.created_at).toISOString().slice(0, 10),
          latestUpdate: new Date(doc.updated_at).toISOString().slice(0, 10),
        }));
        setDocumentations(transformed);
      } catch (err) {
        console.error("Failed to load documentation:", err);
        setDocumentations([]);
      }
    })();
  }, [docsRefreshTrigger]);

  /**
   * Refresh repository list when navigating to repositories page
   */
  useEffect(() => {
    if (location.pathname === "/repositories") {
      console.log(
        "Navigating to repositories page - refreshing repository list",
      );
      setReposRefreshTrigger((prev) => prev + 1);
      // Reset all repository page sub-views when navigating to repositories
      setShowGeneralSettings(false);
      setShowEditSpecificPrompt(false);
      setShowInformation(false);
    }
  }, [
    location.pathname,
    setReposRefreshTrigger,
    setShowGeneralSettings,
    setShowEditSpecificPrompt,
    setShowInformation,
  ]);

  // Clear search when navigating away from documentation pages
  useEffect(() => {
    if (location.pathname !== "/" && location.pathname !== "/documentations") {
      setSearchTerm("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Handle delete documentations
  const handleDeleteDocs = async (docIds) => {
    try {
      setIsDeleting(true);
      setActionCount(docIds.length);
      
      // Call API to delete from database
      const result = await deleteDocuments(docIds);

      // Remove from local state
      setDocumentations((prev) =>
        prev.filter((doc) => !docIds.includes(doc.id)),
      );

      // Trigger sidebar refresh
      setDocsRefreshTrigger((prev) => prev + 1);

      // Trigger repository list refresh to update status tags
      setReposRefreshTrigger((prev) => prev + 1);

      setPopup({
        visible: true,
        title: "Deletion completed",
        message: `${result.deleted_count} documentation have been successfully deleted.${result.errors ? ` Errors: ${result.errors.join(", ")}` : ""}`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to delete documentation:", err);
      setPopup({
        visible: true,
        title: "Deletion failed",
        message: `Failed to delete documentation: ${err.message}`,
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setActionCount(0);
    }
  };

  // Handle update documentations
  const handleUpdateDocs = async (docIds) => {
    try {
      setIsUpdating(true);
      setActionCount((prev) => prev + docIds.length);
      
      // Call API to regenerate documentation
      const result = await updateDocumentation(docIds);

      // Trigger documentation list refresh
      setDocsRefreshTrigger((prev) => prev + 1);

      // Trigger repository list refresh to update status tags
      setReposRefreshTrigger((prev) => prev + 1);

      setPopup({
        visible: true,
        title: "Update completed",
        message: result.errors
          ? `Update of documentation was successful. Errors: ${result.errors.join(", ")}`
          : "Update of documentation was successful",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to update documentation:", err);
      setPopup({
        visible: true,
        title: "Update failed",
        message: `Failed to update documentation: ${err.message}`,
        type: "error",
      });
    } finally {
      setActionCount((prev) => {
        const next = prev - docIds.length;
        if (next <= 0) {
          setIsUpdating(false);
          return 0;
        }
        return next;
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      <Routes>
        <Route
          path="/"
          element={
            <DocumentationOverview
              searchTerm={searchTerm}
              documentations={documentations}
              onDelete={handleDeleteDocs}
              onUpdate={handleUpdateDocs}
              isDark={isDark}
              isDeleting={isDeleting}
              isUpdating={isUpdating}
              actionCount={actionCount}
            />
          }
        />
        <Route
          path="/repositories"
          element={
            roles.includes("admin") ||
            roles.includes("bearbeiter") ||
            roles.includes("Team.Admin") ||
            roles.includes("Team.Editor") ? (
              <AdminRepoPage
                items={items}
                setItems={setItems}
                showGeneralSettings={showGeneralSettings}
                setShowGeneralSettings={setShowGeneralSettings}
                showEditSpecificPrompt={showEditSpecificPrompt}
                setShowEditSpecificPrompt={setShowEditSpecificPrompt}
                showInformation={showInformation}
                setShowInformation={setShowInformation}
                setDocsRefreshTrigger={setDocsRefreshTrigger}
                setReposRefreshTrigger={setReposRefreshTrigger}
                isDark={isDark}
                documentations={documentations}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                generatingCount={generatingCount}
                setGeneratingCount={setGeneratingCount}
                setPopup={setPopup}
              />
            ) : (
              <NoAccess />
            )
          }
        />
        <Route
          path="/documentations"
          element={
            <DocumentationOverview
              searchTerm={searchTerm}
              documentations={documentations}
              onDelete={handleDeleteDocs}
              onUpdate={handleUpdateDocs}
              isDark={isDark}
              isDeleting={isDeleting}
              isUpdating={isUpdating}
              actionCount={actionCount}
            />
          }
        />
        <Route
          path="/documentations/:id"
          element={
            <DocumentationViewWrapper
              onDelete={handleDeleteDocs}
              onUpdate={handleUpdateDocs}
              isDark={isDark}
            />
          }
        />
      </Routes>
      {popup.visible && (
        <NotificationPopUp
          title={popup.title}
          message={popup.message}
          type={popup.type}
          onClose={() =>
            setPopup({ visible: false, title: "", message: "", type: "info" })
          }
        />
      )}
    </div>
  );
}
