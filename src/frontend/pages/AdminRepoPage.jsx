/**
 * AdminRepoPage Component
 * Main page for repository management displayed when logged in as Admin
 * Handles repository cloning, deletion, documentation generation, and settings
 * Manages polling for repository status updates and documentation generation
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.showGeneralSettings - Whether to show general settings modal
 * @param {Function} props.setShowGeneralSettings - Setter for general settings visibility
 * @param {boolean} props.showEditSpecificPrompt - Whether to show edit prompt modal
 * @param {Function} props.setShowEditSpecificPrompt - Setter for edit prompt visibility
 * @param {Array} props.items - List of repository items
 * @param {Function} props.setItems - Setter for repository items
 * @param {boolean} props.showInformation - Whether to show repository information modal
 * @param {Function} props.setShowInformation - Setter for information visibility
 * @param {Function} props.setDocsRefreshTrigger - Triggers documentation list refresh
 * @param {Function} props.setReposRefreshTrigger - Triggers repository list refresh
 * @param {boolean} props.isDark - Dark mode state
 * @param {Array} props.documentations - List of available documentations
 * @param {boolean} props.isGenerating - Whether documentation generation is in progress
 * @param {Function} props.setIsGenerating - Setter for generation state
 * @param {number} props.generatingCount - Count of documentations being generated
 * @param {Function} props.setGeneratingCount - Setter for generation count
 * @param {Function} props.setPopup - Setter for popup notifications
 * @returns {React.ReactElement} The admin repository page component
 */

import AdminRepoHeader from "../components/AdminRepoHeader.jsx";
import DataTable from "../components/AdminRepoDataTable.jsx";
import GeneralSetting from "../components/GeneralSetting.jsx";
import EditSpecificPromptMenu from "../components/EditSpecificPromptMenu.jsx";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthProvider.jsx";
import {
  enqueueClone,
  getTask,
  listRepos,
  deleteRepo,
  generateDocu,
  saveSpecificPrompt,
  getSpecificPrompt,
} from "../lib/api";
import ShowRepoInformation from "../components/ShowRepoInformation.jsx";

import { BrowserRouter, Route, Routes } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import SideBar from "../components/SideBar.jsx";

export default function AdminRepoPage({
  showGeneralSettings,
  setShowGeneralSettings,
  showEditSpecificPrompt,
  setShowEditSpecificPrompt,
  items,
  setItems,
  showInformation,
  setShowInformation,
  setDocsRefreshTrigger,
  setReposRefreshTrigger,
  isDark,
  documentations = [],
  isGenerating,
  setIsGenerating,
  generatingCount,
  setGeneratingCount,
  setPopup,
}) {
  const [specificPromptInfo, setSpecificPromptInfo] = useState([]);
  const [selectedRepoNames, setSelectedRepoNames] = useState([]);
  const { roles } = useAuth();

  const pollTimer = useRef(null);
  const itemsRef = useRef(items);

  /**
   * Keeps items reference up to date for polling callback
   */
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * Computes repository name from URL
   * Extracts only the repository name, removing .git extension
   * Handles both HTTPS and SSH URLs
   * 
   * @param {string} url - Repository URL (HTTPS or SSH format)
   * @returns {string} Repository name
   */
  const computeName = (url) => {
    try {
      // Handle SSH URLs like git@github.com:user/repo.git
      if (url.startsWith('git@') || url.startsWith('ssh://')) {
        // Remove ssh:// prefix if present
        let sshUrl = url.replace('ssh://', '');
        // Remove git@ prefix
        sshUrl = sshUrl.replace(/^git@/, '');
        // Split by : or / to get path parts
        const parts = sshUrl.split(/[:/]/).filter(Boolean);
        if (parts.length >= 2) {
          return parts[parts.length - 1].replace(/\.git$/i, "");
        }
      }
      
      // Handle HTTPS URLs
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return parts[parts.length - 1].replace(/\.git$/i, "");
      }
      if (parts.length === 1) {
        return parts[0].replace(/\.git$/i, "");
      }
    } catch {}
    return url;
  };

  /** Normalize repository URL for duplicate detection
   Converts SSH URLs to HTTPS and ensures consistent format
   */
  const normalizeRepoUrl = (url) => {
  
    if (typeof url !== 'string') {
      return '';
    }
    
    let normalized = url.trim();
    if (normalized.startsWith("git@")) {
      const withoutPrefix = normalized.substring(4); // Remove 'git@'
      // Replace only the first colon with a slash
      const colonIndex = withoutPrefix.indexOf(":");
      if (colonIndex !== -1) {
        normalized = "https://" + withoutPrefix.substring(0, colonIndex) + "/" + withoutPrefix.substring(colonIndex + 1);
      }
    }
    
    else if (normalized.startsWith("ssh://git@")) {
      normalized = normalized.replace("ssh://git@", "https://");
    }

  
    if (normalized.startsWith("http://")) {
      normalized = normalized.replace("http://", "https://");
    }

    
    if (!normalized.endsWith(".git")) {
      normalized = normalized + ".git";
    }

    normalized = normalized.replace("/.git", ".git");

    return normalized.toLowerCase(); // Lowercase for case-insensitive comparison
  };

 
  /**
   * Starts polling for repository task status updates
   * Polls every second until all tasks are complete (SUCCESS or FAILURE)
   */
  const startPolling = () => {
    if (pollTimer.current) return;
    pollTimer.current = setInterval(async () => {
      const snapshot = itemsRef.current;
      const open = snapshot.filter(
        (it) => it.taskId && !["SUCCESS", "FAILURE"].includes(it.status),
      );
      if (open.length === 0) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
        return;
      }

      const updates = await Promise.all(
        open.map(async (it) => {
          try {
            const s = await getTask(it.taskId);
            return { id: it.id, state: s.state, result: s.result };
          } catch (e) {
            return { id: it.id, state: it.status, result: it.result };
          }
        }),
      );

      setItems((prev) =>
        prev.map((it) => {
          const u = updates.find((x) => x.id === it.id);
          if (!u) return it;

          const updatedItem = { ...it, status: u.state, result: u.result };
          if (u.result?.repo_id && u.state === "SUCCESS") {
            updatedItem.id = u.result.repo_id;
            // Update name from backend response if available
            // This ensures SSH URLs show the proper repo name immediately
            if (u.result?.repo_name) {
              updatedItem.name = u.result.repo_name;
            }
          }

          // Handle backend duplicate detection errors
          if (u.state === "SUCCESS" && u.result?.status === "error") {
            const errorMessage = u.result.message || "Unknown error";
            
            // Check if it's a duplicate repository error
            // Check for both URL and name duplicates
            const isDuplicateError = errorMessage.includes("already exists") ||
                                    u.result.repo_id !== undefined; // Backend includes repo_id for duplicates
            
            if (isDuplicateError) {
              // Show popup for duplicate error
              setPopup({
                visible: true,
                title: "Duplicate Repository",
                message: errorMessage,
                type: "warning",
              });
              
              // Mark item for removal by returning null
              // We'll filter these out below
              return null;
            }
          }

          return updatedItem;
        }).filter((item) => item !== null), // Remove duplicate entries detected by backend
      );
    }, 1000);
  };

  /**
   * Handles adding a new repository
   * Checks for duplicates, creates pending entry, and enqueues clone task
   * 
   * @param {Object} params - Parameters object
   * @param {string} params.url - Repository URL
   */
  const onAdd = async ({ url }) => {
    const id = url;
    const name = computeName(url);
    
    const normalizedUrl = normalizeRepoUrl(url);
    
    
    const existingRepo = items.find((item) => {
      // Prefer the url field, fall back to id only if it's a string (initially id equals url)
      const itemUrl = item.url || (typeof item.id === 'string' ? item.id : '');
      if (!itemUrl) return false;
      return normalizeRepoUrl(itemUrl) === normalizedUrl;
    });
    
    if (existingRepo) {
      setPopup({
        visible: true,
        title: "Duplicate Repository",
        message: `A repository with this URL already exists: ${existingRepo.name}`,
        type: "warning",
      });
      return;
    }

    setItems((prev) => [
      {
        id,
        url,
        name,
        status: "PENDING",
        documentStatus: "Not Documented",
        added: "",
        taskId: null,
        result: null,
      },
      ...prev,
    ]);

    try {
      const { task_id } = await enqueueClone({ repo_url: url, depth: 1 });
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, taskId: task_id, status: "RECEIVED" } : it,
        ),
      );
      startPolling();
    } catch (e) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "FAILURE",
                result: { error: String(e?.message || e) },
              }
            : it,
        ),
      );
    }
  };

  /**
   * Clears polling timer on component unmount
   */
  useEffect(
    () => () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    },
    [],
  );

  /**
   * Handles repository deletion
   * Deletes repositories from backend and updates state
   * 
   * @param {Array} selectedRepoIds - Array of repo info objects with id and targetDir
   */
  const handleDelete = async (selectedRepoIds) => {
    console.log("Trying to delete these repos:", selectedRepoIds);

    const deleteResults = await Promise.allSettled(
      selectedRepoIds.map(async (repoInfo) => {
        if (
          !repoInfo.id ||
          repoInfo.id === "undefined" ||
          repoInfo.id === "null"
        ) {
          console.warn(
            `Skipping invalid repo ID: ${repoInfo.id}, removing from state only`,
          );
          return { success: true, id: repoInfo.id, fromState: true };
        }

        try {
          await deleteRepo(repoInfo.id);
          return {
            success: true,
            id: repoInfo.id,
            targetDir: repoInfo.targetDir,
          };
        } catch (err) {
          console.error(`Failed to delete repo ${repoInfo.name}:`, err);
          return { success: true, id: repoInfo.id, error: err.message };
        }
      }),
    );

    const successfullyDeleted = deleteResults
      .filter((result) => result.status === "fulfilled" && result.value.success)
      .map((result) => result.value.id);

    if (successfullyDeleted.length > 0) {
      setItems((prev) =>
        prev.filter((repo) => !successfullyDeleted.includes(repo.id)),
      );

      if (setDocsRefreshTrigger) {
        setDocsRefreshTrigger((prev) => prev + 1);
      }
    }
  };

  /**
   * Handles documentation generation for selected repositories
   * Updates repository status and triggers sidebar refresh on completion
   * 
   * @param {Array} selectedNames - Array of selected repository names
   */
  const handleGenerateDocumentation = async (selectedNames) => {
    const selectedRepoUrls = items
      .filter((repo) => selectedNames.includes(repo.name))
      .map((repo) => repo.id);

    setItems((prev) =>
      prev.map((repo) =>
        selectedNames.includes(repo.name)
          ? { ...repo, documentStatus: "generating" }
          : repo,
      ),
    );

    try {
      setIsGenerating(true);
      setGeneratingCount((prev) => prev + selectedNames.length);

      const response = await generateDocu(selectedRepoUrls);
      console.log("Documentation generation response:", response);

      if (response.status === "error") {
        console.error("Documentation generation failed:", response.message);
        console.error("Errors:", response.errors);

        setItems((prev) =>
          prev.map((repo) =>
            selectedNames.includes(repo.name)
              ? { ...repo, documentStatus: "error" }
              : repo,
          ),
        );

        setPopup({
          visible: true,
          title: "Generation Failed",
          message:
            response.message ||
            "Failed to generate documentation. Please check console logs for details.",
          type: "error",
        });
        return;
      }

      if (response.status === "partial_success") {
        console.warn(
          "Documentation generation partially succeeded:",
          response.message,
        );
        console.warn("Errors:", response.errors);

        const successfulRepoIds = new Set(
          (response.results || [])
            .filter((r) => r.status === "documented")
            .map((r) => r.repository),
        );

        setItems((prev) =>
          prev.map((repo) => {
            if (!selectedNames.includes(repo.name)) return repo;
            return {
              ...repo,
              documentStatus: successfulRepoIds.has(repo.name)
                ? "documented"
                : "error",
            };
          }),
        );

        setPopup({
          visible: true,
          title: "Partial Success",
          message:
            response.message ||
            `Documentation generated for ${response.successful_count || 0} repositories.`,
          type: "warning",
        });

        if (response.successful_count > 0 && setDocsRefreshTrigger) {
          setDocsRefreshTrigger((prev) => prev + 1);
        }
        return;
      }

      if (response.status === "ok" && response.successful_count > 0) {
        console.log(
          `Successfully generated documentation for ${response.successful_count} repositories`,
        );

        const successfulRepoNames = new Set(
          (response.results || [])
            .filter((r) => r.status === "documented")
            .map((r) => r.repository),
        );

        setItems((prev) =>
          prev.map((repo) => {
            if (!selectedNames.includes(repo.name)) return repo;
            return {
              ...repo,
              documentStatus: successfulRepoNames.has(repo.name)
                ? "documented"
                : "error",
            };
          }),
        );

        if (setDocsRefreshTrigger) {
          setDocsRefreshTrigger((prev) => prev + 1);
        }

        setPopup({
          visible: true,
          title: "Generation Completed",
          message:
            response.message ||
            "Your repository documentation has been successfully generated.",
          type: "success",
        });
      } else {
        console.error("No documentation was successfully generated");

        setItems((prev) =>
          prev.map((repo) =>
            selectedNames.includes(repo.name)
              ? { ...repo, documentStatus: "error" }
              : repo,
          ),
        );

        setPopup({
          visible: true,
          title: "Generation Failed",
          message:
            "Failed to generate documentation. Please check console logs for details.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to generate documentation:", err);
      console.error("Error details:", err.message || err);

      setItems((prev) =>
        prev.map((repo) =>
          selectedNames.includes(repo.name)
            ? { ...repo, documentStatus: "error" }
            : repo,
        ),
      );

      setPopup({
        visible: true,
        title: "Generation Failed",
        message:
          "An error occurred while generating documentation. Please check console logs for details.",
        type: "error",
      });
    } finally {
      setGeneratingCount((prev) => {
        const next = prev - selectedNames.length;
        if (next <= 0) {
          setIsGenerating(false);
          return 0;
        }
        return next;
      });
    }
  };

  return (
    <>
      {!showGeneralSettings && !showEditSpecificPrompt && !showInformation && (
        <AdminRepoHeader
          onAdd={onAdd}
          onSettingsClick={() => setShowGeneralSettings(true)}
        />
      )}
      {showGeneralSettings && (roles.includes("Admin") || roles.includes("admin") || roles.includes("Team.Admin") || roles.includes("Team.admin")) ? (
        <GeneralSetting onClose={() => setShowGeneralSettings(false)} />
      ) : showEditSpecificPrompt ? (
        <EditSpecificPromptMenu
          selectedNames={selectedRepoNames}
          selectedPrompts={specificPromptInfo}
          onClose={() => setShowEditSpecificPrompt(false)}
          onSave={async (newPrompt, names) => {
            setItems((prev) =>
              prev.map((repo) =>
                names.includes(repo.name)
                  ? { ...repo, specificPrompt: newPrompt }
                  : repo
              )
            );
            
            setShowEditSpecificPrompt(false);
            
            Promise.all(
              names.map(async (name) => {
                const repo = items.find((r) => r.name === name);
                if (!repo) return null;
                try {
                  await saveSpecificPrompt(repo.id, newPrompt);
                  return { name, success: true };
                } catch (err) {
                  console.error(`Failed to save prompt for ${name}:`, err);
                  return { name, success: false, error: err };
                }
              }),
            ).then((results) => {
              const failed = results.filter(r => r !== null && !r.success);
              if (failed.length > 0) {
                // Show error popup only if saves failed
                setPopup({
                  visible: true,
                  title: "Save Error",
                  message: `Failed to save prompt for ${failed.length} ${failed.length === 1 ? "repository" : "repositories"}: ${failed.map(f => f.name).join(", ")}`,
                  type: "error",
                });
              } else {
                // All saves successful - trigger refresh to update documentation status
                if (setDocsRefreshTrigger) {
                  setDocsRefreshTrigger((prev) => prev + 1);
                }
              }
            }).catch((err) => {
              // Handle unexpected errors in Promise.all
              console.error('Unexpected error saving prompts:', err);
              setPopup({
                visible: true,
                title: "Save Error",
                message: `An unexpected error occurred while saving prompts: ${err.message}`,
                type: "error",
              });
            });
          }}
        />
      ) : showInformation ? (
        <ShowRepoInformation
          selectedNames={selectedRepoNames}
          items={items}
          onClose={() => setShowInformation(false)}
          onSave={({
            originalName,
            newName,
            originalDescription,
            newDescription,
          }) => {
            setItems((prev) =>
              prev.map((repo) => {
                if (
                  repo.name === originalName &&
                  repo.description === originalDescription
                ) {
                  return {
                    ...repo,
                    name: newName,
                    description: newDescription,
                  };
                }
                return repo;
              }),
            );
            
            // Trigger sidebar refresh to update documentation titles when repo name changes
            if (setDocsRefreshTrigger && originalName !== newName) {
              setDocsRefreshTrigger((prev) => prev + 1);
            }
            
            setShowInformation(false);
          }}
          onRegenerateDoc={(repoName) => {
            // Update document status to "documented" for the regenerated repo
            setItems((prev) =>
              prev.map((repo) =>
                repo.name === repoName
                  ? { ...repo, documentStatus: "documented" }
                  : repo,
              ),
            );
            
            // Trigger sidebar refresh
            if (setDocsRefreshTrigger) {
              setDocsRefreshTrigger((prev) => prev + 1);
            }
            
            // Show success popup
            setPopup({
              visible: true,
              title: "Documentation Regenerated",
              message: `Documentation has been successfully regenerated for ${repoName}.`,
              type: "success",
            });
          }}
        />
      ) : (
        <DataTable
          items={items}
          isDark={isDark}
          onDelete={handleDelete}
          onGenerateDocumentation={handleGenerateDocumentation}
          onShowInformation={(selectedNames) => {
            setSelectedRepoNames(selectedNames);
            setShowInformation(true);
          }}
          onEditClick={async (selectedPrompts, selectedNames) => {
            // Use local cached prompts for instant display
            const prompts = selectedNames.map((name) => {
              const repo = items.find((r) => r.name === name);
              return repo?.specificPrompt || "";
            });
            setSelectedRepoNames(selectedNames);
            setSpecificPromptInfo(prompts);
            setShowEditSpecificPrompt(true);
          }}
          documentations={documentations}
          isGenerating={isGenerating}
          generatingCount={generatingCount}
        />
      )}
    </>
  );
}
