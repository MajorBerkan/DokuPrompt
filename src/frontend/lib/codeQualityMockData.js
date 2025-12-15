/**
 * Mock data generator for repository code quality analysis
 * Generates realistic but fictional data for demonstration purposes
 */

/**
 * Generates mock data for comments per file analysis
 */
export function generateCommentsData() {
  const totalFunctions = 347;
  const commentedFunctions = 198;
  const uncommentedFunctions = totalFunctions - commentedFunctions;
  const commentRate = ((commentedFunctions / totalFunctions) * 100).toFixed(1);

  const filesWithLowComments = [
    { file: "app/server/routes/api.py", rate: 12.5, uncommented: 28, commented: 4 },
    { file: "web/components/DataGrid.jsx", rate: 18.2, uncommented: 9, commented: 2 },
    { file: "app/server/security/session.py", rate: 22.7, uncommented: 17, commented: 5 },
    { file: "web/utilities/http_client.js", rate: 25.0, uncommented: 12, commented: 4 },
    { file: "app/server/data/schemas.py", rate: 28.6, uncommented: 15, commented: 6 },
    { file: "web/components/ProjectInfo.jsx", rate: 31.3, uncommented: 11, commented: 5 },
    { file: "app/server/helpers/storage.py", rate: 33.3, uncommented: 8, commented: 4 },
    { file: "web/views/Dashboard.jsx", rate: 35.7, uncommented: 9, commented: 5 },
    { file: "app/server/routes/interceptor.py", rate: 37.5, uncommented: 10, commented: 6 },
    { file: "web/components/ConfigPanel.jsx", rate: 40.0, uncommented: 6, commented: 4 },
  ];

  return {
    donut: {
      commentedFunctions,
      uncommentedFunctions,
      commentRate,
      totalFunctions,
    },
    filesTable: filesWithLowComments,
  };
}

/**
 * Generates mock data for TODOs in repository
 */
export function generateTodosData() {
  const todosData = [
    {
      file: "app/server/routes/api.py",
      count: 12,
      todos: [
        { line: 45, text: "Add input validation for user parameters" },
        { line: 89, text: "Implement rate limiting" },
        { line: 134, text: "Add error handling for database connection" },
        { line: 201, text: "Refactor authentication logic" },
        { line: 267, text: "Add unit tests for edge cases" },
      ]
    },
    {
      file: "web/components/ContentDisplay.jsx",
      count: 8,
      todos: [
        { line: 37, text: "Implement search functionality" },
        { line: 125, text: "Add loading state indicator" },
        { line: 203, text: "Optimize re-rendering performance" },
      ]
    },
    {
      file: "app/server/business/report_generator.py",
      count: 7,
      todos: [
        { line: 78, text: "Cache parsed markdown content" },
        { line: 156, text: "Add support for custom templates" },
        { line: 234, text: "Implement incremental updates" },
      ]
    },
    {
      file: "web/utilities/http_client.js",
      count: 6,
      todos: [
        { line: 23, text: "Add retry logic for failed requests" },
        { line: 67, text: "Implement request cancellation" },
        { line: 103, text: "Add request timeout configuration" },
      ]
    },
    {
      file: "app/server/helpers/text_processor.py",
      count: 5,
      todos: [
        { line: 91, text: "Support additional file formats" },
        { line: 142, text: "Improve error messages" },
      ]
    },
    {
      file: "web/components/DataGrid.jsx",
      count: 5,
      todos: [
        { line: 56, text: "Add column sorting" },
        { line: 112, text: "Implement pagination controls" },
      ]
    },
    {
      file: "app/server/data/version_control.py",
      count: 4,
      todos: [
        { line: 34, text: "Add rollback support" },
        { line: 78, text: "Test migration with large datasets" },
      ]
    },
    {
      file: "web/components/Header.jsx",
      count: 3,
      todos: [
        { line: 45, text: "Add user preferences menu" },
      ]
    },
    {
      file: "app/server/business/vcs_integration.py",
      count: 3,
      todos: [
        { line: 123, text: "Handle API rate limits" },
      ]
    },
    {
      file: "web/components/Navigation.jsx",
      count: 2,
      todos: [
        { line: 67, text: "Add keyboard navigation" },
      ]
    },
  ];

  return todosData;
}

/**
 * Generates mock data for cyclomatic complexity analysis
 */
export function generateComplexityData() {
  const topComplexFunctions = [
    { 
      name: "process_report_batch", 
      file: "app/server/business/report_generator.py", 
      complexity: 47,
      metrics: {
        conditions: 18,
        loops: 3,
        returnStatements: 7,
        nestingDepth: 5
      },
      description: "Handles batch processing of report generation with multiple error paths"
    },
    { 
      name: "validate_and_parse_project", 
      file: "app/server/routes/api.py", 
      complexity: 38,
      metrics: {
        conditions: 14,
        loops: 2,
        returnStatements: 5,
        nestingDepth: 4
      },
      description: "Complex validation logic with nested conditions for project structure"
    },
    { 
      name: "render_content_with_plugins", 
      file: "app/server/helpers/content_renderer.py", 
      complexity: 34,
      metrics: {
        conditions: 12,
        loops: 4,
        returnStatements: 3,
        nestingDepth: 4
      },
      description: "Processes content with multiple plugin hooks and conditional rendering"
    },
    { 
      name: "authenticate_user_request", 
      file: "app/server/security/session.py", 
      complexity: 29,
      metrics: {
        conditions: 11,
        loops: 2,
        returnStatements: 6,
        nestingDepth: 3
      },
      description: "Multi-factor authentication with various fallback mechanisms"
    },
    { 
      name: "sync_remote_changes", 
      file: "app/server/business/vcs_integration.py", 
      complexity: 26,
      metrics: {
        conditions: 10,
        loops: 3,
        returnStatements: 4,
        nestingDepth: 3
      },
      description: "Synchronizes remote changes with complex conflict resolution"
    },
    { 
      name: "build_navigation_tree", 
      file: "app/server/helpers/tree_builder.py", 
      complexity: 24,
      metrics: {
        conditions: 9,
        loops: 2,
        returnStatements: 3,
        nestingDepth: 4
      },
      description: "Recursive navigation tree generation with depth limits and filtering"
    },
    { 
      name: "handle_file_upload", 
      file: "app/server/routes/upload_handler.py", 
      complexity: 22,
      metrics: {
        conditions: 8,
        loops: 1,
        returnStatements: 4,
        nestingDepth: 3
      },
      description: "File upload handling with validation, conversion, and storage"
    },
    { 
      name: "generate_search_index", 
      file: "app/server/business/indexer.py", 
      complexity: 21,
      metrics: {
        conditions: 7,
        loops: 2,
        returnStatements: 2,
        nestingDepth: 3
      },
      description: "Creates searchable index with tokenization and ranking"
    },
    { 
      name: "apply_access_control", 
      file: "app/server/security/permissions.py", 
      complexity: 19,
      metrics: {
        conditions: 6,
        loops: 1,
        returnStatements: 3,
        nestingDepth: 2
      },
      description: "Role-based access control with hierarchical permissions"
    },
    { 
      name: "render_content_page", 
      file: "web/components/ContentDisplay.jsx", 
      complexity: 18,
      metrics: {
        conditions: 5,
        loops: 1,
        returnStatements: 2,
        nestingDepth: 2
      },
      description: "Complex React component with multiple conditional renders"
    },
  ];

  const cfgDescriptions = [
    {
      functionName: "process_report_batch",
      file: "app/server/business/report_generator.py",
      complexity: 47,
      metrics: {
        conditions: 18,
        loops: 3,
        returnStatements: 7,
        nestingDepth: 5
      },
      cfg: {
        nodes: [
          "Entry",
          "Validate input parameters",
          "Check project access",
          "Loop: For each file in batch",
          "Parse file content",
          "Check file type",
          "Process markdown files",
          "Process code files",
          "Generate report",
          "Handle parsing errors",
          "Update database",
          "Handle database errors",
          "Send notifications",
          "Loop: Retry failed items",
          "Exit"
        ],
        branches: [
          "Input validation: valid/invalid (2 paths)",
          "Project access: granted/denied (2 paths)",
          "File type: markdown/code/other (3 paths)",
          "Parse result: success/error (2 paths)",
          "Database operation: success/error (2 paths)",
          "Retry condition: continue/abort (2 paths)"
        ],
        loops: [
          "Main batch processing loop (for each file)",
          "Retry loop for failed items (while retries < max)"
        ],
        specialFeatures: [
          "Multiple exception handlers with different recovery strategies",
          "Nested loops with early exit conditions",
          "Complex error aggregation across batch items"
        ]
      }
    },
    {
      functionName: "validate_and_parse_project",
      file: "app/server/routes/api.py",
      complexity: 38,
      metrics: {
        conditions: 14,
        loops: 2,
        returnStatements: 5,
        nestingDepth: 4
      },
      cfg: {
        nodes: [
          "Entry",
          "Extract project URL",
          "Validate URL format",
          "Check remote API availability",
          "Fetch project metadata",
          "Verify project structure",
          "Check for required files",
          "Validate branch access",
          "Parse configuration file",
          "Apply default settings",
          "Check file permissions",
          "Validate size limits",
          "Return validated data",
          "Exit"
        ],
        branches: [
          "URL format: valid/invalid (2 paths)",
          "API availability: online/offline (2 paths)",
          "Project type: public/private (2 paths)",
          "Required files: present/missing (2 paths each for README, LICENSE)",
          "Config file: exists/missing (2 paths)",
          "Size check: within/exceeds limit (2 paths)"
        ],
        loops: [
          "Loop through required files list",
          "Loop through validation rules"
        ],
        specialFeatures: [
          "Cascading validation with short-circuit evaluation",
          "Multiple fallback paths for missing configurations",
          "Nested conditional validation chains"
        ]
      }
    },
    {
      functionName: "render_content_with_plugins",
      file: "app/server/helpers/content_renderer.py",
      complexity: 34,
      metrics: {
        conditions: 12,
        loops: 4,
        returnStatements: 3,
        nestingDepth: 4
      },
      cfg: {
        nodes: [
          "Entry",
          "Initialize renderer",
          "Load plugin registry",
          "Parse content AST",
          "Loop: Process each node",
          "Check node type",
          "Apply heading transformations",
          "Apply code block highlighting",
          "Apply link processing",
          "Apply image optimization",
          "Check for custom plugins",
          "Execute plugin hooks",
          "Handle plugin errors",
          "Merge transformed content",
          "Generate final HTML",
          "Exit"
        ],
        branches: [
          "Node type: heading/code/link/image/text/other (6 paths)",
          "Plugin available: yes/no (2 paths per plugin type)",
          "Plugin execution: success/error (2 paths)",
          "Content modification: changed/unchanged (2 paths)"
        ],
        loops: [
          "AST node traversal (for each node)",
          "Plugin execution loop (for each registered plugin)"
        ],
        specialFeatures: [
          "Dynamic plugin loading and execution",
          "Recursive AST traversal with depth tracking",
          "Plugin priority ordering and dependency resolution"
        ]
      }
    }
  ];

  return {
    topFunctions: topComplexFunctions,
    cfgDescriptions,
  };
}

/**
 * Generates mock data for dead code analysis
 */
export function generateDeadCodeData() {
  return {
    unusedFunctions: 23,
    unusedFiles: 7,
    explanation: [
      "Functions that are not called anywhere in the codebase",
      "Legacy code from previous features that were removed",
      "Test utilities that are no longer used",
      "Deprecated API endpoints that should be removed"
    ],
    details: [
      { type: "Unused Functions", count: 23, impact: "Low" },
      { type: "Unused Files", count: 7, impact: "Medium" },
      { type: "Unreachable Code", count: 4, impact: "Low" }
    ]
  };
}

/**
 * Generates mock data for code smells analysis
 */
export function generateCodeSmellsData() {
  const topSmellFiles = [
    {
      file: "app/server/routes/api.py",
      score: 87,
      smells: ["Long Method (8 instances)", "Large Class", "Feature Envy (3 instances)", "Data Clumps"]
    },
    {
      file: "app/server/business/report_generator.py",
      score: 82,
      smells: ["Long Method (6 instances)", "God Class", "Duplicate Code (4 blocks)"]
    },
    {
      file: "web/components/DataGrid.jsx",
      score: 76,
      smells: ["Long Method (4 instances)", "Shotgun Surgery", "Primitive Obsession"]
    },
    {
      file: "app/server/data/schemas.py",
      score: 71,
      smells: ["Large Class", "Data Clumps", "Message Chains (5 instances)"]
    },
    {
      file: "web/components/ContentDisplay.jsx",
      score: 68,
      smells: ["Long Method (3 instances)", "Duplicate Code (2 blocks)", "Complex Conditional"]
    },
    {
      file: "app/server/security/session.py",
      score: 65,
      smells: ["Feature Envy (4 instances)", "Long Parameter List", "Switch Statements"]
    },
    {
      file: "app/server/helpers/storage.py",
      score: 62,
      smells: ["Long Method (5 instances)", "Temporary Field", "Speculative Generality"]
    },
    {
      file: "web/utilities/http_client.js",
      score: 58,
      smells: ["Duplicate Code (3 blocks)", "Middle Man", "Lazy Class"]
    },
    {
      file: "app/server/business/vcs_integration.py",
      score: 55,
      smells: ["Long Method (2 instances)", "Data Clumps", "Refused Bequest"]
    },
    {
      file: "web/components/ProjectInfo.jsx",
      score: 52,
      smells: ["Long Method (2 instances)", "Divergent Change", "Parallel Inheritance"]
    },
  ];

  const criticalFiles = [
    {
      file: "app/server/routes/api.py",
      reason: "Contains multiple long methods (>100 lines) with deep nesting levels. The class has grown to over 800 lines with 15+ methods. Needs urgent refactoring into smaller, focused modules."
    },
    {
      file: "app/server/business/report_generator.py",
      reason: "God class anti-pattern detected with 25+ methods and 1200+ lines. Handles too many responsibilities including parsing, rendering, caching, and API calls. Should be split into separate services."
    }
  ];

  return {
    topFiles: topSmellFiles,
    criticalAnalysis: criticalFiles,
  };
}

/**
 * Generates all mock data for code quality analysis
 */
export function generateAllCodeQualityData() {
  return {
    comments: generateCommentsData(),
    todos: generateTodosData(),
    complexity: generateComplexityData(),
    deadCode: generateDeadCodeData(),
    codeSmells: generateCodeSmellsData(),
    timestamp: new Date().toISOString(),
  };
}
