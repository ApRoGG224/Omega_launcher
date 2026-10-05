import React, { useState } from "react";
import type { ModpackInstance, Account } from "../../types";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import { SkinModal } from "./SkinModal";
import type { SkinApi } from "../../hooks/useSkin";
import { IconPlay, IconX } from "../../ui/icons";

interface HomeViewProps {
  t: any;
  account: Account;
  selectedInstance: ModpackInstance | null;
  isRunning: boolean;
  skinApi: SkinApi;
  onPlay: () => void;
  onStop: () => void;
  onSelectVersion: () => void;
}

export const HomeView: React.FC<HomeViewProps> = React.memo(({
  t,
  selectedInstance,
  isRunning,
  skinApi,
  onPlay,
  onStop,
  onSelectVersion,
}) => {
  const [skinModalOpen, setSkinModalOpen] = useState(false);

  const formatPlayTime = (ms: number | undefined): string => {
    const totalMin = Math.floor((ms || 0) / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h} ${t.timeH || "ч"} ${m} ${t.timeMin || "м"}`;
    if (m > 0) return `${m} ${t.timeMin || "м"}`;
    return `0 ${t.timeMin || "м"}`;
  };

  const loaderText = selectedInstance?.loader || "Vanilla";
  const versionText = selectedInstance?.mcVersion || "1.21.4";
  const playTimeText = formatPlayTime(selectedInstance?.playTimeMs);
  const subInfo = `${loaderText} • ${versionText} • ${playTimeText}`;

  return (
    <div className="millida-home-container">
      {/* Radiant wine background glow & light rays */}
      <div className="millida-bg-atmosphere" aria-hidden="true">
        <div className="millida-radial-glow" />
        <div className="millida-sunburst" />
      </div>

      {/* Left side card: Мой скин / Загрузи свой */}
      <div className="millida-left-cards">
        <button
          type="button"
          className="millida-skin-card"
          onClick={() => setSkinModalOpen(true)}
          title={t.changeSkin || "Сменить скин"}
        >
          <div className="millida-card-badge">!</div>
          <div className="millida-card-avatar-box">
            {skinApi.activeSkinUrl ? (
              <img
                src={skinApi.activeSkinUrl}
                alt="Skin preview"
                className="millida-card-skin-img"
              />
            ) : (
              <div className="millida-card-avatar-placeholder" />
            )}
          </div>
          <div className="millida-card-info">
            <span className="millida-card-title">{t.mySkin || "Мой скин"}</span>
            <span className="millida-card-sub">{t.uploadYourOwn || "Загрузи свой"}</span>
          </div>
        </button>
      </div>

      {/* Center 3D skin model */}
      <div className="millida-center-stage">
        <div className="millida-skin-wrapper">
          <Skin3DViewer
            width={360}
            height={500}
            cameraDistance={65}
            skinUrl={skinApi.activeSkinUrl}
            capeUrl={skinApi.activeCapeUrl}
            model={
              skinApi.skinModel === "auto"
                ? "auto-detect"
                : skinApi.skinModel === "slim"
                  ? "slim"
                  : "default"
            }
            animation="idle"
            loading={skinApi.skinLoading}
          />
          <div className="millida-skin-shadow" aria-hidden="true" />
        </div>
      </div>

      {/* Bottom Launch Dock */}
      <div className="millida-dock-wrapper">
        <div className="millida-dock">
          {/* Left section: Version / instance selector */}
          <button
            type="button"
            className="millida-dock-version-btn"
            onClick={onSelectVersion}
            title={t.myBuildsDesc || "Выбор версии / сборки"}
          >
            <div className="millida-dock-cube-icon">
              <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 2L29 9.5V22.5L16 30L3 22.5V9.5L16 2Z"
                  fill="#00e5ff"
                  fillOpacity="0.25"
                  stroke="#00f0ff"
                  strokeWidth="1.8"
                />
                <path
                  d="M16 2V16.5M16 16.5L29 9.5M16 16.5L3 9.5M16 16.5V30"
                  stroke="#00f0ff"
                  strokeWidth="1.6"
                />
                <circle cx="16" cy="16.5" r="2.5" fill="#ffffff" />
              </svg>
            </div>
            <div className="millida-dock-text">
              <span className="millida-dock-caption">
                {t.todayPlaying || "СЕГОДНЯ ИГРАЕМ"}
              </span>
              <span className="millida-dock-title">
                {selectedInstance?.name || t.noInstanceSelected || "Omega Default"}
              </span>
              <span className="millida-dock-meta">{subInfo}</span>
            </div>
          </button>

          {/* Right section: Big vibrant Play button */}
          <button
            type="button"
            className={`millida-dock-play-btn ${isRunning ? "running" : ""}`}
            onClick={isRunning ? onStop : onPlay}
            title={isRunning ? t.stopBtn : t.playBtn}
          >
            <span className="millida-play-icon">
              {isRunning ? <IconX /> : <IconPlay size={20} />}
            </span>
            <span className="millida-play-label">
              {isRunning ? (t.stopBtn || "Остановить") : (t.playBtn || "Играть")}
            </span>
          </button>
        </div>
      </div>

      {/* Skin customizer modal */}
      {skinModalOpen && (
        <SkinModal
          t={t}
          skinApi={skinApi}
          onClose={() => setSkinModalOpen(false)}
        />
      )}
    </div>
  );
});
