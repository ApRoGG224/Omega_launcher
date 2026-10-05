import React, { useState } from "react";
import type { ModpackInstance, Account } from "../../types";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import { SkinModal } from "./SkinModal";
import { SkinHeadPreview } from "./SkinHeadPreview";
import type { SkinApi } from "../../hooks/useSkin";
import { IconPlay, IconX, IconClock } from "../../ui/icons";

interface HomeViewProps {
  t: any;
  account: Account;
  selectedInstance: ModpackInstance | null;
  isRunning: boolean;
  skinApi: SkinApi;
  onPlay: () => void;
  onStop: () => void;
  onSelectVersion: () => void;
  onOpenStore?: () => void;
  onOpenFriends?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = React.memo(
  ({
    t,
    selectedInstance,
    isRunning,
    skinApi,
    onPlay,
    onStop,
    onSelectVersion,
    onOpenStore,
    onOpenFriends,
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

    const loaderText = selectedInstance?.loader || "Forge";
    const versionText = selectedInstance?.mcVersion || "1.20.1";
    const playTimeText = formatPlayTime(selectedInstance?.playTimeMs);

    return (
      <div className="millida-home-container">
        {/* Radiant Emerald Minecraft background glow & sunburst rays */}
        <div className="millida-bg-atmosphere" aria-hidden="true">
          <div className="millida-radial-glow" />
          <div className="millida-sunburst" />
          <div className="millida-dust-sparks">
            <div className="spark spark-1" />
            <div className="spark spark-2" />
            <div className="spark spark-3" />
            <div className="spark spark-4" />
            <div className="spark spark-5" />
            <div className="spark spark-6" />
          </div>
        </div>

        {/* Left side gaming cards */}
        <div className="millida-left-cards">
          {/* Card 1: Store / Bonus */}
          <button
            type="button"
            className="millida-left-card millida-card-store"
            onClick={onOpenStore}
            title={t.launcherStoreTitle || "Магазин"}
          >
            <div className="millida-card-badge-exclamation" aria-hidden="true">
              <span>!</span>
            </div>
            <div className="millida-card-art-box millida-store-art">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18"
                  stroke="#facc15"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 10a4 4 0 01-8 0"
                  stroke="#facc15"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="millida-card-info">
              <span className="millida-card-title">
                {t.launcherStoreTitle || "Магазин"}
              </span>
              <span className="millida-card-sub millida-sub-gold">
                {t.bonusAwaits || "Бонус ждёт"}
              </span>
            </div>
          </button>

          {/* Card 2: My Skin / Upload */}
          <button
            type="button"
            className="millida-left-card millida-card-skin"
            onClick={() => setSkinModalOpen(true)}
            title={t.changeSkin || "Сменить скин"}
          >
            <div className="millida-card-badge-exclamation" aria-hidden="true">
              <span>!</span>
            </div>
            <div className="millida-card-art-box millida-skin-art">
              <SkinHeadPreview skinUrl={skinApi.activeSkinUrl} size={36} />
            </div>
            <div className="millida-card-info">
              <span className="millida-card-title">
                {t.mySkin || "Мой скин"}
              </span>
              <span className="millida-card-sub millida-sub-cyan">
                {t.uploadYourOwn || "Загрузи свой"}
              </span>
            </div>
          </button>

          {/* Card 3: Play with Friends */}
          <button
            type="button"
            className="millida-left-card millida-card-friends"
            onClick={onOpenFriends}
            title={t.playWithFriends || "Играть с друзьями"}
          >
            <div className="millida-card-art-box millida-friends-art">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                  stroke="#84cc16"
                  strokeWidth="1.8"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                  stroke="#84cc16"
                  strokeWidth="1.8"
                />
                <path
                  d="M23 21v-2a4 4 0 00-3-3.87"
                  stroke="#65a30d"
                  strokeWidth="1.8"
                />
                <path
                  d="M16 3.13a4 4 0 010 7.75"
                  stroke="#65a30d"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div className="millida-card-info">
              <span className="millida-card-title">
                {t.playWithFriends || "Играть с друзьями"}
              </span>
            </div>
          </button>
        </div>

        {/* Center 3D skin model */}
        <div className="millida-center-stage">
          <div className="millida-skin-wrapper">
            <Skin3DViewer
              width={380}
              height={520}
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

        {/* Right side Featured / Recommendation Card */}
        <div className="millida-right-featured">
          <div className="millida-featured-card">
            <div className="millida-featured-thumb">
              <div className="millida-featured-icon-badge">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="#a3e635"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="millida-featured-label-art">ARCANIA</span>
            </div>
            <div className="millida-featured-content">
              <span className="millida-featured-subtitle">
                {t.tryToday || "ПОПРОБУЙ СЕГОДНЯ"}
              </span>
              <span className="millida-featured-title">Arcania 1.4.3</span>
              <div className="millida-featured-meta">
                <span>fabric · 1.20.1 · ⬇ 4 920</span>
              </div>
              <button
                type="button"
                className="millida-featured-action-btn"
                onClick={onOpenStore}
              >
                <span>{t.tryBtn || "Попробовать"} &gt;</span>
              </button>
            </div>
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
                {/* Isometric 3D Cyan Block Icon */}
                <svg width="38" height="38" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 2L29 9.5V22.5L16 30L3 22.5V9.5L16 2Z"
                    fill="#00e5ff"
                    fillOpacity="0.3"
                    stroke="#00f0ff"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M16 2V16.5M16 16.5L29 9.5M16 16.5L3 9.5M16 16.5V30"
                    stroke="#38bdf8"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M9.5 6L22.5 13M9.5 26V13"
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle cx="16" cy="16.5" r="2.5" fill="#ffffff" />
                </svg>
              </div>
              <div className="millida-dock-text">
                <span className="millida-dock-caption">
                  {t.todayPlaying || "СЕГОДНЯ ИГРАЕМ"}
                </span>
                <span className="millida-dock-title">
                  {selectedInstance?.name || "Скайблок"}
                </span>
                <span className="millida-dock-meta">
                  {loaderText} · {versionText} · <IconClock size={12} />{" "}
                  {playTimeText}
                </span>
              </div>
            </button>

            {/* Right section: Big vibrant Lime-Green Play button */}
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
                {isRunning ? t.stopBtn || "Остановить" : t.playBtn || "Играть"}
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
  },
);
