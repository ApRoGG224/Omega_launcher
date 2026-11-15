import React, { useState } from "react";
import { IconUserFriends } from "../icons/PixelIcons";

interface FriendsModalProps {
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({ onClose }) => {
  const [friendCodeCopied, setFriendCodeCopied] = useState(false);

  const friends = [
    { id: "1", name: "Alex_Miner", status: "В игре: Fabric 1.21.4 (Hypixel)", online: true },
    { id: "2", name: "Notch_Fan", status: "В главном меню", online: true },
    { id: "3", name: "CreeperHunter", status: "Офлайн (был 2 часа назад)", online: false },
  ];

  const handleCopyCode = () => {
    navigator.clipboard?.writeText("OMG-774921");
    setFriendCodeCopied(true);
    setTimeout(() => setFriendCodeCopied(false), 2000);
  };

  return (
    <div className="modal-window" role="dialog" aria-modal="true">
      <div className="modal-header">
        <div className="modal-header-left">
          <div className="modal-icon-badge">
            <IconUserFriends size={20} />
          </div>
          <div>
            <h2 className="modal-title">Друзья и совместная игра</h2>
            <p className="modal-subtitle">Облачная синхронизация Omega / Supabase</p>
          </div>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Закрыть">
          ✕
        </button>
      </div>

      <div className="modal-body">
        <div className="instance-hero-box" style={{ padding: "14px 18px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Твой код друга:
            </span>
            <div style={{ fontFamily: "var(--font-primary)", fontSize: "16px", fontWeight: 800, color: "var(--color-cyan)" }}>
              OMG-774921
            </div>
          </div>
          <button
            type="button"
            className="screen-back-btn pixel-plate-dark"
            onClick={handleCopyCode}
            style={{ minHeight: "34px", height: "34px", padding: "0 14px", fontSize: "12px" }}
          >
            {friendCodeCopied ? "Скопировано!" : "Скопировать код"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Список контактов (2 в сети)
          </h3>
          {friends.map((friend) => (
            <div
              key={friend.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-plate)",
                border: "1px solid var(--border-medium)",
                borderRadius: "0 6px 0 6px",
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "0 4px 0 4px",
                    background: friend.online ? "rgba(16, 185, 129, 0.2)" : "rgba(100, 116, 139, 0.2)",
                    border: friend.online ? "1px solid #10b981" : "1px solid #64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: friend.online ? "#10b981" : "#64748b",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-pure)" }}>
                    {friend.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {friend.status}
                  </span>
                </div>
              </div>

              {friend.online && (
                <button
                  type="button"
                  className="server-connect-btn pixel-plate-play"
                  style={{ minHeight: "32px", height: "32px", padding: "0 14px", fontSize: "12px" }}
                  onClick={() => alert(`Подключение к сессии игрока ${friend.name}...`)}
                >
                  Войти в игру
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
