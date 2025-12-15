/**
 * Status Tag Utilities
 * Provides styling classes for repository and documentation status indicators
 */

/**
 * Gets CSS classes for repository status tags
 * 
 * @param {string} status - Repository status (PENDING, RECEIVED, SUCCESS, FAILURE)
 * @returns {string} Tailwind CSS classes for the status badge
 */
export const getRepoStatusClasses = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 dark:bg-yellow-900 text-black dark:text-yellow-100";
    case "RECEIVED":
      return "bg-blue-100 dark:bg-blue-900 text-black dark:text-blue-100";
    case "SUCCESS":
      return "bg-green-100/75 dark:bg-green-800 text-black dark:text-green-100";
    case "FAILURE":
      return "bg-red-100 dark:bg-red-900 text-black dark:text-black";
    default:
      return "bg-gray-200 dark:bg-gray-600 text-black dark:text-white";
  }
};

/**
 * Gets CSS classes for documentation status tags
 * 
 * @param {string} status - Documentation status (documented, not documented, error)
 * @returns {string} Tailwind CSS classes for the status badge
 */
export const getDocumentStatusClasses = (status) => {
  switch (status?.toLowerCase()) {
    case "documented":
      return "bg-green-100/75 dark:bg-green-800 text-black dark:text-green-100";
    case "not documented":
      return "bg-yellow-100 dark:bg-yellow-500/75 text-black dark:text-gray-100";
    case "error":
      return "bg-red-100 dark:bg-red-900 text-black dark:text-black";
    default:
      return "bg-gray-200 dark:bg-gray-600 text-black dark:text-white";
  }
};
