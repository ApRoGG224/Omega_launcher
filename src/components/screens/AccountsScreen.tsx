import React, { useState } from "react";
import type { AccountData, OmegaAccountState } from "../../types";
import { User, Globe } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/screens.css";
import "../../design-system/pixelPlates.css";

interface AccountsScreenProps {
  onBack: () => void;
  activeAccount?: AccountData | null;
  accounts: AccountData[];
  onSelectAccount: (acc: AccountData) => void;
  omegaAccount?: OmegaAccountState;
  onOpenOmegaLogin?: () => void;
  onUnlinkOmega?: () => void;
  onCreateOfflineAccount?: (name: string) => void;
  onDeleteAccount?: (id: string) => void;
  onLoginMicrosoft?: () => Promise<void>;
  onLoginEly?: () => Promise<void>;
}

const MINECRAFT_NICK_REGEX = /^[a-zA-Z0-9_]{3,16}$/;

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  onBack,
  activeAccount,
  accounts,
  onSelectAccount,
  omegaAccount = { isLinked: false },
  onOpenOmegaLogin,
  onUnlinkOmega,
  onCreateOfflineAccount,
  onDeleteAccount,
  onLoginMicrosoft,
  onLoginEly,
}) => {
  const { t, lang } = useLanguage();
  const [offlineInput, setOfflineInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoggingInMs, setIsLoggingInMs] = useState(false);

  const handleAddOffline = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = offlineInput.trim();
    if (!MINECRAFT_NICK_REGEX.test(cleanNick)) {
      setValidationError(
        lang === "uk"
          ? "Нікнейм має містити від 3 до 16 латинських символів, цифр або _"
          : lang === "ru"
          ? "Никнейм должен содержать от 3 до 16 латинских символов, цифр или _"
          : "Nickname must be 3-16 characters (letters, numbers, _)"
      );
      return;
    }
    setValidationError(null);
    onCreateOfflineAccount?.(cleanNick);
    setOfflineInput("");
  };

  const hasBaseAccount = !!activeAccount && (activeAccount.type === "microsoft" || activeAccount.type === "offline");

  return (
    <div className="screens-overlay-layer">
      <div className="screen-header-bar">
        <div className="screen-header-left">
          <button
            type="button"
            className="screen-back-btn pixel-plate-dark"
            onClick={onBack}
            title={lang === "uk" ? "Повернутися назад (Esc)" : lang === "ru" ? "Вернуться назад (Esc)" : "Go back (Esc)"}
          >
            ← {lang === "uk" ? "Назад" : lang === "ru" ? "Назад" : "Back"}
          </button>
          <div className="screen-title-wrap">
            <h1 className="screen-title">
              {lang === "uk" ? "Керування акаунтами" : lang === "ru" ? "Управление аккаунтами" : "Account Management"}
            </h1>
            <span className="screen-subtitle">
              {lang === "uk"
                ? "Дворівнева система: базовий акаунт Minecraft (Microsoft / Офлайн) + мережевий акаунт Omega для гри з друзями"
                : lang === "ru"
                ? "Двухуровневая система: базовый аккаунт Minecraft (Microsoft / Офлайн) + сетевой аккаунт Omega для игры с друзьями"
                : "Dual-tier system: basic Minecraft account (Microsoft / Offline) + Omega account for playing with friends"}
            </span>
          </div>
        </div>
      </div>

      <div className="screen-scroll-body" style={{ paddingBottom: "48px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {lang === "uk" ? "Базові ігрові акаунти Minecraft" : lang === "ru" ? "Базовые игровые аккаунты Minecraft" : "Minecraft Game Accounts"} ({accounts.length})
          </h3>

          {accounts.map((acc) => {
            const isActive = acc.id === activeAccount?.id;
            return (
              <div
                key={acc.id}
                className={`pixel-plate-dark ${isActive ? "active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderColor: isActive ? "var(--btn-kc-instance)" : undefined,
                  backgroundColor: isActive ? "rgba(32, 73, 117, 0.18)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      background: acc.type === "microsoft" ? "#0369a1" : "#1e293b",
                      border: "1px solid var(--border-medium)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-pure)",
                      borderRadius: "0 4px 0 4px",
                    }}
                  >
                    {acc.type === "microsoft" ? <span style={{ fontWeight: 800, fontSize: "12px" }}>MS</span> : <User size={20} />}
                  </div>

                  <div>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-pure)", display: "block" }}>
                      {acc.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {acc.type === "microsoft"
                        ? (lang === "uk" ? "Офіційна ліцензія Microsoft (Mojang OAuth2)" : lang === "ru" ? "Официальная лицензия Microsoft (Mojang OAuth2)" : "Official Microsoft License (Mojang OAuth2)")
                        : (lang === "uk" ? "Локальний офлайн профіль" : lang === "ru" ? "Локальный оффлайн профиль" : "Local offline profile")}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {isActive ? (
                    <span style={{ color: "var(--text-accent)", fontWeight: 800, fontSize: "13px" }}>
                      ● {lang === "uk" ? "Активний" : lang === "ru" ? "Активен" : "Active"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="screen-back-btn pixel-plate-dark"
                      style={{ padding: "6px 16px", minHeight: "32px", fontSize: "12px" }}
                      onClick={() => onSelectAccount(acc)}
                    >
                      {lang === "uk" ? "Обрати" : lang === "ru" ? "Выбрать" : "Select"}
                    </button>
                  )}
                  {accounts.length > 1 && onDeleteAccount && (
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => onDeleteAccount(acc.id)}
                      title={lang === "uk" ? "Видалити профіль" : lang === "ru" ? "Удалить профиль" : "Delete profile"}
                    >
                      {lang === "uk" ? "Видалити" : lang === "ru" ? "Удалить" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="pixel-plate-dark"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            borderColor: omegaAccount.isLinked ? "var(--btn-kc-default)" : undefined,
            backgroundColor: "#080c14",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ color: "var(--text-accent)" }}>
                <Globe size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-pure)" }}>
                  Сетевой аккаунт Omega (Совместная игра с друзьями)
                </h4>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Связывает базовый профиль ({activeAccount?.name ?? "Гость"}) с облаком Omega для поиска друзей, лобби и совместной игры
                </p>
              </div>
            </div>

            {omegaAccount.isLinked ? (
              <span style={{ color: "var(--color-success)", fontWeight: 800, fontSize: "12px" }}>
                Подключен (@{omegaAccount.omegaUsername})
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "11px" }}>
                Не привязан
              </span>
            )}
          </div>

          {omegaAccount.isLinked ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(14, 20, 32, 0.8)",
                border: "1px solid var(--border-medium)",
                borderRadius: "0 6px 0 6px",
              }}
            >
              <div>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-pure)" }}>
                  Аккаунт Omega: @{omegaAccount.omegaUsername}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginTop: "2px" }}>
                  Привязан к игровому профилю: <strong>{activeAccount?.name ?? "Гость"}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn-delete"
                onClick={onUnlinkOmega}
              >
                Отвязать аккаунт
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {hasBaseAccount ? (
                <button
                  type="button"
                  className="server-connect-btn pixel-plate-play"
                  onClick={onOpenOmegaLogin}
                >
                  Войти в аккаунт Omega
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="server-connect-btn pixel-plate-play disabled"
                >
                  Вход в аккаунт Omega (недоступно)
                </button>
              )}
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {hasBaseAccount
                  ? `Готово к подключению. Будет связан с текущим профилем: ${activeAccount?.name ?? "Гость"}`
                  : "Сначала войдите в аккаунт Microsoft или Офлайн профиль"}
              </span>
            </div>
          )}
        </div>

        <div className="pixel-plate-dark" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-pure)" }}>
            Добавить новый базовый аккаунт
          </h4>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={isLoggingInMs}
              className="screen-back-btn pixel-plate-dark"
              style={{ padding: "10px 18px", color: "var(--text-accent)", minHeight: "40px" }}
              onClick={async () => {
                if (!onLoginMicrosoft) return;
                setIsLoggingInMs(true);
                try {
                  await onLoginMicrosoft();
                } finally {
                  setIsLoggingInMs(false);
                }
              }}
            >
              {isLoggingInMs
                ? (lang === "uk" ? "Авторизація Microsoft..." : lang === "ru" ? "Авторизация Microsoft..." : "Microsoft Authorization...")
                : (lang === "uk" ? "Увійти через Microsoft OAuth2" : lang === "ru" ? "Войти через Microsoft OAuth2" : "Login with Microsoft OAuth2")}
            </button>

            {onLoginEly && (
              <button
                type="button"
                className="screen-back-btn pixel-plate-dark"
                style={{ padding: "10px 18px", color: "#38bdf8", minHeight: "40px" }}
                onClick={() => onLoginEly()}
              >
                {lang === "uk" ? "Увійти в Ely.by" : lang === "ru" ? "Войти в Ely.by" : "Login with Ely.by"}
              </button>
            )}
          </div>

          <form onSubmit={handleAddOffline} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                required
                minLength={3}
                maxLength={16}
                placeholder={lang === "uk" ? "Створити офлайн нікнейм (3-16 символів)..." : lang === "ru" ? "Создать оффлайн никнейм (3-16 символов)..." : "Create offline nickname (3-16 chars)..."}
                value={offlineInput}
                onChange={(e) => {
                  setOfflineInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="omega-login-input"
                style={{ flex: 1, padding: "10px 14px", color: "var(--text-pure)", fontSize: "13px" }}
              />
              <button
                type="submit"
                className="server-connect-btn pixel-plate-play"
                style={{ padding: "10px 20px", minHeight: "42px" }}
              >
                {lang === "uk" ? "+ Додати профіль" : lang === "ru" ? "+ Добавить профиль" : "+ Add Profile"}
              </button>
            </div>
            {validationError && (
              <span style={{ fontSize: "11px", color: "var(--btn-text-delete)", fontWeight: 600 }}>
                {validationError}
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
