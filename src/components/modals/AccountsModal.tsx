import React, { useState } from "react";
import { User } from "lucide-react";
import type { AccountData } from "../../types";

interface AccountsModalProps {
  onClose: () => void;
  activeAccount: AccountData;
  onSelectAccount: (acc: AccountData) => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  onClose,
  activeAccount,
  onSelectAccount,
}) => {
  const [accounts, setAccounts] = useState<AccountData[]>([
    activeAccount,
    {
      id: "acc_ms",
      name: "SkyGamer_Pro",
      type: "microsoft",
      isOnline: true,
    },
    {
      id: "acc_ely",
      name: "OmegaTester",
      type: "elyby",
      isOnline: false,
    },
  ]);

  const [offlineName, setOfflineName] = useState("");

  const handleAddOffline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineName.trim()) return;

    const newAcc: AccountData = {
      id: "acc_" + Date.now(),
      name: offlineName.trim(),
      type: "offline",
      isOnline: true,
    };

    setAccounts((prev) => [...prev, newAcc]);
    onSelectAccount(newAcc);
    setOfflineName("");
  };

  return (
    <div className="modal-window" role="dialog" aria-modal="true">
      <div className="modal-header">
        <div className="modal-header-left">
          <div className="modal-icon-badge">
            <User size={18} color="var(--accent-bright)" />
          </div>
          <div>
            <h2 className="modal-title">Управление аккаунтами</h2>
            <p className="modal-subtitle">Поддержка Microsoft OAuth, Оффлайн, Omega Cloud и Ely.by</p>
          </div>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Закрыть">
          ✕
        </button>
      </div>

      <div className="modal-body">
        {/* Active Accounts List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {accounts.map((acc) => {
            const isActive = acc.id === activeAccount.id;
            return (
              <div
                key={acc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isActive ? "var(--bg-plate-hover)" : "var(--bg-plate)",
                  border: isActive ? "1px solid var(--accent)" : "1px solid var(--border-medium)",
                  borderRadius: "0 6px 0 6px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "0 4px 0 4px",
                      background: acc.type === "microsoft" ? "#0284c7" : "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {acc.type === "microsoft" ? "MS" : "OFF"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-pure)" }}>
                      {acc.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {acc.type === "microsoft"
                        ? "Официальная лицензия Microsoft"
                        : acc.type === "elyby"
                          ? "Профиль Ely.by"
                          : "Оффлайн профиль (Пиратка)"}
                    </span>
                  </div>
                </div>

                <div>
                  {isActive ? (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--accent-bright)",
                        background: "var(--accent-bg-subtle)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      Активен
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="screen-back-btn pixel-plate-dark"
                      style={{ minHeight: "32px", height: "32px", padding: "0 14px", fontSize: "12px" }}
                      onClick={() => onSelectAccount(acc)}
                    >
                      Выбрать
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Account Options */}
        <div className="settings-section">
          <span className="settings-section-title">Добавить аккаунт</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="screen-back-btn pixel-plate-dark"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: "40px",
                height: "40px",
                color: "#60a5fa",
              }}
              onClick={() => alert("Симуляция входа Microsoft Device Flow")}
            >
              Войти через Microsoft
            </button>
            <button
              type="button"
              className="screen-back-btn pixel-plate-dark"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: "40px",
                height: "40px",
                color: "#34d399",
              }}
              onClick={() => alert("Симуляция входа в Ely.by")}
            >
              Войти через Ely.by
            </button>
          </div>

          <form onSubmit={handleAddOffline} style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <input
              type="text"
              placeholder="Новый оффлайн никнейм..."
              value={offlineName}
              onChange={(e) => setOfflineName(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-bright)",
                padding: "8px 12px",
                borderRadius: "0 4px 0 4px",
                color: "var(--text-pure)",
                fontFamily: "var(--font-primary) !important",
                fontSize: "13px",
              }}
            />
            <button
              type="submit"
              className="server-connect-btn pixel-plate-play"
              style={{ minHeight: "36px", height: "36px", padding: "0 16px" }}
            >
              Добавить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
