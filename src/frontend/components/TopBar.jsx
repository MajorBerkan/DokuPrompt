/**
 * TopBar Component
 * Application header bar displaying logo, title, and search functionality
 * Adapts styling based on theme (light/dark mode)
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.showSearchField - Whether to display the search input
 * @param {string} props.searchTerm - Current search term value
 * @param {Function} props.onSearchChange - Callback when search term changes
 * @returns {React.ReactElement} The top bar component
 */
export default function TopBar({
  showSearchField,
  searchTerm,
  onSearchChange,
}) {
  return (
    <header className="h-12 w-full flex-none flex items-center justify-between px-4 py-7 text-[#3200C8] dark:text-[#8080ff] bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center">
          <img src="../img/logo3.png" alt="Logo" className="h-8 dark:hidden" />
          <img
            src="../img/NFONLogoWhite.png"
            alt="Logo"
            className="h-16 hidden dark:block"
          />
        </div>
        <h1 className="ml-3 text-lg font-semibold whitespace-nowrap">
          DokuPrompt
        </h1>
      </div>

      <div className="flex-1 flex justify-center gap-4 flex-shrink min-w-0">
        {showSearchField && (
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search in documentations"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border min-w-[120px] border-gray-300 dark:bg-dark-bg dark:border-gray-600 dark:hover:border-[#8080ff] hover:border-[#3200c8] focus-visible:outline-[#3200c8] pl-10 pr-2 py-1 w-full bg-white  text-gray-900 dark:text-gray-100"
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
        )}
      </div>
    </header>
  );
}
