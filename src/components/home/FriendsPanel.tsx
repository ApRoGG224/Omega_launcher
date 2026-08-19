import React, { useCallback, useMemo, useState } from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconBox, IconCheck, IconCopy, IconPlay, IconPlus, IconTrash, IconUsers, IconX } from "../../ui/icons";
import type { FriendsApi } from "../../hooks/useFriends";
import type { InviteInfo, PresenceApi } from "../../hooks/usePresence";
import type { ModpackInstance } from "../../types";

const resolveIcon = (icon: string | undefined) => {
  if (!icon) return undefined;
  return icon.startsWith("/") || icon.startsWith("http") ? icon : `file://${icon}`;
};

export interface JoinTarget {
  hostPort: string;
  label: string;
}

export const FriendsPanel = React.memo(({
  t,
  friends,
  presence,
  instances,
  invites,
  onDismissInvite,
  onLaunch,
  onNotify,
}: {
  t: any;
  friends: FriendsApi;
  presence: PresenceApi;
  instances: ModpackInstance[];
  invites: InviteInfo[];
  onDismissInvite: (fromId: string) => void;
  onLaunch: (instanceId: string, serverHostPort: string) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}) => {
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinTarget, setJoinTarget] = useState<JoinTarget | null>(null);
  const [busyCode, setBusyCode] = useState(false);

  const onlineCount = useMemo(
    () => friends.friends.filter((f) => presence.presences[f.id]?.status).length,
    [friends.friends, presence.presences],
  );

  const copyCode = useCallback(async () => {
    if (!friends.ownCode) return;
    try {
      await navigator.clipboard.writeText(friends.ownCode);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [friends.ownCode]);

  const submitByCode = useCallback(async () => {
    if (!codeInput.trim() || busyCode) return;
    setBusyCode(true);
    try {
      await friends.addByCode(codeInput);
      onNotify(t.friendsRequestSent, "success");
      setCodeInput("");
    } catch (e: any) {
      onNotify(e?.message === "friendNotFound" ? t.friendNotFound : t.friendNotFound, "error");
    } finally {
      setBusyCode(false);
    }
  }, [codeInput, busyCode, friends, onNotify, t]);

  const requestInvite = useCallback(
    async (friendId: string, friendName: string) => {
      const host = await presence.getMyHost();
      if (!host) {
        onNotify(t.friendsNoBuilds, "error");
        return;
      }
      presence.sendInvite(friendId, friendName, host);
      onNotify(t.friendsInviteSent, "success");
    },
    [presence, onNotify, t],
  );

  const openJoin = useCallback((hostPort: string, label: string) => {
    setJoinTarget({ hostPort, label });
  }, []);

  const chooseInstance = useCallback(
    (instanceId: string) => {
      if (!joinTarget) return;
      const hostPort = joinTarget.hostPort;
      setJoinTarget(null);
      onLaunch(instanceId, hostPort);
    },
    [joinTarget, onLaunch],
  );

  const statusFor = useCallback(
    (friendId: string) => presence.presences[friendId] || null,
    [presence.presences],
  );

  return (
    <DraggableWindow
      storageKey="omega:friends-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: Math.max(100, window.innerWidth - 370), y: 94 }}
      defaultSize={{ width: 340, height: 648 }}
    >
      <div style={{ height: "100%", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="sketch-card-header draggable-window-handle">
          <span className="sketch-card-title">
            <IconUsers /> {t.friendsTitle}
          </span>
          <span className="user-status" style={{ fontSize: "0.78rem", color: onlineCount > 0 ? "#269684" : "#9da7ba" }}>
            <span className="status-dot" style={{ background: onlineCount > 0 ? "#269684" : "#9da7ba" }} /> {onlineCount} {t.friendsOnline}
          </span>
        </div>

        {!friends.active && (
          <div style={{ padding: "14px", textAlign: "center", color: "#9da7ba", fontSize: "0.8rem", background: "rgba(186, 215, 247, 0.04)", borderRadius: 10 }}>
            {t.friendsNotLoggedIn}
          </div>
        )}

        {friends.active && (
          <>
            {invites.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {invites.map((invite) => (
                  <div key={invite.fromId} className="friend-invite-banner">
                    <div style={{ flex: 1, minWidth: 0, fontSize: "0.78rem", lineHeight: 1.35 }}>
                      <b>{invite.fromName}</b> {t.friendsInvite} ({invite.hostPort})
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="friend-action-btn accept" onClick={() => openJoin(invite.hostPort, invite.fromName)} title={t.friendsJoin}>
                        <IconPlay />
                      </button>
                      <button className="friend-action-btn decline" onClick={() => onDismissInvite(invite.fromId)} title={t.friendsDecline}>
                        <IconX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="friends-tabs">
              <button className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}>
                {t.friendsTabFriends} ({friends.friends.length})
              </button>
              <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
                {t.friendsTabRequests} ({friends.requests.length})
              </button>
            </div>

            <div className="friends-my-code">
              <span>{t.friendsMyCode}:</span>
              <code>{friends.ownCode ?? "—"}</code>
              {friends.ownCode && (
                <button className="friend-action-btn" onClick={() => void copyCode()} title={t.friendsCopied}>
                  {copied ? <IconCheck /> : <IconCopy />}
                </button>
              )}
            </div>

            {tab === "friends" ? (
              <>
                <div className="friends-add-row">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submitByCode()}
                    placeholder={t.friendsSearchPlaceholder}
                  />
                  <button onClick={() => void submitByCode()} disabled={busyCode || !codeInput.trim()}>
                    <IconPlus /> {t.friendsAdd}
                  </button>
                </div>

                <div className="friends-list" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  {friends.friends.length === 0 && (
                    <div style={{ padding: "14px", textAlign: "center", color: "#9da7ba", fontSize: "0.8rem" }}>
                      {t.friendsEmpty}
                    </div>
                  )}
                  {friends.friends.map((friend) => {
                    const p = statusFor(friend.id);
                    const online = !!p;
                    const inGame = p?.status === "in_game";
                    return (
                      <div key={friend.id} className="friend-item" style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                          <div
                            className="friend-avatar"
                            style={{
                              width: 34,
                              height: 34,
                              fontSize: "0.8rem",
                              background: online ? "linear-gradient(135deg, #663af3, #8b5cf6)" : "#2f343e",
                            }}
                          >
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 8, objectFit: "cover" }} />
                            ) : (
                              friend.username.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="friend-name" style={{ fontSize: "0.85rem" }}>{friend.username}</div>
                            <div className="friend-activity" style={{ fontSize: "0.72rem" }}>
                              {inGame
                                ? p.serverHost
                                  ? `${t.friendsOnServer} ${p.serverHost}`
                                  : p.instanceName || t.friendsInGame
                                : online
                                  ? t.friendsInMainMenu
                                  : t.friendsOffline}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div className="friend-status" style={{ fontSize: "0.72rem", color: online ? "#269684" : "#9da7ba" }}>
                            <span className="status-dot" style={{ width: 6, height: 6, background: online ? "#269684" : "#9da7ba" }} />
                            {inGame ? t.friendsInGame : online ? t.friendsOnline : t.friendsOffline}
                          </div>
                          {inGame && p?.serverHost && (
                            <button className="friend-action-btn join" onClick={() => openJoin(p.serverHost!, friend.username)} title={t.friendsJoin}>
                              <IconPlay />
                            </button>
                          )}
                          {online && !inGame && (
                            <button className="friend-action-btn" onClick={() => void requestInvite(friend.id, friend.username)} title={t.friendsInvite}>
                              <IconUsers />
                            </button>
                          )}
                          <button className="friend-action-btn decline" onClick={() => void friends.removeFriend(friend.id)} title={t.friendsRemove}>
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="friends-list" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {friends.requests.length === 0 && (
                  <div style={{ padding: "14px", textAlign: "center", color: "#9da7ba", fontSize: "0.8rem" }}>
                    {t.friendsRequestsEmpty}
                  </div>
                )}
                {friends.requests.map((req) => (
                  <div key={req.id} className="friend-item" style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                      <div className="friend-avatar" style={{ width: 34, height: 34, fontSize: "0.8rem", background: "#2f343e" }}>
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          req.username.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="friend-name" style={{ fontSize: "0.85rem" }}>{req.username}</div>
                        <div className="friend-activity" style={{ fontSize: "0.72rem" }}>
                          {req.direction === "outgoing" ? t.friendsPendingSent : t.friendsAdd}
                        </div>
                      </div>
                    </div>
                    {req.direction === "incoming" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="friend-action-btn accept" onClick={() => void friends.acceptRequest(req.id)} title={t.friendsAccept}>
                          <IconCheck />
                        </button>
                        <button className="friend-action-btn decline" onClick={() => void friends.declineRequest(req.id)} title={t.friendsDecline}>
                          <IconX />
                        </button>
                      </div>
                    ) : (
                      <button className="friend-action-btn decline" onClick={() => void friends.declineRequest(req.id)} title={t.friendsDecline}>
                        <IconX />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {joinTarget && (
        <div className="account-modal-overlay" onClick={() => setJoinTarget(null)}>
          <DraggableWindow
            storageKey="omega:friend-join-modal"
            className="create-modal server-launch-modal draggable-window"
            defaultPosition={{ x: 140, y: 160 }}
          >
            <h3>
              {t.friendsJoin}{" "}
              <span style={{ color: "var(--accent-color)" }}>
                {joinTarget.label} ({joinTarget.hostPort})
              </span>
            </h3>
            <p className="server-launch-hint">{t.friendsJoinTitle}</p>
            {instances.length === 0 ? (
              <div style={{ color: "#9da7ba", textAlign: "center", padding: "12px", fontSize: "0.85rem" }}>
                {t.friendsNoBuilds}
              </div>
            ) : (
              <div className="server-launch-list">
                {instances.map((inst) => (
                  <div key={inst.id} className="server-launch-instance" onClick={() => chooseInstance(inst.id)}>
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
                      <div style={{ fontSize: "0.72rem", color: "#9da7ba" }}>
                        {inst.mcVersion} • {inst.loader}
                      </div>
                    </div>
                    <IconPlay />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="play-btn modal-action-btn" style={{ flex: 1, background: "rgba(186, 215, 247, 0.1)", boxShadow: "none" }} onClick={() => setJoinTarget(null)}>
                {t.cancel}
              </button>
            </div>
          </DraggableWindow>
        </div>
      )}
    </DraggableWindow>
  );
});
