/**
 * CodeQualityAnalysis Component
 * Displays comprehensive code quality metrics and visualizations
 * Shows comments analysis, cyclomatic complexity, TODOs, and test coverage
 * Uses mock data for demonstration purposes
 * 
 * @param {Object} props - Component props
 * @param {string} props.repositoryName - Name of the repository being analyzed
 * @returns {React.ReactElement} The code quality analysis component
 */
import { useState, useEffect } from "react";
import { generateAllCodeQualityData } from "../lib/codeQualityMockData.js";

/**
 * DonutChart Component
 * Visualizes the ratio of commented to uncommented functions using a donut chart
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Chart data with commented/uncommented function counts
 * @returns {React.ReactElement} The donut chart component
 */
function DonutChart({ data }) {
  const { commentedFunctions, uncommentedFunctions, commentRate } = data;
  const total = commentedFunctions + uncommentedFunctions;

  const commentedPercent = (commentedFunctions / total) * 100;
  const uncommentedPercent = (uncommentedFunctions / total) * 100;

  const size = 200;
  const strokeWidth = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const commentedDash = (commentedPercent / 100) * circumference;
  const uncommentedDash = (uncommentedPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Commented functions segment (green) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={`${commentedDash} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Uncommented functions segment (red) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeDasharray={`${uncommentedDash} ${circumference}`}
          strokeDashoffset={-commentedDash}
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Commented: {commentedFunctions} ({commentedPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Uncommented: {uncommentedFunctions} ({uncommentedPercent.toFixed(1)}
            %)
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Overall Comment Rate: {commentRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * ComplexityBarChart Component
 * Displays cyclomatic complexity of functions as a horizontal bar chart
 * Allows expanding individual functions to see detailed complexity metrics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.functions - Array of function objects with complexity data
 * @returns {React.ReactElement} The complexity bar chart component
 */
function ComplexityBarChart({ functions }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!functions || functions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No complexity data available.
      </div>
    );
  }

  const maxComplexity = Math.max(...functions.map((f) => f.complexity));

  return (
    <div className="flex flex-col gap-3">
      {functions.map((func, idx) => {
        const widthPercent = (func.complexity / maxComplexity) * 100;
        const color =
          func.complexity > 30
            ? "bg-red-500"
            : func.complexity > 20
              ? "bg-orange-500"
              : "bg-yellow-500";
        const isExpanded = expandedIndex === idx;

        return (
          <div
            key={idx}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div
              className="flex flex-col gap-2 cursor-pointer"
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
            >
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 font-medium">
                  {func.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {func.complexity}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-6 rounded overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-300`}
                  style={{ width: `${widthPercent}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {func.file}
              </span>
            </div>

            {/* Expandable Detailed Metrics */}
            {isExpanded && func.metrics && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cyclomatic Complexity
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {func.complexity}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Conditions / IFs
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {func.metrics.conditions}
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Loops / Iterations
                    </div>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {func.metrics.loops}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Return Statements
                    </div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {func.metrics.returnStatements}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded col-span-2">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Maximum Nesting Depth
                    </div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {func.metrics.nestingDepth} levels
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-xs">
                    Complexity Analysis:
                  </h5>
                  <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>
                        <strong>
                          High condition count ({func.metrics.conditions}):
                        </strong>{" "}
                        Multiple decision points increase maintenance complexity
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>
                        <strong>
                          Nesting depth of {func.metrics.nestingDepth}:
                        </strong>{" "}
                        Deep nesting makes code harder to understand and test
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>
                        <strong>{func.metrics.loops} loop(s):</strong> Iterative
                        logic with potential for optimization
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>
                        <strong>
                          {func.metrics.returnStatements} exit point(s):
                        </strong>{" "}
                        Multiple returns can indicate complex error handling
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * CodeQualityAnalysis Component (Main Export)
 * Main component that orchestrates all code quality visualizations
 * Provides tabbed interface for different quality metrics
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isDark - Dark mode state
 * @returns {React.ReactElement} The code quality analysis component
 */
export default function CodeQualityAnalysis({ isDark }) {
  const [activeSection, setActiveSection] = useState("comments");
  const [data, setData] = useState(null);

  /**
   * Generates mock code quality data on component mount
   */
  useEffect(() => {
    const mockData = generateAllCodeQualityData();
    setData(mockData);
  }, []);

  if (!data) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        Loading analysis data...
      </div>
    );
  }

  const sections = [
    {
      id: "comments",
      label: "Comments",
      icon: isDark ? "../img/commentDM.png" : "../img/comment.png",
    },
    {
      id: "todos",
      label: "TODOs",
      icon: isDark ? "../img/checkDM.png" : "../img/check.png",
    },
    {
      id: "complexity",
      label: "Complexity",
      icon: isDark ? "../img/complexityDM.png" : "../img/complexity.png",
    },
    {
      id: "deadcode",
      label: "Dead Code",
      icon: isDark ? "../img/deleteDarkMode.png" : "../img/delete.png",
    },
    {
      id: "smells",
      label: "Code Smells",
      icon: isDark ? "../img/codeSmellsDM.png" : "../img/codeSmells.png",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-950">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Code Quality Analysis
        </h2>
      </div>

      {/* Section Navigation */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 dark:bg-stone-950 overflow-x-auto">
        <div className="flex">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-none px-4 py-2 text-sm font-medium flex items-center dark:bg-stone-950 gap-2 border-none focus:outline-none whitespace-normal ${
                activeSection === section.id
                  ? "bg-indigo-50 dark:bg-[#1b1929]"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <img src={section.icon} alt={section.label} className="w-5 h-5" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {activeSection === "comments" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Repository-wide Comment Coverage
              </h3>
              <DonutChart data={data.comments.donut} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Files with Lowest Comment Rates
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        File
                      </th>
                      <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        Uncommented
                      </th>
                      <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        Commented
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.comments.filesTable.map((file, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                          {file.file}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {file.rate}%
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                          {file.uncommented}
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                          {file.commented}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === "todos" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Top 10 Files with Most TODOs
            </h3>
            <div className="space-y-4">
              {data.todos.map((fileData, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {fileData.file}
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {fileData.count} TODOs
                    </span>
                  </div>
                  <ul className="space-y-1 ml-4">
                    {fileData.todos.map((todo, tidx) => (
                      <li
                        key={tidx}
                        className="text-xs text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-gray-500 dark:text-gray-400">
                          Line {todo.line}:
                        </span>{" "}
                        {todo.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "complexity" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Top 10 Most Complex Functions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Click on any function to view detailed complexity metrics
              </p>
              <ComplexityBarChart functions={data.complexity.topFunctions} />
            </div>

            {/* High Complexity Alert */}
            {data.complexity.topFunctions.filter((f) => f.complexity > 30)
              .length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                      High Complexity Alert
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {
                        data.complexity.topFunctions.filter(
                          (f) => f.complexity > 30,
                        ).length
                      }{" "}
                      functions have complexity scores above 30, indicating
                      potential maintainability issues. Consider refactoring
                      these functions into smaller, more focused units.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "deadcode" && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Dead Code Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {data.deadCode.unusedFunctions}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Unused Functions
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {data.deadCode.unusedFiles}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Unused Files
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Why could this be dead code?</strong>
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {data.deadCode.explanation.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Breakdown by Type
              </h3>
              <div className="space-y-2">
                {data.deadCode.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {detail.type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Impact: {detail.impact}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {detail.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "smells" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Top 10 Files with Worst Code Smell Scores
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        File
                      </th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                        Score
                      </th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        Detected Smells
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.codeSmells.topFiles.map((file, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                          {file.file}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              file.score >= 70
                                ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                : file.score >= 50
                                  ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                                  : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                            }`}
                          >
                            {file.score}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-xs">
                          {file.smells.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Critical Files Requiring Immediate Attention
              </h3>
              <div className="space-y-3">
                {data.codeSmells.criticalAnalysis.map((critical, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {critical.file}
                        </h4>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                          {critical.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
