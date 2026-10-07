import React, { useEffect, useState } from "react";
import type { ModpackInstance, Account } from "../../types";
import { Skin3DViewer } from "../settings/Skin3DViewer";
import { AnimationWheelModal } from "./AnimationWheelModal";
import type { AnimationId } from "../../utils/skinAnimations";
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
    const [currentAnimation, setCurrentAnimation] = useState<
      AnimationId | string
    >("idle");
    const [wheelOpen, setWheelOpen] = useState(false);

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

    useEffect(() => {
      const isInputElement = (target: EventTarget | null): boolean => {
        if (!target || !(target instanceof HTMLElement)) return false;
        const tag = target.tagName.toLowerCase();
        return (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target.isContentEditable ||
          Boolean(
            target.closest("input, textarea, select, [contenteditable='true']"),
          )
        );
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (isInputElement(e.target)) return;
        if (e.code === "KeyB" && !e.repeat) {
          e.preventDefault();
          setWheelOpen(true);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
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
      <div
        className={`millida-home-container ${wheelOpen ? "wheel-active" : ""}`}
      >
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

          {/* Card 2: Play with Friends */}
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
              animation={currentAnimation}
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
                {/* Rich 3D Isometric Shaded Minecraft Block */}
                <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient
                      id="cubeTop"
                      x1="16"
                      y1="2"
                      x2="16"
                      y2="17"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#67e8f9" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient
                      id="cubeLeft"
                      x1="3"
                      y1="9.5"
                      x2="16"
                      y2="31"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#0891b2" />
                      <stop offset="100%" stopColor="#0e7490" />
                    </linearGradient>
                    <linearGradient
                      id="cubeRight"
                      x1="29"
                      y1="9.5"
                      x2="16"
                      y2="31"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#0e7490" />
                      <stop offset="100%" stopColor="#155e75" />
                    </linearGradient>
                  </defs>
                  {/* Top face */}
                  <polygon
                    points="16,2 29,9.5 16,17 3,9.5"
                    fill="url(#cubeTop)"
                    stroke="#a5f3fc"
                    strokeWidth="1"
                  />
                  <line
                    x1="9.5"
                    y1="5.75"
                    x2="22.5"
                    y2="13.25"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="22.5"
                    y1="5.75"
                    x2="9.5"
                    y2="13.25"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.8"
                  />
                  {/* Left face */}
                  <polygon
                    points="3,9.5 16,17 16,31 3,23.5"
                    fill="url(#cubeLeft)"
                    stroke="#22d3ee"
                    strokeWidth="1"
                  />
                  <line
                    x1="9.5"
                    y1="13.25"
                    x2="9.5"
                    y2="27.25"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.8"
                  />
                  {/* Right face */}
                  <polygon
                    points="16,17 29,9.5 29,23.5 16,31"
                    fill="url(#cubeRight)"
                    stroke="#06b6d4"
                    strokeWidth="1"
                  />
                  <line
                    x1="22.5"
                    y1="13.25"
                    x2="22.5"
                    y2="27.25"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="0.8"
                  />
                  {/* Center glowing crystal core */}
                  <circle cx="16" cy="17" r="2.2" fill="#ffffff" />
                  <circle
                    cx="16"
                    cy="17"
                    r="3.6"
                    stroke="#cffafe"
                    strokeWidth="0.8"
                    strokeOpacity="0.8"
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
                  {selectedInstance?.name || "Скайблок"}
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

            {/* Right section: Big vibrant Lime-Green Play button */}
            <button
              type="button"
              className={`millida-dock-play-btn ${isRunning ? "running" : ""}`}
              onClick={isRunning ? onStop : onPlay}
              title={isRunning ? t.stopBtn : t.playBtn}
            >
              <span className="millida-play-icon">
                {isRunning ? <IconX size={20} /> : <IconPlay size={20} />}
              </span>
              <span className="millida-play-label">
                {isRunning ? t.stopBtn || "СТОП" : t.playBtn || "ИГРАТЬ"}
              </span>
            </button>
          </div>
        </div>

        {/* Animation wheel modal */}
        <AnimationWheelModal
          isOpen={wheelOpen}
          currentAnimation={currentAnimation}
          onSelectAnimation={(id) => setCurrentAnimation(id)}
          onClose={() => setWheelOpen(false)}
          t={t}
        />
      </div>
    );
  },
);
