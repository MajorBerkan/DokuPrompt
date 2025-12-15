import { useAuth } from "../lib/AuthProvider";
import { NavLink, useParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import profileIcon from "../img/UserOutline3.png";
import darkProfileIcon from "../img/ProfileDarkMode.png";
import { listDocuments, getDocument } from "../lib/api";

const DARK_MODE_KEY = "codedoc.darkMode";

/**
 * Generates a URL-friendly slug from heading text
 * Used for creating anchor links to documentation sections
 * 
 * @param {string} text - The heading text to convert to a slug
 * @returns {string} URL-friendly slug
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Extracts headings (H1, H2) from markdown content
 * Excludes the first H1 (document title) and filters out headings in code blocks
 * Handles duplicate slugs by appending numbers
 * 
 * @param {string} content - Markdown content to extract headings from
 * @returns {Array<Object>} Array of heading objects with level, text, and slug properties
 */
export function extractHeadings(content) {
  if (!content) return [];

  let contentWithoutCode = content;

  contentWithoutCode = contentWithoutCode.replace(/```[\s\S]*?```/g, "");
  contentWithoutCode = contentWithoutCode.replace(/`[^`]+`/g, "");
  contentWithoutCode = contentWithoutCode.replace(/^( {4}|\t).+$/gm, "");

  const headings = [];
  const headingCounts = {};
  let isFirstH1 = true;

  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(contentWithoutCode)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();

    if (level === 1 && isFirstH1) {
      console.log("Skipping first H1 in link tree:", text);
      isFirstH1 = false;
      continue;
    }

    const slug = generateSlug(text);

    const count = headingCounts[slug] || 0;
    headingCounts[slug] = count + 1;
    const uniqueSlug = count > 0 ? `${slug}-${count}` : slug;

    headings.push({
      level,
      text,
      slug: uniqueSlug,
    });
  }

  return headings;
}

/**
 * Extracts the first H1 heading from markdown content
 * Used as the document title
 * 
 * @param {string} content - Markdown content to extract from
 * @returns {string|null} The first H1 heading text or null if not found
 */
export function extractFirstH1(content) {
  if (!content) return null;
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : null;
}

/**
 * SideBar Component
 * Application sidebar providing navigation to different sections
 * Includes documentation tree, user profile, and theme toggle
 * 
 * @param {Object} props - Component props
 * @param {number} props.refreshTrigger - Trigger value to reload documentation list
 * @param {boolean} props.isDark - Current dark mode state
 * @param {Function} props.toggleTheme - Function to toggle theme
 * @returns {React.ReactElement} The sidebar component
 */
export default function SideBar({ refreshTrigger, isDark, toggleTheme }) {
  const { logout, account, roles } = useAuth();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const logoutRef = useRef(null);
  const [documentations, setDocumentations] = useState([]);
  const [linkTreeHeadings, setLinkTreeHeadings] = useState([]);
  const [docTitles, setDocTitles] = useState({});
  const location = useLocation();
  const params = useParams();
  const [activeHeading, setActiveHeading] = useState(null);

  const activeDocId = location.pathname.startsWith("/documentations/")
    ? params.id || location.pathname.split("/documentations/")[1]
    : null;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) {
      return saved === "true";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  /**
   * Synchronize local dark mode state with prop
   */
  useEffect(() => {
    if (typeof isDark === "boolean") {
      setIsDarkMode(isDark);
    }
  }, [isDark]);

  /**
   * Load documentations from API when component mounts or refresh is triggered
   */
  useEffect(() => {
    (async () => {
      try {
        const docs = await listDocuments();
        console.log("Loaded documentations:", docs);
        docs.sort((a, b) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
        );
        setDocumentations(docs);
      } catch (err) {
        console.error("Failed to load documentations:", err);
        setDocumentations([]);
      }
    })();
  }, [refreshTrigger]);

  /**
   * Load and extract headings for link tree when viewing a specific documentation
   */
  useEffect(() => {
    console.log("=== Load Link Tree Effect ===");
    console.log("Active doc ID:", activeDocId);

    if (activeDocId) {
      (async () => {
        try {
          console.log("Fetching document with ID:", activeDocId);
          const doc = await getDocument(activeDocId);
          console.log("Document fetched:", {
            id: doc.id,
            title: doc.title,
            contentLength: doc.content?.length,
            contentPreview: doc.content?.substring(0, 100),
          });

          const headings = extractHeadings(doc.content);
          console.log("Extracted headings:", headings);

          // Add Project Goal as the first item in the link tree
          const headingsWithGoal = [
            { level: 2, text: "Project Goal", slug: "project-goal" },
            ...headings,
          ];

          setLinkTreeHeadings(headingsWithGoal);
          console.log("Link tree state updated");
        } catch (err) {
          console.error("Failed to load documentation for link tree:", err);
          setLinkTreeHeadings([]);
        }
      })();
    } else {
      console.log("No active doc, clearing link tree");
      setLinkTreeHeadings([]);
    }
    console.log("=== End Load Link Tree Effect ===");
  }, [activeDocId]);

  //Scrollspy for link tree
  useEffect(() => {
    if (!linkTreeHeadings || linkTreeHeadings.length === 0) return;

    const checkContainer = () => document.getElementById("contentScrollArea");

    const observerInit = () => {
      const scrollContainer = checkContainer();
      if (!scrollContainer) return false;

      const observer = new IntersectionObserver(
        (entries) => {
          // Filter nur die Elemente, die aktuell intersecten
          const visibleEntries = entries.filter(
            (entry) => entry.isIntersecting,
          );

          if (visibleEntries.length === 0) return;

          // Wähle das Element, das am weitesten oben im Container ist
          const topEntry = visibleEntries.reduce((prev, curr) => {
            const prevTop = prev.boundingClientRect.top;
            const currTop = curr.boundingClientRect.top;
            return currTop < prevTop ? curr : prev;
          });

          setActiveHeading(topEntry.target.id);
        },
        {
          root: scrollContainer,
          threshold: 0.3, // behalte deinen bisherigen Threshold
        },
      );

      // beobachte alle Headings
      linkTreeHeadings.forEach(({ slug }) => {
        const el = document.getElementById(slug);
        if (el) observer.observe(el);
      });

      return observer;
    };

    let observer = observerInit();

    // Wenn container noch nicht da, wiederhole alle 50ms
    const interval = setInterval(() => {
      if (!observer) observer = observerInit();
      if (observer) clearInterval(interval);
    }, 50);

    return () => {
      if (observer) observer.disconnect();
      clearInterval(interval);
    };
  }, [linkTreeHeadings]);

  //load documentation titles from API
  useEffect(() => {
    (async () => {
      try {
        const docs = await listDocuments();
        setDocumentations(docs);

        // Use title from API response (which is the repo_name)
        // This ensures the sidebar shows just the repository name without "Repository Documentation" suffix
        const titles = Object.fromEntries(
          docs.map((doc) => [doc.id, doc.title]),
        );
        setDocTitles(titles);
      } catch (err) {
        console.error("Failed to load documentations:", err);
        setDocumentations([]);
      }
    })();
  }, [refreshTrigger]);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
  }, [isDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    toggleTheme();
  };

  // User data - display name comes from account
  const user = {
    name: account?.name || account?.username || "User",
    role:
      roles.includes("Team.Admin") || roles.includes("admin")
        ? "Admin"
        : roles.includes("Team.Editor") || roles.includes("bearbeiter")
          ? "Editor"
          : "Viewer",
    avatar: isDark ? darkProfileIcon : profileIcon,
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutPopup(false);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Handle link tree item click - smooth scroll to heading
  const handleLinkTreeClick = (e, slug) => {
    console.log("=== Link Tree Click Debug ===");
    console.log("1. Click event fired for slug:", slug);
    console.log("2. Event object:", e);
    e.preventDefault();
    console.log("3. preventDefault() called");

    // Small delay to ensure the page has loaded
    setTimeout(() => {
      console.log("4. Inside setTimeout, looking for element with ID:", slug);
      const element = document.getElementById(slug);
      console.log("5. Found element:", element);

      if (element) {
        console.log("6. Element found! Details:", {
          tagName: element.tagName,
          id: element.id,
          textContent: element.textContent?.substring(0, 50),
          offsetTop: element.offsetTop,
        });

        // Find the scrollable container (the markdown content div)
        const scrollContainer =
          element.closest(".overflow-y-auto") ||
          element.closest(".overflow-auto");
        console.log("7. Scrollable container:", scrollContainer);

        if (scrollContainer) {
          console.log("8. Container found! Details:", {
            scrollTop: scrollContainer.scrollTop,
            scrollHeight: scrollContainer.scrollHeight,
            clientHeight: scrollContainer.clientHeight,
          });

          // Calculate position relative to container
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const elementTop = element.getBoundingClientRect().top;
          const scrollTop = scrollContainer.scrollTop;
          const targetScroll = scrollTop + (elementTop - containerTop) - 20; // 20px offset

          console.log("9. Scroll calculation:", {
            containerTop,
            elementTop,
            currentScrollTop: scrollTop,
            targetScroll,
          });

          scrollContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
          console.log("10. scrollTo() called successfully");
        } else {
          console.log("8. No scroll container found, using fallback");
          // Fallback to regular scroll
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          console.log("10. scrollIntoView() called");
        }
      } else {
        console.error("5. Element NOT found with ID:", slug);
        console.log(
          "6. All elements with IDs in document:",
          Array.from(document.querySelectorAll("[id]")).map((el) => ({
            id: el.id,
            tagName: el.tagName,
          })),
        );
      }
      console.log("=== End Link Tree Click Debug ===");
    }, 100);
  };

  //let logout button dissappear if mouse clicks different place
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target)) {
        setShowLogoutPopup(false);
      }
    };

    if (showLogoutPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogoutPopup]);

  return (
    <aside className="w-56 min-w-[12rem] max-w-xs text-gray-900 dark:text-gray-100 flex flex-col p-4 bg-white dark:bg-dark-bg h-full border-r border-gray-200 dark:border-gray-700">
      {/* Documentations Section - with border box for clear visual separation */}
      <div className="flex-1 mb-4 overflow-hidden flex flex-col">
        <div className="mt-2 mb-4 flex-shrink-0">
          <NavLink
            to="/"
            end
            className="block text-xl font-bold text-center mt-2
               text-[#3200c8] dark:text-[#8080ff] hover:text-[#3f00fb] hover:dark:text-[#b3b3ff]"
          >
            Documentation
          </NavLink>
          <div className="border-b border-gray-300 dark:border-gray-700 mt-2"></div>
        </div>
        <div className="p-3 bg-white dark:bg-dark-bg flex-1 overflow-y-auto min-h-0">
          <nav className="space-y-1">
            {documentations.length > 0 ? (
              documentations.map((doc) => {
                const isActive = doc.id.toString() === activeDocId;
                const displayTitle = docTitles[doc.id] || null;
                return (
                  <div key={doc.id}>
                    {displayTitle && (
                      <NavLink
                        to={`/documentations/${doc.id}`}
                        className={({ isActive }) =>
                          `block py-2 px-3  
                         hover:bg-[#3200c8] dark:hover:bg-[#8080ff] 
                         hover:text-white dark:hover:text-black text-sm transition-colors
                         ${
                           isActive
                             ? "bg-[#3200c8] dark:bg-[#220094] text-white dark:text-white"
                             : "text-gray-900 dark:text-gray-100"
                         }`
                        }
                      >
                        {displayTitle}
                      </NavLink>
                    )}

                    {/* Link Tree - show only for active documentation */}
                    {isActive && linkTreeHeadings.length > 0 && (
                      <nav className="mt-2 mb-3 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 ml-3">
                        {(() => {
                          console.log("=== Rendering Link Tree ===");
                          console.log("Active doc:", doc.id);
                          console.log(
                            "Number of headings:",
                            linkTreeHeadings.length,
                          );
                          console.log("Headings to render:", linkTreeHeadings);
                          return null;
                        })()}
                        {linkTreeHeadings.map((heading, index) => {
                          // Calculate indentation based on heading level (H1=0, H2=1, H3=2, H4=3)
                          const indent = (heading.level - 1) * 0.75;
                          console.log(`Rendering link ${index}:`, {
                            text: heading.text,
                            slug: heading.slug,
                            level: heading.level,
                            indent,
                          });
                          return (
                            <a
                              key={index}
                              href={`#${heading.slug}`}
                              onClick={(e) => {
                                console.log(
                                  `Link clicked for: ${heading.text} (${heading.slug})`,
                                );
                                handleLinkTreeClick(e, heading.slug);
                              }}
                              className={`
                                          block py-1 px-2 text-xs transition-colors cursor-pointer
                                          ${
                                            activeHeading === heading.slug
                                              ? "text-[#3200c8] dark:text-[#8080ff] font-semibold"
                                              : "text-gray-700 dark:text-gray-300 hover:text-[#3200c8] dark:hover:text-[#8080ff]"
                                          }
                                        `}
                              style={{ paddingLeft: `${0.5 + indent}rem` }}
                              title={heading.text}
                            >
                              {heading.text}
                            </a>
                          );
                        })}
                      </nav>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                No documentation available
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Bottom Section with Repositories button and Profile */}
      <div className="mt-auto space-y-4">
        {/* Border above Repositories */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Repositories Button - rectangular (no rounded corners) */}
          {/* Show Repositories only to Admins and Editors */}
          {(roles.includes("Team.Admin") ||
            roles.includes("admin") ||
            roles.includes("Team.Editor") ||
            roles.includes("bearbeiter")) && (
            <NavLink
              to="/repositories"
              className={({ isActive }) =>
                `block py-2 px-3 border 
     ${
       isActive
         ? "text-white dark:text-white bg-[#3200c8]   border-[#3200c8] dark:border-[#220094] dark:bg-[#220094] dark:hover:bg-[#6060dd] hover:text-white dark:hover:text-white hover:border-white"
         : "text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg hover:bg-[#3200c8] dark:hover:bg-[#8080ff] hover:text-white dark:hover:text-black hover:border-white "
     }`
              }
            >
              Repositories
            </NavLink>
          )}
        </div>

        {/* Profile Section - clickable with popup */}
        <div className=" relative" ref={logoutRef}>
          <button
            onClick={() => setShowLogoutPopup(!showLogoutPopup)}
            className="w-full flex items-start gap-3 p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer "
          >
            <img
              src={user.avatar}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </span>
            </div>
          </button>

          {/* Logout Popup */}
          {showLogoutPopup && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-gray-600 rounded shadow-lg">
              {/* Dark Mode Toggle */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    Dark Mode
                  </span>
                  <button
                    aria-label="Dark Mode"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDarkMode();
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#3200c8] dark:focus:ring-[#8080ff] focus:ring-offset-2 ${
                      isDarkMode ? "bg-[#8080ff]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-all ${
                        isDarkMode ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3 text-left text-base hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent text-gray-900 dark:text-gray-100"
              >
                <img
                  src={
                    isDark ? "../img/LogOutDarkMode.png" : "../img/LogOut1.png"
                  }
                  alt="Logout"
                  className="w-6 h-6 object-conain"
                />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
