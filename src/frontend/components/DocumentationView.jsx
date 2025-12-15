/**
 * DocumentationView Component
 * Displays a single documentation entry with markdown rendering
 * Provides code quality and architecture analysis in a resizable sidebar
 * Supports goal editing and documentation updates
 * 
 * @param {Object} props - Component props
 * @param {string} props.docId - Documentation ID
 * @param {string} props.title - Documentation title
 * @param {Array} props.contents - Table of contents (unused, kept for compatibility)
 * @param {string} props.update - Last update timestamp
 * @param {string} props.repoUrl - Repository URL
 * @param {string} props.goal - Project goal text
 * @param {Function} props.onGoalChange - Callback for goal changes
 * @param {string} props.content - Markdown content to display
 * @param {boolean} props.isDark - Dark mode state
 * @param {Function} props.onDelete - Callback for deletion
 * @param {Function} props.onUpdate - Callback for updates
 * @returns {React.ReactElement} The documentation view component
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import "../styles/markdown.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider.jsx";
import Spinner from "./Spinner.jsx";
import CodeQualityAnalysis from "./CodeQualityAnalysis.jsx";
import ArchitectureAnalysis from "./ArchitectureAnalysis.jsx";
import DeleteModal from "./DeleteModal.jsx";

/**
 * Generates a URL-friendly slug from heading text
 * 
 * @param {string} text - The heading text to convert
 * @returns {string} URL-friendly slug
 */
export function generateSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts the first H1 heading from markdown content
 * 
 * @param {string} content - Markdown content
 * @returns {string|null} The first H1 heading text or null
 */
export function extractFirstH1(content) {
  if (!content) return null;
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : null;
}

export default function DocumentationView({
  docId,
  title,
  contents, // eslint-disable-line no-unused-vars
  update,
  repoUrl,
  goal,
  onGoalChange,
  content,
  isDark,
  onDelete,
  onUpdate,
}) {
  const { roles } = useAuth();
  const contentRef = useRef(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [localGoal, setLocalGoal] = useState(goal);
  const isEmpty = !goal || goal.trim() === "";
  const displayGoal = isEmpty ? "You can enter project goal here" : goal;
  const goalRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [showCodeQuality, setShowCodeQuality] = useState(false);
  const [analysisView, setAnalysisView] = useState("quality");
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const navigate = useNavigate();

  /**
   * Updates goal display when editing state or goal changes
   */
  useEffect(() => {
    if (!isEditingGoal && goalRef.current) {
      goalRef.current.innerHTML = displayGoal;
    }
  }, [isEditingGoal, displayGoal]);

  const displayTitle = title;

  /**
   * Parses markdown content with custom renderer
   * Removes first H1 (shown as title) and adds IDs to headings for navigation
   * Memoized to prevent unnecessary re-parsing
   */
  const parsedContent = useMemo(() => {
    let contentToProcess = content || "";
    const firstH1Match = contentToProcess.match(/^#\s+.+$/m);
    if (firstH1Match) {
      contentToProcess = contentToProcess.replace(/^#\s+.+$/m, "").trim();
    }

    const renderer = new marked.Renderer();
    const headingCounts = {};

    renderer.heading = function ({ text, depth }) {
      const rawText = text;
      const slug = generateSlug(rawText);

      // Handle duplicate slugs
      const count = headingCounts[slug] || 0;
      headingCounts[slug] = count + 1;
      const uniqueSlug = count > 0 ? `${slug}-${count}` : slug;

      // Escape the slug for safe use in HTML attribute
      const escapedSlug = uniqueSlug.replace(/"/g, "&quot;");

      return `<h${depth} id="${escapedSlug}">${text}</h${depth}>`;
    };

    marked.setOptions({
      renderer: renderer,
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error("Highlight.js error:", err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
    });

    return marked.parse(contentToProcess);
  }, [content]);

  const handleDelete = async () => {
    console.log("Doc Id is : " + docId);
    try {
      await onDelete([docId]);
      navigate("/");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate([docId]);
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const isAdminOrEditor =
    roles.includes("admin") ||
    roles.includes("Team.Admin") ||
    roles.includes("bearbeiter") ||
    roles.includes("Team.Editor");

  // Handle sidebar resize
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 350px and 800px
      if (newWidth >= 350 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content Area */}
      <section
        className={`flex flex-col h-full overflow-auto overflow-x-hidden transition-all duration-300 ${showCodeQuality ? "flex-1" : "w-full"}`}
      >
        {/* Header */}
        <div className="flex justify-between items-end gap-4 mb-6 flex-none w-full">
          {/* Linke Spalte: Titel + Meta */}
          <div className="flex flex-col min-w-0">
            <h2 className="font-bold text-4xl text-gray-900 dark:text-gray-100 break-words mb-2">
              {displayTitle}
            </h2>

            {/* Meta-Infos */}
            <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1 mt-3">
              <div className="flex gap-4">
                <span>Latest update: {update}</span>
              </div>

              {repoUrl && (
                <div>
                  Repository:{" "}
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3200c8] dark:text-[#8080ff] hover:underline"
                  >
                    {repoUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
          {/* Rechte Spalte: Buttons */}
          <div className="flex flex-col items-end gap-2 min-h-[40px]">
            {/* Buttons bleiben immer oben */}
            <div className="flex gap-2">
              {/* Analysis Button */}
              <button
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium "
                onClick={() => setShowCodeQuality(!showCodeQuality)}
              >
                {showCodeQuality ? "Hide Analysis" : "Analysis"}
              </button>

              {isAdminOrEditor && (
                <>
                  <button
                    className="dark:bg-dark-bg focus:outline-none"
                    onClick={() => setDeleteModal(true)}
                  >
                    <img
                      src={
                        isDark
                          ? `../img/deleteDarkMode.png`
                          : `../img/delete.png`
                      }
                      alt="Delete Documentation"
                      className="w-6 min-w-[20px] max-w-[32px] h-auto object-contain"
                    />
                  </button>

                  <button
                    className="dark:bg-dark-bg focus:outline-none focus:ring-0"
                    onClick={handleUpdate}
                  >
                    <img
                      src={
                        isDark
                          ? `../img/updateDarkMode.png`
                          : `../img/update.png`
                      }
                      alt="Update Documentation"
                      className="w-6 min-w-[20px] max-w-[32px] h-auto object-contain"
                    />
                  </button>
                </>
              )}
            </div>

            {isAdminOrEditor && (
              <div
                className={`flex items-center gap-2 text-gray-900 dark:text-gray-100 ${!isUpdating ? "invisible" : ""}`}
              >
                Documentation is updating...
                <Spinner size={32} color="#3200c8" />
              </div>
            )}
          </div>
        </div>

        <div
          id="contentScrollArea"
          className="flex-1 overflow-auto p-4 flex flex-col gap-6"
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                id="project-goal"
                className="block text-2xl font-bold text-gray-700 dark:text-gray-300"
              >
                Project Goal
              </label>
              {isAdminOrEditor && (
                <button
                  onClick={() => {
                    if (isEditingGoal) {
                      // Speichern: innerHTML bleibt drin
                      onGoalChange(localGoal);
                      // Div wieder mit localGoal setzen
                      if (goalRef.current) {
                        goalRef.current.innerHTML = localGoal;
                      }
                    }
                    setIsEditingGoal(!isEditingGoal);
                  }}
                  className="px-3 py-1 border text-sm border-gray-300
                    dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900
                    dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isEditingGoal ? "Save" : "Edit"}
                </button>
              )}
            </div>

            <div
              ref={goalRef}
              contentEditable={isEditingGoal}
              suppressContentEditableWarning={true}
              onInput={(e) => setLocalGoal(e.currentTarget.innerHTML)}
              className={`w-full px-3 py-2 rounded
          bg-white dark:bg-dark-bg
          text-gray-900 dark:text-gray-100
          outline-none
          ${isEditingGoal ? "border border-[#3200c8]" : ""}
          ${isEmpty && !isEditingGoal ? "text-gray-400 italic" : ""}`}
            ></div>
          </div>
          {/* Markdown content - full width */}
          <div className="flex-1 min-h-0">
            <div
              ref={contentRef}
              className="markdown-content text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            />
          </div>
        </div>

        <DeleteModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={() => {
            setDeleteModal(false);
            setTimeout(() => handleDelete(), 0);
          }}
          itemType="documentation"
          itemName={displayTitle}
        />
      </section>

      {/* Analysis Sidebar */}
      {showCodeQuality && (
        <aside
          className="flex-none h-full border-l border-gray-200 dark:border-gray-700 overflow-hidden animate-slideIn relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#3200c8] dark:hover:bg-[#8080ff] z-10"
            onMouseDown={handleMouseDown}
            style={{ cursor: isResizing ? "ew-resize" : "ew-resize" }}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-r"></div>
          </div>

          {/* Analysis Content with Toggle */}
          <div className="flex flex-col h-full">
            {/* Toggle Buttons */}
            <div className="flex-none border-b border-gray-200 dark:border-gray-700  bg-white dark:bg-stone-950">
              <div className="flex">
                <button
                  onClick={() => setAnalysisView("quality")}
                  className={`flex-1 px-4 py-3 text-sm font-medium dark:bg-stone-950 dark:text-white border-none focus:outline-none ${
                    analysisView === "quality"
                      ? "bg-indigo-50 dark:bg-[#1b1929] text-[#3200c8] dark:text-[#8080ff] "
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  Code Quality
                </button>
                <button
                  onClick={() => setAnalysisView("architecture")}
                  className={`flex-1 px-4 py-3 text-sm font-medium dark:bg-stone-950 dark:text-white border-none focus:outline-none ${
                    analysisView === "architecture"
                      ? "bg-indigo-50 dark:bg-[#1b1929] text-[#3200c8] dark:text-[#8080ff]"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  Architecture
                </button>
              </div>
            </div>

            {/* Analysis Component */}
            <div className="flex-1 overflow-hidden">
              {analysisView === "quality" ? (
                <CodeQualityAnalysis isDark={isDark} />
              ) : (
                <ArchitectureAnalysis />
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
