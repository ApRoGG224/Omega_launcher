import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/layer4-modals.css";

interface OmegaLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (omegaUsername: string) => void;
  baseAccountName: string;
}

const tr = (lang: string, uk: string, ru: string, en: string): string => {
  if (lang === "uk") return uk;
  if (lang === "en") return en;
  return ru;
};

export const OmegaLoginModal: React.FC<OmegaLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  baseAccountName,
}) => {
  const { lang } = useLanguage();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) {
      setError(tr(lang, "Будь ласка, введіть логін або email акаунта Omega", "Пожалуйста, введите логин или email аккаунта Omega", "Please enter Omega account login or email"));
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
              {tr(lang, "Вхід в акаунт Omega", "Вход в аккаунт Omega", "Sign in to Omega Account")}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            style={{ width: "32px", height: "32px", minHeight: "32px", padding: 0, fontSize: "14px", fontWeight: 900 }}
            onClick={onClose}
            title={tr(lang, "Закрити", "Закрыть", "Close")}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "rgba(37, 99, 235, 0.1)",
            border: "1px solid rgba(96, 165, 250, 0.28)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          {tr(lang, "Акаунт Omega необхідний для", "Аккаунт Omega необходим для", "Omega account is required for")}{" "}
          <strong>{tr(lang, "спільної гри з друзями", "совместной игры с друзьями", "playing together with friends")}</strong>{" "}
          {tr(lang, "через P2P/хмару Omega. Буде прив'язаний до активного профілю:", "через P2P/облако Omega. Будет привязан к активному профилю:", "via Omega P2P/cloud. Will be linked to active profile:")}{" "}
          <span style={{ color: "var(--text-accent)", fontWeight: 800 }}>{baseAccountName}</span>.
        </div>

        {error && (
          <div
            style={{
              color: "#f87171",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "8px 12px",
              borderRadius: "6px",
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
              {tr(lang, "Логін або Email Omega:", "Логин или Email Omega:", "Omega Login or Email:")}
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
              {tr(lang, "Пароль:", "Пароль:", "Password:")}
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
              {tr(lang, "Увійти в акаунт Omega", "Войти в аккаунт Omega", "Sign in to Omega")}
            </button>
            <button
              type="button"
              className="omega-login-cancel-btn"
              onClick={onClose}
            >
              {tr(lang, "Скасувати", "Отмена", "Cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
