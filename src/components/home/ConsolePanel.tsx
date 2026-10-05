import React from "react";
import type { ModpackInstance } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { useToast } from "../../ui/ToastProvider";
import { IconCopy, IconTerminal } from "../../ui/icons";

export const ConsolePanel = React.memo(
  ({
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
    const statusColor = isRunning ? "#5fd0b2" : "#7e8ba6";
    const statusGlow = isRunning ? "0 0 8px rgba(95, 208, 178, 0.6)" : "none";

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
        defaultPosition={{ x: 402, y: 402 }}
        defaultSize={{ width: 500, height: 320 }}
      >
        <div
          style={{
            overflow: "hidden",
            padding: 0,
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="sketch-card-header draggable-window-handle"
            style={{
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={onToggleConsole}
          >
            <div className="sketch-card-header-left">
              <div className="settings-rewrite-section-icon">
                <IconTerminal size={16} />
              </div>
              <div>
                <span className="sketch-card-title">
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: statusColor,
                      display: "inline-block",
                      boxShadow: statusGlow,
                      marginRight: 6,
                    }}
                  />
                  {isRunning ? t.consoleRunning : t.consoleTitle}
                </span>
                <span className="sketch-card-subtitle">
                  {selectedInstance
                    ? `${selectedInstance.mcVersion} • ${selectedInstance.loader}`
                    : t.consoleTitle}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void copyLogs();
                }}
                title={t.copyLogs}
                className="panel-header-btn"
              >
                <IconCopy size={13} /> <span>{t.copyLogs}</span>
              </button>
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
                padding: "8px 10px",
                marginTop: 8,
                background: "rgba(4, 6, 13, 0.64)",
                border: "1px solid rgba(186, 215, 247, 0.08)",
                borderRadius: "9px",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                scrollbarWidth: "thin",
              }}
            >
              {logs.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 8,
                    color: "#7e8ba6",
                  }}
                >
                  <IconTerminal size={26} />
                  <div style={{ fontSize: "0.75rem", textAlign: "center" }}>
                    {t.consoleEmpty}
                  </div>
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
                        color: isError
                          ? "#e46d4c"
                          : isWarn
                            ? "#e46d4c"
                            : isInfo
                              ? "#b6d9fc"
                              : "#3f4959",
                        background: isError
                          ? "rgba(248,113,113,0.05)"
                          : "transparent",
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
      </DraggableWindow>
    );
  },
);
