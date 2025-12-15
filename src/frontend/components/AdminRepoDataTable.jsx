/**
 * AdminRepoDataTable Component
 * Displays and manages repository data in a table format
 * Provides functionality for filtering, searching, selecting, and performing actions on repositories
 * Supports bulk operations and individual repository management
 *
 * @param {Object} props - Component props
 * @param {Array} props.items - List of repository items to display
 * @param {Function} props.onEditClick - Callback for editing repository prompts
 * @param {Function} props.onDelete - Callback for deleting repositories
 * @param {Function} props.onShowInformation - Callback for showing repository information
 * @param {Function} props.onGenerateDocumentation - Callback for generating documentation
 * @param {boolean} props.isDark - Dark mode state
 * @param {Array} props.documentations - List of available documentations
 * @param {boolean} props.isGenerating - Whether documentation generation is in progress
 * @param {number} props.generatingCount - Number of documents being generated
 * @returns {React.ReactElement} The repository data table component
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../lib/AuthProvider.jsx";
import { useNavigate } from "react-router-dom";

import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";
import {
  getRepoStatusClasses,
  getDocumentStatusClasses,
} from "../lib/statusTags.js";
import Spinner from "./Spinner.jsx";
import DeleteModal from "./DeleteModal.jsx";

export default function AdminRepoDataTable({
  items = [],
  onEditClick,
  onDelete,
  onShowInformation,
  onGenerateDocumentation,
  isDark,
  documentations = [],
  isGenerating = false,
  generatingCount = 0,
}) {
  const { roles } = useAuth();
  const navigate = useNavigate();

  /**
   * Memoized safe repository items with normalized data and sorted alphabetically
   */
  const safeItems = useMemo(
    () =>
      items
        .map((repo) => ({
          id: repo.id || repo.url || "",
          name: repo.name || "No Name",
          description: repo.description || "",
          status: (repo.status || "PENDING").toUpperCase(),
          documentStatus: (
            repo.documentStatus || "Not Documented"
          ).toLowerCase(),
          added: repo.added || (repo.date_of_version ? repo.date_of_version.split("T")[0] : ""),
          specificPrompt: repo.specificPrompt || "",
          path: repo.result?.target_dir || "",
        }))
        .sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        ),
    [items],
  );

  const isAdmin = roles.includes("admin") || roles.includes("Team.Admin");
  const baseOptionsOneSelection = [
    "Generate Documentation",
    "Edit Specific Prompt",
  ];
  const [menuPosition, setMenuPosition] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);
  const [openRowMenu, setOpenRowMenu] = useState(null);
  const menuRef = useRef(null);
  const filterRef = useRef(null);
  const actionsRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reposToDelete, setReposToDelete] = useState([]);

  const hoverCloseTimeout = useRef(null);

  /**
   * Adjusts menu position after opening to ensure it stays within viewport
   */
  useEffect(() => {
  if (!openRowMenu || !menuRef.current || !menuPosition) return;

  const rect = menuRef.current.getBoundingClientRect();
  const menuHeight = rect.height;

  let newTop = menuPosition.top;

  if (newTop + menuHeight > window.innerHeight) {
    newTop = window.innerHeight - menuHeight - 16;
    if (newTop < 8) newTop = 8;
  }

  setMenuPosition((prev) => {
    if (!prev) return prev;
    if (prev.top === newTop) return prev;
    return { ...prev, top: newTop };
  });
}, [openRowMenu]);


  /**
   * Closes popup menu and tooltip when user scrolls the table
   */
  useEffect(() => {
    const scrollContainer = document.getElementById("repo-table-scroll");
    if (!scrollContainer) return;

    const handleScroll = () => {
      setOpenRowMenu(null);
      setMenuPosition(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [openRowMenu]);

  const [tooltip, setTooltip] = useState({
    text: "",
    top: 0,
    left: 0,
    rect: null,
    visible: false,
  });

  /**
   * TooltipPortal Component
   * Renders a tooltip using React portal for proper positioning
   *
   * @param {Object} props - Tooltip props
   * @param {string} props.text - Tooltip text content
   * @param {number} props.top - Top position in pixels
   * @param {number} props.left - Left position in pixels
   * @param {number} props.maxWidth - Maximum width in pixels
   * @returns {React.ReactElement} The tooltip portal
   */
  function TooltipPortal({ text, top, left, maxWidth }) {
    return createPortal(
      <span
        role="tooltip"
        aria-label={"repo-table-tooltip"}
        style={{
          position: "fixed",
          top,
          left,
          transform: "translate(-50%, -100%)",
          maxWidth: maxWidth,
          width: "max-content",
          minWidth: "120px",
          pointerEvents: "none",
          zIndex: 9999,
        }}
        className="bg-gray-100 text-black dark:bg-gray-800 dark:text-white text-sm px-3 py-2 max-w-xs whitespace-normal break-words leading-relaxed shadow-lg line-clamp-10"
      >
        {text}
      </span>,
      document.body,
    );
  }

  const baseOptionsMultipleSelection = [
    "Generate Documentation",
    "Edit Specific Prompt",
  ];

  const actionOptionsOneSelection = isAdmin
    ? [...baseOptionsOneSelection, "Delete", "Edit Information"]
    : [...baseOptionsOneSelection, "Edit Information"];

  const actionOptionsMultipleSelection = isAdmin
    ? [...baseOptionsMultipleSelection, "Delete"]
    : baseOptionsMultipleSelection;

  //Filter Options
  const filterCategories = [
    {
      id: "status",
      title: "Status",
      type: "checkbox",
      options: ["PENDING", "RECEIVED", "SUCCESS", "FAILURE"],
    },
    {
      id: "documentStatus",
      title: "Document Status",
      type: "checkbox",
      options: ["documented", "not documented", "error"],
    },
    { id: "added", title: "Added Date", type: "dateRange", options: [] },
  ];

  //Icons
  const iconMap = {
    "Generate Documentation": "generate-documentation.png",
    "Edit Specific Prompt": "edit-specific-prompt.png",
    Delete: "delete.png",
    "Edit Information": "show-information.png",
  };
  const darkIconMap = {
    "Generate Documentation": "GenerateDarkMode.png",
    "Edit Specific Prompt": "editdarkMode.png",
    Delete: "deleteDarkMode.png",
    "Edit Information": "InfoDarkMode.png",
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [actionsMenu, setActionsMenu] = useState(false);
  const [filter, setFilter] = useState(false);

  const [filterOptions, setFilterOptions] = useState(
    filterCategories.reduce((acc, cat) => {
      if (cat.type === "checkbox") acc[cat.id] = [];
      if (cat.type === "dateRange") acc[cat.id] = { start: "", end: "" };
      return acc;
    }, {}),
  );

  const [appliedFilterOptions, setAppliedFilterOptions] = useState(
    filterCategories.reduce((acc, cat) => {
      if (cat.type === "checkbox") acc[cat.id] = [];
      if (cat.type === "dateRange") acc[cat.id] = { start: "", end: "" };
      return acc;
    }, {}),
  );

  const [openCategories, setOpenCategories] = useState(
    filterCategories.reduce((acc, cat) => {
      acc[cat.id] = true;
      return acc;
    }, {}),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(safeItems);

  /**
   * Resets filtered data to all items when no filters are applied
   */
  useEffect(() => {
    const noFilters =
      appliedFilterOptions.status.length === 0 &&
      appliedFilterOptions.documentStatus.length === 0 &&
      !appliedFilterOptions.added.start &&
      !appliedFilterOptions.added.end &&
      searchTerm === "";

    if (noFilters) {
      setFilteredData(safeItems);
    }
  }, [safeItems, appliedFilterOptions, searchTerm]);

  /**
   * Filters data based on search term in repository name or description
   */
  const term = searchTerm.toLowerCase();
  const searched = term
    ? filteredData.filter((repo) => {
        return (
          (repo.name && repo.name.toLowerCase().includes(term)) ||
          (repo.description && repo.description.toLowerCase().includes(term))
        );
      })
    : filteredData;

  /**
   * Closes actions menu when all rows are deselected
   */
  useEffect(() => {
    if (selectedRows.length === 0 && actionsMenu === true) {
      setActionsMenu(false);
    }
  }, [selectedRows, actionsMenu]);

  /**
   * Determines which action options to show based on number of selected rows
   */
  const optionsToShow =
    selectedRows.length === 0
      ? []
      : selectedRows.length > 1
        ? actionOptionsMultipleSelection
        : actionOptionsOneSelection;

  /**
   * Handles row click for selection
   * Supports shift-click for range selection
   * Note: Only works if repository names are unique
   *
   * @param {string} repoName - Name of the repository
   * @param {Event} event - Click event object
   */
  const handleRowClick = (repoName, event) => {
    const index = safeItems.findIndex((r) => r.name === repoName);

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const range = safeItems.slice(start, end + 1).map((r) => r.name);
      setSelectedRows((prev) => Array.from(new Set([...prev, ...range])));
    } else {
      setSelectedRows((prev) =>
        prev.includes(repoName)
          ? prev.filter((name) => name !== repoName)
          : [...prev, repoName],
      );
      setLastSelectedIndex(index);
    }
  };

  /**
   * Toggles selection of all rows
   * Deselects all if all are selected, otherwise selects all filtered rows
   */
  const toggleSelectAll = () => {
    if (selectedRows.length === searched.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(searched.map((r) => r.name));
    }
  };

  /**
   * Toggles the filter popup menu
   * Resets filter options to match applied filters when opening
   */
  const toggleFilter = () => {
    if (!filter) {
      setFilterOptions({ ...appliedFilterOptions });
    }
    setFilter(!filter);
  };

  /**
   * Helper function to apply filter logic to repositories
   * Filters by status, document status, and date range
   *
   * @param {Object} filterOpts - Filter options to apply
   * @returns {Array} Filtered repository list
   */
  const filterRepos = (filterOpts) => {
    return safeItems.filter((repo) => {
      const statusMatch =
        filterOpts.status.length === 0 ||
        filterOpts.status.some(
          (opt) => opt.toLowerCase() === (repo.status || "").toLowerCase(),
        );

      const docuStatusMatch =
        filterOpts.documentStatus.length === 0 ||
        filterOpts.documentStatus.some(
          (opt) =>
            opt.toLowerCase() === (repo.documentStatus || "").toLowerCase(),
        );

      const startDate = filterOpts.added.start
        ? new Date(filterOpts.added.start)
        : null;
      const endDate = filterOpts.added.end
        ? new Date(filterOpts.added.end)
        : null;

      let dateMatch = true;
      if (startDate || endDate) {
        const repoDate = new Date(repo.added || new Date());
        if (startDate && repoDate < startDate) dateMatch = false;
        if (endDate && repoDate > endDate) dateMatch = false;
      }

      return statusMatch && docuStatusMatch && dateMatch;
    });
  };

  /**
   * Applies the current filter options and closes the filter menu
   */
  const applyFilter = () => {
    const filtered = filterRepos(filterOptions);
    setFilteredData(filtered);
    setAppliedFilterOptions({ ...filterOptions });
    setFilter(false);
  };

  /**
   * Clears all filter options and resets to show all repositories
   */
  const clearFilter = () => {
    const resetFilter = {};
    filterCategories.forEach((category) => {
      if (category.type === "checkbox") {
        resetFilter[category.id] = [];
      } else if (category.type === "dateRange") {
        resetFilter[category.id] = { start: "", end: "" };
      }
    });
    setFilterOptions(resetFilter);
    setAppliedFilterOptions(resetFilter);
    setFilteredData(safeItems);
    setFilter(false);
  };

  /**
   * Removes a single filter value and reapplies filters
   *
   * @param {string} categoryId - The filter category ID
   * @param {string} value - The filter value to remove
   */
  const removeFilter = (categoryId, value) => {
    const newAppliedOptions = { ...appliedFilterOptions };
    if (Array.isArray(newAppliedOptions[categoryId])) {
      newAppliedOptions[categoryId] = newAppliedOptions[categoryId].filter(
        (item) => item !== value,
      );
    } else if (typeof newAppliedOptions[categoryId] === "object") {
      if (value === "start") {
        newAppliedOptions[categoryId] = {
          ...newAppliedOptions[categoryId],
          start: "",
        };
      } else if (value === "end") {
        newAppliedOptions[categoryId] = {
          ...newAppliedOptions[categoryId],
          end: "",
        };
      }
    }

    setAppliedFilterOptions(newAppliedOptions);

    setFilterOptions((prev) => {
      const newOptions = { ...prev };
      if (Array.isArray(newOptions[categoryId])) {
        newOptions[categoryId] = newOptions[categoryId].filter(
          (item) => item !== value,
        );
      } else if (typeof newOptions[categoryId] === "object") {
        if (value === "start") {
          newOptions[categoryId] = { ...newOptions[categoryId], start: "" };
        } else if (value === "end") {
          newOptions[categoryId] = { ...newOptions[categoryId], end: "" };
        }
      }
      return newOptions;
    });

    const filtered = filterRepos(newAppliedOptions);
    setFilteredData(filtered);
  };

  /**
   * Gets list of active filters for display as badges
   *
   * @returns {Array} Array of active filter objects
   */
  const getActiveFilters = () => {
    const active = [];

    filterCategories.forEach((category) => {
      if (
        category.type === "checkbox" &&
        appliedFilterOptions[category.id].length > 0
      ) {
        appliedFilterOptions[category.id].forEach((value) => {
          active.push({
            categoryId: category.id,
            categoryTitle: category.title,
            value: value,
            displayValue: value.replace(/\b\w/g, (char) => char.toUpperCase()),
          });
        });
      } else if (category.type === "dateRange") {
        if (appliedFilterOptions[category.id].start) {
          active.push({
            categoryId: category.id,
            categoryTitle: category.title,
            value: "start",
            displayValue: `From: ${appliedFilterOptions[category.id].start}`,
          });
        }
        if (appliedFilterOptions[category.id].end) {
          active.push({
            categoryId: category.id,
            categoryTitle: category.title,
            value: "end",
            displayValue: `To: ${appliedFilterOptions[category.id].end}`,
          });
        }
      }
    });

    return active;
  };

  /**
   * Closes filter menu when clicking outside
   * Resets filter options to applied filters when closing without applying
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        filter &&
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setFilterOptions({ ...appliedFilterOptions });
        setFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filter, filterRef, appliedFilterOptions]);

  /**
   * Handles actions from the three-dots row menu
   * Temporarily sets the clicked row as selected for the action
   *
   * @param {string} option - The selected action option
   * @param {string} repoName - Name of the repository
   */
  const handleRowMenuAction = async (option, repoName) => {
    setOpenRowMenu(null);

    const previousSelection = [...selectedRows];
    setSelectedRows([repoName]);

    if (option === "Generate Documentation" && onGenerateDocumentation) {
      await onGenerateDocumentation([repoName]);
      setSelectedRows(previousSelection);
      return;
    }

    if (option === "Edit Specific Prompt" && onEditClick) {
      const repo = safeItems.find((r) => r.name === repoName);
      const specificPrompt = repo?.specificPrompt || "";
      onEditClick([specificPrompt], [repoName]);
      setSelectedRows(previousSelection);
      return;
    }

    if (option === "Edit Information" && onShowInformation) {
      onShowInformation([repoName]);
      setSelectedRows(previousSelection);
      return;
    }

    if (option === "Delete" && onDelete) {
      const repo = safeItems.find((r) => r.name === repoName);
      if (repo) {
        const repoInfo = {
          id: repo.id,
          targetDir: repo.path || null,
          name: repo.name,
        };
        setReposToDelete([repoInfo]);
        setShowDeleteModal(true);
      }
      setSelectedRows(previousSelection);
      return;
    }
  };

  /**
   * Handles actions from the main actions menu for selected repositories
   *
   * @param {string} option - The selected action option
   */
  const handleActionClick = async (option) => {
    setActionsMenu(false);

    if (option === "Generate Documentation" && onGenerateDocumentation) {
      const selected = [...selectedRows];
      setSelectedRows([]);
      await onGenerateDocumentation(selected);
      return;
    }

    if (option === "Edit Specific Prompt" && onEditClick) {
      handleEditClick();
      setActionsMenu(false);
      setSelectedRows([]);
      return;
    }

    if (option === "Edit Information" && onShowInformation) {
      onShowInformation(selectedRows);
      setActionsMenu(false);
      setSelectedRows([]);
      return;
    }

    if (option === "Delete" && onDelete) {
      const repoInfos = selectedRows
        .map((name) => {
          const repo = safeItems.find((r) => r.name === name);
          if (!repo) return null;
          return { id: repo.id, targetDir: repo.path || null, name: repo.name };
        })
        .filter(Boolean);
      if (repoInfos.length > 0) {
        setReposToDelete(repoInfos);
        setShowDeleteModal(true);
      }
      setSelectedRows([]);
      setActionsMenu(false);
      return;
    }
  };

  // Handle confirm delete from modal
  const handleConfirmDelete = async () => {
    if (reposToDelete.length > 0 && onDelete) {
      await onDelete(reposToDelete);
    }
    setShowDeleteModal(false);
    setReposToDelete([]);
  };

  // get specific prompts of one or more repos
  /**
   * Gets specific prompts for selected repositories
   * Triggers the edit prompt callback with prompts and repository names
   */
  const handleEditClick = () => {
    if (selectedRows.length === 0) {
      return;
    }

    const selectedPrompts = selectedRows.map(
      (name) => safeItems.find((r) => r.name === name)?.specificPrompt || "",
    );

    onEditClick(selectedPrompts, selectedRows);
  };

  /**
   * Handles click on repository name to navigate to its documentation
   * Only navigates if documentation exists for the repository
   *
   * @param {string} repoName - Name of the repository
   * @param {Event} event - Click event object
   */
  const handleRepoNameClick = (repoName, event) => {
    event.stopPropagation();

    const doc = documentations.find((d) => d.repo_name === repoName);

    if (doc) {
      navigate(`/documentations/${doc.id}`);
    }
  };

  /**
   * Closes actions menu when clicking outside
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        actionsMenu &&
        actionsRef.current &&
        !actionsRef.current.contains(event.target)
      ) {
        setActionsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsMenu, actionsRef]);

  return (
    //select none needed - no blue marking of text if selected with shift
    <section className="bg-white dark:bg-dark-bg p-4 select-none flex flex-col h-full overflow-x-auto">
      {/* Header for repo table, search bar and filter option */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-5">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Repository list
          </h3>

          {/* Toggle-Button */}

          {searched.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`border px-3 py-2 w-28
      ${
        selectedRows.length === searched.length
          ? "bg-[#3200c8] dark:bg-[#8080ff] text-white dark:text-white border-[#3200c8] dark:border-none"
          : "bg-white dark:bg-dark-bg text-[#3200c8] dark:text-[#8080ff] hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
      }`}
            >
              {selectedRows.length === searched.length
                ? "Deselect All"
                : "Select All"}
            </button>
          )}

          {/* Actions Button + Pop-up */}
          {selectedRows.length > 0 && (
            <div className="relative inline-block">
              <button
                data-testid="actions-button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActionsMenu(!actionsMenu);
                  setActionsMenuPosition({
                    top: rect.top - rect.height / 2,
                    left: rect.right + 8,
                  });
                }}
                className="bg-[#3200c8] dark:bg-[#8080ff] text-white border border-[#3200c8] dark:border-[#8080ff] px-3 py-2 hover:bg-[#220094] dark:hover:bg-[#6060dd]"
              >
                Actions
              </button>

              {actionsMenu &&
                createPortal(
                  <div
                    ref={actionsRef}
                    style={{
                      position: "fixed",
                      top: actionsMenuPosition?.top,
                      left: actionsMenuPosition?.left,
                      zIndex: 9999,
                    }}
                    className="w-48 bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600"
                  >
                    {optionsToShow.map((option) => (
                      <div key={option}>
                        <button
                          className="flex items-center gap-4 w-full text-left px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                          onClick={() => handleActionClick(option)}
                        >
                          <img
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

                        {/* horizontal ruler after Delete option for single selection */}
                        {selectedRows.length === 1 && option === "Delete" && (
                          <div className="mx-4 border-t border-gray-900 dark:border-gray-100 my-1" />
                        )}
                      </div>
                    ))}
                  </div>,
                  document.body,
                )}
            </div>
          )}
        </div>

        {/*Search Bar and Filter*/}
        <div className="relative">
          <div className="flex gap-4 items-center">
            <div className="relative w-full sm:w-64 md:w-72">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border bg-white border-gray-300 hover:border-[#3200c8] dark:hover:border-[#8080ff] dark:bg-dark-bg dark:border-gray-600 focus-visible:outline-[#3200c8] px-10 py-2 w-full"
              />
              <img
                src="../img/magnifier.png"
                alt="Search"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 dark:hidden"
              />
              <img
                src="../img/magnifier-white.png"
                alt="Search"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 hidden dark:block"
              />
            </div>

            <button
              onClick={toggleFilter}
              aria-label={"filterButton"}
              className="border flex items-center gap-2 border-gray-300 dark:border-gray-600 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
            >
              <img
                src="../img/filter.png"
                alt="Filter"
                className="w-6 h-6 dark:hidden"
              />
              <img
                src="../img/filter-white.png"
                alt="Filter"
                className="w-6 h-6 hidden dark:block"
              />
              Filter
            </button>

            {filter && (
              <div
                ref={filterRef}
                className="absolute right-0 top-full mt-3 w-80 h-104 max-h-104 bg-white dark:bg-dark-bg shadow-xl border border-gray-200 dark:border-gray-600 z-50 p-4 flex flex-col overflow-y-auto"
              >
                <div className="flex items-center gap-2">
                  <img
                    src="../img/filter.png"
                    alt="Filter"
                    className="w-6 h-6 dark:hidden"
                  />
                  <img
                    src="../img/filter-white.png"
                    alt="Filter"
                    className="w-6 h-6 hidden dark:block"
                  />
                  <h2
                    aria-label={"filterModal"}
                    className="font-bold text-gray-900 dark:text-gray-100"
                  >
                    Filters
                  </h2>
                </div>
                <hr className="w-full border-t border-gray-300 dark:border-gray-600 my-2" />
                {filterCategories.map((category, index) => (
                  <div
                    key={category.id}
                    className="relative flex flex-col items-center gap-2"
                  >
                    <div
                      className="flex justify-between items-center w-full cursor-pointer hover:opacity-80"
                      onClick={() =>
                        setOpenCategories((prev) => ({
                          ...prev,
                          [category.id]: !prev[category.id],
                        }))
                      }
                    >
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">
                        {category.title}
                      </h3>

                      <button className="bg-white dark:bg-dark-bg hover:opacity-80 p-0 focus:outline-none border-0 focus:ring-0">
                        <img
                          src={
                            openCategories[category.id]
                              ? isDark
                                ? "../img/chevronUpdark.png"
                                : "../img/chevron-up.png"
                              : isDark
                                ? "../img/chevronDownDark.png"
                                : "../img/chevron-down.png"
                          }
                          alt="Icon"
                          className="w-5 h-5 object-contain"
                        />
                      </button>
                    </div>

                    {category.type === "checkbox" &&
                      openCategories[category.id] && (
                        <div className="grid [grid-template-columns:120px_120px] gap-x-12 gap-y-1 ">
                          {category.options.map((option) => (
                            <label
                              key={option}
                              className="flex items-center cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                value={option}
                                checked={filterOptions[category.id].includes(
                                  option,
                                )}
                                name={category.title}
                                className="
                                  appearance-none
                                  h-4 w-4
                                  border border-gray-400 dark:border-gray-300

                                  bg-white
                                  checked:bg-[#3200c8]
                                  checked:border-[#3200c8]
                                  dark:checked:bg-[#8080ff]
                                  dark:checked:border-[#8080ff]
                                  focus:ring-2 focus:ring-offset-1
                                  focus:ring-[#3200c8]
                                  dark:focus:ring-[#8080ff]
                                  cursor-pointer"
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFilterOptions((prev) => ({
                                    ...prev,
                                    [category.id]: checked
                                      ? [...prev[category.id], option]
                                      : prev[category.id].filter(
                                          (s) => s !== option,
                                        ),
                                  }));
                                }}
                              />
                              <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                                {option.replace(/\b\w/g, (char) =>
                                  char.toUpperCase(),
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                    {category.type === "dateRange" &&
                      openCategories[category.id] && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300 w-1/2">
                              <span className="mb-1 font-medium">Start</span>
                              <input
                                type="date"
                                name={`${category.id}_start`}
                                value={filterOptions[category.id].start}
                                className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#3200c8] dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
                                onChange={(e) =>
                                  setFilterOptions((prev) => ({
                                    ...prev,
                                    [category.id]: {
                                      ...prev[category.id],
                                      start: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>

                            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300 w-1/2">
                              <span className="mb-1 font-medium">End</span>
                              <input
                                type="date"
                                name={`${category.id}_end`}
                                value={filterOptions[category.id].end}
                                onChange={(e) =>
                                  setFilterOptions((prev) => ({
                                    ...prev,
                                    [category.id]: {
                                      ...prev[category.id],
                                      end: e.target.value,
                                    },
                                  }))
                                }
                                className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#3200c8] dark:focus:ring-[#8080ff] bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                    {index < filterCategories.length - 1 && (
                      <hr className="w-full border-t border-gray-300 dark:border-gray-600 my-2" />
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={applyFilter}
                    className="bg-[#3200c8] dark:bg-[#8080ff] text-white px-4 py-2 hover:bg-[#220094] dark:hover:bg-[#6060dd]"
                  >
                    Apply
                  </button>

                  <button
                    onClick={clearFilter}
                    className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isGenerating ? (
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
          Generating documentation for {generatingCount}{" "}
          {generatingCount === 1 ? "repository" : "repositories"}...
          <Spinner size={32} color="#3200c8" />
        </div>
      ) : selectedRows.length > 0 ? (
        <span className="text-gray-900 dark:text-gray-100 mb-3">
          {selectedRows.length} selected
        </span>
      ) : null}

      {/* Active Filters Display */}
      {getActiveFilters().length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Active Filters:
          </span>
          {getActiveFilters().map((filter, index) => (
            <div
              key={`${filter.categoryId}-${filter.value}-${index}`}
              className="inline-flex items-center gap-2 bg-[#3200c8] dark:bg-[#8080ff] text-white px-3 py-1 rounded-full text-sm"
            >
              <span aria-label={"active-filter"}>
                {filter.categoryTitle}: {filter.displayValue}
              </span>
              <button
                onClick={() => removeFilter(filter.categoryId, filter.value)}
                className="text-gray-500 hover:text-[#3200c8] dark:text-gray-400 hover:bg-gray-500 hover:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-full p-0.5"
                aria-label="Remove filter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="relative flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700 min-h-0">
        <div id="repo-table-scroll" className="h-full overflow-y-auto">
          <table className="w-full min-w-max text-left">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
              <tr className="border-b bg-gray-100 dark:bg-gray-700">
                <th></th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Repository Name
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Description
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Repo Status
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Added
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Documentation Status
                </th>
                <th className="py-2 px-3 text-gray-900 dark:text-gray-100">
                  Specific Prompt
                </th>
                {/* Actions column header */}
                <th className="py-2 px-3 w-12 text-gray-900 dark:text-gray-100"></th>
              </tr>
            </thead>
            <tbody className={""}>
              {/*Search has no results */}
              {searched.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedRows.length > 0 ? "8" : "7"}
                    className="text-center text-gray-500 dark:text-gray-400 py-6"
                  >
                    No results!
                  </td>
                </tr>
              ) : (
                //has results
                searched.map((item) => (
                  <tr
                    key={item.name}
                    onClick={(e) => handleRowClick(item.name, e)}
                    onMouseLeave={() => {
                      // Timer starten → erst nach 200ms schließen
                      hoverCloseTimeout.current = setTimeout(() => {
                        setOpenRowMenu(null);
                        setMenuPosition(null);
                      }, 200);
                    }}
                    className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer
                             ${
                               selectedRows.includes(item.name)
                                 ? "bg-[#00f0ff1a] dark:bg-[#00f0ff33]"
                                 : "hover:bg-[#00f0ff1a] dark:hover:bg-[#00f0ff33]"
                             }`}
                  >
                    <td
                      className="py-2 px-3 w-12"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item.name)}
                        onChange={() =>
                          handleRowClick(item.name, { shiftKey: false })
                        }
                        className="
                        appearance-none
                        h-4 w-4
                        border border-gray-400 dark:border-gray-300
                        bg-white
                        checked:bg-[#3200c8]
                        checked:border-[#3200c8]
                        dark:checked:bg-[#8080ff]
                        dark:checked:border-[#8080ff]
                        focus:ring-2 focus:ring-offset-1
                        focus:ring-[#3200c8]
                        dark:focus:ring-[#8080ff]
                        cursor-pointer"
                      />
                    </td>

                    <td
                      className="py-2 px-3 text-gray-900 dark:text-gray-100 cursor-pointer hover:text-[#3200c8] dark:hover:text-[#8080ff] hover:underline"
                      aria-label={`repository-name-${item.name}`}
                      onClick={(e) => handleRepoNameClick(item.name, e)}
                    >
                      {item.name}
                    </td>
                    <td
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: item.description, // oder item.specificPrompt
                          top: rect.top - 8,
                          left: rect.left + rect.width / 2,
                          maxWidth: rect.width,
                          visible: true,
                        });
                      }}
                      onMouseLeave={() =>
                        setTooltip({ ...tooltip, visible: false })
                      }
                      className="relative group cursor-default py-2 px-3 max-w-sm text-gray-900 dark:text-gray-100"
                    >
                      <div className="line-clamp-1">{item.description}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getRepoStatusClasses(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                      {item.added}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getDocumentStatusClasses(
                          item.documentStatus,
                        )}`}
                      >
                        {item.documentStatus.replace(/\b\w/g, (c) =>
                          c.toUpperCase(),
                        )}
                      </span>
                    </td>
                    <td
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: item.specificPrompt,
                          top: rect.top - 8,
                          left: rect.left + rect.width / 2,
                          maxWidth: rect.width,
                          visible: true,
                        });
                      }}
                      onMouseLeave={() =>
                        setTooltip({ ...tooltip, visible: false })
                      }
                      className="relative group cursor-default py-2 px-3 max-w-sm text-gray-900 dark:text-gray-100"
                    >
                      <div className="line-clamp-1 overflow-hidden">
                        {item.specificPrompt}
                      </div>
                    </td>
                    {/* Three-dots menu column */}
                    <td
                      className="py-2 px-3 w-12 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        data-testid="row-actions-button"
                        onMouseEnter={(e) => {
                          if (hoverCloseTimeout.current) {
                            clearTimeout(hoverCloseTimeout.current);
                            hoverCloseTimeout.current = null;
                          }

                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();

                          if (openRowMenu !== item.name) {
                            setOpenRowMenu(null);
                            setMenuPosition(null);

                            // 3) Mikro-Delay, damit React die States sauber setzt
                            setTimeout(() => {
                              setOpenRowMenu(item.name);
                              setMenuPosition({
                                top: rect.top,
                                left: rect.right - 220,
                              });
                            }, 0);
                          } else {
                            // Wenn es das gleiche Menü ist → einfach neu positionieren
                            setMenuPosition({
                              top: rect.top,
                              left: rect.right - 220,
                            });
                          }
                        }}
                        /*setOpenRowMenu(
                            openRowMenu === item.name ? null : item.name,
                          );
                          setMenuPosition({
                            top: rect.top,
                            left: rect.right - 220,*/

                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-dark-bg rounded flex items-center justify-center"
                        aria-label="Row actions"
                      >
                        {/* Three vertical dots using SVG */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          className="bi bi-three-dots-vertical"
                          viewBox="0 0 16 16"
                        >
                          <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portal für das Row-Action-Menu (global, außerhalb der Tabelle) */}
      {openRowMenu &&
        menuPosition &&
        createPortal(
          <div
            onMouseEnter={() => {
              // dont close when hovering over the menu
              if (hoverCloseTimeout.current) {
                clearTimeout(hoverCloseTimeout.current);
                hoverCloseTimeout.current = null;
              }
            }}
            onMouseLeave={() => {
              // close if not hovering anymore
              hoverCloseTimeout.current = setTimeout(() => {
                setOpenRowMenu(null);
                setMenuPosition(null);
              }, 200);
            }}
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.top,

              /*Math.max(
                8,
                Math.min(menuPosition.top, window.innerHeight - 220),
              ),  220 = geschätzte Menühöhe*/
              left: menuPosition.left,

              /*Math.max(
                8,
                Math.min(menuPosition.left, window.innerWidth - 208),
              ), // 208 = Menübreite + padding*/
              zIndex: 9999,
              width: "192px",
            }}
            className="bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600"
            onClick={(e) => e.stopPropagation()} // Klicks im Menü schließen nicht sofort
          >
            {actionOptionsOneSelection.map((option) => (
              <button
                key={option}
                className="flex items-center gap-4 w-full text-left px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  // Aktion auslösen und Menü schließen
                  handleRowMenuAction(option, openRowMenu);
                  setOpenRowMenu(null);
                  setMenuPosition(null);
                }}
              >
                <img
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

      {tooltip.visible && tooltip.text && (
        <TooltipPortal
          text={tooltip.text}
          top={tooltip.top}
          left={tooltip.left}
          maxWidth={tooltip.maxWidth}
        />
      )}

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReposToDelete([]);
        }}
        onConfirm={handleConfirmDelete}
        itemType="repository"
        itemName={
          reposToDelete.length === 1
            ? reposToDelete[0]?.name
            : `${reposToDelete.length} repositories`
        }
      />
    </section>
  );
}
