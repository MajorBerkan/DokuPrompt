/**
 * ArchitectureAnalysis Component
 * Displays repository architecture analysis including dependencies, external packages, and file structure
 * Provides visualizations for dependency relationships and cyclic dependencies
 * Uses mock data for demonstration purposes
 *
 * @param {Object} props - Component props
 * @param {string} props.repositoryName - Name of the repository being analyzed
 * @returns {React.ReactElement} The architecture analysis component
 */
import { useState, useEffect } from "react";
import { generateAllArchitectureData } from "../lib/architectureMockData.js";

/**
 * SummaryBox Component
 * Displays a summary of dependency statistics in a grid layout
 *
 * @param {Object} props - Component props
 * @param {Object} props.summary - Summary object containing dependency counts and description
 * @returns {React.ReactElement} The summary box component
 */
function SummaryBox({ summary }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Dependency Summary
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.directInternal}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Direct Internal
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summary.directExternal}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Direct External
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summary.transitive}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Transitive Total
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {summary.cyclicChains}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Cyclic Chains
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded col-span-2">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary.filesWithDependencies}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Files with Dependencies
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 italic">
        {summary.description}
      </p>
    </div>
  );
}

/**
 * InternalDependenciesTree Component
 * Displays a collapsible tree view of internal module dependencies
 * Shows module names, their dependencies, and descriptions
 *
 * @param {Object} props - Component props
 * @param {Object} props.data - Data object containing modules array
 * @returns {React.ReactElement} The internal dependencies tree component
 */
function InternalDependenciesTree({ data }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Internal Dependencies Tree
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {data.modules.map((module, idx) => (
            <div
              key={idx}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 break-words whitespace-normal"
            >
              <div className="font-mono text-sm text-blue-600 dark:text-blue-400 mb-2">
                {module.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                {module.description}
              </div>
              {module.dependencies.length > 0 ? (
                <div className="ml-4 space-y-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    depends on:
                  </div>
                  {module.dependencies.map((dep, depIdx) => (
                    <div
                      key={depIdx}
                      className="ml-4 text-xs text-gray-700 dark:text-gray-300 font-mono"
                    >
                      → {dep}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ml-4 text-xs text-green-600 dark:text-green-400">
                  ✓ No internal dependencies (leaf node)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TransitiveDependencies Component
 * Displays transitive (indirect) dependencies with expandable details
 * Shows dependency chains and their depths
 *
 * @param {Object} props - Component props
 * @param {Object} props.data - Data object containing packages array
 * @returns {React.ReactElement} The transitive dependencies component
 */
function TransitiveDependencies({ data }) {
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <div className="space-y-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Transitive Dependency Chains
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isSectionExpanded ? "rotate-180" : ""}`}
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
      </div>

      {isSectionExpanded && (
        <div className="space-y-3">
          {data.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {item.root}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Depth: {item.depth} levels
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                      {item.chain.map((module, moduleIdx) => (
                        <div key={moduleIdx} className="flex items-start gap-2">
                          <div className="text-gray-400 dark:text-gray-500 mt-0.5">
                            {moduleIdx < item.chain.length - 1 ? "↓" : ""}
                          </div>
                          <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                            {module}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 italic">
                      {item.description}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * CyclicDependencies Component
 * Displays cyclic dependency chains with severity indicators
 * Highlights potential architectural issues
 *
 * @param {Object} props - Component props
 * @param {Object} props.data - Data object containing chains array
 * @returns {React.ReactElement} The cyclic dependencies component
 */
function CyclicDependencies({ data }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "medium":
        return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      default:
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "high":
        return "🔴";
      case "medium":
        return "🟠";
      default:
        return "🟡";
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Cyclic Dependencies
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
      </div>

      {isExpanded && (
        <>
          {data.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="text-sm text-green-700 dark:text-green-300">
                  No cyclic dependencies detected. Good architectural hygiene!
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((cycle) => (
                <div
                  key={cycle.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(cycle.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {getSeverityIcon(cycle.severity)}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Cycle Project A #{cycle.id} (length {cycle.length}):
                      </h4>
                      <div className="bg-white dark:bg-gray-800 rounded p-3 mb-3 font-mono text-xs">
                        {cycle.modules.map((module, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-gray-500 dark:text-gray-400">
                              {idx < cycle.modules.length - 1 ? "→" : "↺"}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 break-all">
                              {module}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Impact: {cycle.impact}
                        </div>
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          {cycle.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ArchitectureAnalysis Component (Main Export)
 * Main component that orchestrates all architecture visualizations
 * Displays dependency summary, internal/external dependencies, and cyclic dependencies
 *
 * @returns {React.ReactElement} The architecture analysis component
 */
export default function ArchitectureAnalysis() {
  const [data, setData] = useState(null);

  /**
   * Generates mock architecture data on component mount
   */
  useEffect(() => {
    const mockData = generateAllArchitectureData();
    setData(mockData);
  }, []);

  if (!data) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        Loading architecture data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-950">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Architecture Analysis
        </h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Summary Box */}
        <SummaryBox summary={data.summary} />

        {/* Internal Dependencies */}
        <InternalDependenciesTree data={data.internalDependencies} />

        {/* Transitive Dependencies */}
        <TransitiveDependencies data={data.transitiveDependencies} />

        {/* Cyclic Dependencies */}
        <CyclicDependencies data={data.cyclicDependencies} />
      </div>
    </div>
  );
}
