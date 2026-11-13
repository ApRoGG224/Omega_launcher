import React, { useState } from "react";
import { IconGear } from "../icons/PixelIcons";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
}) => {
  const [ram, setRam] = useState<number>(4);
  const [javaPath, setJavaPath] = useState<string>("/usr/lib/jvm/java-21-openjdk");

  const ramPresets = [2, 4, 6, 8, 12, 16];

  return (
    <div className="modal-window" role="dialog" aria-modal="true">
      <div className="modal-header">
        <div className="modal-header-left">
          <div className="modal-icon-badge">
            <IconGear size={20} />
          </div>
          <div>
            <h2 className="modal-title">Настройки лаунчера</h2>
            <p className="modal-subtitle">Параметры Java, оперативная память и поведение</p>
          </div>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Закрыть">
          ✕
        </button>
      </div>

      <div className="modal-body">
        {/* Section 1: Java & RAM */}
        <div className="settings-section">
          <span className="settings-section-title">Выделение памяти (RAM)</span>
          <div className="settings-ram-slider-box">
            <div className="ram-value-display">
              <span className="ram-value-num">{ram}</span>
              <span className="ram-value-unit">ГБ</span>
            </div>
            <input
              type="range"
              min={2}
              max={16}
              step={1}
              value={ram}
              onChange={(e) => setRam(Number(e.target.value))}
              className="ram-range-input"
            />
            <div className="ram-chips-row">
              {ramPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`ram-chip-btn ${ram === val ? "active" : ""}`}
                  onClick={() => setRam(val)}
                >
                  {val}G
                </button>
              ))}
            </div>
            <span className="ram-hint-text">
              Рекомендуется 4–8 ГБ для комфортной игры с модами и шейдерами.
            </span>
          </div>
        </div>

        {/* Section 2: Java Path */}
        <div className="settings-section">
          <span className="settings-section-title">Путь к Java Runtime</span>
          <div className="settings-input-row">
            <input
              type="text"
              value={javaPath}
              onChange={(e) => setJavaPath(e.target.value)}
              className="settings-text-input"
            />
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => alert("Автодетект: обнаружена Java 21 OpenJDK (/usr/lib/jvm/java-21-openjdk)")}
            >
              Автопоиск
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
