import React, { useEffect, useState } from "react";
import type { ModpackInstance, Account } from "../../types";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import type { SkinApi } from "../../hooks/useSkin";
import { IconPixelPlay, IconX, IconClock } from "../../ui/icons";

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
    const [sunburstEnabled, setSunburstEnabled] = useState<boolean>(
      () => localStorage.getItem("omega:atmosphereSunburst") !== "false",
    );
    const [sparksEnabled, setSparksEnabled] = useState<boolean>(
      () => localStorage.getItem("omega:atmosphereSparks") !== "false",
    );
    const [glowEnabled, setGlowEnabled] = useState<boolean>(
      () => localStorage.getItem("omega:atmosphereGlow") !== "false",
    );

    useEffect(() => {
      const handleAtmosphereUpdate = () => {
        setSunburstEnabled(
          localStorage.getItem("omega:atmosphereSunburst") !== "false",
        );
        setSparksEnabled(
          localStorage.getItem("omega:atmosphereSparks") !== "false",
        );
        setGlowEnabled(
          localStorage.getItem("omega:atmosphereGlow") !== "false",
        );
      };

      window.addEventListener(
        "omega:atmosphere-change",
        handleAtmosphereUpdate,
      );
      window.addEventListener("storage", handleAtmosphereUpdate);

      return () => {
        window.removeEventListener(
          "omega:atmosphere-change",
          handleAtmosphereUpdate,
        );
        window.removeEventListener("storage", handleAtmosphereUpdate);
      };
    }, []);

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
          {glowEnabled && <div className="millida-radial-glow" />}
          {sunburstEnabled && <div className="millida-sunburst" />}
          {sparksEnabled && (
            <div className="millida-dust-sparks">
              <div className="spark spark-1" />
              <div className="spark spark-2" />
              <div className="spark spark-3" />
              <div className="spark spark-4" />
              <div className="spark spark-5" />
              <div className="spark spark-6" />
            </div>
          )}
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
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
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

          {/* Card 2: Play with Friends */}
          <button
            type="button"
            className="millida-left-card millida-card-friends"
            onClick={onOpenFriends}
            title={t.playWithFriends || "Играть с друзьями"}
          >
            <div className="millida-card-art-box millida-friends-art">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
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

        {/* Center 3D skin model & Animation prompt */}
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
                {/* Isometric Minecraft Grass Block */}
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  {/* Top Face - Grass */}
                  <polygon
                    points="16,3 29,10 16,17 3,10"
                    fill="#74b72e"
                    stroke="#5b8c22"
                    strokeWidth="0.8"
                  />
                  {/* Left Face - Dirt */}
                  <polygon
                    points="3,10 16,17 16,29 3,22"
                    fill="#866043"
                    stroke="#68472f"
                    strokeWidth="0.8"
                  />
                  {/* Left Face - Grass Overhang */}
                  <polygon
                    points="3,10 16,17 16,20 13,18 10,21 7,17 3,18"
                    fill="#5b8c22"
                  />
                  {/* Right Face - Dirt (Shadowed) */}
                  <polygon
                    points="16,17 29,10 29,22 16,29"
                    fill="#6d4c32"
                    stroke="#543720"
                    strokeWidth="0.8"
                  />
                  {/* Right Face - Grass Overhang */}
                  <polygon
                    points="16,17 29,10 29,18 25,17 22,21 19,18 16,20"
                    fill="#466e18"
                  />
                </svg>
              </div>
              <div className="millida-dock-text">
                <div className="millida-dock-caption-wrap">
                  <span className="millida-dock-caption">
                    {t.todayPlaying || "СЕГОДНЯ ИГРАЕМ"}
                  </span>
                </div>
                <span className="millida-dock-title">
                  {selectedInstance?.name || "Выживание"}
                </span>
                <div className="millida-dock-meta">
                  <span className="dock-loader-chip">{loaderText}</span>
                  <span className="dock-version-chip">{versionText}</span>
                  <span className="dock-playtime">
                    <IconClock size={12} /> {playTimeText}
                  </span>
                </div>
              </div>
            </button>

            {/* Right section: Vibrant Play button */}
            <button
              type="button"
              className={`millida-dock-play-btn ${isRunning ? "running" : ""}`}
              onClick={isRunning ? onStop : onPlay}
              title={isRunning ? t.stopBtn : t.playBtn}
            >
              <span className="millida-play-icon">
                {isRunning ? <IconX size={20} /> : <IconPixelPlay size={18} />}
              </span>
              <span className="millida-play-label">
                {isRunning ? t.stopBtn || "СТОП" : t.playBtn || "Играть"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  },
);
