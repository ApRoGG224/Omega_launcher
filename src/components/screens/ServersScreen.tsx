import React, { useState, useEffect, useCallback } from "react";
import { ipc } from "../../services/ipc";
import "../../styles/screens.css";

interface ServersScreenProps {
  onBack?: () => void;
  onDirectConnect: (serverName: string, ip: string) => void;
}

interface ServerEntry {
  id: string;
  name: string;
  ip: string;
  motd: string;
  pingMs: number;
  onlinePlayers: number;
  maxPlayers: number;
  favicon: string;
  online: boolean;
}

const DEFAULT_SERVERS: ServerEntry[] = [
  {
    id: "hypixel",
    name: "Hypixel Network",
    ip: "mc.hypixel.net",
    motd: "[1.8-1.21] SkyBlock • BedWars • Wool Wars • Autumn Festival!",
    pingMs: 24,
    onlinePlayers: 48210,
    maxPlayers: 100000,
    favicon: "H",
    online: true,
  },
  {
    id: "2b2t",
    name: "2b2t Anarchy",
    ip: "2b2t.org",
    motd: "The oldest anarchy server in Minecraft. Queue position: 142",
    pingMs: 86,
    onlinePlayers: 250,
    maxPlayers: 250,
    favicon: "2B",
    online: true,
  },
  {
    id: "omega_smp",
    name: "Omega Community SMP",
    ip: "play.omegalauncher.net",
    motd: "Официальный приватный сервер с голосовым чатом Plasmo Voice",
    pingMs: 14,
    onlinePlayers: 32,
    maxPlayers: 100,
    favicon: "Ω",
    online: true,
  },
];

export const ServersScreen: React.FC<ServersScreenProps> = ({
  onDirectConnect,
}) => {
  const [servers, setServers] = useState<ServerEntry[]>(() => {
    try {
      const saved = localStorage.getItem("omega_servers");
      return saved ? JSON.parse(saved) : DEFAULT_SERVERS;
    } catch {
      return DEFAULT_SERVERS;
    }
  });

  const [newIp, setNewIp] = useState("");
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("omega_servers", JSON.stringify(servers));
    } catch {}
  }, [servers]);

  const pingServerEntry = useCallback(async (entry: ServerEntry) => {
    try {
      const parts = entry.ip.split(":");
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;
      const res = await ipc.pingServer(host, port);
      setServers((prev) =>
        prev.map((s) =>
          s.id === entry.id
            ? {
                ...s,
                motd: res.motd ? res.motd.replace(/§[0-9a-fk-or]/gi, "") : s.motd,
                pingMs: res.latencyMs || s.pingMs,
                onlinePlayers: res.playersOnline !== undefined ? res.playersOnline : s.onlinePlayers,
                maxPlayers: res.playersMax !== undefined ? res.playersMax : s.maxPlayers,
                online: res.online,
                favicon: res.favicon || s.favicon,
              }
            : s
        )
      );
    } catch {
      // Keep existing data if offline or ping failed
    }
  }, []);

  const refreshAllServers = useCallback(async (list: ServerEntry[]) => {
    setIsRefreshing(true);
    await Promise.allSettled(list.map((s) => pingServerEntry(s)));
    setIsRefreshing(false);
  }, [pingServerEntry]);

  // Load from Tauri DB on mount, ping servers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ipc.dbLoadServers();
        if (cancelled) return;
        if (rows && rows.length > 0) {
          const loaded: ServerEntry[] = rows.map((r) => ({
            id: `${r.host}:${r.port}`,
            name: r.name,
            ip: r.port === 25565 ? r.host : `${r.host}:${r.port}`,
            motd: "Опрос статуса сервера...",
            pingMs: 0,
            onlinePlayers: 0,
            maxPlayers: 0,
            favicon: r.favicon || (r.name.charAt(0).toUpperCase() || "S"),
            online: false,
          }));
          setServers(loaded);
          void refreshAllServers(loaded);
        } else {
          void refreshAllServers(DEFAULT_SERVERS);
        }
      } catch {
        void refreshAllServers(DEFAULT_SERVERS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAllServers]);

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim() || !newName.trim()) return;

    const parts = newIp.trim().split(":");
    const host = parts[0];
    const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;

    const added: ServerEntry = {
      id: `${host}:${port}_${Date.now()}`,
      name: newName.trim(),
      ip: newIp.trim(),
      motd: "Опрос сервера...",
      pingMs: 0,
      onlinePlayers: 0,
      maxPlayers: 0,
      favicon: newName.trim().charAt(0).toUpperCase() || "S",
      online: true,
    };

    setServers((prev) => [...prev, added]);
    setShowAddForm(false);
    setNewName("");
    setNewIp("");

    void ipc.dbSaveServer({ host, port, name: added.name, favicon: null }).catch(() => {});
    void pingServerEntry(added);
  };

  const handleDeleteServer = (id: string) => {
    const srv = servers.find((s) => s.id === id);
    if (srv) {
      const parts = srv.ip.split(":");
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) || 25565 : 25565;
      void ipc.dbDeleteServer(host, port).catch(() => {});
    }
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConnect = (server: ServerEntry) => {
    setConnectingId(server.id);
    onDirectConnect(server.name, server.ip);
    setTimeout(() => {
      setConnectingId(null);
    }, 1500);
  };

  return (
    <div className="screens-overlay-layer servers-screen-overlay">
      <div className="srv-wrap">
        {/* Top Header: Title with count & Add button */}
        <div className="srv-top">
          <h1>СЕРВЕРЫ ({servers.length})</h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="srv-b"
              onClick={() => refreshAllServers(servers)}
              disabled={isRefreshing}
              title="Обновить пинг и статус серверов"
            >
              {isRefreshing ? "Опрос…" : "⟳ Обновить"}
            </button>
            <button
              type="button"
              className="srv-b"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? "✕ Отмена" : "+ Добавить сервер"}
            </button>
          </div>
        </div>

        {/* Add Server Form */}
        {showAddForm && (
          <form onSubmit={handleAddServer} className="srv-form">
            <input
              type="text"
              required
              placeholder="Название"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              required
              placeholder="Адрес, например mc.example.net"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
            />
            <button type="submit" className="srv-b srv-b-go">
              Сохранить
            </button>
          </form>
        )}

        {/* Scrollable Servers List */}
        <div className="srv-scroll-area">
          <div className="srv-list">
            {servers.length === 0 ? (
              <div className="srv-empty">Серверов пока нет</div>
            ) : (
              servers.map((server) => {
                const isFull = server.onlinePlayers >= server.maxPlayers && server.maxPlayers > 0;
                return (
                  <div key={server.id} className="srv-row">
                    <div className="srv-ico">
                      {server.favicon && server.favicon.startsWith("data:image") ? (
                        <img
                          src={server.favicon}
                          alt={server.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
                        />
                      ) : (
                        server.favicon
                      )}
                    </div>
                    <div className="srv-info">
                      <div className="srv-nm">
                        <b>{server.name}</b>
                        <span className="srv-tag">{server.ip}</span>
                      </div>
                      <div className="srv-ds">{server.motd}</div>
                    </div>
                    <div className="srv-st">
                      <div className={`srv-on-n ${isFull ? "full" : ""}`}>
                        {server.online ? `${server.onlinePlayers.toLocaleString("en-US")} / ${server.maxPlayers.toLocaleString("en-US")}` : "Офлайн"}
                      </div>
                      <div className="srv-ping">
                        {server.online ? `${server.pingMs} мс` : "—"}
                      </div>
                    </div>
                    <div className="srv-acts">
                      <button
                        type="button"
                        className="srv-b srv-b-go"
                        onClick={() => handleConnect(server)}
                        title="Запустить игру и подключиться к серверу напрямую"
                      >
                        {connectingId === server.id
                          ? "Подключение…"
                          : "Играть на сервере"}
                      </button>
                      <button
                        type="button"
                        className="srv-b srv-b-del"
                        onClick={() => handleDeleteServer(server.id)}
                        title="Удалить сервер"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
