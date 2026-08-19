import React from "react";
import type { ModpackInstance } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { useToast } from "../../ui/ToastProvider";

export const ConsolePanel = React.memo(({
  t,
  logs,
  isRunning,
  consoleOpen,
  onToggleConsole,
  selectedInstance,
}: {
  t: any;
  logs: string[];
  isRunning: boolean;
  consoleOpen: boolean;
  onToggleConsole: () => void;
  selectedInstance: ModpackInstance | null;
}) => {
  const { showToast } = useToast();
  const statusColor = isRunning ? "#269684" : "#9da7ba";
  const statusGlow = isRunning ? "0 0 6px #269684" : "none";

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      showToast(t.copyLogsDone, "success");
    } catch {
      showToast(t.copyLogsFailed, "error");
    }
  };

  return (
    <DraggableWindow
      storageKey="omega:console-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: 462, y: 430 }}
      defaultSize={{ width: 560, height: 310 }}
    >
      <div style={{ overflow: "hidden", padding: 0, position: "relative", height: "100%", transition: "height 0.3s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(180deg, rgba(102, 58, 243, 0.07) 0%, rgba(5, 6, 15, 0.97) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div
            className="draggable-window-handle"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
            onClick={onToggleConsole}
          >
            <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#8b5cf6", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", boxShadow: statusGlow }} />
              {isRunning ? t.consoleRunning : t.consoleTitle}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void copyLogs();
                }}
                title={t.copyLogs}
                style={{
                  background: "rgba(186, 215, 247, 0.06)",
                  border: "1px solid rgba(186, 215, 247, 0.1)",
                  color: "#9da7ba",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: "0.66rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📋 {t.copyLogs}
              </button>
              <span style={{ fontSize: "0.68rem", color: "#3f4959", fontFamily: "monospace" }}>
                {selectedInstance ? `${selectedInstance.mcVersion} • ${selectedInstance.loader}` : ""}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#9da7ba",
                  transform: consoleOpen ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 0.3s",
                  display: "inline-block",
                  lineHeight: 1,
                }}
              >
                ▲
              </span>
            </div>
          </div>

          {consoleOpen && (
            <div
              className="copyable-console"
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginTop: 10,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(139, 92, 246, 0.2) transparent",
              }}
            >
              {logs.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                  <span style={{ fontSize: "1.3rem" }}>📟</span>
                  <div style={{ color: "#3f4959", fontSize: "0.72rem", textAlign: "center" }}>{t.consoleEmpty}</div>
                </div>
              ) : (
                logs.slice(-40).map((line, i) => {
                  const isError = /error|exception|failed/i.test(line);
                  const isWarn = /warn/i.test(line);
                  const isInfo = /\[info\]/i.test(line);
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: "0.65rem",
                        lineHeight: 1.45,
                        padding: "1px 4px",
                        borderRadius: 3,
                        color: isError ? "#e46d4c" : isWarn ? "#e46d4c" : isInfo ? "#b6d9fc" : "#3f4959",
                        background: isError ? "rgba(248,113,113,0.05)" : "transparent",
                        wordBreak: "break-all",
                      }}
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
});