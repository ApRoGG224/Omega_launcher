import React from "react";

export interface InstanceContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  instanceId: string;
}

export const InstanceContextMenu = React.memo(({
  menu,
  onAction,
}: {
  menu: InstanceContextMenuState;
  onAction: (action: string, instanceId: string) => void;
}) => {
  const item = (label: string, emoji: string, action: string, danger = false, disabled = false) => (
    <button className={`instance-context-item ${danger ? "danger" : ""}`} disabled={disabled} onClick={() => onAction(action, menu.instanceId)}>
      <span>{emoji}</span><span>{label}</span>
    </button>
  );

  return (
    <div
      className="instance-context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item("Переименовать", "✏️", "rename")}
      {item("Выбрать значок", "🖼️", "icon")}
      <div className="instance-context-sep" />
      {item("Запустить", "▶", "play")}
      {item("Остановить", "■", "stop")}
      <div className="instance-context-sep" />
      {item("Изменить...", "🛠️", "edit")}
      {item("Изменить группу...", "📁", "group")}
      {item("Папка", "📂", "folder")}
      {item("Экспортировать...", "📤", "export")}
      {item("Экспорт .omega", "📦", "export_omega")}
      {item("Обновить моды", "🔄", "update_mods")}
      {item("Копировать...", "📋", "copy")}
      {item("Удалить", "🗑️", "delete", true)}
      {item("Создать ярлык", "🔗", "shortcut")}
    </div>
  );
});