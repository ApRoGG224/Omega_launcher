import React from "react";
import type { ModpackInstance } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";

export const ConsolePanel = React.memo(({
  logs,
  isRunning,
  consoleOpen,
  onToggleConsole,
  selectedInstance,
}: {
  logs: string[];
  isRunning: boolean;
  consoleOpen: boolean;
  onToggleConsole: () => void;
  selectedInstance: ModpackInstance | null;
}) => {
  const statusColor = isRunning ? "#10b981" : "#6b7280";
  const statusGlow = isRunning ? "0 0 6px #10b981" : "none";

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
            background: "linear-gradient(180deg, rgba(150,13,242,0.07) 0%, rgba(5,4,8,0.97) 100%)",
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
            <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#AB3DF5", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block", boxShadow: statusGlow }} />
              {isRunning ? "Игра запущена" : "Консоль"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.68rem", color: "#4a4a5a", fontFamily: "monospace" }}>
                {selectedInstance ? `${selectedInstance.mcVersion} • ${selectedInstance.loader}` : ""}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#6b7280",
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
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginTop: 10,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(171,61,245,0.2) transparent",
              }}
            >
              {logs.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                  <span style={{ fontSize: "1.3rem" }}>📟</span>
                  <div style={{ color: "#4a4a5a", fontSize: "0.72rem", textAlign: "center" }}>Запустите сборку, чтобы увидеть логи</div>
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
                        color: isError ? "#f87171" : isWarn ? "#fbbf24" : isInfo ? "#60a5fa" : "#6b6b7a",
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