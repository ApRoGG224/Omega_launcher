import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export default function DebugWindow() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const unlisten = listen<string>("debug-log", (event) => {
      setLogs((prev) => [...prev, event.payload]);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div style={{ padding: 20, background: "#1e1e1e", color: "#00ff00", height: "100vh", overflowY: "auto", fontFamily: "monospace" }}>
      <h3>Debug Logs</h3>
      <hr style={{ borderColor: "#333" }} />
      {logs.map((log, i) => (
        <div key={i} style={{ marginBottom: "5px" }}>{log}</div>
      ))}
      {logs.length === 0 && <div style={{ color: "#888" }}>Ожидание логов...</div>}
    </div>
  );
}
