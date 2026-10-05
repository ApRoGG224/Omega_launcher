import React, { useRef } from "react";
import { IconX, IconShirt, IconTrash } from "../../ui/icons";
import type { SkinApi } from "../../hooks/useSkin";

interface SkinModalProps {
  t: any;
  skinApi: SkinApi;
  onClose: () => void;
}

export const SkinModal: React.FC<SkinModalProps> = ({ t, skinApi, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void skinApi.uploadSkin(file);
    }
  };

  return (
    <div className="skin-modal-overlay" onClick={onClose}>
      <div className="skin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="skin-modal-header">
          <div className="skin-modal-title-group">
            <div className="skin-modal-icon-badge">
              <IconShirt />
            </div>
            <div>
              <h3>{t.mySkin || "Мой скин"}</h3>
              <p className="skin-modal-subtitle">{t.changeSkin || "Сменить скин"}</p>
            </div>
          </div>
          <button className="skin-modal-close-btn" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="skin-modal-body">
          <div className="skin-modal-section">
            <label className="skin-modal-label">{t.skinSource || "Источник скина"}</label>
            <div className="skin-modal-pills">
              <button
                type="button"
                className={`skin-pill ${skinApi.skinSource === "ely" ? "active" : ""}`}
                onClick={() => skinApi.setSkinSource("ely")}
              >
                {t.skinSourceEly || "Ely.by"}
              </button>
              <button
                type="button"
                className={`skin-pill ${skinApi.skinSource === "microsoft" ? "active" : ""}`}
                onClick={() => skinApi.setSkinSource("microsoft")}
              >
                {t.skinSourceMicrosoft || "Microsoft"}
              </button>
              <button
                type="button"
                className={`skin-pill ${skinApi.skinSource === "custom" ? "active" : ""}`}
                onClick={() => skinApi.setSkinSource("custom")}
              >
                {t.skinSourceCustom || "Свой файл"}
              </button>
            </div>
          </div>

          <div className="skin-modal-section">
            <label className="skin-modal-label">{t.skinModel || "Модель скина"}</label>
            <div className="skin-modal-pills">
              <button
                type="button"
                className={`skin-pill ${skinApi.skinModel === "auto" ? "active" : ""}`}
                onClick={() => skinApi.setSkinModel("auto")}
              >
                {t.skinModelAuto || "Авто"}
              </button>
              <button
                type="button"
                className={`skin-pill ${skinApi.skinModel === "classic" ? "active" : ""}`}
                onClick={() => skinApi.setSkinModel("classic")}
              >
                {t.skinModelClassic || "Classic (Steve)"}
              </button>
              <button
                type="button"
                className={`skin-pill ${skinApi.skinModel === "slim" ? "active" : ""}`}
                onClick={() => skinApi.setSkinModel("slim")}
              >
                {t.skinModelSlim || "Slim (Alex)"}
              </button>
            </div>
          </div>

          <div className="skin-modal-section skin-modal-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="skin-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconShirt />
              <span>{t.skinUploadPng || "Загрузить скин (.png)"}</span>
            </button>

            {skinApi.customSkinUrl && (
              <button
                type="button"
                className="skin-reset-btn"
                onClick={skinApi.resetSkin}
                title={t.skinReset || "Сбросить скин"}
              >
                <IconTrash />
                <span>{t.skinReset || "Сбросить"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
