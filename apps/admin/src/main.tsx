import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("[main] Fatal render error:", err);
    rootEl.innerHTML = `<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:sans-serif"><div style="text-align:center"><p style="font-size:1.1rem;font-weight:600">Failed to start the application</p><p style="color:#666;margin-top:8px">Please refresh the page or contact support.</p><button style="margin-top:16px;padding:8px 20px;border-radius:8px;cursor:pointer;border:1px solid #ccc" onclick="window.location.reload()">Refresh</button></div></div>`;
  }
}
