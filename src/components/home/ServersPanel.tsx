import React, { useCallback, useEffect, useState } from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { ipc } from "../../services/ipc";
import type { ServerInfo, ServerRow } from "../../services/ipc";

interface ServerWithStatus extends ServerRow {
  status: ServerInfo | null;
  checking: boolean;
}

export const ServersPanel = React.memo(() => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [newHost, setNewHost] = useState("");
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    try {
      const rows = await ipc.dbLoadServers();
      setServers((prev) => {
        const merged: ServerWithStatus[] = rows.map((row) => {
          const existing = prev.find(
            (p) => p.host === row.host && p.port === row.port,
          );
          return { ...row, status: existing?.status ?? null, checking: false };
        });
        return merged;
      });
    } catch {
      // Tauri backend unavailable
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ping = useCallback(async (host: string, port: number) => {
    setServers((prev) =>
      prev.map((s) =>
        s.host === host && s.port === port ? { ...s, checking: true } : s,
      ),
    );
    let result: ServerInfo | null = null;
    try {
      result = await ipc.pingServer(host, port);
    } catch {
      result = null;
    }
    setServers((prev) =>
      prev.map((s) =>
        s.host === host && s.port === port
          ? { ...s, checking: false, status: result }
          : s,
      ),
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const s of servers) {
        if (s.status === null && !s.checking) void ping(s.host, s.port);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [servers, ping]);

  const addServer = useCallback(async () => {
    const host = newHost.trim();
    if (!host) return;
    const hasPort = host.match(/^(.*):(\d+)$/);
    const pureHost = hasPort ? hasPort[1] : host;
    const port = hasPort ? parseInt(hasPort[2]) : 25565;
    const row: ServerRow = { host: pureHost, port, name: newName.trim() || pureHost };
    setNewHost("");
    setNewName("");
    try {
      await ipc.dbSaveServer(row);
      await refresh();
    } catch {
      // offline fallback
    }
  }, [newHost, newName, refresh]);

  const removeServer = useCallback(async (host: string, port: number) => {
    setServers((prev) => prev.filter((s) => !(s.host === host && s.port === port)));
    try {
      await ipc.dbDeleteServer(host, port);
    } catch {
      // offline fallback
    }
  }, []);

  return (
    <DraggableWindow
      storageKey="omega:servers-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: 100, y: 442 }}
      defaultSize={{ width: 340, height: 330 }}
    >
      <div className="floating-dashboard-content" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div className="sketch-card-header draggable-window-handle">
          <span className="sketch-card-title">🌐 Сервера</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {servers.map((server) => (
            <div key={`${server.host}:${server.port}`} className="server-item" style={{ padding: "8px 12px", flexShrink: 0 }}>
              <div className="server-info-left" style={{ gap: "10px" }}>
                <div
                  className="server-icon-badge"
                  style={{
                    width: 34,
                    height: 34,
                    fontSize: "0.9rem",
                    background: server.status?.online
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(107,114,128,0.15)",
                    color: server.status?.online ? "#10b981" : "#6b7280",
                  }}
                >
                  {server.status?.online ? "●" : "○"}
                </div>
                <div>
                  <div className="server-name" style={{ fontSize: "0.85rem" }}>
                    {server.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeServer(server.host, server.port);
                      }}
                      style={{
                        marginLeft: 8,
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="server-ip" style={{ fontSize: "0.72rem" }}>
                    {server.host}:{server.port}
                  </div>
                </div>
              </div>
              <span
                className="server-players-tag"
                style={{ fontSize: "0.7rem", padding: "2px 8px" }}
              >
                {server.checking
                  ? "…"
                  : server.status?.online
                    ? `${server.status.playersOnline}/${server.status.playersMax} · ${server.status.latencyMs}ms`
                    : server.status
                      ? "офлайн"
                      : "—"}
              </span>
            </div>
          ))}
          {servers.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#8b8b9c", padding: "12px", textAlign: "center" }}>
              Добавьте сервер, чтобы играть со своими
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", padding: "8px 4px 0" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название"
            style={{ flex: 1, minWidth: 0, fontSize: "0.72rem" }}
          />
          <input
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            placeholder="адрес:порт"
            onKeyDown={(e) => e.key === "Enter" && void addServer()}
            style={{ flex: 1.4, minWidth: 0, fontSize: "0.72rem" }}
          />
          <button onClick={() => void addServer()} className="mod-install-btn" style={{ flexShrink: 0 }}>
            +
          </button>
        </div>
      </div>
    </DraggableWindow>
  );
});