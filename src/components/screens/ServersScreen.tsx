import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Search,
  X,
  Globe,
  Users,
  Radio,
  ArrowUpDown,
  Edit3,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ipc, InstanceServerEntry } from "../../services/ipc";
import { useLanguage } from "../../context/LanguageContext";
import type { InstanceData } from "../../types";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import { IconPixelPlay } from "../icons/PixelIcons";
import "../../styles/servers.css";

export interface ServersScreenProps {
  onBack?: () => void;
  onDirectConnect: (serverName: string, ip: string, instanceId?: string) => void;
  instances?: InstanceData[];
  selectedInstance?: InstanceData | null;
  onSelectInstance?: (instance: InstanceData) => void;
  isRunning?: boolean;
}

export interface ServerDisplayEntry {
  id: string;
  name: string;
  ip: string;
  motd: string;
  pingMs: number;
  onlinePlayers: number;
  maxPlayers: number;
  favicon: string;
  version?: string;
  online: boolean;
  isAssemblyServer: boolean;
  isQuerying?: boolean;
}

export const DEFAULT_SERVERS: ServerDisplayEntry[] = [
  {
    id: "hypixel",
    name: "Hypixel Network",
    ip: "mc.hypixel.net",
    motd: "§e[1.8-1.21] §6SkyBlock §8• §bBedWars §8• §aWool Wars §8• §eAutumn Festival!",
    pingMs: 24,
    onlinePlayers: 48210,
    maxPlayers: 100000,
    favicon: "H",
    online: true,
    isAssemblyServer: false,
  },
  {
    id: "2b2t",
    name: "2b2t Anarchy",
    ip: "2b2t.org",
    motd: "§cThe oldest anarchy server in Minecraft. §7Queue position: 142",
    pingMs: 86,
    onlinePlayers: 250,
    maxPlayers: 250,
    favicon: "2B",
    online: true,
    isAssemblyServer: false,
  },
  {
    id: "omega_smp",
    name: "Omega Community SMP",
    ip: "play.omegalauncher.net",
    motd: "§aОфициальный приватный сервер с голосовым чатом Plasmo Voice",
    pingMs: 14,
    onlinePlayers: 32,
    maxPlayers: 100,
    favicon: "Ω",
    online: true,
    isAssemblyServer: false,
  },
];

// Hoisted constants according to react-best-practices (js-hoist-regexp)
export const MC_COLOR_MAP: Record<string, string> = {
  "0": "#1e293b", // Black (softened for dark mode readability)
  "1": "#2563eb", // Dark Blue
  "2": "#22c55e", // Dark Green
  "3": "#0ea5e9", // Dark Aqua
  "4": "#ef4444", // Dark Red
  "5": "#a855f7", // Dark Purple
  "6": "#f59e0b", // Gold
  "7": "#94a3b8", // Gray
  "8": "#64748b", // Dark Gray
  "9": "#60a5fa", // Blue
  a: "#4ade80", // Green
  b: "#38bdf8", // Aqua
  c: "#f87171", // Red
  d: "#e879f9", // Light Purple
  e: "#fde047", // Yellow
  f: "#ffffff", // White
};

// Strips all Minecraft formatting codes (§0-§f, §k-§r, §x§r§r§g§g§b§b)
const MC_STRIP_REGEX = /§(?:[0-9a-fk-orA-FK-OR]|x(?:§[0-9a-fA-F]){6})/g;

export function cleanMinecraftText(text?: string | null): string {
  if (!text) return "";
  return text.replace(MC_STRIP_REGEX, "").replace(/§/g, "").trim();
}

// Regex to extract version numbers/ranges: e.g. "1.12-1.21", "1.20.4", "1.8.x - 1.21.x", "v1.19"
const VERSION_RANGE_REGEX =
  /\bv?(\d+\.\d+(?:\.\d+)?(?:\.x)?(?:\s*(?:-|–|до|\.\.)\s*v?\d+\.\d+(?:\.\d+)?(?:\.x)?)?)\b/i;

export function cleanServerVersion(rawVersion?: string | null): string {
  if (!rawVersion) return "";
  const cleaned = cleanMinecraftText(rawVersion);
  if (!cleaned) return "";

  // If already concise and doesn't contain multiline marketing text
  if (cleaned.length <= 20 && !cleaned.includes("\n")) {
    return cleaned;
  }

  // Look for version pattern inside advertisement text
  const match = cleaned.match(VERSION_RANGE_REGEX);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, "");
  }

  // Fallback: truncate to at most 18 characters
  return cleaned.slice(0, 18).trim() + "…";
}

// Matches §x§r§r§g§g§b§b OR §[0-9a-fk-or] OR \n
const MC_TOKEN_REGEX = /(§x(?:§[0-9a-fA-F]){6}|§[0-9a-fk-orA-FK-OR]|\n)/g;

export function renderMinecraftFormattedText(text?: string | null): React.ReactNode {
  if (!text) return null;
  if (!text.includes("§") && !text.includes("\n")) {
    return text;
  }

  const parts = text.split(MC_TOKEN_REGEX);
  let currentColor = "#cbd5e1";
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;

  const nodes: React.ReactNode[] = [];
  let keyIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part === "\n") {
      nodes.push(<br key={`br-${keyIndex++}`} />);
      continue;
    }

    if (part.startsWith("§")) {
      // Hex code check: §x§r§r§g§g§b§b
      if (part.toLowerCase().startsWith("§x") && part.length === 14) {
        currentColor = "#" + part.replace(/§[xX]/, "").replace(/§/g, "");
        continue;
      }

      const code = part.charAt(1).toLowerCase();
      if (MC_COLOR_MAP[code] !== undefined) {
        currentColor = MC_COLOR_MAP[code];
        // In Minecraft specification, setting a color resets text formatting styles
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrike = false;
      } else if (code === "l") {
        isBold = true;
      } else if (code === "o") {
        isItalic = true;
      } else if (code === "n") {
        isUnderline = true;
      } else if (code === "m") {
        isStrike = true;
      } else if (code === "r") {
        currentColor = "#cbd5e1";
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrike = false;
      }
      continue;
    }

    const textDecoration =
      isUnderline && isStrike
        ? "underline line-through"
        : isUnderline
        ? "underline"
        : isStrike
        ? "line-through"
        : "none";

    nodes.push(
      <span
        key={`mc-${keyIndex++}`}
        style={{
          color: currentColor,
          fontWeight: isBold ? 700 : 400,
          fontStyle: isItalic ? "italic" : "normal",
          textDecoration,
        }}
      >
        {part}
      </span>
    );
  }

  return nodes.length > 0 ? nodes : null;
}

// Backwards-compatible alias for existing callers/tests
export const renderMinecraftMotd = renderMinecraftFormattedText;

/**
 * Authentic Minecraft 5-bar connection strength indicator
 */
const MinecraftSignalBars: React.FC<{ online: boolean; pingMs: number }> = memo(
  ({ online, pingMs }) => {
    if (!online) {
      return (
        <span className="srv-signal-bars offline" title="Офлайн / Нет ответа">
          <i className="bar bar-1 off" />
          <i className="bar bar-2 off" />
          <i className="bar bar-3 off" />
          <i className="bar bar-4 off" />
          <i className="bar bar-5 off" />
          <span className="srv-signal-x">✕</span>
        </span>
      );
    }

    const activeBars =
      pingMs < 50 ? 5 : pingMs < 100 ? 4 : pingMs < 180 ? 3 : pingMs < 300 ? 2 : 1;
    const barClass =
      activeBars >= 4 ? "good" : activeBars === 3 ? "medium" : "poor";

    return (
      <span className={`srv-signal-bars ${barClass}`} title={`${pingMs} мс`}>
        <i className={`bar bar-1 ${activeBars >= 1 ? "on" : "off"}`} />
        <i className={`bar bar-2 ${activeBars >= 2 ? "on" : "off"}`} />
        <i className={`bar bar-3 ${activeBars >= 3 ? "on" : "off"}`} />
        <i className={`bar bar-4 ${activeBars >= 4 ? "on" : "off"}`} />
        <i className={`bar bar-5 ${activeBars >= 5 ? "on" : "off"}`} />
      </span>
    );
  }
);
MinecraftSignalBars.displayName = "MinecraftSignalBars";

/**
 * Isolated Timer Widget following react-best-practices
 */
const AutoRefreshTimerBadge: React.FC<{
  countdown: number;
  isRefreshing: boolean;
  lang: string;
}> = memo(({ countdown, isRefreshing, lang }) => {
  return (
    <div
      className={`srv-timer-badge ${isRefreshing ? "refreshing" : ""}`}
      title={
        lang === "uk"
          ? "Автоматичне оновлення щохвилини"
          : "Автоматическое обновление каждую минуту"
      }
      role="status"
      aria-atomic="true"
    >
      <span className="srv-timer-dot" />
      <span>
        {isRefreshing
          ? lang === "uk"
            ? "Опитування…"
            : "Опрос…"
          : `${lang === "uk" ? "Авто" : "Авто"}: ${countdown}с`}
      </span>
    </div>
  );
});
AutoRefreshTimerBadge.displayName = "AutoRefreshTimerBadge";

/**
 * Memoized Server Card following react-best-practices (rerender-memo)
 */
interface ServerCardProps {
  server: ServerDisplayEntry;
  isConnecting: boolean;
  isCopied: boolean;
  isRunning: boolean;
  currentInstanceName?: string;
  lang: string;
  onPlay: (server: ServerDisplayEntry) => void;
  onDelete: (server: ServerDisplayEntry) => void;
  onEdit?: (server: ServerDisplayEntry) => void;
  onCopyIp: (ip: string, id: string) => void;
}

const ServerCard = memo<ServerCardProps>(
  ({
    server,
    isConnecting,
    isCopied,
    isRunning,
    currentInstanceName,
    lang,
    onPlay,
    onDelete,
    onEdit,
    onCopyIp,
  }) => {
    const playerPercent =
      server.online && server.maxPlayers > 0
        ? Math.min(100, Math.round((server.onlinePlayers / server.maxPlayers) * 100))
        : 0;

    return (
      <div
        className={`srv-card ${server.online ? "is-online" : "is-offline"}`}
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 96px" }}
      >
        {/* Favicon Box */}
        <div className="srv-favicon-box">
          {server.favicon && server.favicon.startsWith("data:image") ? (
            <img
              src={server.favicon}
              alt={cleanMinecraftText(server.name)}
              className="srv-favicon-img"
              loading="lazy"
            />
          ) : (
            <span className="srv-favicon-fallback">
              {server.favicon ||
                cleanMinecraftText(server.name || server.ip)
                  .trim()
                  .charAt(0)
                  .toUpperCase() ||
                "S"}
            </span>
          )}
          <span
            className={`srv-favicon-status-dot ${server.online ? "online" : "offline"}`}
            title={
              server.online
                ? lang === "uk"
                  ? "В мережі"
                  : "В сети"
                : lang === "uk"
                ? "Офлайн"
                : "Офлайн"
            }
          />
        </div>

        {/* Info Column */}
        <div className="srv-card-main">
          <div className="srv-card-title-row">
            <span
              className="srv-card-title"
              title={cleanMinecraftText(server.name)}
            >
              {renderMinecraftFormattedText(server.name)}
            </span>

            {/* Click to copy IP chip */}
            <button
              type="button"
              className={`srv-ip-chip ${isCopied ? "copied" : ""}`}
              onClick={() => onCopyIp(server.ip, server.id)}
              title={
                lang === "uk"
                  ? "Натисніть, щоб скопіювати IP адресу"
                  : "Нажмите, чтобы скопировать IP адрес"
              }
            >
              <span>{cleanMinecraftText(server.ip)}</span>
              <span className="srv-ip-copy-tag">
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
              </span>
            </button>

            {/* Version tag */}
            {server.version && (
              <span
                className="srv-ver-chip"
                title={cleanMinecraftText(server.version)}
              >
                {cleanServerVersion(server.version)}
              </span>
            )}

            {/* Assembly tag if from servers.dat */}
            {server.isAssemblyServer && (
              <span className="srv-assembly-chip">
                {lang === "uk" ? "Зі збірки" : "Из сборки"}
              </span>
            )}
          </div>

          {/* MOTD */}
          <div className="srv-card-motd">
            {server.isQuerying ? (
              <span className="srv-motd-loading">
                {lang === "uk" ? "Опитування сервера…" : "Опрос сервера…"}
              </span>
            ) : (
              renderMinecraftFormattedText(server.motd)
            )}
          </div>

          {/* Player Capacity Bar */}
          <div className="srv-card-subinfo">
            {server.online ? (
              <div className="srv-card-player-gauge">
                <div className="srv-player-bar-track">
                  <div
                    className={`srv-player-bar-fill ${playerPercent > 90 ? "high" : ""}`}
                    style={{ width: `${playerPercent}%` }}
                  />
                </div>
                <span className="srv-player-bar-label">
                  <Users size={11} />
                  <span>
                    {server.onlinePlayers.toLocaleString("en-US")} /{" "}
                    {server.maxPlayers.toLocaleString("en-US")}
                  </span>
                </span>
              </div>
            ) : (
              <span className="srv-offline-hint">
                {lang === "uk"
                  ? "Сервер недоступний або не відповідає"
                  : "Сервер недоступен или не отвечает"}
              </span>
            )}
          </div>
        </div>

        {/* Metrics Column */}
        <div className="srv-card-metrics">
          <span
            className={`srv-status-badge ${server.online ? "online" : "offline"}`}
          >
            <span className="srv-status-bullet" />
            {server.online
              ? lang === "uk"
                ? "В МЕРЕЖІ"
                : "В СЕТИ"
              : lang === "uk"
              ? "НЕ В МЕРЕЖІ"
              : "НЕ В СЕТИ"}
          </span>

          <div className="srv-ping-row">
            <MinecraftSignalBars
              online={server.online}
              pingMs={server.pingMs}
            />
            <span
              className={`srv-ping-text ${
                !server.online
                  ? "ping-none"
                  : server.pingMs < 60
                  ? "ping-good"
                  : server.pingMs < 150
                  ? "ping-med"
                  : "ping-bad"
              }`}
            >
              {server.online ? `${server.pingMs} мс` : "—"}
            </span>
          </div>
        </div>

        {/* Actions Column */}
        <div className="srv-card-actions">
          <button
            type="button"
            className={`srv-btn-play ${isConnecting ? "connecting" : ""} ${
              isRunning ? "game-running" : ""
            }`}
            onClick={() => onPlay(server)}
            title={
              currentInstanceName
                ? lang === "uk"
                  ? `Запустити Minecraft (${currentInstanceName}) і підключитися до ${cleanMinecraftText(server.name)}`
                  : `Запустить Minecraft (${currentInstanceName}) и подключиться к ${cleanMinecraftText(server.name)}`
                : lang === "uk"
                ? "Запустити Minecraft і підключитися до сервера"
                : "Запустить Minecraft и подключиться к серверу"
            }
          >
            <span className="srv-btn-play-icon">
              <IconPixelPlay size={14} />
            </span>
            <div className="srv-btn-play-texts">
              <span className="srv-btn-play-label">
                {isConnecting
                  ? "Запуск…"
                  : isRunning
                  ? lang === "uk"
                    ? "Підключитися"
                    : "Подключиться"
                  : lang === "uk"
                  ? "Грати"
                  : "Играть"}
              </span>
              {currentInstanceName && (
                <span className="srv-btn-play-sub" title={currentInstanceName}>
                  {currentInstanceName}
                </span>
              )}
            </div>
          </button>

          {onEdit && (
            <button
              type="button"
              className="srv-btn-edit"
              onClick={() => onEdit(server)}
              title={
                lang === "uk" ? "Редагувати сервер" : "Редактировать сервер"
              }
            >
              <Edit3 size={15} />
            </button>
          )}

          <button
            type="button"
            className="srv-btn-delete"
            onClick={() => onDelete(server)}
            title={
              lang === "uk"
                ? "Видалити сервер зі списку збірки"
                : "Удалить сервер из списка сборки"
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }
);
ServerCard.displayName = "ServerCard";

/**
 * Direct Connection Modal Component
 */
interface DirectConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (ip: string) => void;
  currentInstanceName?: string;
  lang: string;
}

const DirectConnectModal: React.FC<DirectConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  currentInstanceName,
  lang,
}) => {
  const [ip, setIp] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{
    online: boolean;
    pingMs: number;
    motd: string;
    playersOnline?: number;
    playersMax?: number;
    version?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIp("");
      setPingResult(null);
      setIsTesting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    if (!ip.trim()) return;
    setIsTesting(true);
    let rawHost = ip.trim();
    if (rawHost.startsWith("https://")) rawHost = rawHost.slice(8);
    else if (rawHost.startsWith("http://")) rawHost = rawHost.slice(7);
    if (rawHost.includes("/")) rawHost = rawHost.split("/")[0];

    let host = rawHost;
    let port = 25565;
    if (rawHost.includes(":")) {
      const parts = rawHost.split(":");
      host = parts[0];
      port = parseInt(parts[1], 10) || 25565;
    }

    try {
      const res = await ipc.pingServer(host, port);
      setPingResult({
        online: res.online,
        pingMs: res.latencyMs || 0,
        motd: res.motd || "A Minecraft Server",
        playersOnline: res.playersOnline,
        playersMax: res.playersMax,
        version: res.version || undefined,
      });
    } catch {
      setPingResult({
        online: false,
        pingMs: 0,
        motd: "Сервер недоступен",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    onConnect(ip.trim());
    onClose();
  };

  return (
    <div className="srv-modal-backdrop" onClick={onClose}>
      <div
        className="srv-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="srv-modal-header">
          <div className="srv-modal-title-wrap">
            <h2 className="srv-modal-heading">
              <Zap size={18} className="srv-modal-title-icon" />
              {lang === "uk" ? "Пряме підключення" : "Прямое подключение"}
            </h2>
            <p className="srv-modal-subheading">
              {lang === "uk"
                ? `Швидкий запуск та вхід на сервер через збірку «${currentInstanceName || "Minecraft"}»`
                : `Быстрый запуск и вход на сервер через сборку «${currentInstanceName || "Minecraft"}»`}
            </p>
          </div>
          <button
            type="button"
            className="srv-modal-close"
            onClick={onClose}
            title={lang === "uk" ? "Закрити" : "Закрыть"}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="srv-modal-form">
          <div className="srv-modal-field">
            <label className="srv-modal-label">
              {lang === "uk" ? "Адреса або IP сервера" : "Адрес или IP сервера"}
            </label>
            <div className="srv-modal-input-row">
              <input
                type="text"
                autoFocus
                required
                className="srv-input"
                placeholder="mc.hypixel.net / 192.168.1.10:25565"
                value={ip}
                onChange={(e) => {
                  setIp(e.target.value);
                  setPingResult(null);
                }}
              />
              <button
                type="button"
                className="srv-btn-test-ping"
                onClick={handleTestPing}
                disabled={!ip.trim() || isTesting}
              >
                {isTesting ? (
                  <RefreshCw size={14} className="spinning" />
                ) : (
                  <Activity size={14} />
                )}
                <span>{lang === "uk" ? "Пінг" : "Пинг"}</span>
              </button>
            </div>
          </div>

          {pingResult && (
            <div
              className={`srv-ping-preview-card ${
                pingResult.online ? "online" : "offline"
              }`}
            >
              <div className="srv-ping-preview-top">
                <span className="srv-ping-status-pill">
                  {pingResult.online ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>{lang === "uk" ? "В мережі" : "В сети"}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} />
                      <span>{lang === "uk" ? "Немає зв'язку" : "Нет связи"}</span>
                    </>
                  )}
                </span>
                {pingResult.online && (
                  <span className="srv-ping-val">{pingResult.pingMs} мс</span>
                )}
                {pingResult.online && pingResult.playersOnline !== undefined && (
                  <span className="srv-ping-players">
                    <Users size={12} />
                    {pingResult.playersOnline} / {pingResult.playersMax ?? "?"}
                  </span>
                )}
              </div>
              <div className="srv-ping-preview-motd">
                {renderMinecraftFormattedText(pingResult.motd)}
              </div>
            </div>
          )}

          <div className="srv-modal-actions">
            <button
              type="button"
              className="srv-btn-modal-cancel"
              onClick={onClose}
            >
              {lang === "uk" ? "Скасувати" : "Отмена"}
            </button>
            <button
              type="submit"
              className="srv-btn-modal-submit"
              disabled={!ip.trim()}
            >
              <IconPixelPlay size={14} />
              <span>{lang === "uk" ? "Підключитися" : "Подключиться"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Add / Edit Server Modal Component
 */
interface ServerModalProps {
  isOpen: boolean;
  initialServer?: ServerDisplayEntry | null;
  onClose: () => void;
  onSave: (name: string, ip: string, originalId?: string) => void;
  currentInstanceName?: string;
  lang: string;
}

const ServerModal: React.FC<ServerModalProps> = ({
  isOpen,
  initialServer,
  onClose,
  onSave,
  currentInstanceName,
  lang,
}) => {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    online: boolean;
    pingMs: number;
    motd: string;
    playersOnline?: number;
    playersMax?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialServer) {
        setName(initialServer.name);
        setIp(initialServer.ip);
      } else {
        setName("");
        setIp("");
      }
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen, initialServer]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!ip.trim()) return;
    setIsTesting(true);
    let rawHost = ip.trim();
    if (rawHost.startsWith("https://")) rawHost = rawHost.slice(8);
    else if (rawHost.startsWith("http://")) rawHost = rawHost.slice(7);
    if (rawHost.includes("/")) rawHost = rawHost.split("/")[0];

    let host = rawHost;
    let port = 25565;
    if (rawHost.includes(":")) {
      const parts = rawHost.split(":");
      host = parts[0];
      port = parseInt(parts[1], 10) || 25565;
    }

    try {
      const res = await ipc.pingServer(host, port);
      setTestResult({
        online: res.online,
        pingMs: res.latencyMs || 0,
        motd: res.motd || "A Minecraft Server",
        playersOnline: res.playersOnline,
        playersMax: res.playersMax,
      });
      if (!name.trim() && res.motd) {
        setName(cleanMinecraftText(res.motd).split("\n")[0].slice(0, 30) || ip);
      }
    } catch {
      setTestResult({
        online: false,
        pingMs: 0,
        motd: "Сервер недоступен",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ip.trim()) return;
    onSave(name.trim(), ip.trim(), initialServer?.id);
    onClose();
  };

  const isEditing = Boolean(initialServer);

  return (
    <div className="srv-modal-backdrop" onClick={onClose}>
      <div
        className="srv-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="srv-modal-header">
          <div className="srv-modal-title-wrap">
            <h2 className="srv-modal-heading">
              {isEditing ? <Edit3 size={18} /> : <Plus size={18} />}
              {isEditing
                ? lang === "uk"
                  ? "Редагувати сервер"
                  : "Редактировать сервер"
                : lang === "uk"
                ? "Додати сервер"
                : "Добавить сервер"}
            </h2>
            <p className="srv-modal-subheading">
              {lang === "uk"
                ? `Збереження в servers.dat збірки «${currentInstanceName || "Minecraft"}»`
                : `Сохранение в servers.dat сборки «${currentInstanceName || "Minecraft"}»`}
            </p>
          </div>
          <button
            type="button"
            className="srv-modal-close"
            onClick={onClose}
            title={lang === "uk" ? "Закрити" : "Закрыть"}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="srv-modal-form">
          <div className="srv-modal-field">
            <label className="srv-modal-label">
              {lang === "uk" ? "Назва сервера" : "Название сервера"}
            </label>
            <input
              type="text"
              autoFocus
              required
              className="srv-input"
              placeholder={
                lang === "uk"
                  ? "Наприклад: Hypixel Network"
                  : "Например: Hypixel Network"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="srv-modal-field">
            <label className="srv-modal-label">
              {lang === "uk" ? "Адреса або IP:порт" : "Адрес или IP:порт"}
            </label>
            <div className="srv-modal-input-row">
              <input
                type="text"
                required
                className="srv-input"
                placeholder="mc.hypixel.net / play.example.com:25565"
                value={ip}
                onChange={(e) => {
                  setIp(e.target.value);
                  setTestResult(null);
                }}
              />
              <button
                type="button"
                className="srv-btn-test-ping"
                onClick={handleTest}
                disabled={!ip.trim() || isTesting}
              >
                {isTesting ? (
                  <RefreshCw size={14} className="spinning" />
                ) : (
                  <Activity size={14} />
                )}
                <span>{lang === "uk" ? "Перевірити" : "Проверить"}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`srv-ping-preview-card ${
                testResult.online ? "online" : "offline"
              }`}
            >
              <div className="srv-ping-preview-top">
                <span className="srv-ping-status-pill">
                  {testResult.online ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>{lang === "uk" ? "В мережі" : "В сети"}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} />
                      <span>{lang === "uk" ? "Не відповідає" : "Не отвечает"}</span>
                    </>
                  )}
                </span>
                {testResult.online && (
                  <span className="srv-ping-val">{testResult.pingMs} мс</span>
                )}
                {testResult.online && testResult.playersOnline !== undefined && (
                  <span className="srv-ping-players">
                    <Users size={12} />
                    {testResult.playersOnline} / {testResult.playersMax ?? "?"}
                  </span>
                )}
              </div>
              <div className="srv-ping-preview-motd">
                {renderMinecraftFormattedText(testResult.motd)}
              </div>
            </div>
          )}

          <div className="srv-modal-actions">
            <button
              type="button"
              className="srv-btn-modal-cancel"
              onClick={onClose}
            >
              {lang === "uk" ? "Скасувати" : "Отмена"}
            </button>
            <button
              type="submit"
              className="srv-btn-modal-submit"
              disabled={!name.trim() || !ip.trim()}
            >
              <Check size={14} />
              <span>
                {isEditing
                  ? lang === "uk"
                    ? "Зберегти зміни"
                    : "Сохранить изменения"
                  : lang === "uk"
                  ? "Додати до збірки"
                  : "Добавить в сборку"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ServersScreen: React.FC<ServersScreenProps> = ({
  onBack,
  onDirectConnect,
  instances = [],
  selectedInstance,
  onSelectInstance,
  isRunning = false,
}) => {
  const { lang } = useLanguage();

  const [activeInstanceId, setActiveInstanceId] = useState<string>(() => {
    return selectedInstance?.id || instances[0]?.id || "";
  });

  const [isInstanceDropdownOpen, setIsInstanceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Sync active instance if selectedInstance prop changes
  useEffect(() => {
    if (selectedInstance && selectedInstance.id !== activeInstanceId) {
      setActiveInstanceId(selectedInstance.id);
    }
  }, [selectedInstance]);

  const currentInstance = useMemo(() => {
    return (
      instances.find((i) => i.id === activeInstanceId) ||
      selectedInstance ||
      instances[0] ||
      null
    );
  }, [instances, activeInstanceId, selectedInstance]);

  const [servers, setServers] = useState<ServerDisplayEntry[]>([]);
  const [filterType, setFilterType] = useState<
    "all" | "online" | "offline" | "assembly"
  >("all");
  const [sortBy, setSortBy] = useState<"default" | "ping" | "players" | "name">(
    "default"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerDisplayEntry | null>(
    null
  );
  const [isDirectConnectModalOpen, setIsDirectConnectModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 60-second auto-refresh countdown
  const [refreshCountdown, setRefreshCountdown] = useState<number>(60);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPingingRef = useRef(false);
  const activeReqSeqRef = useRef<number>(0);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsInstanceDropdownOpen(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pingServerEntry = useCallback(
    async (entry: ServerDisplayEntry, seqId: number) => {
      try {
        let rawHost = entry.ip.trim();
        if (rawHost.startsWith("https://")) rawHost = rawHost.slice(8);
        else if (rawHost.startsWith("http://")) rawHost = rawHost.slice(7);
        if (rawHost.includes("/")) rawHost = rawHost.split("/")[0];

        let host = rawHost;
        let port = 25565;
        if (rawHost.includes(":")) {
          const parts = rawHost.split(":");
          host = parts[0];
          port = parseInt(parts[1], 10) || 25565;
        }

        const res = await ipc.pingServer(host, port);
        // Sequence guard: if user switched assembly, discard obsolete ping results
        if (seqId !== activeReqSeqRef.current) return;

        setServers((prev) =>
          prev.map((s) =>
            s.id === entry.id
              ? {
                  ...s,
                  motd: res.motd ? res.motd : s.motd,
                  pingMs: res.latencyMs || s.pingMs,
                  onlinePlayers:
                    res.playersOnline !== undefined
                      ? res.playersOnline
                      : s.onlinePlayers,
                  maxPlayers:
                    res.playersMax !== undefined
                      ? res.playersMax
                      : s.maxPlayers,
                  online: res.online,
                  favicon: res.favicon || s.favicon,
                  version: res.version ? cleanServerVersion(res.version) : s.version,
                  isQuerying: false,
                }
              : s
          )
        );
      } catch {
        if (seqId !== activeReqSeqRef.current) return;
        setServers((prev) =>
          prev.map((s) => (s.id === entry.id ? { ...s, isQuerying: false } : s))
        );
      }
    },
    []
  );

  const refreshAllServers = useCallback(
    async (list: ServerDisplayEntry[]) => {
      if (isPingingRef.current) return;
      isPingingRef.current = true;
      setIsRefreshing(true);
      setRefreshCountdown(60);

      const curSeq = ++activeReqSeqRef.current;
      setServers((prev) => prev.map((s) => ({ ...s, isQuerying: true })));

      await Promise.allSettled(list.map((s) => pingServerEntry(s, curSeq)));
      setIsRefreshing(false);
      isPingingRef.current = false;
    },
    [pingServerEntry]
  );

  // Load servers whenever active instance changes
  const loadServersForInstance = useCallback(
    async (instId: string) => {
      let loadedList: ServerDisplayEntry[] = [];
      const curSeq = ++activeReqSeqRef.current;

      try {
        if (instId) {
          const assemblyServers: InstanceServerEntry[] =
            await ipc.listInstanceServers(instId);
          if (curSeq !== activeReqSeqRef.current) return;

          if (assemblyServers && assemblyServers.length > 0) {
            loadedList = assemblyServers.map((s, idx) => ({
              id: `assembly_${instId}_${s.ip}_${idx}`,
              name: s.name || s.ip,
              ip: s.ip,
              motd: "Опрос статуса сервера...",
              pingMs: 0,
              onlinePlayers: 0,
              maxPlayers: 0,
              favicon:
                s.icon ||
                cleanMinecraftText(s.name || s.ip)
                  .trim()
                  .charAt(0)
                  .toUpperCase() ||
                "S",
              online: false,
              isAssemblyServer: true,
              isQuerying: true,
            }));
          }
        }

        // If instance has no servers.dat, check database
        if (loadedList.length === 0) {
          const dbRows = await ipc.dbLoadServers();
          if (curSeq !== activeReqSeqRef.current) return;

          if (dbRows && dbRows.length > 0) {
            loadedList = dbRows.map((r) => ({
              id: `db_${r.host}:${r.port}`,
              name: r.name,
              ip: r.port === 25565 ? r.host : `${r.host}:${r.port}`,
              motd: "Опрос статуса сервера...",
              pingMs: 0,
              onlinePlayers: 0,
              maxPlayers: 0,
              favicon:
                r.favicon ||
                cleanMinecraftText(r.name || r.host)
                  .trim()
                  .charAt(0)
                  .toUpperCase() ||
                "S",
              online: false,
              isAssemblyServer: false,
              isQuerying: true,
            }));
          }
        }

        // If still empty, use defaults
        if (loadedList.length === 0) {
          loadedList = DEFAULT_SERVERS.map((s) => ({
            ...s,
            isQuerying: true,
          }));
        }

        setServers(loadedList);
        void refreshAllServers(loadedList);
      } catch {
        if (curSeq !== activeReqSeqRef.current) return;
        setServers(DEFAULT_SERVERS);
        void refreshAllServers(DEFAULT_SERVERS);
      }
    },
    [refreshAllServers]
  );

  useEffect(() => {
    void loadServersForInstance(activeInstanceId);
  }, [activeInstanceId, loadServersForInstance]);

  // Periodic 60s auto-refresh
  useEffect(() => {
    setRefreshCountdown(60);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          setServers((cur) => {
            void refreshAllServers(cur);
            return cur;
          });
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshAllServers]);

  const handleManualRefresh = useCallback(() => {
    void refreshAllServers(servers);
  }, [refreshAllServers, servers]);

  const handleSwitchInstance = useCallback(
    (inst: InstanceData) => {
      setActiveInstanceId(inst.id);
      setIsInstanceDropdownOpen(false);
      if (onSelectInstance) {
        onSelectInstance(inst);
      }
    },
    [onSelectInstance]
  );

  const handleOpenAddModal = useCallback(() => {
    setEditingServer(null);
    setIsServerModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((server: ServerDisplayEntry) => {
    setEditingServer(server);
    setIsServerModalOpen(true);
  }, []);

  const handleSaveServer = useCallback(
    async (nameClean: string, ipClean: string, originalId?: string) => {
      const parts = ipClean.split(":");
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;

      if (originalId) {
        // Edit existing server
        setServers((prev) =>
          prev.map((s) =>
            s.id === originalId
              ? {
                  ...s,
                  name: nameClean,
                  ip: ipClean,
                  isQuerying: true,
                }
              : s
          )
        );

        const updatedEntry = servers.find((s) => s.id === originalId);
        if (updatedEntry) {
          void pingServerEntry(
            { ...updatedEntry, name: nameClean, ip: ipClean },
            activeReqSeqRef.current
          );
        }

        // Save to active assembly's servers.dat if applicable
        if (activeInstanceId) {
          try {
            await ipc.addInstanceServer(activeInstanceId, nameClean, ipClean);
          } catch {}
        }

        void ipc
          .dbSaveServer({ host, port, name: nameClean, favicon: null })
          .catch(() => {});
      } else {
        // Add new server
        const added: ServerDisplayEntry = {
          id: `srv_${activeInstanceId}_${Date.now()}`,
          name: nameClean,
          ip: ipClean,
          motd: "Опрос статуса...",
          pingMs: 0,
          onlinePlayers: 0,
          maxPlayers: 0,
          favicon: nameClean.charAt(0).toUpperCase() || "S",
          online: true,
          isAssemblyServer: Boolean(activeInstanceId),
          isQuerying: true,
        };

        setServers((prev) => [added, ...prev]);

        // Save to active assembly's servers.dat
        if (activeInstanceId) {
          try {
            await ipc.addInstanceServer(activeInstanceId, nameClean, ipClean);
          } catch {}
        }

        // Save to launcher database
        void ipc
          .dbSaveServer({ host, port, name: nameClean, favicon: null })
          .catch(() => {});
        void pingServerEntry(added, activeReqSeqRef.current);
      }
    },
    [activeInstanceId, pingServerEntry, servers]
  );

  const handleDeleteServer = useCallback(
    async (server: ServerDisplayEntry) => {
      if (activeInstanceId && server.isAssemblyServer) {
        try {
          await ipc.deleteInstanceServer(activeInstanceId, server.ip);
        } catch {}
      }

      const parts = server.ip.split(":");
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;
      void ipc.dbDeleteServer(host, port).catch(() => {});

      setServers((prev) => prev.filter((s) => s.id !== server.id));
    },
    [activeInstanceId]
  );

  const handlePlayOnServer = useCallback(
    (server: ServerDisplayEntry) => {
      setConnectingId(server.id);
      onDirectConnect(
        cleanMinecraftText(server.name),
        server.ip,
        activeInstanceId || undefined
      );
      setTimeout(() => {
        setConnectingId(null);
      }, 2000);
    },
    [activeInstanceId, onDirectConnect]
  );

  const handleCopyIp = useCallback((ip: string, id: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  }, []);

  const handleDirectConnectSubmit = useCallback(
    (targetIp: string) => {
      onDirectConnect(
        targetIp,
        targetIp,
        activeInstanceId || undefined
      );
    },
    [activeInstanceId, onDirectConnect]
  );

  // Filter and sort computation
  const filteredServers = useMemo(() => {
    let result = servers.filter((s) => {
      if (filterType === "online" && !s.online) return false;
      if (filterType === "offline" && s.online) return false;
      if (filterType === "assembly" && !s.isAssemblyServer) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName =
          cleanMinecraftText(s.name).toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query);
        const matchesIp = s.ip.toLowerCase().includes(query);
        const matchesMotd =
          cleanMinecraftText(s.motd).toLowerCase().includes(query) ||
          s.motd.toLowerCase().includes(query);
        if (!matchesName && !matchesIp && !matchesMotd) return false;
      }
      return true;
    });

    if (sortBy === "ping") {
      result = [...result].sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return a.pingMs - b.pingMs;
      });
    } else if (sortBy === "players") {
      result = [...result].sort((a, b) => b.onlinePlayers - a.onlinePlayers);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) =>
        cleanMinecraftText(a.name).localeCompare(cleanMinecraftText(b.name))
      );
    }

    return result;
  }, [servers, filterType, searchQuery, sortBy]);

  const onlineCount = useMemo(
    () => servers.filter((s) => s.online).length,
    [servers]
  );
  const offlineCount = useMemo(
    () => servers.filter((s) => !s.online).length,
    [servers]
  );
  const totalPlayersOnline = useMemo(
    () =>
      servers.reduce(
        (sum, s) => sum + (s.online ? s.onlinePlayers : 0),
        0
      ),
    [servers]
  );
  const assemblyServersCount = useMemo(
    () => servers.filter((s) => s.isAssemblyServer).length,
    [servers]
  );

  return (
    <div className="screens-overlay-layer servers-screen-overlay">
      <div className="srv-container">
        {/* Top Header Bar */}
        <div className="srv-header-bar">
          <div className="srv-header-left">
            {/* Assembly Selector Dropdown */}
            {instances.length > 0 && (
              <div className="srv-instance-selector" ref={dropdownRef}>
                <button
                  type="button"
                  className="srv-instance-trigger-btn"
                  onClick={() => setIsInstanceDropdownOpen((prev) => !prev)}
                  title={
                    lang === "uk"
                      ? "Оберіть збірку для перегляду та гри"
                      : "Выберите сборку для просмотра и игры"
                  }
                >
                  <span className="srv-instance-icon-box">
                    <InstanceAvatarIcon
                      icon={currentInstance?.icon}
                      size={20}
                    />
                  </span>
                  <span className="srv-instance-name">
                    {currentInstance ? currentInstance.name : "Minecraft"}
                  </span>
                  <span className="srv-instance-tag">
                    {currentInstance
                      ? `${currentInstance.mcVersion} ${
                          currentInstance.loader || ""
                        }`.trim()
                      : ""}
                  </span>
                  <span
                    className={`srv-instance-chevron ${
                      isInstanceDropdownOpen ? "open" : ""
                    }`}
                  >
                    <ChevronDown size={14} />
                  </span>
                </button>

                {isInstanceDropdownOpen && (
                  <div className="srv-instance-dropdown-menu">
                    <div className="srv-dropdown-header">
                      {lang === "uk"
                        ? "Оберіть збірку Minecraft:"
                        : "Выберите сборку Minecraft:"}
                    </div>
                    {instances.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        className={`srv-instance-option-btn ${
                          inst.id === activeInstanceId ? "active" : ""
                        }`}
                        onClick={() => handleSwitchInstance(inst)}
                      >
                        <span className="srv-instance-icon-box">
                          <InstanceAvatarIcon icon={inst.icon} size={18} />
                        </span>
                        <div className="srv-option-info">
                          <div className="srv-option-title">{inst.name}</div>
                          <div className="srv-option-sub">
                            {inst.mcVersion} • {inst.loader || "Vanilla"}
                          </div>
                        </div>
                        {inst.id === activeInstanceId && (
                          <span className="srv-option-check">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="srv-header-right">
            <AutoRefreshTimerBadge
              countdown={refreshCountdown}
              isRefreshing={isRefreshing}
              lang={lang}
            />

            <button
              type="button"
              className="srv-btn-refresh"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title={
                lang === "uk"
                  ? "Оновити пінг та статус серверів"
                  : "Обновить пинг и статус серверов"
              }
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "spinning" : ""}
              />
              <span>
                {isRefreshing
                  ? lang === "uk"
                    ? "Опитування…"
                    : "Опрос…"
                  : lang === "uk"
                  ? "Оновити"
                  : "Обновить"}
              </span>
            </button>

            <button
              type="button"
              className="srv-btn-direct"
              onClick={() => setIsDirectConnectModalOpen(true)}
              title={
                lang === "uk"
                  ? "Пряме підключення до сервера по IP"
                  : "Прямое подключение к серверу по IP"
              }
            >
              <Zap size={14} />
              <span>
                {lang === "uk" ? "Пряме підключення" : "Прямое подключение"}
              </span>
            </button>

            <button
              type="button"
              className="srv-btn-add"
              onClick={handleOpenAddModal}
            >
              <Plus size={15} />
              <span>
                {lang === "uk" ? "Додати сервер" : "Добавить сервер"}
              </span>
            </button>
          </div>
        </div>

        {/* Active Assembly Hero Banner */}
        {currentInstance && (
          <div className="srv-assembly-hero">
            <div className="srv-hero-left">
              <div className="srv-hero-icon-plate">
                <InstanceAvatarIcon icon={currentInstance.icon} size={28} />
              </div>
              <div className="srv-hero-text">
                <div className="srv-hero-title-row">
                  <span className="srv-hero-name">{currentInstance.name}</span>
                  <span className="srv-hero-tag loader">
                    {currentInstance.loader?.toUpperCase() || "VANILLA"}
                  </span>
                  <span className="srv-hero-tag">
                    {currentInstance.mcVersion}
                  </span>
                  <span className="srv-hero-badge-active">
                    {lang === "uk" ? "Активна збірка" : "Активная сборка"}
                  </span>
                </div>
                <div className="srv-hero-desc">
                  <span>
                    {lang === "uk" ? "Файл конфігурації:" : "Файл конфигурации:"}{" "}
                    <b className="srv-hero-dat-badge">servers.dat</b>
                  </span>
                  <span>•</span>
                  <span>
                    {lang === "uk"
                      ? `${assemblyServersCount} серверів у збірці`
                      : `${assemblyServersCount} серверов в сборке`}
                  </span>
                </div>
              </div>
            </div>

            <div className="srv-hero-stats">
              <div className="srv-stat-box">
                <span className="srv-stat-val">
                  {onlineCount} <span className="srv-stat-slash">/</span> {servers.length}
                </span>
                <span className="srv-stat-lbl">
                  {lang === "uk" ? "В мережі" : "В сети"}
                </span>
              </div>
              <div className="srv-stat-box">
                <span className="srv-stat-val">
                  {totalPlayersOnline.toLocaleString("en-US")}
                </span>
                <span className="srv-stat-lbl">
                  {lang === "uk" ? "Гравців онлайн" : "Игроков онлайн"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Toolbar */}
        <div className="srv-toolbar">
          <div className="srv-filter-tabs">
            <button
              type="button"
              className={`srv-filter-tab ${
                filterType === "all" ? "active" : ""
              }`}
              onClick={() => setFilterType("all")}
            >
              <span>{lang === "uk" ? "Всі" : "Все"}</span>
              <span className="srv-tab-count">({servers.length})</span>
            </button>
            <button
              type="button"
              className={`srv-filter-tab ${
                filterType === "online" ? "active" : ""
              }`}
              onClick={() => setFilterType("online")}
            >
              <span className="srv-tab-dot online" />
              <span>{lang === "uk" ? "В мережі" : "В сети"}</span>
              <span className="srv-tab-count">({onlineCount})</span>
            </button>
            <button
              type="button"
              className={`srv-filter-tab ${
                filterType === "offline" ? "active" : ""
              }`}
              onClick={() => setFilterType("offline")}
            >
              <span className="srv-tab-dot offline" />
              <span>{lang === "uk" ? "Офлайн" : "Офлайн"}</span>
              <span className="srv-tab-count">({offlineCount})</span>
            </button>
            <button
              type="button"
              className={`srv-filter-tab ${
                filterType === "assembly" ? "active" : ""
              }`}
              onClick={() => setFilterType("assembly")}
            >
              <span>{lang === "uk" ? "Зі збірки" : "Из сборки"}</span>
              <span className="srv-tab-count">({assemblyServersCount})</span>
            </button>
          </div>

          <div className="srv-toolbar-right">
            {/* Custom Sort Dropdown */}
            <div className="srv-sort-dropdown-wrap" ref={sortDropdownRef}>
              <button
                type="button"
                className="srv-sort-trigger-btn"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                title={lang === "uk" ? "Сортування списку серверів" : "Сортировка списка серверов"}
              >
                <ArrowUpDown size={13} className="srv-sort-icon" />
                <span>
                  {sortBy === "ping"
                    ? lang === "uk"
                      ? "За пінгом"
                      : "По пингу"
                    : sortBy === "players"
                    ? lang === "uk"
                      ? "За онлайном"
                      : "По онлайну"
                    : sortBy === "name"
                    ? lang === "uk"
                      ? "За назвою"
                      : "По названию"
                    : lang === "uk"
                    ? "Порядок: за замовчуванням"
                    : "Порядок: по умолчанию"}
                </span>
                <ChevronDown size={13} className={`srv-sort-chevron ${isSortDropdownOpen ? "open" : ""}`} />
              </button>

              {isSortDropdownOpen && (
                <div className="srv-sort-menu">
                  <button
                    type="button"
                    className={`srv-sort-option ${sortBy === "default" ? "active" : ""}`}
                    onClick={() => {
                      setSortBy("default");
                      setIsSortDropdownOpen(false);
                    }}
                  >
                    <span>{lang === "uk" ? "За замовчуванням" : "По умолчанию"}</span>
                    {sortBy === "default" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`srv-sort-option ${sortBy === "ping" ? "active" : ""}`}
                    onClick={() => {
                      setSortBy("ping");
                      setIsSortDropdownOpen(false);
                    }}
                  >
                    <span>{lang === "uk" ? "За пінгом (швидкі)" : "По пингу (быстрые)"}</span>
                    {sortBy === "ping" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`srv-sort-option ${sortBy === "players" ? "active" : ""}`}
                    onClick={() => {
                      setSortBy("players");
                      setIsSortDropdownOpen(false);
                    }}
                  >
                    <span>{lang === "uk" ? "За онлайном (гравці)" : "По онлайну (игроки)"}</span>
                    {sortBy === "players" && <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`srv-sort-option ${sortBy === "name" ? "active" : ""}`}
                    onClick={() => {
                      setSortBy("name");
                      setIsSortDropdownOpen(false);
                    }}
                  >
                    <span>{lang === "uk" ? "За назвою (А-Я)" : "По названию (А-Я)"}</span>
                    {sortBy === "name" && <Check size={13} />}
                  </button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="srv-search-box">
              <span className="srv-search-icon">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder={
                  lang === "uk"
                    ? "Пошук сервера за назвою або IP…"
                    : "Поиск сервера по названию или IP…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="srv-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="srv-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Очистить"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Servers List Area */}
        <div className="srv-scroll-area">
          <div className="srv-cards-list">
            {filteredServers.length === 0 ? (
              <div className="srv-empty-card">
                <div className="srv-empty-icon">
                  <Globe size={48} />
                </div>
                <div className="srv-empty-title">
                  {searchQuery
                    ? lang === "uk"
                      ? "Серверів за запитом не знайдено"
                      : "Серверов по запросу не найдено"
                    : lang === "uk"
                    ? "У цій збірці поки немає серверів"
                    : "В этой сборке пока нет серверов"}
                </div>
                <div className="srv-empty-desc">
                  {searchQuery
                    ? lang === "uk"
                      ? "Спробуйте змінити пошуковий запит або скинути фільтри"
                      : "Попробуйте изменить поисковый запрос или сбросить фильтры"
                    : lang === "uk"
                    ? "Додайте новий сервер вище, і він автоматично з'явиться в меню мультиплеєра Minecraft!"
                    : "Добавьте новый сервер выше, и он автоматически появится в меню мультиплеера Minecraft!"}
                </div>
                {!searchQuery && (
                  <div className="srv-empty-action">
                    <button
                      type="button"
                      className="srv-btn-add"
                      onClick={handleOpenAddModal}
                    >
                      <Plus size={14} />
                      <span>
                        {lang === "uk"
                          ? "Додати перший сервер"
                          : "Добавить первый сервер"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredServers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  isConnecting={connectingId === server.id}
                  isCopied={copiedId === server.id}
                  isRunning={isRunning}
                  currentInstanceName={currentInstance?.name}
                  lang={lang}
                  onPlay={handlePlayOnServer}
                  onDelete={handleDeleteServer}
                  onEdit={handleOpenEditModal}
                  onCopyIp={handleCopyIp}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Server Modal */}
      <ServerModal
        isOpen={isServerModalOpen}
        initialServer={editingServer}
        onClose={() => {
          setIsServerModalOpen(false);
          setEditingServer(null);
        }}
        onSave={handleSaveServer}
        currentInstanceName={currentInstance?.name}
        lang={lang}
      />

      {/* Direct Connect Modal */}
      <DirectConnectModal
        isOpen={isDirectConnectModalOpen}
        onClose={() => setIsDirectConnectModalOpen(false)}
        onConnect={handleDirectConnectSubmit}
        currentInstanceName={currentInstance?.name}
        lang={lang}
      />
    </div>
  );
};
