import React from "react";
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

const skinCubeFaces = ["front", "back", "right", "left", "top", "bottom"] as const;

function SkinCube({ className }: { className: string }) {
  return (
    <div className={`skin-css-cube ${className}`}>
      {skinCubeFaces.map((face) => <span className={`skin-css-face skin-css-face-${face}`} key={face} />)}
    </div>
  );
}

export const SkinSection = React.memo(({ account, language }: { account: Account; language: Language }) => {
  const isRussian = language === "ru";
  const modelRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerId: number; x: number; y: number; rotationX: number; rotationY: number } | null>(null);
  const rotationRef = React.useRef({ x: -8, y: -28 });
  const zoomRef = React.useRef(1);
  const [localSkin, setLocalSkin] = React.useState<string | null>(() => readLocalSkin(account));
  const [microsoftSkin, setMicrosoftSkin] = React.useState<string | null>(null);
  const [microsoftSkinState, setMicrosoftSkinState] = React.useState<"loading" | "ready" | "error">("loading");
  const [skinStatus, setSkinStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [skinError, setSkinError] = React.useState(false);

  const remoteSkin = React.useMemo(
    () => `https://skinsystem.ely.by/skins/${encodeURIComponent(account.name)}.png?version=2`,
    [account.name],
  );
  const isMicrosoft = account.type === "microsoft";
  const currentSkin = localSkin || (isMicrosoft ? microsoftSkin : remoteSkin);

  React.useEffect(() => {
    setLocalSkin(readLocalSkin(account));
    setMicrosoftSkin(null);
    setMicrosoftSkinState(isMicrosoft ? "loading" : "ready");
    setSkinStatus("loading");
    setSkinError(false);

    if (!isMicrosoft) return;

    let cancelled = false;
    void ipc.getMicrosoftSkin(account.name).then(
      (skin) => {
        if (cancelled) return;
        setMicrosoftSkin(skin);
        setMicrosoftSkinState(skin ? "ready" : "error");
      },
      () => {
        if (!cancelled) setMicrosoftSkinState("error");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [account.name, account.type, isMicrosoft]);

  React.useEffect(() => {
    if (!currentSkin) {
      setSkinStatus(microsoftSkinState === "loading" ? "loading" : "error");
      setSkinError(microsoftSkinState === "error");
      return;
    }

    setSkinStatus("loading");
    setSkinError(false);
  }, [currentSkin, microsoftSkinState]);

  const updateModelTransform = () => {
    if (!modelRef.current) return;
    const { x, y } = rotationRef.current;
    modelRef.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg) scale(${8 * zoomRef.current})`;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotationX: rotationRef.current.x,
      rotationY: rotationRef.current.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    rotationRef.current.x = Math.max(-32, Math.min(28, drag.rotationX - (event.clientY - drag.y) * 0.45));
    rotationRef.current.y = drag.rotationY + (event.clientX - drag.x) * 0.55;
    updateModelTransform();
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomRef.current = Math.max(0.78, Math.min(1.25, zoomRef.current * Math.exp(-event.deltaY * 0.0015)));
    updateModelTransform();
  };

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
      <div
        className="skin-viewer-stage skin-css-stage"
        style={{ "--skin-texture": currentSkin ? `url("${currentSkin}")` : "none" } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
        aria-label={isRussian ? "Просмотр скина" : "Skin preview"}
      >
        {currentSkin && (
          <img
            className="skin-texture-preload"
            src={currentSkin}
            alt=""
            aria-hidden="true"
            onLoad={() => setSkinStatus("ready")}
            onError={() => {
              setSkinStatus("error");
              setSkinError(true);
            }}
          />
        )}
        <div className="skin-css-model" ref={modelRef}>
          <SkinCube className="skin-css-head" />
          <SkinCube className="skin-css-body" />
          <SkinCube className="skin-css-right-arm" />
          <SkinCube className="skin-css-left-arm" />
          <SkinCube className="skin-css-right-leg" />
          <SkinCube className="skin-css-left-leg" />
        </div>
        <div className={`skin-viewer-state ${skinStatus}`} aria-live="polite">
          {skinStatus === "loading" && (isRussian ? "Загрузка скина…" : "Loading skin…")}
          {skinStatus === "ready" &&
            (localSkin
              ? (isRussian ? "Локальный предпросмотр" : "Local preview")
              : isMicrosoft
                ? "Microsoft"
                : "Ely.by")}
          {skinStatus === "error" &&
            (isMicrosoft
              ? (isRussian ? "Официальный скин не загрузился" : "Official skin could not be loaded")
              : (isRussian ? "Скин Ely.by не найден" : "Ely.by skin not found"))}
        </div>
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
              ? "Скин Microsoft загружается из официального профиля Minecraft."
              : "The Microsoft skin is loaded from the official Minecraft profile.")
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
              ? (isMicrosoft
                ? "Не удалось получить официальный профиль Minecraft. Перелогинься в Microsoft и открой настройки снова."
                : "Проверь PNG 64×64 или 128×128 и доступ к skinsystem.ely.by.")
              : (isMicrosoft
                ? "The official Minecraft profile could not be loaded. Sign in to Microsoft again and reopen settings."
                : "Use a 64×64 or 128×128 PNG and check access to skinsystem.ely.by.")}
          </p>
        )}
      </div>
    </div>
  );
});
