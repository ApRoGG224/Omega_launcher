import React from "react";
import DraggableWindow from "../../ui/DraggableWindow";
import { IconX } from "../../ui/icons";

export const EditModal = React.memo(({
  t,
  name,
  setName,
  version,
  setVersion,
  loader,
  setLoader,
  onSave,
  onClose,
}: {
  t: any;
  name: string;
  setName: (v: string) => void;
  version: string;
  setVersion: (v: string) => void;
  loader: string;
  setLoader: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <div className="account-modal-overlay" onClick={onClose}>
    <DraggableWindow storageKey="omega:edit-window" className="account-modal draggable-window" defaultPosition={{ x: 220, y: 130 }}>
      <div className="account-modal-header draggable-window-handle">
        <div className="account-modal-header-info">
          <h3>{t.editBuildTitle}</h3>
        </div>
        <button className="account-modal-close" onClick={onClose}><IconX /></button>
      </div>
      <div className="account-modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
        <div className="input-group">
          <label>{t.namePh}</label>
          <input type="text" className="settings-text-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="input-group">
          <label>{t.versionPh}</label>
          <input type="text" className="settings-text-input" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.26.2" />
        </div>
        <div className="input-group">
          <label>{t.loaderPh}</label>
          <input type="text" className="settings-text-input" value={loader} onChange={(e) => setLoader(e.target.value)} placeholder="Fabric / Forge / Vanilla" />
        </div>
        <button className="play-btn modal-action-btn" style={{ flex: 1 }} onClick={onSave}>{t.saveBtn}</button>
      </div>
    </DraggableWindow>
  </div>
));