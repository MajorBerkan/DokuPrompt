import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import DocumentationView from "./DocumentationView.jsx";
import { getDocument, updateDocumentGoal } from "../lib/api.js";

/**
 * DocumentationViewWrapper Component
 * Wrapper component that loads documentation data and passes it to DocumentationView
 * Handles loading state, error handling, and manages documentation goal
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isDark - Dark mode state
 * @param {Function} props.onDelete - Callback when documentation is deleted
 * @param {Function} props.onUpdate - Callback when documentation is updated
 * @returns {React.ReactElement} The documentation view wrapper component
 */
export default function DocumentationViewWrapper({
  isDark,
  onDelete,
  onUpdate,
}) {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goal, setGoal] = useState("");

  /**
   * Load documentation data when component mounts or ID changes
   */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const docData = await getDocument(id);
        setDoc(docData);
        setError(null);
        setGoal(docData?.goal || "");
      } catch (err) {
        console.error("Failed to load documentation:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /**
   * Handles changes to the documentation goal
   * Calls the API to persist the goal to the database
   * 
   * @param {string} newGoal - The new goal text
   */
  async function handleGoalChange(newGoal) {
    setGoal(newGoal);

    try {
      await updateDocumentGoal(id, newGoal);
      console.log("Goal updated successfully");
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  }

  if (loading) {
    return (
      <p className="text-gray-500 dark:text-gray-400 p-4">
        Loading documentation...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 dark:text-red-400 p-4">
        Error loading documentation: {error}
      </p>
    );
  }

  if (!doc) {
    return (
      <p className="text-gray-500 dark:text-gray-400 p-4">
        Documentation not found.
      </p>
    );
  }

  return (
    <DocumentationView
      docId={id}
      title={doc.title}
      contents={doc.table_of_contents}
      update={new Date(doc.updated_at).toLocaleString()}
      repoUrl={doc.repo_url}
      goal={goal}
      content={doc.content}
      onGoalChange={handleGoalChange}
      isDark={isDark}
      onDelete={onDelete}
      onUpdate={onUpdate}
    />
  );
}
