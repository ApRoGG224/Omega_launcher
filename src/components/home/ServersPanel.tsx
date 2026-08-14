import React, { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import DraggableWindow from "../../ui/DraggableWindow";
import { ipc } from "../../services/ipc";
import type { ServerInfo, ServerRow } from "../../services/ipc";
import type { ModpackInstance } from "../../types";
import { IconBox, IconPlay } from "../../ui/icons";

const resolveIcon = (icon: string | undefined) => {
  if (!icon) return undefined;
  return icon.startsWith("data:") || icon.startsWith("http") ? icon : convertFileSrc(icon);
};

interface ServerWithStatus extends ServerRow {
  status: ServerInfo | null;
  checking: boolean;
  favicon: string | null;
}

const PING_INTERVAL_MS = 60_000;

export const ServersPanel = React.memo(({
  instances,
  onLaunch,
  t,
}: {
  instances: ModpackInstance[];
  onLaunch: (instanceId: string, serverHostPort: string) => void;
  t: any;
}) => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [newHost, setNewHost] = useState("");
  const [newName, setNewName] = useState("");
  const [launchServer, setLaunchServer] = useState<ServerWithStatus | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const rows = await ipc.dbLoadServers();
      if (!mountedRef.current) return;
      setServers((prev) => {
        const merged: ServerWithStatus[] = rows.map((row) => {
          const existing = prev.find(
            (p) => p.host === row.host && p.port === row.port,
          );
          return {
            ...row,
            status: existing?.status ?? null,
            checking: false,
            favicon: row.favicon ?? existing?.status?.favicon ?? null,
          };
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
    if (!mountedRef.current) return;
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
    if (!mountedRef.current) return;
    if (result?.favicon) {
      void ipc.dbSaveServerFavicon(host, port, result.favicon).catch(() => {});
    }
    setServers((prev) =>
      prev.map((s) =>
        s.host === host && s.port === port
          ? {
              ...s,
              checking: false,
              status: result,
              favicon: result?.favicon ?? s.favicon,
            }
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

  // Periodic re-ping to keep online/offline status fresh.
  useEffect(() => {
    const interval = setInterval(() => {
      for (const s of servers) {
        if (!s.checking) void ping(s.host, s.port);
      }
    }, PING_INTERVAL_MS);
    return () => clearInterval(interval);
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

  const openLaunchModal = useCallback((server: ServerWithStatus) => {
    setLaunchServer(server);
  }, []);

  const chooseInstance = useCallback(
    (instanceId: string) => {
      if (!launchServer) return;
      const hostPort = `${launchServer.host}:${launchServer.port}`;
      setLaunchServer(null);
      onLaunch(instanceId, hostPort);
    },
    [launchServer, onLaunch],
  );

  return (
    <DraggableWindow
      storageKey="omega:servers-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: 100, y: 442 }}
      defaultSize={{ width: 340, height: 350 }}
    >
      <div className="floating-dashboard-content" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div className="sketch-card-header draggable-window-handle">
          <span className="sketch-card-title">{`🌐 ${t.serversTitle}`}</span>
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
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: server.status?.online
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(107,114,128,0.15)",
                    color: server.status?.online ? "#10b981" : "#6b7280",
                  }}
                >
                  {server.favicon ? (
                    <img
                      src={server.favicon}
                      alt={server.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : server.checking ? (
                    "…"
                  ) : server.status?.online ? (
                    "●"
                  ) : (
                    "○"
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="server-name" style={{ fontSize: "0.85rem" }}>
                    {server.name}
                  </div>
                  <div className="server-ip" style={{ fontSize: "0.72rem" }}>
                    {server.host}:{server.port}
                  </div>
                </div>
              </div>
              <div className="server-item-actions">
                <span
                  className="server-players-tag"
                  style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                >
                  {server.checking
                    ? "…"
                    : server.status?.online
                      ? `${server.status.playersOnline}/${server.status.playersMax} · ${server.status.latencyMs}ms`
                      : server.status
                        ? t.serverOffline
                        : "—"}
                </span>
                <button
                  className="server-launch-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLaunchModal(server);
                  }}
                  disabled={!server.status?.online}
                >
                  <IconPlay /> {t.serverLaunch}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeServer(server.host, server.port);
                  }}
                  className="server-remove-btn"
                  title={t.serverDelete}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {servers.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#8b8b9c", padding: "12px", textAlign: "center" }}>
              {t.serversEmpty}
            </div>
          )}
        </div>
        <div className="server-add-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.serverNamePh}
          />
          <input
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            placeholder={t.serverHostPh}
            onKeyDown={(e) => e.key === "Enter" && void addServer()}
          />
          <button onClick={() => void addServer()} className="mod-install-btn" style={{ flexShrink: 0 }}>
            +
          </button>
        </div>
      </div>

      {launchServer && (
        <div className="account-modal-overlay" onClick={() => setLaunchServer(null)}>
          <DraggableWindow
            storageKey="omega:server-launch-modal"
            className="create-modal server-launch-modal draggable-window"
            defaultPosition={{ x: 140, y: 160 }}
          >
            <h3>
              {t.serverLaunchTitle}{" "}
              <span style={{ color: "var(--accent-color)" }}>
                {launchServer.host}:{launchServer.port}
              </span>
            </h3>
            <p className="server-launch-hint">
              {t.serverChooseBuild}
            </p>
            {instances.length === 0 ? (
              <div style={{ color: "#8b8b9c", textAlign: "center", padding: "12px", fontSize: "0.85rem" }}>
                {t.noBuildsToLaunch}
              </div>
            ) : (
              <div className="server-launch-list">
                {instances.map((inst) => (
                  <div
                    key={inst.id}
                    className="server-launch-instance"
                    onClick={() => chooseInstance(inst.id)}
                  >
                    <div className="recent-inst-icon" style={{ width: 32, height: 32, borderRadius: 8 }}>
                      {inst.icon ? (
                        <img src={resolveIcon(inst.icon)} alt="icon" style={{ width: 24, height: 24, borderRadius: 6 }} />
                      ) : (
                        <IconBox />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {inst.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#8b8b9c" }}>
                        {inst.mcVersion} • {inst.loader}
                      </div>
                    </div>
                    <IconPlay />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="play-btn modal-action-btn" style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={() => setLaunchServer(null)}>
                {t.cancel}
              </button>
            </div>
          </DraggableWindow>
        </div>
      )}
    </DraggableWindow>
  );
});