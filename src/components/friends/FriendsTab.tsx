import React, { useCallback, useMemo, useState } from "react";
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

export const FriendsTab = React.memo(({
  t,
  friends,
  presence,
  instances,
  invites,
  onDismissInvite,
  onLaunch,
  onNotify,
  onOpenAccounts,
}: {
  t: any;
  friends: FriendsApi;
  presence: PresenceApi;
  instances: ModpackInstance[];
  invites: InviteInfo[];
  onDismissInvite: (fromId: string) => void;
  onLaunch: (instanceId: string, serverHostPort: string) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
  onOpenAccounts: () => void;
}) => {
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyCode, setBusyCode] = useState(false);
  const [joinTarget, setJoinTarget] = useState<JoinTarget | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    } catch {
      onNotify(t.friendNotFound, "error");
    } finally {
      setBusyCode(false);
    }
  }, [codeInput, busyCode, friends, onNotify, t]);

  const requestInvite = useCallback(
    async (friendId: string, friendName: string) => {
      const host = await presence.getMyHost();
      if (!host) {
        onNotify(t.friendNotFound, "error");
        return;
      }
      presence.sendInvite(friendId, friendName, host);
      onNotify(t.friendsInviteSent, "success");
    },
    [presence, onNotify, t],
  );

  const handleRemove = useCallback(
    async (friendId: string) => {
      setRemovingId(friendId);
      try {
        await friends.removeFriend(friendId);
      } finally {
        setRemovingId(null);
      }
    },
    [friends],
  );

  const chooseInstance = useCallback(
    (instanceId: string) => {
      if (!joinTarget) return;
      const hostPort = joinTarget.hostPort;
      setJoinTarget(null);
      onLaunch(instanceId, hostPort);
    },
    [joinTarget, onLaunch],
  );

  const EmptyState = () => (
    <div className="friends-empty">
      <div className="friends-empty-art">
        <div className="friends-empty-orb main" />
        <div className="friends-empty-orb side" />
        <div className="friends-empty-orb dots" />
        <div className="friends-empty-pill">{friends.ownCode ?? "OMG-??????"}</div>
      </div>
      <h3>{t.friendsEmpty}</h3>
      <p>{t.friendsTabSubtitle}</p>
      <div className="friends-add-row wide">
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
    </div>
  );

  const UnauthState = () => (
    <div className="friends-empty">
      <div className="friends-empty-art">
        <div className="friends-empty-orb main dim" />
        <div className="friends-empty-orb side dim" />
        <div className="friends-lock-icon"><IconUsers /></div>
      </div>
      <h3>{t.friendsTabTitle}</h3>
      <p>{t.friendsNotLoggedIn}</p>
      <button className="friends-login-btn" onClick={onOpenAccounts}>
        {t.accountsTitle}
      </button>
    </div>
  );

  return (
    <div className="friends-tab">
      <div className="friends-tab-header">
        <div>
          <h2>{t.friendsTabTitle}</h2>
          <p>{t.friendsTabSubtitle}</p>
        </div>
        {friends.active && (
          <div className="friends-header-right">
            <div className="friends-online-badge">
              <span className="status-dot" style={{ background: onlineCount > 0 ? "#10b981" : "#6b7280" }} />
              {onlineCount} {t.friendsOnline}
            </div>
            {friends.ownCode && (
              <div className="friends-code-chip">
                <span>{t.friendsMyCode}</span>
                <code>{friends.ownCode}</code>
                <button className="friend-code-copy" onClick={() => void copyCode()} title={t.friendsCopied}>
                  {copied ? <IconCheck /> : <IconCopy />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!friends.active ? (
        <UnauthState />
      ) : (
        <div className="friends-tab-body">
          {invites.length > 0 && (
            <div className="friends-invites">
              {invites.map((invite) => (
                <div key={invite.fromId} className="friend-invite-banner">
                  <div style={{ flex: 1, minWidth: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                    <b>{invite.fromName}</b> {t.friendsInvite} · <code>{invite.hostPort}</code>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="friend-action-btn accept" onClick={() => setJoinTarget({ hostPort: invite.hostPort, label: invite.fromName })} title={t.friendsJoin}>
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

          <div className="friends-tab-tabs">
            <button className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}>
              {t.friendsTabFriends}
              {friends.friends.length > 0 && <span className="friends-count">{friends.friends.length}</span>}
            </button>
            <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
              {t.friendsTabRequests}
              {friends.requests.length > 0 && <span className="friends-count">{friends.requests.length}</span>}
            </button>
          </div>

          {tab === "friends" ? (
            friends.friends.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="friends-grid">
                {friends.friends.map((friend) => {
                  const p = presence.presences[friend.id];
                  const online = !!p;
                  const inGame = p?.status === "in_game";
                  const statusLabel = inGame
                    ? p?.serverHost
                      ? `${t.friendsOnServer} ${p.serverHost}`
                      : p?.instanceName || t.friendsInGame
                    : online
                      ? t.friendsInMainMenu
                      : t.friendsOffline;
                  return (
                    <div key={friend.id} className="friend-card">
                      <div className={`friend-card-avatar ${online ? "online" : ""}`}>
                        {friend.username.substring(0, 2).toUpperCase()}
                        <span className="friend-card-dot" style={{ background: online ? "#10b981" : "#6b7280" }} />
                      </div>
                      <div className="friend-card-info">
                        <div className="friend-card-name">{friend.username}</div>
                        <div className="friend-card-activity">
                          <span className={`friend-card-status ${online ? "on" : ""}`} />
                          {statusLabel}
                        </div>
                      </div>
                      <div className="friend-card-actions">
                        {inGame && p?.serverHost && (
                          <button
                            className="friend-action-btn join"
                            onClick={() => setJoinTarget({ hostPort: p.serverHost!, label: friend.username })}
                            title={t.friendsJoin}
                          >
                            <IconPlay />
                          </button>
                        )}
                        {online && !inGame && (
                          <button
                            className="friend-action-btn invite"
                            onClick={() => void requestInvite(friend.id, friend.username)}
                            title={t.friendsInvite}
                          >
                            <IconUsers />
                          </button>
                        )}
                        <button
                          className="friend-action-btn decline"
                          onClick={() => void handleRemove(friend.id)}
                          disabled={removingId === friend.id}
                          title={t.friendsRemove}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : friends.requests.length === 0 ? (
            <div className="friends-empty small">
              <h3>{t.friendsRequestsEmpty}</h3>
            </div>
          ) : (
            <div className="friends-requests">
              {friends.requests.map((req) => (
                <div key={req.id} className="friend-card request">
                  <div className="friend-card-avatar">
                    {req.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="friend-card-info">
                    <div className="friend-card-name">{req.username}</div>
                    <div className="friend-card-activity">
                      {req.direction === "outgoing" ? t.friendsPendingSent : t.friendsAdd}
                    </div>
                  </div>
                  {req.direction === "incoming" ? (
                    <div className="friend-card-actions">
                      <button className="friends-text-btn accept" onClick={() => void friends.acceptRequest(req.id)}>
                        <IconCheck /> {t.friendsAccept}
                      </button>
                      <button className="friends-text-btn decline" onClick={() => void friends.declineRequest(req.id)}>
                        <IconX /> {t.friendsDecline}
                      </button>
                    </div>
                  ) : (
                    <div className="friend-card-actions">
                      <button className="friends-text-btn decline" onClick={() => void friends.declineRequest(req.id)}>
                        <IconX /> {t.friendsDecline}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {joinTarget && (
        <div className="account-modal-overlay" onClick={() => setJoinTarget(null)}>
          <div className="friend-join-modal">
            <h3>
              {t.friendsJoin}{" "}
              <span style={{ color: "var(--accent-color)" }}>
                {joinTarget.label} ({joinTarget.hostPort})
              </span>
            </h3>
            <p className="server-launch-hint">{t.friendsJoinTitle}</p>
            {instances.length === 0 ? (
              <div style={{ color: "#8b8b9c", textAlign: "center", padding: "12px", fontSize: "0.85rem" }}>
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
              <button
                className="play-btn modal-action-btn"
                style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
                onClick={() => setJoinTarget(null)}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});