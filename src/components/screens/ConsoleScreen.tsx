import React, { useState } from "react";
import { Copy, Download } from "lucide-react";
import "../../styles/screens.css";

export interface ConsoleScreenProps {
  onBack?: () => void;
  isRunning?: boolean;
  logs?: LogEntry[];
  onClearLogs?: () => void;
}

export interface LogEntry {
  id: string;
  time: string;
  tag: "INFO" | "WARN" | "ERROR" | "AUTH";
  message: string;
}

const LOG_LEVELS = ["ALL", "INFO", "WARN", "ERROR", "AUTH"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const SAMPLE_LOGS: LogEntry[] = [
  { id: "1", time: "10:24:02", tag: "AUTH", message: "[MS_AUTH] Device code flow token verified. Mojang UUID: 4f1a92… valid." },
  { id: "2", time: "10:24:03", tag: "INFO", message: "[main/INFO] (Launcher) Launching instance 'test1' with Java 21 OpenJDK" },
  { id: "3", time: "10:24:04", tag: "INFO", message: "[main/INFO] (FabricLoader/GameProvider) Loading Minecraft 1.21.4 with Fabric Loader 0.16.9" },
  { id: "4", time: "10:24:05", tag: "INFO", message: "[main/INFO] (Sodium) Initializing OpenGL 4.5 Core Profile pipeline" },
  { id: "5", time: "10:24:06", tag: "INFO", message: "[main/INFO] (Iris) Shader engine initialized: 0 loaded shaderpacks" },
  { id: "6", time: "10:24:07", tag: "WARN", message: "[RenderThread/WARN] Missing sound entry for: omega:ui.click" },
  { id: "7", time: "10:24:08", tag: "INFO", message: "[main/INFO] (MinecraftClient) Sound engine started with OpenAL Soft" },
  { id: "8", time: "10:24:09", tag: "INFO", message: "[main/INFO] Minecraft 1.21.4 client fully loaded in 4.82 seconds" },
];

export const ConsoleScreen: React.FC<ConsoleScreenProps> = ({
  logs: propLogs,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<LogLevel>("ALL");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const logs = propLogs && propLogs.length > 0 ? propLogs : SAMPLE_LOGS;

  const filteredLogs = logs.filter((l) => {
    if (filter === "ALL") return true;
    return l.tag === filter;
  });

  const getCount = (lvl: LogLevel) => {
    if (lvl === "ALL") return logs.length;
    return logs.filter((l) => l.tag === lvl).length;
  };

  const getFormattedText = () => {
    return filteredLogs.map((l) => `[${l.time}] [${l.tag}] ${l.message}`).join("\n");
  };

  const handleCopy = () => {
    const text = getFormattedText();
    const fallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }

    setCopyFeedback("Скопировано");
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const handleExport = () => {
    try {
      const text = getFormattedText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "latest.log";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportFeedback("Готово");
      setTimeout(() => setExportFeedback(null), 1500);
    } catch {
      setExportFeedback("Ошибка");
      setTimeout(() => setExportFeedback(null), 1500);
    }
  };

  return (
    <div className="screens-overlay-layer console-screen-overlay">
      <div className="console-wrap">
        {/* Filter Dock Bar */}
        <div className="console-dock">
          {LOG_LEVELS.map((lvl) => {
            const count = getCount(lvl);
            return (
              <button
                key={lvl}
                type="button"
                className={`console-filter-btn ${filter === lvl ? "active" : ""}`}
                data-level={lvl}
                onClick={() => setFilter(lvl)}
              >
                <span className="console-dot" />
                <span>{lvl}</span>
                {count > 0 && <span className="console-badge">{count}</span>}
              </button>
            );
          })}

          <div className="console-dock-spacer" />
          <div className="console-dock-count">Всего записей: {logs.length}</div>
        </div>

        {/* Log Viewer Body */}
        <div className="console-log-body">
          {filteredLogs.length === 0 ? (
            <div className="console-empty">Нет записей</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`console-row ${log.tag}`}>
                <span className="console-row-time">{log.time}</span>
                <span className={`console-row-tag ${log.tag}`}>{log.tag}</span>
                <span className="console-row-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="console-foot">
          {onClearLogs && (
            <button
              type="button"
              className="console-act-btn"
              onClick={onClearLogs}
              title="Очистить консоль"
            >
              <span>Очистить</span>
            </button>
          )}

          <button
            type="button"
            className="console-act-btn"
            onClick={handleCopy}
            title="Скопировать текущие логи"
          >
            <Copy size={16} />
            <span>{copyFeedback || "Скопировать"}</span>
          </button>

          <button
            type="button"
            className="console-act-btn"
            onClick={handleExport}
            title="Экспортировать latest.log"
          >
            <Download size={16} />
            <span>{exportFeedback || "Экспорт"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
