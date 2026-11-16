import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Copy,
  Download,
  Trash2,
  FolderOpen,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  WrapText,
  Hash,
  Square,
  Check,
  ArrowDownToLine,
  Terminal as TerminalIcon,
  Clock,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import type { InstanceData } from "../../types";
import "../../styles/console.css";

export interface LogEntry {
  id: string;
  time: string;
  tag: "INFO" | "WARN" | "ERROR" | "AUTH";
  message: string;
}

export interface ConsoleScreenProps {
  onBack?: () => void;
  isRunning?: boolean;
  logs?: LogEntry[];
  onClearLogs?: () => void;
  selectedInstance?: InstanceData;
  gamePid?: number | null;
  gameStartTime?: number | null;
  exitStatus?: { code: number | null; crashed: boolean } | null;
  onKillMinecraft?: () => Promise<void>;
  onOpenLogsFolder?: () => Promise<void>;
}

export type ChannelFilter = "ALL" | "GAME" | "LAUNCHER" | "INFO" | "WARN" | "ERROR";

interface ParsedLogLine {
  id: string;
  lineNum: number;
  time: string;
  level: "INFO" | "WARN" | "ERROR" | "AUTH" | "LAUNCHER";
  channel: "GAME" | "LAUNCHER";
  isStackTrace: boolean;
  message: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const ConsoleScreen: React.FC<ConsoleScreenProps> = ({
  isRunning = false,
  logs = [],
  onClearLogs,
  selectedInstance,
  gamePid,
  gameStartTime,
  exitStatus,
  onKillMinecraft,
  onOpenLogsFolder,
}) => {
  const { lang } = useLanguage();

  // Settings & Toggles
  const [filter, setFilter] = useState<ChannelFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Feedbacks
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  // Elapsed running time
  const [elapsed, setElapsed] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Timer loop for running instance
  useEffect(() => {
    if (!isRunning || !gameStartTime) {
      setElapsed(0);
      return;
    }
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - gameStartTime) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isRunning, gameStartTime]);

  // Parse raw log entries into rich Prism structure
  const parsedLines: ParsedLogLine[] = useMemo(() => {
    return logs.map((entry, index) => {
      const raw = entry.message || "";
      let time = entry.time || "";
      let level: ParsedLogLine["level"] = entry.tag === "AUTH" ? "AUTH" : "INFO";
      let channel: ParsedLogLine["channel"] = "GAME";

      let cleanMsg = raw;
      const timeMatch = raw.match(/^\[(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)\]/);
      if (timeMatch) {
        time = timeMatch[1];
        cleanMsg = raw.slice(timeMatch[0].length).trim();
      }

      if (
        cleanMsg.startsWith("[launcher/") ||
        cleanMsg.startsWith("[installer/") ||
        cleanMsg.startsWith("[MS_AUTH]") ||
        entry.tag === "AUTH"
      ) {
        channel = "LAUNCHER";
        level = "LAUNCHER";
      }

      if (
        cleanMsg.includes("/ERROR]") ||
        cleanMsg.includes("/FATAL]") ||
        cleanMsg.startsWith("[ERROR]") ||
        cleanMsg.includes("Exception in thread") ||
        cleanMsg.includes("Caused by:")
      ) {
        level = "ERROR";
      } else if (cleanMsg.includes("/WARN]") || cleanMsg.startsWith("[WARN]")) {
        level = "WARN";
      } else if (entry.tag === "ERROR") {
        level = "ERROR";
      } else if (entry.tag === "WARN") {
        level = "WARN";
      }

      const isStackTrace = /^\s*(at\s+[\w$./]+|Caused by:|Exception in thread|(?:\w+\.)+\w+Exception:|\.{3}\s+\d+\s+more)/.test(
        cleanMsg
      );

      return {
        id: entry.id,
        lineNum: index + 1,
        time,
        level,
        channel,
        isStackTrace,
        message: cleanMsg,
      };
    });
  }, [logs]);

  // Filter lines based on active channel/level tab
  const filteredLines = useMemo(() => {
    return parsedLines.filter((l) => {
      if (filter === "ALL") return true;
      if (filter === "GAME") return l.channel === "GAME";
      if (filter === "LAUNCHER") return l.channel === "LAUNCHER";
      if (filter === "INFO") return l.level === "INFO";
      if (filter === "WARN") return l.level === "WARN";
      if (filter === "ERROR") return l.level === "ERROR";
      return true;
    });
  }, [parsedLines, filter]);

  // Search matches inside filtered lines
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    filteredLines.forEach((l, idx) => {
      if (l.message.toLowerCase().includes(q) || l.time.includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [filteredLines, searchQuery]);

  // Keep active match index in bounds
  useEffect(() => {
    if (searchMatches.length === 0) {
      setActiveMatchIndex(0);
    } else if (activeMatchIndex >= searchMatches.length) {
      setActiveMatchIndex(searchMatches.length - 1);
    }
  }, [searchMatches, activeMatchIndex]);

  // Scroll to active match when it changes
  const scrollToMatch = useCallback(
    (matchIdx: number) => {
      if (searchMatches.length === 0) return;
      const lineIdx = searchMatches[matchIdx];
      const targetLine = filteredLines[lineIdx];
      if (!targetLine) return;

      const el = document.getElementById(`log-line-${targetLine.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [searchMatches, filteredLines]
  );

  const handleNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const next = (activeMatchIndex + 1) % searchMatches.length;
    setActiveMatchIndex(next);
    scrollToMatch(next);
  }, [activeMatchIndex, searchMatches.length, scrollToMatch]);

  const handlePrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prev = (activeMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setActiveMatchIndex(prev);
    scrollToMatch(prev);
  }, [activeMatchIndex, searchMatches.length, scrollToMatch]);

  // Smart scroll listener
  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 48;
    if (isAtBottom) {
      setUserScrolledUp(false);
      setUnreadCount(0);
    } else {
      setUserScrolledUp(true);
    }
  }, []);

  // Autoscroll to bottom on new logs
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (autoScroll && !userScrolledUp) {
      el.scrollTop = el.scrollHeight;
      setUnreadCount(0);
    } else if (userScrolledUp) {
      setUnreadCount((c) => c + 1);
    }
  }, [logs.length, autoScroll, userScrolledUp]);

  const resumeAutoScroll = useCallback(() => {
    setAutoScroll(true);
    setUserScrolledUp(false);
    setUnreadCount(0);
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, []);

  // Filter tab counts
  const counts = useMemo(() => {
    let game = 0;
    let launcher = 0;
    let info = 0;
    let warn = 0;
    let error = 0;
    parsedLines.forEach((l) => {
      if (l.channel === "GAME") game++;
      if (l.channel === "LAUNCHER") launcher++;
      if (l.level === "INFO") info++;
      if (l.level === "WARN") warn++;
      if (l.level === "ERROR") error++;
    });
    return {
      ALL: parsedLines.length,
      GAME: game,
      LAUNCHER: launcher,
      INFO: info,
      WARN: warn,
      ERROR: error,
    };
  }, [parsedLines]);

  // Export & Copy
  const getFormattedExportText = useCallback(() => {
    return filteredLines
      .map((l) => `[${l.time}] [${l.level}] ${l.message}`)
      .join("\n");
  }, [filteredLines]);

  const handleCopy = useCallback(() => {
    const text = getFormattedExportText();
    const fallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(textarea);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }

    setCopyFeedback(lang === "uk" ? "Скопійовано!" : lang === "ru" ? "Скопировано!" : "Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  }, [getFormattedExportText, lang]);

  const handleExport = useCallback(() => {
    try {
      const text = getFormattedExportText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `latest_${selectedInstance?.name?.replace(/\s+/g, "_") || "minecraft"}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportFeedback(lang === "uk" ? "Збережено!" : lang === "ru" ? "Сохранено!" : "Saved!");
      setTimeout(() => setExportFeedback(null), 2000);
    } catch {
      setExportFeedback(lang === "uk" ? "Помилка" : lang === "ru" ? "Ошибка" : "Error");
      setTimeout(() => setExportFeedback(null), 2000);
    }
  }, [getFormattedExportText, selectedInstance?.name, lang]);

  const handleKill = useCallback(async () => {
    if (!onKillMinecraft || isKilling) return;
    setIsKilling(true);
    try {
      await onKillMinecraft();
    } finally {
      setIsKilling(false);
    }
  }, [onKillMinecraft, isKilling]);

  // Message renderer with search query highlighting
  const renderMessageContent = useCallback(
    (msg: string, isCurrentMatch: boolean) => {
      if (!searchQuery.trim()) {
        return <span>{msg}</span>;
      }
      const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
      const parts = msg.split(regex);
      return (
        <span>
          {parts.map((part, i) => {
            if (part.toLowerCase() === searchQuery.toLowerCase()) {
              return (
                <mark
                  key={i}
                  className={isCurrentMatch ? "console-mark-active" : "console-mark"}
                >
                  {part}
                </mark>
              );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
        </span>
      );
    },
    [searchQuery]
  );

  return (
    <div className="screens-overlay-layer console-screen-overlay">
      <div className="console-main-container">
        {/* --- Top Header Bar --- */}
        <div className="console-header-bar">
          <div className="console-status-group">
            {/* Live Process Status Badge */}
            {isRunning ? (
              <div className="console-status-pill">
                <span className="console-status-dot running" />
                <span>
                  {lang === "uk"
                    ? "ГРА ЗАПУЩЕНА"
                    : lang === "ru"
                    ? "ИГРА ЗАПУЩЕНА"
                    : "GAME RUNNING"}{" "}
                  {gamePid ? `(PID: ${gamePid})` : ""}
                </span>
              </div>
            ) : exitStatus ? (
              <div className="console-status-pill">
                <span
                  className={`console-status-dot ${exitStatus.crashed ? "crashed" : "success"}`}
                />
                <span>
                  {exitStatus.crashed
                    ? lang === "uk"
                      ? `АВАРІЙНЕ ЗАВЕРШЕННЯ (КОД ${exitStatus.code ?? 1})`
                      : lang === "ru"
                      ? `АВАРИЙНОЕ ЗАВЕРШЕНИЕ (КОД ${exitStatus.code ?? 1})`
                      : `CRASHED (EXIT CODE ${exitStatus.code ?? 1})`
                    : lang === "uk"
                    ? `ПРОЦЕС ЗАВЕРШИВСЯ (КОД ${exitStatus.code ?? 0})`
                    : lang === "ru"
                    ? `ПРОЦЕСС ЗАВЕРШИЛСЯ (КОД ${exitStatus.code ?? 0})`
                    : `PROCESS EXITED (CODE ${exitStatus.code ?? 0})`}
                </span>
              </div>
            ) : (
              <div className="console-status-pill">
                <span className="console-status-dot idle" />
                <span>
                  {lang === "uk"
                    ? "КОНСОЛЬ ОЧІКУЄ"
                    : lang === "ru"
                    ? "КОНСОЛЬ ОЖИДАЕТ"
                    : "CONSOLE READY"}
                </span>
              </div>
            )}

            {/* Live Stopwatch Duration */}
            {isRunning && elapsed > 0 && (
              <div className="console-timer-pill" title="Час роботи процесу">
                <Clock size={13} />
                <span>{formatDuration(elapsed)}</span>
              </div>
            )}

            {/* Active Instance Pill */}
            {selectedInstance && (
              <div className="console-instance-pill">
                <span>{selectedInstance.name}</span>
                <span style={{ color: "#64748b" }}>•</span>
                <span style={{ color: "#38bdf8" }}>{selectedInstance.mcVersion}</span>
                {selectedInstance.loader && selectedInstance.loader !== "Vanilla" && (
                  <span style={{ color: "#c084fc", fontSize: "10.5px" }}>
                    ({selectedInstance.loader})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="console-header-actions">
            {/* Kill Minecraft Process Button */}
            {isRunning && onKillMinecraft && (
              <button
                type="button"
                className="console-btn console-btn-danger"
                onClick={handleKill}
                disabled={isKilling}
                title={
                  lang === "uk"
                    ? "Примусово завершити процес гри"
                    : lang === "ru"
                    ? "Принудительно завершить процесс игры"
                    : "Force kill Minecraft process"
                }
              >
                <Square size={13} fill="currentColor" />
                <span>
                  {isKilling
                    ? lang === "uk"
                      ? "Зупинка..."
                      : lang === "ru"
                      ? "Остановка..."
                      : "Stopping..."
                    : lang === "uk"
                    ? "Завершити процес"
                    : lang === "ru"
                    ? "Завершить процесс"
                    : "Kill Process"}
                </span>
              </button>
            )}

            {/* Open Logs Folder */}
            {onOpenLogsFolder && (
              <button
                type="button"
                className="console-btn"
                onClick={onOpenLogsFolder}
                title={
                  lang === "uk"
                    ? "Відкрити папку логів збірки"
                    : lang === "ru"
                    ? "Открыть папку логов сборки"
                    : "Open instance logs folder"
                }
              >
                <FolderOpen size={14} />
                <span>{lang === "uk" ? "Папка логів" : lang === "ru" ? "Папка логов" : "Logs folder"}</span>
              </button>
            )}

            {/* Copy Logs */}
            <button
              type="button"
              className="console-btn"
              onClick={handleCopy}
              title={
                lang === "uk"
                  ? "Скопіювати логи в буфер обміну"
                  : lang === "ru"
                  ? "Скопировать логи в буфер обмена"
                  : "Copy logs to clipboard"
              }
            >
              {copyFeedback ? <Check size={14} style={{ color: "#4ade80" }} /> : <Copy size={14} />}
              <span>{copyFeedback || (lang === "uk" ? "Скопіювати" : lang === "ru" ? "Скопировать" : "Copy")}</span>
            </button>

            {/* Export latest.log */}
            <button
              type="button"
              className="console-btn"
              onClick={handleExport}
              title={
                lang === "uk"
                  ? "Експортувати latest.log"
                  : lang === "ru"
                  ? "Экспортировать latest.log"
                  : "Export latest.log"
              }
            >
              <Download size={14} />
              <span>{exportFeedback || (lang === "uk" ? "Експорт" : lang === "ru" ? "Экспорт" : "Export")}</span>
            </button>

            {/* Clear Console */}
            {onClearLogs && (
              <button
                type="button"
                className="console-btn"
                onClick={onClearLogs}
                title={
                  lang === "uk"
                    ? "Очистити вивід консолі"
                    : lang === "ru"
                    ? "Очистить вывод консоли"
                    : "Clear console output"
                }
              >
                <Trash2 size={14} />
                <span>{lang === "uk" ? "Очистити" : lang === "ru" ? "Очистить" : "Clear"}</span>
              </button>
            )}
          </div>
        </div>

        {/* --- Sub-Toolbar: Filters, Search, View Toggles --- */}
        <div className="console-sub-bar">
          {/* Level / Channel Filter Tabs */}
          <div className="console-filter-tabs">
            {(["ALL", "GAME", "LAUNCHER", "INFO", "WARN", "ERROR"] as ChannelFilter[]).map((tab) => {
              const count = counts[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  className={`console-filter-pill ${filter === tab ? "active" : ""}`}
                  onClick={() => setFilter(tab)}
                >
                  <span>
                    {tab === "ALL"
                      ? lang === "uk"
                        ? "ВСІ"
                        : lang === "ru"
                        ? "ВСЕ"
                        : "ALL"
                      : tab === "GAME"
                      ? lang === "uk"
                        ? "ГРА"
                        : lang === "ru"
                        ? "ИГРА"
                        : "GAME"
                      : tab === "LAUNCHER"
                      ? lang === "uk"
                        ? "ЛАУНЧЕР"
                        : lang === "ru"
                        ? "ЛАУНЧЕР"
                        : "LAUNCHER"
                      : tab}
                  </span>
                  <span className="console-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="console-search-box">
            <Search size={13} style={{ color: "#64748b", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              className="console-search-input"
              placeholder={
                lang === "uk"
                  ? "Пошук у логах..."
                  : lang === "ru"
                  ? "Поиск в логах..."
                  : "Search logs..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === "Escape") {
                  setSearchQuery("");
                }
              }}
            />
            {searchQuery && (
              <>
                <span className="console-search-badge">
                  {searchMatches.length > 0
                    ? `${activeMatchIndex + 1} / ${searchMatches.length}`
                    : lang === "uk"
                    ? "0 збігів"
                    : lang === "ru"
                    ? "0 совпадений"
                    : "0 matches"}
                </span>
                <button
                  type="button"
                  className="console-search-btn"
                  onClick={handlePrevMatch}
                  title="Попередній збіг (Shift+Enter)"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="console-search-btn"
                  onClick={handleNextMatch}
                  title="Наступний збіг (Enter)"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="console-search-btn"
                  onClick={() => setSearchQuery("")}
                  title="Очистити пошук (Esc)"
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>

          {/* View Toggles */}
          <div className="console-view-toggles">
            <button
              type="button"
              className={`console-toggle-btn ${autoScroll ? "active" : ""}`}
              onClick={() => {
                if (!autoScroll) resumeAutoScroll();
                else setAutoScroll(false);
              }}
              title={
                autoScroll
                  ? lang === "uk"
                    ? "Автопрокрутка увімкнена"
                    : lang === "ru"
                    ? "Автопрокрутка включена"
                    : "Auto-scroll is on"
                  : lang === "uk"
                  ? "Автопрокрутка вимкнена"
                  : lang === "ru"
                  ? "Автопрокрутка выключена"
                  : "Auto-scroll is off"
              }
            >
              <ArrowDownToLine size={13} />
              <span>
                {lang === "uk"
                  ? "Автопрокрутка"
                  : lang === "ru"
                  ? "Автопрокрутка"
                  : "Auto-scroll"}
              </span>
            </button>

            <button
              type="button"
              className={`console-toggle-btn ${wordWrap ? "active" : ""}`}
              onClick={() => setWordWrap(!wordWrap)}
              title={
                lang === "uk"
                  ? "Перенос довгих рядків"
                  : lang === "ru"
                  ? "Перенос длинных строк"
                  : "Wrap long lines"
              }
            >
              <WrapText size={13} />
              <span>
                {lang === "uk" ? "Перенос" : lang === "ru" ? "Перенос" : "Wrap"}
              </span>
            </button>

            <button
              type="button"
              className={`console-toggle-btn ${showLineNumbers ? "active" : ""}`}
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              title={
                lang === "uk"
                  ? "Показувати номери рядків"
                  : lang === "ru"
                  ? "Показывать номера строк"
                  : "Show line numbers"
              }
            >
              <Hash size={13} />
              <span>№</span>
            </button>
          </div>
        </div>

        {/* --- Main Log Stream Viewport --- */}
        <div className="console-body-wrapper">
          <div
            ref={viewportRef}
            className="console-viewport"
            onScroll={handleScroll}
          >
            {filteredLines.length === 0 ? (
              <div className="console-empty-state">
                <TerminalIcon className="console-empty-icon" />
                <div className="console-empty-title">
                  {lang === "uk"
                    ? "Консоль очікує виводу"
                    : lang === "ru"
                    ? "Консоль ожидает вывода"
                    : "Console is awaiting output"}
                </div>
                <div className="console-empty-desc">
                  {lang === "uk"
                    ? "Запустіть гру або виберіть інший фільтр для відображення подій"
                    : lang === "ru"
                    ? "Запустите игру или выберите другой фильтр для отображения событий"
                    : "Launch an instance or change filter to display logs"}
                </div>
              </div>
            ) : (
              filteredLines.map((line, idx) => {
                const isMatch = searchMatches.includes(idx);
                const isCurrentMatch =
                  searchMatches.length > 0 && searchMatches[activeMatchIndex] === idx;

                const badgeClass =
                  line.level === "ERROR"
                    ? "badge-error"
                    : line.level === "WARN"
                    ? "badge-warn"
                    : line.level === "AUTH"
                    ? "badge-auth"
                    : line.level === "LAUNCHER"
                    ? "badge-launcher"
                    : "badge-info";

                return (
                  <div
                    key={line.id}
                    id={`log-line-${line.id}`}
                    className={`console-line ${wordWrap ? "wrap" : "nowrap"} ${
                      line.isStackTrace ? "stack-trace" : ""
                    } ${isCurrentMatch ? "active-match" : ""}`}
                  >
                    {/* Line Number */}
                    {showLineNumbers && (
                      <span className="console-line-num">{line.lineNum}</span>
                    )}

                    {/* Timestamp */}
                    <span className="console-line-time">{line.time}</span>

                    {/* Level Badge */}
                    <span className={`console-line-badge ${badgeClass}`}>
                      {line.level}
                    </span>

                    {/* Message Body */}
                    <span className="console-line-content">
                      {renderMessageContent(line.message, isCurrentMatch)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Resume Auto-Scroll Button */}
          {userScrolledUp && (
            <button
              type="button"
              className="console-resume-pill"
              onClick={resumeAutoScroll}
            >
              <ArrowDownToLine size={13} />
              <span>
                {lang === "uk"
                  ? `Вниз${unreadCount > 0 ? ` (+${unreadCount})` : ""}`
                  : lang === "ru"
                  ? `Вниз${unreadCount > 0 ? ` (+${unreadCount})` : ""}`
                  : `Scroll to bottom${unreadCount > 0 ? ` (+${unreadCount})` : ""}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
