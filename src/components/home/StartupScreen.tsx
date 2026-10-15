import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface StartupScreenProps {
  t: any;
  isReady?: boolean;
  onComplete: () => void;
}

export const StartupScreen: React.FC<StartupScreenProps> = React.memo(
  ({ t, isReady = true, onComplete }) => {
    const [progress, setProgress] = useState(12);
    const [isExiting, setIsExiting] = useState(false);
    const completeCalledRef = useRef(false);

    const tips = useMemo(
      () => [
        t.startupTip1 || "Совет: В Магазине Omega можно выбрать официальные скины и плащи",
        t.startupTip2 || "Совет: Нажмите F11 для перехода в полноэкранный режим",
        t.startupTip3 || "Совет: Вы можете играть с друзьями прямо через лаунчер",
      ],
      [t],
    );

    const [currentTipIndex] = useState(() => Math.floor(Math.random() * 3));

    const finishLoading = useCallback(() => {
      if (completeCalledRef.current) return;
      completeCalledRef.current = true;
      setProgress(100);
      setIsExiting(true);

      const timer = setTimeout(() => {
        onComplete();
      }, 420);

      return () => clearTimeout(timer);
    }, [onComplete]);

    useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      const startTime = Date.now();

      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed < 350) {
          setProgress((prev) => Math.min(35, prev + 6));
        } else if (elapsed < 750) {
          setProgress((prev) => Math.min(65, prev + 5));
        } else if (elapsed < 1200) {
          setProgress((prev) => Math.min(88, prev + 4));
        } else if (isReady || elapsed >= 1600) {
          setProgress(100);
          if (interval) clearInterval(interval);
          finishLoading();
        }
      }, 70);

      const maxTimeout = setTimeout(() => {
        if (!completeCalledRef.current) {
          finishLoading();
        }
      }, 2600);

      return () => {
        if (interval) clearInterval(interval);
        clearTimeout(maxTimeout);
      };
    }, [isReady, finishLoading]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          finishLoading();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [finishLoading]);

    const statusText = useMemo(() => {
      if (progress < 30) return t.startupStepConfig || "Загрузка конфигурации лаунчера...";
      if (progress < 60) return t.startupStepProfile || "Инициализация профиля и скина...";
      if (progress < 85) return t.startupStepInstances || "Проверка игровых сборок и модов...";
      if (progress < 100) return t.startupStepCatalog || "Синхронизация каталога...";
      return t.startupStepReady || "Готово! Приятной игры!";
    }, [progress, t]);

    const totalSegments = 18;
    const filledSegments = Math.round((progress / 100) * totalSegments);

    return (
      <div
        className={`startup-screen-overlay ${isExiting ? "startup-screen-exit" : ""}`}
        onClick={finishLoading}
        role="dialog"
        aria-label="Launcher Startup"
      >
        {/* Background ambient lighting and pixel dust */}
        <div className="startup-bg-atmosphere" aria-hidden="true">
          <div className="startup-radial-glow" />
          <div className="startup-pixel-dust">
            <span className="dust-mote mote-1" />
            <span className="dust-mote mote-2" />
            <span className="dust-mote mote-3" />
            <span className="dust-mote mote-4" />
            <span className="dust-mote mote-5" />
            <span className="dust-mote mote-6" />
          </div>
        </div>

        {/* Central Pixel Card */}
        <div className="startup-card" onClick={(e) => e.stopPropagation()}>
          {/* 3D Pixel Block */}
          <div className="startup-cube-stage">
            <div className="startup-cube-bob">
              <svg
                width="72"
                height="72"
                viewBox="0 0 32 32"
                fill="none"
                className="startup-cube-svg"
              >
                {/* Top face - Emerald / Grass */}
                <polygon
                  points="16,3 29,10 16,17 3,10"
                  fill="#84cc16"
                  stroke="#5b8c22"
                  strokeWidth="0.8"
                />
                {/* Left face - Dirt */}
                <polygon
                  points="3,10 16,17 16,29 3,22"
                  fill="#866043"
                  stroke="#68472f"
                  strokeWidth="0.8"
                />
                {/* Left face - Grass overhang */}
                <polygon
                  points="3,10 16,17 16,20 13,18 10,21 7,17 3,18"
                  fill="#5b8c22"
                />
                {/* Right face - Dirt shadow */}
                <polygon
                  points="16,17 29,10 29,22 16,29"
                  fill="#6d4c32"
                  stroke="#543720"
                  strokeWidth="0.8"
                />
                {/* Right face - Grass overhang shadow */}
                <polygon
                  points="16,17 29,10 29,18 25,17 22,21 19,18 16,20"
                  fill="#466e18"
                />
              </svg>
            </div>
            <div className="startup-cube-shadow" />
          </div>

          {/* Title & Badge */}
          <div className="startup-brand">
            <div className="startup-brand-title">
              <span className="brand-omega">OMEGA</span>{" "}
              <span className="brand-launcher">LAUNCHER</span>
            </div>
            <div className="startup-badge-row">
              <span className="startup-pill-chip">MINECRAFT 1.21</span>
              <span className="startup-pill-chip startup-pill-version">v0.1.1 BETA</span>
            </div>
          </div>

          {/* Minecraft XP Segmented Progress Bar */}
          <div className="startup-progress-section">
            <div className="startup-status-header">
              <span className="startup-status-text">{statusText}</span>
              <span className="startup-percentage">{progress}%</span>
            </div>

            <div
              className="startup-xp-bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="startup-xp-segments">
                {Array.from({ length: totalSegments }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`xp-segment ${idx < filledSegments ? "filled" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Minecraft Pro-Tip Bar */}
          <div className="startup-tip-box">
            <div className="startup-tip-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  stroke="#84cc16"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="startup-tip-text">{tips[currentTipIndex]}</span>
          </div>

          {/* Interactive skip hint */}
          <button
            type="button"
            className="startup-skip-btn"
            onClick={finishLoading}
            title={t.startupSkip || "Нажмите Пробел или кликните, чтобы пропустить"}
          >
            <span>{t.startupSkip || "Нажмите Пробел или кликните, чтобы войти"}</span>
            <kbd className="startup-kbd">SPACE</kbd>
          </button>
        </div>
      </div>
    );
  },
);
