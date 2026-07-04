import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DebugWindow from "./Debug";
import { getCurrentWindow } from "@tauri-apps/api/window";

const currentWindow = getCurrentWindow();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {currentWindow.label === "debug_window" ? <DebugWindow /> : <App />}
  </React.StrictMode>
);
