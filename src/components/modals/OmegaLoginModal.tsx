import React, { useState } from "react";
import "../../design-system/pixelPlates.css";
import "../../styles/layer4-modals.css";

interface OmegaLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (omegaUsername: string) => void;
  baseAccountName: string;
}

export const OmegaLoginModal: React.FC<OmegaLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  baseAccountName,
}) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      setError("Пожалуйста, введите логин или email аккаунта Omega");
      return;
    }
    setError(null);
    onLogin(login.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="omega-login-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.2px" }}>
              Вход в аккаунт Omega
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon pixel-plate-dark"
            style={{ width: "32px", height: "32px", minHeight: "32px", padding: 0, fontSize: "14px", fontWeight: 900 }}
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "rgba(37, 99, 235, 0.1)",
            border: "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: "0 6px 0 6px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          Аккаунт Omega необходим для <strong>совместной игры с друзьями</strong> через P2P/облако Omega.
          Будет привязан к активному профилю: <span style={{ color: "var(--text-accent)", fontWeight: 800 }}>{baseAccountName}</span>.
        </div>

        {error && (
          <div
            style={{
              color: "#f87171",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "8px 12px",
              borderRadius: "0 6px 0 6px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
              Логин или Email Omega:
            </label>
            <input
              type="text"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Sky2Fly или user@omega.network"
              className="omega-login-input"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
              Пароль:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="omega-login-input"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="submit"
              className="omega-login-submit-btn"
            >
              Войти в аккаунт Omega
            </button>
            <button
              type="button"
              className="omega-login-cancel-btn"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
