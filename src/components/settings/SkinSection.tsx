import React from "react";
import { IdleAnimation, SkinViewer } from "skinview3d";
import type { Account, Language } from "../../types";
import { ipc } from "../../services/ipc";
import { IconCamera, IconDownload } from "../../ui/icons";

const LOCAL_SKIN_STORAGE_PREFIX = "omega-launcher:skin:";

function getStorageKey(account: Account) {
  return `${LOCAL_SKIN_STORAGE_PREFIX}${account.type}:${account.name.toLowerCase()}`;
}

function readLocalSkin(account: Account) {
  try {
    return window.localStorage.getItem(getStorageKey(account));
  } catch {
    return null;
  }
}

function saveLocalSkin(account: Account, skin: string) {
  try {
    window.localStorage.setItem(getStorageKey(account), skin);
  } catch {
    // A private browsing profile or a full localStorage should not break the viewer.
  }
}

function removeLocalSkin(account: Account) {
  try {
    window.localStorage.removeItem(getStorageKey(account));
  } catch {
    // Ignore storage errors; the viewer can still use the Ely.by skin.
  }
}

export const SkinSection = React.memo(({ account, language }: { account: Account; language: Language }) => {
  const isRussian = language === "ru";
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const viewerRef = React.useRef<SkinViewer | null>(null);
  const [localSkin, setLocalSkin] = React.useState<string | null>(() => readLocalSkin(account));
  const [skinStatus, setSkinStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [skinError, setSkinError] = React.useState(false);

  const remoteSkin = React.useMemo(
    () => `https://skinsystem.ely.by/skins/${encodeURIComponent(account.name)}.png?version=2`,
    [account.name],
  );
  const currentSkin = localSkin || remoteSkin;
  const isMicrosoft = account.type === "microsoft";

  React.useEffect(() => {
    setLocalSkin(readLocalSkin(account));
    setSkinStatus("loading");
    setSkinError(false);
  }, [account.name, account.type]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    let viewer: SkinViewer;
    try {
      viewer = new SkinViewer({
        canvas,
        width: Math.max(stage.clientWidth, 240),
        height: Math.max(stage.clientHeight, 300),
        background: 0x080b16,
        enableControls: true,
      });
      viewer.controls.enablePan = false;
      viewer.controls.enableZoom = false;
      viewer.controls.enableRotate = true;
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = 0.55;
      viewer.animation = new IdleAnimation();
      viewerRef.current = viewer;

      const resize = () => {
        viewer.setSize(Math.max(stage.clientWidth, 240), Math.max(stage.clientHeight, 300));
      };
      resize();

      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
      observer?.observe(stage);

      return () => {
        observer?.disconnect();
        viewer.dispose();
        viewerRef.current = null;
      };
    } catch {
      setSkinStatus("error");
      setSkinError(true);
    }
  }, []);

  React.useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;
    setSkinStatus("loading");
    setSkinError(false);
    void viewer.loadSkin(currentSkin, { model: "auto-detect" }).then(
      () => {
        if (!cancelled) setSkinStatus("ready");
      },
      () => {
        if (!cancelled) {
          setSkinStatus("error");
          setSkinError(true);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [currentSkin]);

  const handleSkinFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "image/png") {
      setSkinStatus("error");
      setSkinError(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      saveLocalSkin(account, reader.result);
      setLocalSkin(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetSkin = () => {
    removeLocalSkin(account);
    setLocalSkin(null);
  };

  return (
    <div className="skin-section-content">
      <div className="skin-viewer-stage" ref={stageRef}>
        <canvas ref={canvasRef} aria-label={isRussian ? "Просмотр скина" : "Skin preview"} />
        <div className={`skin-viewer-state ${skinStatus}`} aria-live="polite">
          {skinStatus === "loading" && (isRussian ? "Загрузка скина…" : "Loading skin…")}
          {skinStatus === "ready" && (localSkin ? (isRussian ? "Локальный предпросмотр" : "Local preview") : "Ely.by")}
          {skinStatus === "error" && (isRussian ? "Скин не найден" : "Skin not found")}
        </div>
        <span className="skin-viewer-hint">{isRussian ? "Перетаскивай мышью, чтобы вращать" : "Drag to rotate"}</span>
      </div>

      <div className="skin-controls">
        <div className="skin-account-card">
          <span>{isRussian ? "Аккаунт" : "Account"}</span>
          <strong>{account.name}</strong>
          <small>{isMicrosoft ? "Microsoft · Ely.by proxy" : "Ely.by"}</small>
        </div>

        <p className="skin-description">
          {isMicrosoft
            ? (isRussian
              ? "Скин Microsoft загружается через Ely.by. Для офлайн-аккаунта используется скин по его нику."
              : "The Microsoft skin is loaded through Ely.by. Offline accounts use the skin assigned to their nickname.")
            : (isRussian
              ? "Для этого аккаунта используется система скинов Ely.by. Открой сайт, чтобы изменить скин."
              : "This account uses the Ely.by skin system. Open the site to change the skin.")}
        </p>

        <div className="skin-actions">
          <label className="skin-action-button skin-action-button-primary">
            <IconCamera />
            <span>{isRussian ? "Загрузить PNG" : "Upload PNG"}</span>
            <input type="file" accept="image/png" onChange={handleSkinFile} />
          </label>
          <button className="skin-action-button" type="button" onClick={() => void ipc.openPath("https://ely.by/")}>
            <IconDownload />
            <span>{isRussian ? "Открыть Ely.by" : "Open Ely.by"}</span>
          </button>
        </div>

        {localSkin && (
          <button className="skin-reset-button" type="button" onClick={resetSkin}>
            {isRussian ? "Вернуть скин Ely.by" : "Use Ely.by skin again"}
          </button>
        )}

        {skinError && (
          <p className="skin-error" role="status">
            {isRussian
              ? "Проверь PNG 64×64 или 128×128 и доступ к skinsystem.ely.by."
              : "Use a 64×64 or 128×128 PNG and check access to skinsystem.ely.by."}
          </p>
        )}
      </div>
    </div>
  );
});
