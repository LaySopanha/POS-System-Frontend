import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
  );
} catch (err) {
  console.error("[Web] Failed to render:", err);
  document.getElementById("root")!.innerHTML =
    '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:sans-serif"><p>Failed to load. Please refresh.</p></div>';
}
