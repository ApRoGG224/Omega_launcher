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
  Layers,
} from "lucide-react";
import { ipc, InstanceServerEntry } from "../../services/ipc";
import { useLanguage } from "../../context/LanguageContext";
import type { InstanceData } from "../../types";
import { InstanceAvatarIcon } from "../icons/MinecraftIcons";
import { IconPixelPlay } from "../icons/PixelIcons";
import "../../styles/servers.css";
import "../../design-system/pixelPlates.css";

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

const DEFAULT_SERVERS: ServerDisplayEntry[] = [
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
const MC_COLOR_MAP: Record<string, string> = {
  "0": "#000000",
  "1": "#0000aa",
  "2": "#2ea043",
  "3": "#00aaaa",
  "4": "#cf222e",
  "5": "#8250df",
  "6": "#d29922",
  "7": "#8b949e",
  "8": "#57606a",
  "9": "#58a6ff",
  a: "#3fb950",
  b: "#39c5bb",
  c: "#f85149",
  d: "#d2a8ff",
  e: "#e3b341",
  f: "#f0f6fc",
};

const MC_FORMAT_SPLIT_REGEX = /(§[0-9a-fk-or])/gi;

function renderMinecraftMotd(motd: string): React.ReactNode {
  if (!motd) return null;
  if (!motd.includes("§")) return motd;

  const parts = motd.split(MC_FORMAT_SPLIT_REGEX);
  let currentColor = "#c9d1d9";
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;

  return parts.map((part, index) => {
    if (part.startsWith("§")) {
      const code = part.charAt(1).toLowerCase();
      if (MC_COLOR_MAP[code]) {
        currentColor = MC_COLOR_MAP[code];
        isBold = false;
        isItalic = false;
        isUnderline = false;
      } else if (code === "l") {
        isBold = true;
      } else if (code === "o") {
        isItalic = true;
      } else if (code === "n") {
        isUnderline = true;
      } else if (code === "r") {
        currentColor = "#c9d1d9";
        isBold = false;
        isItalic = false;
        isUnderline = false;
      }
      return null;
    }
    return (
      <span
        key={index}
        style={{
          color: currentColor,
          fontWeight: isBold ? 800 : 400,
          fontStyle: isItalic ? "italic" : "normal",
          textDecoration: isUnderline ? "underline" : "none",
        }}
      >
        {part}
      </span>
    );
  });
}

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
    onCopyIp,
  }) => {
    return (
      <div
        className={`srv-card ${server.online ? "is-online" : "is-offline"}`}
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 88px" }}
      >
        {/* Favicon Box */}
        <div className="srv-favicon-box">
          {server.favicon && server.favicon.startsWith("data:image") ? (
            <img
              src={server.favicon}
              alt={server.name}
              className="srv-favicon-img"
              loading="lazy"
            />
          ) : (
            <span className="srv-favicon-fallback">{server.favicon || "MC"}</span>
          )}
        </div>

        {/* Info Column */}
        <div className="srv-card-main">
          <div className="srv-card-title-row">
            <span className="srv-card-title" title={server.name}>
              {server.name}
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
              <span>{server.ip}</span>
              <span className="srv-ip-copy-tag">
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
              </span>
            </button>

            {/* Version tag */}
            {server.version && (
              <span className="srv-ver-chip">{server.version}</span>
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
            {renderMinecraftMotd(server.motd)}
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

          <div className="srv-players-row">
            {server.online ? (
              <>
                <span>{server.onlinePlayers.toLocaleString("en-US")}</span>
                <span className="srv-players-slash">/</span>
                <span className="srv-players-max">
                  {server.maxPlayers.toLocaleString("en-US")}
                </span>
              </>
            ) : (
              <span style={{ color: "#64748b", fontSize: "11.5px" }}>
                {lang === "uk" ? "Недоступний" : "Недоступен"}
              </span>
            )}
          </div>

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
                ? `Запустить Minecraft (${currentInstanceName}) и подключиться к ${server.name}`
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
  const [filterType, setFilterType] = useState<"all" | "online" | "offline">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newName, setNewName] = useState("");
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
                  version: res.version || s.version,
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
              favicon: s.icon || s.name.charAt(0).toUpperCase() || "S",
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
              favicon: r.favicon || (r.name.charAt(0).toUpperCase() || "S"),
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

  const handleAddServer = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newIp.trim() || !newName.trim()) return;

      const ipClean = newIp.trim();
      const nameClean = newName.trim();

      const parts = ipClean.split(":");
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;

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
      setShowAddForm(false);
      setNewName("");
      setNewIp("");

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
    },
    [activeInstanceId, newIp, newName, pingServerEntry]
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
      onDirectConnect(server.name, server.ip, activeInstanceId || undefined);
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

  // Filter and search computation
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      if (filterType === "online" && !s.online) return false;
      if (filterType === "offline" && s.online) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesIp = s.ip.toLowerCase().includes(query);
        const matchesMotd = s.motd.toLowerCase().includes(query);
        if (!matchesName && !matchesIp && !matchesMotd) return false;
      }
      return true;
    });
  }, [servers, filterType, searchQuery]);

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
            {onBack && (
              <button
                type="button"
                className="screen-back-btn"
                onClick={onBack}
                title={lang === "uk" ? "Повернутися назад" : "Вернуться назад"}
              >
                ← {lang === "uk" ? "Назад" : lang === "ru" ? "Назад" : "Back"}
              </button>
            )}

            <div className="srv-title-wrap">
              <h1 className="srv-heading">
                {lang === "uk" ? "СЕРВЕРИ" : lang === "ru" ? "СЕРВЕРЫ" : "SERVERS"}
                <span className="srv-count-pill">{servers.length}</span>
              </h1>
              <span className="srv-subheading">
                {lang === "uk"
                  ? "Моніторинг мережі та список серверів у збірці"
                  : "Мониторинг сети и список серверов в сборке"}
              </span>
            </div>

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
              className={`srv-btn-add ${showAddForm ? "active" : ""}`}
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? <X size={15} /> : <Plus size={15} />}
              <span>
                {showAddForm
                  ? lang === "uk"
                    ? "Скасувати"
                    : "Отмена"
                  : lang === "uk"
                  ? "Додати сервер"
                  : "Добавить сервер"}
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
                </div>
                <div className="srv-hero-desc">
                  <span>
                    {lang === "uk" ? "Файл збірки:" : "Файл сборки:"}{" "}
                    <b className="srv-hero-dat-badge">servers.dat</b>
                  </span>
                  <span>•</span>
                  <span>
                    {lang === "uk"
                      ? `${assemblyServersCount} серверів у конфізі`
                      : `${assemblyServersCount} серверов в конфиге`}
                  </span>
                </div>
              </div>
            </div>

            <div className="srv-hero-stats">
              <div className="srv-stat-box">
                <span className="srv-stat-val">
                  {onlineCount} / {servers.length}
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

        {/* Add Server Drawer */}
        {showAddForm && (
          <div className="srv-add-panel">
            <div className="srv-add-header">
              <span className="srv-add-title">
                <Plus size={15} />
                {lang === "uk"
                  ? `Додати сервер до servers.dat збірки «${currentInstance?.name || "Minecraft"}»`
                  : `Добавить сервер в servers.dat сборки «${currentInstance?.name || "Minecraft"}»`}
              </span>
            </div>
            <form onSubmit={handleAddServer} className="srv-add-form">
              <input
                type="text"
                required
                placeholder={
                  lang === "uk"
                    ? "Назва сервера (наприклад: Hypixel Network)"
                    : "Название сервера (например: Hypixel Network)"
                }
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="srv-input"
              />
              <input
                type="text"
                required
                placeholder={
                  lang === "uk"
                    ? "Адреса або IP:порт (наприклад: mc.hypixel.net)"
                    : "Адрес или IP:порт (например: mc.hypixel.net)"
                }
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="srv-input"
              />
              <button type="submit" className="srv-btn-save">
                {lang === "uk" ? "Зберегти в збірку" : "Сохранить в сборку"}
              </button>
            </form>
            <div className="srv-add-hint">
              {lang === "uk"
                ? "Сервер миттєво з'явиться в меню гри Minecraft та у списку вище"
                : "Сервер мгновенно появится в игровом меню Minecraft и в списке выше"}
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
              <span style={{ opacity: 0.7 }}>({servers.length})</span>
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
              <span style={{ opacity: 0.7 }}>({onlineCount})</span>
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
              <span style={{ opacity: 0.7 }}>({offlineCount})</span>
            </button>
          </div>

          <div className="srv-search-box">
            <span className="srv-search-icon">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder={
                lang === "uk"
                  ? "Пошук сервера за назвою, IP або описом…"
                  : "Поиск сервера по названию, IP или описанию…"
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
                      onClick={() => setShowAddForm(true)}
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
                  onCopyIp={handleCopyIp}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
