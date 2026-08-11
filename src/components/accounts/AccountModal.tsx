import React from "react";
import type { Account } from "../../types";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconArrowLeft, IconMicrosoft, IconPlus, IconTrash, IconUser, IconX } from "../../ui/icons";
import type { AccountModalView } from "../../hooks/useAccounts";

export const AccountModal = React.memo(({
  t,
  accountModalView,
  account,
  savedAccounts,
  newUsernameInput,
  setNewUsernameInput,
  onBack,
  onSelectAccount,
  onDeleteAccount,
  onAddOffline,
  onAddMicrosoft,
  onChangeView,
  onClose,
}: {
  t: any;
  accountModalView: AccountModalView;
  account: Account;
  savedAccounts: Account[];
  newUsernameInput: string;
  setNewUsernameInput: (v: string) => void;
  onBack: () => void;
  onSelectAccount: (acc: Account) => void;
  onDeleteAccount: (accName: string) => void;
  onAddOffline: () => void;
  onAddMicrosoft: () => void;
  onChangeView: (v: AccountModalView) => void;
  onClose: () => void;
}) => {
  const nicknameValid = newUsernameInput.trim().length > 0 && /^[a-zA-Z0-9_]{3,16}$/.test(newUsernameInput.trim());

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
            </h3>
            <p>
              {accountModalView === "list" && t.accountsSubtitle}
              {accountModalView === "method" && (t as any).addAccountSubtitle}
              {accountModalView === "offline" && (t as any).addOfflineSubtitle}
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
                      key={acc.name}
                      className={`account-item ${acc.name === account.name ? "active" : ""}`}
                      onClick={() => onSelectAccount(acc)}
                    >
                      <div className={`account-item-avatar ${acc.type}`}>
                        {acc.type === "microsoft" ? <IconMicrosoft /> : acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="account-item-info">
                        <div className="account-item-name">{acc.name}</div>
                        <div className="account-item-type">
                          {acc.type === "microsoft" ? "Microsoft" : (t as any).offlineAccountTitle}
                          {acc.name === account.name && (
                            <span className="account-item-active-badge">{(t as any).activeLabel}</span>
                          )}
                        </div>
                      </div>
                      {savedAccounts.length > 1 && (
                        <button
                          className="account-item-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAccount(acc.name);
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
        </div>
      </DraggableWindow>
    </div>
  );
});