import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./lib/AuthProvider";

/**
 * Application entry point
 * Renders the main App component wrapped with AuthProvider for authentication
 * and React.StrictMode for development checks
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
