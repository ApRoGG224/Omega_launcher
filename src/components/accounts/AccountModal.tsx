import React, { useState } from "react";
import type { Account } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconArrowLeft, IconEye, IconEyeOff, IconMicrosoft, IconPlus, IconTrash, IconUser, IconUsers, IconX } from "../../ui/icons";
import type { AccountModalView, OmegaFormMode } from "../../hooks/useAccounts";

export const AccountModal = React.memo(({
  t,
  accountModalView,
  account,
  savedAccounts,
  newUsernameInput,
  setNewUsernameInput,
  omegaMode,
  setOmegaMode,
  omegaEmail,
  setOmegaEmail,
  omegaUsername,
  setOmegaUsername,
  omegaPassword,
  setOmegaPassword,
  omegaBusy,
  omegaError,
  onBack,
  onSelectAccount,
  onDeleteAccount,
  onAddOffline,
  onAddMicrosoft,
  onAddOmega,
  onChangeView,
  onClose,
}: {
  t: any;
  accountModalView: AccountModalView;
  account: Account;
  savedAccounts: Account[];
  newUsernameInput: string;
  setNewUsernameInput: (v: string) => void;
  omegaMode: OmegaFormMode;
  setOmegaMode: (v: OmegaFormMode) => void;
  omegaEmail: string;
  setOmegaEmail: (v: string) => void;
  omegaUsername: string;
  setOmegaUsername: (v: string) => void;
  omegaPassword: string;
  setOmegaPassword: (v: string) => void;
  omegaBusy: boolean;
  omegaError: string | null;
  onBack: () => void;
  onSelectAccount: (acc: Account) => void;
  onDeleteAccount: (acc: Account) => void;
  onAddOffline: () => void;
  onAddMicrosoft: () => void;
  onAddOmega: () => void;
  onChangeView: (v: AccountModalView) => void;
  onClose: () => void;
}) => {
  const nicknameValid = newUsernameInput.trim().length > 0 && /^[a-zA-Z0-9_]{3,16}$/.test(newUsernameInput.trim());
  const [showOmegaPassword, setShowOmegaPassword] = useState(false);
  const omegaSubmitEnabled =
    omegaEmail.trim().length > 0 &&
    omegaPassword.length >= 6 &&
    (omegaMode === "login" || /^[a-zA-Z0-9_]{3,16}$/.test(omegaUsername.trim())) &&
    !omegaBusy;

  return (
    <div className="account-modal-overlay profile-modal-overlay" onClick={onClose}>
      <DraggableWindow
        storageKey="omega:profile-window"
        className="account-modal draggable-window"
        defaultPosition={{ x: 180, y: 90 }}
        defaultSize={{ width: 420, height: 520 }}
      >
        <div className="account-modal-header draggable-window-handle">
          <div className="account-modal-header-info">
            <h3>
              {accountModalView === "list" && t.accountsSection}
              {accountModalView === "method" && (t as any).addAccountTitle}
              {accountModalView === "offline" && (t as any).addOfflineTitle}
              {accountModalView === "omega" && (omegaMode === "register" ? (t as any).omegaRegisterTitle : (t as any).omegaLoginTitle)}
            </h3>
            <p>
              {accountModalView === "list" && t.accountsSubtitle}
              {accountModalView === "method" && (t as any).addAccountSubtitle}
              {accountModalView === "offline" && (t as any).addOfflineSubtitle}
              {accountModalView === "omega" && (omegaMode === "register" ? (t as any).omegaRegisterSubtitle : (t as any).omegaLoginSubtitle)}
            </p>
          </div>
          <button className="account-modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="account-modal-body">
          {accountModalView === "list" && (
            <>
              {savedAccounts.length > 0 && (
                <div className="account-list-section">
                  <span className="account-list-label">{t.accountsSection}</span>
                  {savedAccounts.map((acc) => (
                    <div
                      key={`${acc.type}:${acc.name}`}
                      className={`account-item ${acc.name === account.name && acc.type === account.type ? "active" : ""}`}
                      onClick={() => onSelectAccount(acc)}
                    >
                      <div className={`account-item-avatar ${acc.type}`}>
                        {acc.type === "microsoft" ? <IconMicrosoft /> : acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="account-item-info">
                        <div className="account-item-name">{acc.name}</div>
                        <div className="account-item-type">
                          {acc.type === "microsoft" ? "Microsoft" : acc.type === "omega" ? (t as any).omegaAccountTitle : (t as any).offlineAccountTitle}
                          {(acc.type === "microsoft" || acc.type === "omega") && (
                            <span className="account-item-connected-badge">{(t as any).connectedLabel}</span>
                          )}
                          {acc.name === account.name && acc.type === account.type && (
                            <span className="account-item-active-badge">{(t as any).activeLabel}</span>
                          )}
                        </div>
                      </div>
                      {savedAccounts.length > 1 && (
                        <button
                          className="account-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAccount(acc);
                          }}
                          title={(t as any).deleteAccountBtn}
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="account-modal-divider" />

              <div className="account-method-card" onClick={() => onChangeView("method")}>
                <div className="account-method-icon" style={{ background: "rgba(var(--accent-color-rgb), 0.15)", color: "var(--accent-color)" }}>
                  <IconPlus />
                </div>
                <div className="account-method-info">
                  <h4>{(t as any).addAccountTitle}</h4>
                  <p>{(t as any).addAccountSubtitle}</p>
                </div>
              </div>
            </>
          )}

          {accountModalView === "method" && (
            <>
              <button className="account-back-btn" onClick={onBack}>
                <IconArrowLeft /> {(t as any).backBtn}
              </button>

              <div className="account-method-card" onClick={onAddMicrosoft}>
                <div className="account-method-icon microsoft">
                  <IconMicrosoft />
                </div>
                <div className="account-method-info">
                  <h4>Microsoft</h4>
                  <p>{(t as any).microsoftAccountDesc}</p>
                </div>
              </div>

              <div className="account-method-card" onClick={() => onChangeView("omega")}>
                <div className="account-method-icon omega">
                  <IconUsers />
                </div>
                <div className="account-method-info">
                  <h4>{(t as any).omegaAccountTitle}</h4>
                  <p>{(t as any).omegaAccountDesc}</p>
                </div>
              </div>

              <div className="account-method-card" onClick={() => onChangeView("offline")}>
                <div className="account-method-icon offline">
                  <IconUser />
                </div>
                <div className="account-method-info">
                  <h4>{(t as any).offlineAccountTitle}</h4>
                  <p>{(t as any).offlineAccountDesc}</p>
                </div>
              </div>
            </>
          )}

          {accountModalView === "offline" && (
            <div className="account-offline-form">
              <button className="account-back-btn" onClick={() => onChangeView("method")}>
                <IconArrowLeft /> {(t as any).backBtn}
              </button>

              <div className="account-input-group">
                <input
                  type="text"
                  placeholder={t.nicknamePlaceholder}
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onAddOffline()}
                  className={newUsernameInput.length > 0 && !/^[a-zA-Z0-9_]{3,16}$/.test(newUsernameInput) ? "invalid" : ""}
                  autoFocus
                />
                <span className="account-input-hint">{(t as any).nicknameRules}</span>
              </div>

              <button className="account-add-btn" onClick={onAddOffline} disabled={!nicknameValid}>
                <IconPlus /> {(t as any).addBtn}
              </button>
            </div>
          )}

          {accountModalView === "omega" && (
            <div className="account-offline-form">
              <button className="account-back-btn" onClick={() => onChangeView("method")}>
                <IconArrowLeft /> {(t as any).backBtn}
              </button>

              <div className="omega-mode-toggle">
                <button
                  className={omegaMode === "login" ? "active" : ""}
                  onClick={() => setOmegaMode("login")}
                >
                  {(t as any).omegaLoginTab}
                </button>
                <button
                  className={omegaMode === "register" ? "active" : ""}
                  onClick={() => setOmegaMode("register")}
                >
                  {(t as any).omegaRegisterTab}
                </button>
              </div>

              <div className="account-input-group">
                <input
                  type="email"
                  placeholder={(t as any).omegaEmailPlaceholder}
                  value={omegaEmail}
                  onChange={(e) => setOmegaEmail(e.target.value)}
                  autoFocus
                />
              </div>

              {omegaMode === "register" && (
                <div className="account-input-group">
                  <input
                    type="text"
                    placeholder={(t as any).omegaUsernamePlaceholder}
                    value={omegaUsername}
                    onChange={(e) => setOmegaUsername(e.target.value)}
                    className={omegaUsername.length > 0 && !/^[a-zA-Z0-9_]{3,16}$/.test(omegaUsername) ? "invalid" : ""}
                  />
                  <span className="account-input-hint">{(t as any).nicknameRules}</span>
                </div>
              )}

              <div className="account-input-group omega-password-row">
                <input
                  type={showOmegaPassword ? "text" : "password"}
                  placeholder={(t as any).omegaPasswordPlaceholder}
                  value={omegaPassword}
                  onChange={(e) => setOmegaPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && omegaSubmitEnabled && onAddOmega()}
                />
                <button
                  type="button"
                  className="omega-password-toggle"
                  onClick={() => setShowOmegaPassword((p) => !p)}
                  title={showOmegaPassword ? (t as any).omegaHidePassword : (t as any).omegaShowPassword}
                >
                  {showOmegaPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              {omegaError && <div className="omega-error">{omegaError}</div>}

              <button className="account-add-btn" onClick={onAddOmega} disabled={!omegaSubmitEnabled}>
                <IconPlus />{" "}
                {omegaBusy
                  ? (t as any).loading
                  : omegaMode === "register"
                    ? (t as any).omegaSubmitRegister
                    : (t as any).omegaSubmitLogin}
              </button>
            </div>
          )}
        </div>
      </DraggableWindow>
    </div>
  );
});
