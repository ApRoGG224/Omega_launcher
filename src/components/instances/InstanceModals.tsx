import React from "react";
import DraggableWindow from "../../ui/DraggableWindow";

export const RenameModal = React.memo(({
  instanceId,
  value,
  onChange,
  onSave,
  onClose,
  t,
  title,
  placeholder,
}: {
  instanceId: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  t: any;
  title?: string;
  placeholder?: string;
}) => {
  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <DraggableWindow storageKey={`omega:rename-window:${instanceId}`} className="create-modal draggable-window" defaultPosition={{ x: 120, y: 120 }}>
        <h3>{title || t.renameInstTitle}</h3>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || t.renameInstPlaceholder} />
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button className="play-btn modal-action-btn" style={{ flex: 1 }} onClick={onSave}>{t.saveBtn}</button>
          <button className="play-btn modal-action-btn" style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={onClose}>{t.cancel}</button>
        </div>
      </DraggableWindow>
    </div>
  );
});

export const EditModal = React.memo(({
  instanceId,
  name,
  setName,
  version,
  setVersion,
  loader,
  setLoader,
  onSave,
  onClose,
}: {
  instanceId: string;
  name: string;
  setName: (v: string) => void;
  version: string;
  setVersion: (v: string) => void;
  loader: string;
  setLoader: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => {
  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <DraggableWindow storageKey={`omega:edit-window:${instanceId}`} className="create-modal draggable-window" defaultPosition={{ x: 140, y: 140 }}>
        <h3>Изменить сборку</h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
        <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Версия" />
        <input type="text" value={loader} onChange={(e) => setLoader(e.target.value)} placeholder="Загрузчик" />
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button className="play-btn modal-action-btn" style={{ flex: 1 }} onClick={onSave}>Сохранить</button>
          <button className="play-btn modal-action-btn" style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={onClose}>Отмена</button>
        </div>
      </DraggableWindow>
    </div>
  );
});

export const GroupModal = React.memo(({
  instanceId,
  value,
  onChange,
  onSave,
  onClose,
}: {
  instanceId: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => {
  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <DraggableWindow storageKey={`omega:group-window:${instanceId}`} className="create-modal draggable-window" defaultPosition={{ x: 160, y: 160 }}>
        <h3>Изменить группу</h3>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Название группы" />
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button className="play-btn modal-action-btn" style={{ flex: 1 }} onClick={onSave}>Сохранить</button>
          <button className="play-btn modal-action-btn" style={{ flex: 1, background: "rgba(255,255,255,0.1)", boxShadow: "none" }} onClick={onClose}>Отмена</button>
        </div>
      </DraggableWindow>
    </div>
  );
});