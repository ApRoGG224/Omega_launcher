import React from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconPlus, IconUsers } from "../../ui/icons";

const FRIENDS_LIST = [
  { id: "1", name: "пронуб_228", status: "В игре (1.20.1)", online: true, activity: "Играет на Hypixel" },
  { id: "2", name: "Alex_Crafter", status: "В сети", online: true, activity: "В главном меню" },
  { id: "3", name: "Steve_Pro", status: "Офлайн", online: false, activity: "Был 15 мин назад" },
];

export const FriendsPanel = React.memo(() => {
  return (
    <DraggableWindow
      storageKey="omega:friends-panel"
      className="sketch-card floating-dashboard-window draggable-window"
      defaultPosition={{ x: Math.max(100, window.innerWidth - 370), y: 94 }}
      defaultSize={{ width: 340, height: 648 }}
    >
      <div style={{ height: "100%", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="sketch-card-header draggable-window-handle">
          <span className="sketch-card-title">
            <IconUsers /> Друзья
          </span>
          <span className="user-status" style={{ fontSize: "0.78rem", color: "#10b981" }}>
            <span className="status-dot" /> 2 онлайн
          </span>
        </div>
        <div className="friends-list" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {FRIENDS_LIST.map((friend) => (
            <div key={friend.id} className="friend-item" style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  className="friend-avatar"
                  style={{
                    width: 34,
                    height: 34,
                    fontSize: "0.8rem",
                    background: friend.online ? "linear-gradient(135deg, #960DF2, #AB3DF5)" : "#2a2a35",
                  }}
                >
                  {friend.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="friend-name" style={{ fontSize: "0.85rem" }}>{friend.name}</div>
                  <div className="friend-activity" style={{ fontSize: "0.72rem" }}>{friend.activity}</div>
                </div>
              </div>
              <div className="friend-status" style={{ fontSize: "0.72rem", color: friend.online ? "#10b981" : "#8b8b9c" }}>
                <span className="status-dot" style={{ width: 6, height: 6, background: friend.online ? "#10b981" : "#6b7280" }} />
                {friend.status}
              </div>
            </div>
          ))}
        </div>
        <button
          style={{
            marginTop: "auto",
            flexShrink: 0,
            width: "100%",
            padding: "10px",
            background: "rgba(150,13,242,0.12)",
            border: "1px dashed rgba(171,61,245,0.35)",
            borderRadius: "10px",
            color: "#AB3DF5",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(150,13,242,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(150,13,242,0.12)")}
        >
          <IconPlus /> Добавить друга
        </button>
      </div>
    </DraggableWindow>
  );
});