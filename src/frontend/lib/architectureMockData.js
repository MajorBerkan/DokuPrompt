/**
 * Mock data generator for repository architecture analysis
 * Generates realistic but fictional data for demonstration purposes
 */

/**
 * Generates summary statistics for dependencies
 */
export function generateDependencySummary() {
  return {
    directInternal: 47,
    directExternal: 23,
    transitive: 156,
    cyclicChains: 3,
    filesWithDependencies: 89,
    description: "The repository shows moderate coupling with 47 internal dependencies. The presence of 3 cyclic dependency chains indicates areas requiring architectural review."
  };
}

/**
 * Generates internal dependencies tree structure
 */
export function generateInternalDependenciesTree() {
  return {
    modules: [
      {
        name: "web/App.jsx",
        dependencies: ["web/components/MainWrapper.jsx", "web/utilities/SessionProvider.jsx", "web/components/Routes.jsx"],
        description: "Main application entry point"
      },
      {
        name: "web/components/MainWrapper.jsx",
        dependencies: ["web/components/ContentDisplay.jsx", "web/utilities/http_client.js"],
        description: "Wrapper component for content display"
      },
      {
        name: "web/components/ContentDisplay.jsx",
        dependencies: ["web/components/MetricsPanel.jsx", "web/components/DependencyGraph.jsx", "web/components/Navigation.jsx", "web/components/LoadingIndicator.jsx"],
        description: "Main content view with analysis sidebar"
      },
      {
        name: "web/components/MetricsPanel.jsx",
        dependencies: ["web/data/metrics_mock.js"],
        description: "Code quality metrics and visualizations"
      },
      {
        name: "web/components/DependencyGraph.jsx",
        dependencies: ["web/data/dependencies_mock.js"],
        description: "Dependency analysis with visualization"
      },
      {
        name: "web/components/DataGrid.jsx",
        dependencies: ["web/utilities/http_client.js", "web/components/LoadingIndicator.jsx"],
        description: "Admin table for project management"
      },
      {
        name: "web/utilities/http_client.js",
        dependencies: ["web/utilities/SessionProvider.jsx"],
        description: "HTTP client with authentication integration"
      },
      {
        name: "app/server/routes/api.py",
        dependencies: ["app/server/business/report_generator.py", "app/server/security/session.py", "app/server/data/schemas.py"],
        description: "REST API endpoint definitions"
      },
      {
        name: "app/server/business/report_generator.py",
        dependencies: ["app/server/helpers/content_renderer.py", "app/server/business/vcs_integration.py", "app/server/data/schemas.py"],
        description: "Report generation and processing service"
      },
      {
        name: "app/server/business/vcs_integration.py",
        dependencies: ["app/server/helpers/text_processor.py", "app/server/data/schemas.py"],
        description: "VCS integration and project management"
      },
      {
        name: "app/server/security/session.py",
        dependencies: ["app/server/data/schemas.py", "app/server/helpers/token_manager.py"],
        description: "Authentication and authorization service"
      },
      {
        name: "app/server/helpers/content_renderer.py",
        dependencies: ["app/server/helpers/text_processor.py"],
        description: "Content parsing and rendering utilities"
      },
      {
        name: "app/server/data/schemas.py",
        dependencies: [],
        description: "Database ORM models and schemas"
      }
    ]
  };
}

/**
 * Generates transitive dependency chains
 */
export function generateTransitiveDependencies() {
  return [
    {
      root: "web/App.jsx",
      chain: [
        "web/components/MainWrapper.jsx",
        "web/components/ContentDisplay.jsx",
        "web/components/MetricsPanel.jsx",
        "web/data/metrics_mock.js"
      ],
      depth: 4,
      description: "Main application depends on metrics mock data through 3 intermediate modules"
    },
    {
      root: "app/server/routes/api.py",
      chain: [
        "app/server/business/report_generator.py",
        "app/server/business/vcs_integration.py",
        "app/server/helpers/text_processor.py"
      ],
      depth: 3,
      description: "API endpoints transitively depend on text processor through report generator and VCS integration"
    },
    {
      root: "app/server/routes/api.py",
      chain: [
        "app/server/business/report_generator.py",
        "app/server/helpers/content_renderer.py",
        "app/server/helpers/text_processor.py"
      ],
      depth: 3,
      description: "API endpoints reach text processor through content rendering chain"
    },
    {
      root: "web/components/DataGrid.jsx",
      chain: [
        "web/utilities/http_client.js",
        "web/utilities/SessionProvider.jsx"
      ],
      depth: 2,
      description: "Data grid indirectly depends on authentication through HTTP client"
    },
    {
      root: "app/server/security/session.py",
      chain: [
        "app/server/data/schemas.py"
      ],
      depth: 1,
      description: "Authentication service has direct dependency on database schemas"
    }
  ];
}

/**
 * Generates cyclic dependency information
 */
export function generateCyclicDependencies() {
  return [
    {
      id: 1,
      length: 3,
      modules: [
        "app/server/business/report_generator.py",
        "app/server/business/vcs_integration.py",
        "app/server/helpers/text_processor.py",
        "app/server/business/report_generator.py"
      ],
      impact: "3 files affected. Critical",
      description: "Report generator depends on VCS integration which depends on text processor, which requires report generator for metadata extraction. This creates a circular dependency that could lead to import errors and makes testing difficult.",
      severity: "high"
    },
    {
      id: 2,
      length: 2,
      modules: [
        "web/utilities/http_client.js",
        "web/utilities/SessionProvider.jsx",
        "web/utilities/http_client.js"
      ],
      impact: "Bidirectional dependency, moderately critical",
      description: "HTTP client and SessionProvider have mutual dependencies. Client needs auth tokens, while SessionProvider uses client for token refresh. Consider using dependency injection or event-based communication.",
      severity: "medium"
    },
    {
      id: 3,
      length: 4,
      modules: [
        "app/server/data/schemas.py",
        "app/server/security/session.py",
        "app/server/routes/api.py",
        "app/server/routes/interceptor.py",
        "app/server/data/schemas.py"
      ],
      impact: "4 files affected. Architectural concern",
      description: "Schemas depend on session service for default values, which depends on API endpoints for user context, which depends on interceptor, which queries schemas. This cycle indicates mixed concerns and violation of layered architecture principles.",
      severity: "high"
    }
  ];
}

/**
 * Generates all mock data for architecture analysis
 */
export function generateAllArchitectureData() {
  return {
    summary: generateDependencySummary(),
    internalDependencies: generateInternalDependenciesTree(),
    transitiveDependencies: generateTransitiveDependencies(),
    cyclicDependencies: generateCyclicDependencies(),
    timestamp: new Date().toISOString(),
  };
}
