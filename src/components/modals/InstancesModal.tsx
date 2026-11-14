import React, { useState } from "react";
import { createPortal } from "react-dom";
import { IsometricCube } from "../icons/IsometricCube";
import type { InstanceData } from "../../types";

interface InstancesModalProps {
  onClose: () => void;
  instances: InstanceData[];
  selectedInstanceId: string;
  onSelectInstance: (instance: InstanceData) => void;
  onCreateInstance: (instance: InstanceData) => void;
}

export const InstancesModal: React.FC<InstancesModalProps> = ({
  onClose,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onCreateInstance,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("1.21.4");
  const [newLoader, setNewLoader] = useState<InstanceData["loader"]>("Fabric");

  const currentInstance =
    instances.find((i) => i.id === selectedInstanceId) || instances[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created: InstanceData = {
      id: "inst_" + Date.now(),
      name: newName.trim(),
      mcVersion: newLoader === "Rust" ? "26.3" : newVersion,
      loader: newLoader,
      playTimeMinutes: 0,
      modCount: 0,
      isReady: true,
    };

    onCreateInstance(created);
    setIsCreating(false);
    setNewName("");
  };

  return (
    <div className="modal-window" role="dialog" aria-modal="true">
      <div className="modal-header">
        <div className="modal-header-left">
          <div className="modal-icon-badge">
            <IsometricCube size={22} variant="grass" />
          </div>
          <div>
            <h2 className="modal-title">Менеджер версий</h2>
            <p className="modal-subtitle">Выбор профиля, версии Minecraft и загрузчика модов</p>
          </div>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Закрыть">
          ✕
        </button>
      </div>

      <div className="modal-body">
        {/* Top Hero Card for Current Instance */}
        {currentInstance && (
          <div className="instance-hero-box">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "54px", height: "54px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IsometricCube
                  size={50}
                  variant={
                    currentInstance.loader === "Rust" || currentInstance.folderId === "folder_rust"
                      ? "rust"
                      : "grass"
                  }
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-pure)" }}>
                    {currentInstance.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      padding: "2px 6px",
                      borderRadius: "2px",
                      fontWeight: 700,
                    }}
                  >
                    ● Готова к игре
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`dock-chip loader ${currentInstance.loader === "Rust" ? "loader-rust" : ""}`}>
                    {currentInstance.loader}
                  </span>
                  <span className="dock-chip version">{currentInstance.mcVersion}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {currentInstance.modCount} модов
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {currentInstance.playTimeMinutes} мин
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="server-connect-btn pixel-plate-play"
                onClick={() => {
                  onSelectInstance(currentInstance);
                  onClose();
                }}
                style={{ minHeight: "34px", height: "34px", padding: "0 16px" }}
              >
                Выбрать активной
              </button>
            </div>
          </div>
        )}

        {/* Carousel of Instances */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
            Все версии ({instances.length})
          </h3>
          <button
            type="button"
            className="screen-back-btn pixel-plate-dark"
            onClick={() => setIsCreating(true)}
            style={{ minHeight: "34px", height: "34px", padding: "0 14px", color: "var(--accent-bright)" }}
          >
            + Создать версию
          </button>
        </div>

        <div className="instances-carousel">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className={`instance-card-item ${inst.id === selectedInstanceId ? "active" : ""}`}
              onClick={() => onSelectInstance(inst)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IsometricCube
                  size={28}
                  variant={
                    inst.loader === "Rust" || inst.folderId === "folder_rust"
                      ? "rust"
                      : "grass"
                  }
                />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                  {inst.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <span className={`dock-chip loader ${inst.loader === "Rust" ? "loader-rust" : ""}`}>
                  {inst.loader}
                </span>
                <span className="dock-chip version">{inst.mcVersion}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Create Instance Dialog (Посередине экрана) */}
        {isCreating &&
          createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.82)",
                backdropFilter: "blur(14px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px",
              }}
              onClick={() => setIsCreating(false)}
            >
            <div
              className="tactical-modal-card"
              style={{
                width: "100%",
                maxWidth: "480px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <IsometricCube
                    size={24}
                    variant={newLoader === "Rust" ? "rust" : "grass"}
                  />
                  <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-pure)", margin: 0, fontFamily: "var(--font-primary)" }}>
                    Новая версия
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  title="Закрыть"
                  className="btn-icon pixel-plate-dark"
                  style={{
                    width: "32px",
                    height: "32px",
                    minHeight: "32px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Название версии
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Название версии"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#080d17",
                      border: "1px solid var(--border-medium)",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: "var(--font-primary)",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Загрузчик
                    </label>
                    <select
                      value={newLoader}
                      onChange={(e) => {
                        const selected = e.target.value as InstanceData["loader"];
                        setNewLoader(selected);
                        if (selected === "Rust") {
                          setNewVersion("26.3");
                        } else if (newVersion === "26.3") {
                          setNewVersion("1.21.4");
                        }
                      }}
                      style={{
                        width: "100%",
                        background: "#080d17 url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b919c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 12px center",
                        border: "1px solid var(--border-medium)",
                        padding: "10px 32px 10px 12px",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        colorScheme: "dark",
                      }}
                    >
                      <option value="Fabric">Fabric</option>
                      <option value="Forge">Forge</option>
                      <option value="NeoForge">NeoForge</option>
                      <option value="Quilt">Quilt</option>
                      <option value="Vanilla">Vanilla</option>
                      <option value="Rust">Rust (Beta)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Версия игры
                    </label>
                    <select
                      value={newLoader === "Rust" ? "26.3" : newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      disabled={newLoader === "Rust"}
                      style={{
                        width: "100%",
                        background: "#080d17 url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b919c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 12px center",
                        border: "1px solid var(--border-medium)",
                        padding: "10px 32px 10px 12px",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        fontFamily: "var(--font-primary)",
                        opacity: newLoader === "Rust" ? 0.85 : 1,
                        cursor: newLoader === "Rust" ? "not-allowed" : "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        colorScheme: "dark",
                      }}
                    >
                      {newLoader === "Rust" ? (
                        <option value="26.3">26.3</option>
                      ) : (
                        <>
                          <option value="1.21.4">1.21.4 (Latest)</option>
                          <option value="1.20.1">1.20.1 (Stable)</option>
                          <option value="1.19.2">1.19.2</option>
                          <option value="1.16.5">1.16.5 (Classic Forge)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {newLoader === "Rust" && (
                  <div
                    style={{
                      background: "rgba(224, 108, 58, 0.12)",
                      border: "1px solid rgba(224, 108, 58, 0.35)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "11.5px",
                      color: "#fed7aa",
                    }}
                  >
                    Клиент на Rust зафиксирован на версии 26.3
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="screen-back-btn pixel-plate-dark"
                    style={{ minHeight: "36px", height: "36px", padding: "0 16px" }}
                    onClick={() => setIsCreating(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="server-connect-btn pixel-plate-play"
                    style={{ minHeight: "36px", height: "36px", padding: "0 18px" }}
                  >
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
