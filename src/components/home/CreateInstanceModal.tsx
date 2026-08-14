import React, { useEffect } from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { Dropdown } from "../../ui/Dropdown";
import { IconPlus, IconX } from "../../ui/icons";

const LOADERS_LIST = ["Vanilla", "Fabric", "Forge", "NeoForge", "Quilt"];

export const CreateInstanceModal = React.memo(({
  t,
  versionsList,
  newName,
  setNewName,
  newVer,
  setNewVer,
  newLoader,
  setNewLoader,
  onCreate,
  onImport,
  onClose,
}: {
  t: any;
  versionsList: string[];
  newName: string;
  setNewName: (v: string) => void;
  newVer: string;
  setNewVer: (v: string) => void;
  newLoader: string;
  setNewLoader: (v: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const visibleVersions = versionsList;
  const visibleLoaders = LOADERS_LIST;

  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <DraggableWindow
        storageKey="omega:create-instance-window"
        className="account-modal create-instance-modal draggable-window"
        defaultPosition={{ x: 80, y: 90 }}
      >
        <div className="account-modal-header draggable-window-handle">
          <div className="account-modal-header-info">
            <h3>{t.newInstTitle}</h3>
            <p>{t.setMetaSub}</p>
          </div>
          <button className="account-modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="account-modal-body">
          <div className="create-instance-hero">
            <div className="create-instance-hero-icon">
              <IconPlus />
            </div>
            <div className="create-instance-hero-text">
              <strong>{t.newInstTitle}</strong>
              <span>{t.heroSub}</span>
            </div>
          </div>

          <div className="account-offline-form">
            <div className="account-input-group">
              <input type="text" placeholder={t.newInstNamePlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <Dropdown
                value={newVer}
                options={visibleVersions.map((v) => ({ value: v, label: v }))}
                onSelect={setNewVer}
                searchable
                style={{ flex: 1 }}
                menuUpward
                buttonHeight={40}
              />
              <Dropdown
                value={newLoader}
                options={visibleLoaders.map((l) => ({ value: l, label: l }))}
                onSelect={setNewLoader}
                style={{ flex: 1 }}
                menuUpward
                buttonHeight={40}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button className="create-action-btn create-action-btn-primary create-action-btn-compact" style={{ flex: 1 }} onClick={onCreate}>
                <IconPlus />
                <h4>{t.createBtn}</h4>
              </button>
              <button className="create-action-btn create-action-btn-secondary create-action-btn-compact" style={{ flex: 1 }} onClick={onImport}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <polyline points="7 10 12 15 17 10" />
                  <rect x="3" y="17" width="18" height="4" rx="2" />
                </svg>
                <h4>{t.importBtn}</h4>
              </button>
            </div>
          </div>
        </div>
      </DraggableWindow>
    </div>
  );
});