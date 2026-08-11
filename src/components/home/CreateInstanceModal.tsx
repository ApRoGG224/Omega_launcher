import React, { useEffect } from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { Dropdown } from "../../ui/Dropdown";
import { IconPlus, IconX } from "../../ui/icons";

const LOADERS_LIST = ["Vanilla", "Fabric", "Forge", "NeoForge", "Quilt"];

export const CreateInstanceModal = React.memo(({
  t,
  language,
  versionsList,
  newName,
  setNewName,
  newVer,
  setNewVer,
  newLoader,
  setNewLoader,
  onCreate,
  onClose,
}: {
  t: any;
  language: string;
  versionsList: string[];
  newName: string;
  setNewName: (v: string) => void;
  newVer: string;
  setNewVer: (v: string) => void;
  newLoader: string;
  setNewLoader: (v: string) => void;
  onCreate: () => void;
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
            <p>{language === "en" ? "Set the name, version, and loader before creating." : "Задайте имя, версию и загрузчик перед созданием"}</p>
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
              <span>{language === "en" ? "Prepare a profile in a few seconds" : "Подготовьте профиль за несколько секунд"}</span>
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
              <button className="create-action-btn create-action-btn-primary" style={{ flex: 1 }} onClick={onCreate}>
                <div className="account-method-icon" style={{ background: "rgba(var(--accent-color-rgb), 0.15)", color: "var(--accent-color)" }}>
                  <IconPlus />
                </div>
                <div className="account-method-info">
                  <h4>{t.createBtn}</h4>
                  <p>{language === "en" ? "Create a new instance" : "Создать новую сборку"}</p>
                </div>
              </button>
              <button className="create-action-btn create-action-btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                <div className="account-method-icon offline">
                  <IconX />
                </div>
                <div className="account-method-info">
                  <h4>{t.cancel}</h4>
                  <p>{language === "en" ? "Close the window" : "Закрыть окно"}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DraggableWindow>
    </div>
  );
});