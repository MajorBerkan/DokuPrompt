/**
 * EditSpecificPromptMenu Component
 * Provides interface for editing repository-specific prompts
 * Supports template management, creation, editing, and deletion
 * Handles single and multiple repository prompt editing
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback to close the menu
 * @param {Function} props.onSave - Callback when saving prompts
 * @param {Array} props.selectedPrompts - Array of currently selected prompts
 * @param {Array} props.selectedNames - Array of selected repository names
 * @returns {React.ReactElement} The edit specific prompt menu component
 */
import { useState, useEffect, useRef } from "react";
import {
  getPromptTemplates,
  savePromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "../lib/api";
import DeleteModal from "./DeleteModal.jsx";

export default function EditSpecificPromptMenu({
  onClose,
  onSave,
  selectedPrompts = [],
  selectedNames = [],
}) {
  /**
   * Determines initial prompt value based on selected prompts
   * Shows "Different prompts" if multiple different prompts are selected
   */
  let initialPrompt = "";
  if (selectedPrompts.length === 1) {
    initialPrompt = selectedPrompts[0];
  } else if (
    selectedPrompts.length > 1 &&
    selectedPrompts.every((p) => p === selectedPrompts[0])
  ) {
    initialPrompt = selectedPrompts[0];
  } else if (selectedPrompts.length > 1) {
    initialPrompt = "Different prompts";
  }

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [showManageTemplatesModal, setShowManageTemplatesModal] =
    useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDescription, setEditTemplateDescription] = useState("");
  const [editTemplateContent, setEditTemplateContent] = useState("");

  const [specificPrompt, setSpecificPrompt] = useState(initialPrompt);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [errors, setErrors] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const dropdownRef = useRef(null);

  const TEMPLATE_ITEM_HEIGHT = 40;
  const DROPDOWN_OFFSET = 52;

  /**
   * Extracts error message from API error object
   * 
   * @param {Error} err - The error object
   * @param {string} defaultMessage - Default message if error has no message
   * @returns {string} The error message
   */
  const getErrorMessage = (err, defaultMessage) => {
    return err.message || defaultMessage;
  };

  /**
   * Fetches prompt templates from API on component mount
   */
  useEffect(() => {
    async function fetchData() {
      setErrors([]);
      try {
        const response = await getPromptTemplates();
        setPromptTemplates(response);
      } catch (err) {
        setErrors([getErrorMessage(err, "Failed to load prompt templates.")]);
        setShowErrorModal(true);
        setPromptTemplates([]);
      }
    }
    fetchData();
  }, []);

  /**
   * Updates specific prompt when selected prompts change
   */
  useEffect(() => {
    let initialPrompt = "";
    if (selectedPrompts.length === 1) {
      initialPrompt = selectedPrompts[0];
    } else if (
      selectedPrompts.length > 1 &&
      selectedPrompts.every((p) => p === selectedPrompts[0])
    ) {
      initialPrompt = selectedPrompts[0];
    } else if (selectedPrompts.length > 1) {
      initialPrompt = "Different prompts";
    }
    setSpecificPrompt(initialPrompt);
  }, [selectedPrompts]);

  /**
   * Closes dropdown when clicking outside
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(false);
      }
    }

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openDropdown]);

  /**
   * Saves the edited prompt and closes the menu
   */
  const handleSave = () => {
    setErrors([]);
    if (onSave) onSave(specificPrompt, selectedNames);
    onClose();
  };

  /**
   * Opens modal to create a new template
   */
  const handleTemplate = () => {
    setErrors([]);
    setTemplateName("");
    setTemplateDescription("");
    setShowTemplateModal(true);
  };

  /**
   * Saves a new template to the database
   */
  const saveTemplateToDatabase = async () => {
    setErrors([]);
    const templateData = {
      name: templateName,
      description: templateDescription,
      content: specificPrompt,
    };

    try {
      const newTemplate = await savePromptTemplate(templateData);
      setPromptTemplates((prev) => [...prev, newTemplate]);
      setShowTemplateModal(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (err) {
      setErrors([getErrorMessage(err, "Failed to save prompt template.")]);
      setShowErrorModal(true);
    }
  };

  /**
   * Opens modal to manage existing templates
   */
  const handleManageTemplates = () => {
    setErrors([]);
    setShowManageTemplatesModal(true);
  };

  /**
   * Opens confirmation modal to delete a template
   * 
   * @param {Object} template - The template to delete
   */
  const handleDeleteTemplate = (template) => {
    setErrors([]);
    setTemplateToDelete(template);
    setShowDeleteConfirmModal(true);
  };

  /**
   * Confirms and executes template deletion
   */
  const confirmDeleteTemplate = async () => {
    setErrors([]);
    if (templateToDelete) {
      try {
        await deletePromptTemplate(templateToDelete.id);
        setPromptTemplates((prev) =>
          prev.filter((t) => t.id !== templateToDelete.id),
        );
      } catch (err) {
        setErrors([getErrorMessage(err, "Failed to delete template.")]);
        setShowErrorModal(true);
      }
    }
    setShowDeleteConfirmModal(false);
    setTemplateToDelete(null);
  };

  /**
   * Opens modal to edit a template
   * 
   * @param {Object} template - The template to edit
   */
  const handleEditTemplate = (template) => {
    setErrors([]);
    setTemplateToEdit(template);
    setEditTemplateName(template.name);
    setEditTemplateDescription(template.description);
    setEditTemplateContent(template.content);
    setShowManageTemplatesModal(false);
    setShowEditTemplateModal(true);
  };

  /**
   * Opens confirmation modal before saving template edits
   */
  const handleSaveEditTemplate = () => {
    setErrors([]);
    setShowEditConfirmModal(true);
  };

  /**
   * Confirms and saves template edits
   */
  const confirmEditTemplate = async () => {
    setErrors([]);
    if (templateToEdit) {
      try {
        const updatedTemplate = await updatePromptTemplate(templateToEdit.id, {
          name: editTemplateName,
          description: editTemplateDescription,
          content: editTemplateContent,
        });

        setPromptTemplates((prev) =>
          prev.map((t) => (t.id === templateToEdit.id ? updatedTemplate : t)),
        );
      } catch (err) {
        setErrors([getErrorMessage(err, "Failed to update template.")]);
        setShowErrorModal(true);
      }
    }
    setShowEditConfirmModal(false);
    setShowEditTemplateModal(false);
    setTemplateToEdit(null);
    setShowManageTemplatesModal(true);
  };

  return (
    <section className="mb-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-[#3200C8] dark:text-[#8080ff] hover:bg-gray-100 dark:bg-dark-bg dark:hover:bg-gray-700 p-2 rounded transition-colors"
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
            Edit Specific Prompt
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Current specific prompt
            </h4>
            <div className={"flex gap-4 items-center"}>
              <button
                onClick={handleManageTemplates}
                className="px-4 py-2 border border-gray-300 font-medium text-sm dark:bg-dark-bg dark:text-white dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Edit Templates
              </button>

              {/* Custom Dropdown mit Tooltip */}
              <div
                ref={dropdownRef}
                className="flex flex-col mb-4 w-full pr-[2px] sm:w-64 md:w-72 relative -mt-[8px] "
              >
                <label
                  htmlFor="promptTemplates"
                  className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Prompt Templates
                </label>

                <button
                  aria-label={"dropdown"}
                  onClick={() => setOpenDropdown(!openDropdown)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-[#3200c8] dark:focus:ring-[#8080ff] "
                >
                  {selectedTemplate || "None selected"}
                  <svg
                    className={`w-4 h-4 ml-2 transition-transform ${
                      openDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {openDropdown && (
                  <div className="absolute top-full mt-1 w-full shadow-lg z-10">
                    <div
                      style={{ maxHeight: "240px", overflowY: "auto" }}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
                    >
                      {/* 🔹 Neue Option: "None" */}
                      <div
                        onClick={() => {
                          setSelectedTemplate("");
                          setSpecificPrompt("");
                          setOpenDropdown(false);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                      >
                        None
                      </div>

                      {promptTemplates.map((template, index) => (
                        <div
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template.name);
                            setSpecificPrompt(template.content);
                            setOpenDropdown(false);
                          }}
                          onMouseEnter={() =>
                            setHoveredTemplate({ ...template, index })
                          }
                          onMouseLeave={() => setHoveredTemplate(null)}
                          className="relative px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {template.name}
                        </div>
                      ))}
                    </div>

                    {/* Tooltip rendered outside scrollable container */}
                    {hoveredTemplate && hoveredTemplate.index !== undefined && (
                      <div
                        className="absolute left-[-260px] bg-gray-100 text-black dark:bg-gray-700 dark:text-gray-100
                              text-sm px-3 py-2 shadow-lg z-20 w-60 pointer-events-none"
                        style={{
                          top: `${hoveredTemplate.index * TEMPLATE_ITEM_HEIGHT + DROPDOWN_OFFSET}px`,
                        }}
                      >
                        <div className="font-semibold mb-1">
                          {hoveredTemplate.description}
                        </div>

                        <div className="text-xs opacity-90 overflow-hidden text-ellipsis line-clamp-3 break-words">
                          {hoveredTemplate.content}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <textarea
            onChange={(e) => setSpecificPrompt(e.target.value)}
            value={specificPrompt}
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 hover:border-[#3200c8] dark:hover:border-[#8080ff] focus:outline-none resize-y w-full min-h-[24rem] max-h-[32rem] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex gap-10">
          <button
            onClick={handleSave}
            className="min-w-[200px] min-h-[50px] bg-[#3200c8] dark:bg-[#8080ff] self-start text-white px-4 py-2 inline-flex items-center gap-4 justify-center hover:bg-[#220094] dark:hover:bg-[#6060dd]"
          >
            <img src="../img/save.png" alt="Save" />
            <span>Save Changes</span>
          </button>

          <button
            onClick={handleTemplate}
            className="min-w-[200px] min-h-[50px] bg-[#4d70d8] dark:bg-[#4d70d8] self-start text-white  px-4 py-2 inline-flex items-center gap-4 justify-center hover:bg-[#220094] hover:text-white dark:hover:bg-[#6060dd] "
          >
            <span>Save Prompt as Template</span>
          </button>
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 w-[400px] shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Save Prompt as Template
            </h3>

            {/* Template Name */}
            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
              Template Name
            </label>
            <input
              aria-label={"template name"}
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 mb-4 border bg-white dark:bg-dark-bg dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />

            {/* Template Description */}
            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
              Description
            </label>
            <textarea
              aria-label={"template description"}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 h-24 border  bg-white dark:bg-dark-bg dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2  bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancel
              </button>

              <button
                onClick={saveTemplateToDatabase}
                className="px-4 py-2 rounded bg-[#3200c8] dark:bg-[#8080ff] text-white hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Templates Modal */}
      {showManageTemplatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 w-[600px] shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Edit Templates
            </h3>

            {promptTemplates.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                No templates available
              </p>
            ) : (
              <div
                className="space-y-2"
                style={{ maxHeight: "350px", overflowY: "auto" }}
              >
                {promptTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {template.description}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="px-3 py-1 bg-[#4d70d8] text-white hover:bg-[#3d60c8] text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowManageTemplatesModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 w-[500px] shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Edit Template
            </h3>

            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={editTemplateName}
              onChange={(e) => setEditTemplateName(e.target.value)}
              className="w-full px-3 py-2 mb-4 border bg-white dark:bg-dark-bg dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />

            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
              Description
            </label>
            <textarea
              value={editTemplateDescription}
              onChange={(e) => setEditTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 mb-4 h-24 border bg-white dark:bg-dark-bg dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />

            <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
              Content
            </label>
            <textarea
              value={editTemplateContent}
              onChange={(e) => setEditTemplateContent(e.target.value)}
              className="w-full px-3 py-2 mb-4 h-48 border bg-white dark:bg-dark-bg dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowEditTemplateModal(false);
                  setTemplateToEdit(null);
                  setShowManageTemplatesModal(true);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTemplate}
                className="px-4 py-2 bg-[#3200c8] dark:bg-[#8080ff] text-white hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {showEditConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
          <div className="bg-white dark:bg-gray-800 p-6 w-[400px] shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Confirm Changes
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to change this template?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowEditConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                No
              </button>
              <button
                onClick={confirmEditTemplate}
                className="px-4 py-2 bg-[#3200c8] dark:bg-[#8080ff] text-white hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteTemplate}
        itemType="template"
        itemName={templateToDelete?.name}
        itemContent={templateToDelete?.content}
      />

      {/* Error Modal */}
      {showErrorModal && errors.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70]">
          <div className="bg-white dark:bg-gray-800 p-6 w-[400px] shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-red-700 dark:text-red-400">
              Error occurred:
            </h3>
            <div className="mb-6">
              {errors.map((err, i) => (
                <div key={i} className="text-gray-700 dark:text-gray-300 mb-2">
                  {err}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrors([]);
                }}
                className="px-4 py-2 bg-[#3200c8] dark:bg-[#8080ff] text-white hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
