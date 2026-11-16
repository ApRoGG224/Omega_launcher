import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { InstanceData } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/import-modal.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (instance: InstanceData) => void;
  folderId?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  folderId,
}) => {
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installState, setInstallState] = useState<"idle" | "installing" | "installed">("idle");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSelectedFile(null);
    setIsOver(false);
    setError(null);
    setInstallState("idle");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (installState === "installing") return;
    resetState();
    onClose();
  }, [installState, onClose, resetState]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && installState !== "installing") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, installState, handleClose]);

  const processFile = (file?: File) => {
    setError(null);
    if (!file) return;

    const extMatch = file.name.match(/\.(zip|mrpack)$/i);
    if (!extMatch) {
      setError(
        lang === "uk"
          ? "Підходять лише файли .zip та .mrpack"
          : lang === "ru"
          ? "Подходят только файлы .zip и .mrpack"
          : "Only .zip and .mrpack files are supported"
      );
      return;
    }

    setSelectedFile(file);
    setInstallState("idle");
    setProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleInstall = () => {
    if (!selectedFile || installState === "installing") return;

    setInstallState("installing");
    setProgress(0);

    let currentProgress = 0;
    timerRef.current = setInterval(() => {
      currentProgress += 8 + Math.random() * 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setProgress(100);
        setInstallState("installed");

        const nameWithoutExt = selectedFile.name.replace(/\.(zip|mrpack)$/i, "");
        const isMrpack = selectedFile.name.toLowerCase().endsWith(".mrpack");
        const newInst: InstanceData = {
          id: "inst_" + Date.now(),
          name: nameWithoutExt || (lang === "uk" ? "Імпортована версія" : lang === "ru" ? "Импортированная версия" : "Imported version"),
          mcVersion: "1.21.4",
          loader: isMrpack ? "Fabric" : "Forge",
          playTimeMinutes: 0,
          modCount: 15,
          isReady: true,
          folderId: folderId === "all" ? undefined : folderId,
        };

        onImport(newInst);

        setTimeout(() => {
          handleClose();
        }, 700);
      } else {
        setProgress(currentProgress);
      }
    }, 180);
  };

  const formatSize = (bytes: number): string => {
    const mb = lang === "en" ? " MB" : " МБ";
    const kb = lang === "en" ? " KB" : " КБ";
    if (bytes > 1048576) {
      return (bytes / 1048576).toFixed(1) + mb;
    }
    return Math.max(1, Math.round(bytes / 1024)) + kb;
  };

  if (!isOpen) return null;

  const ext = selectedFile ? (selectedFile.name.match(/\.(zip|mrpack)$/i)?.[1]?.toLowerCase() || "zip") : "zip";

  const isBusy = installState === "installing";

  return createPortal(
    <div
      className="import-modal-overlay"
      onClick={handleClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <main className="dlg import-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="hd">
          <h1>{lang === "uk" ? "Імпорт" : lang === "ru" ? "Импорт" : "Import"}</h1>
          <button
            type="button"
            className="b sq"
            id="x"
            aria-label={lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
            onClick={handleClose}
            disabled={isBusy}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {!selectedFile ? (
          <div
            className={`zone ${isOver ? "over" : ""}`}
            id="zone"
            tabIndex={0}
            role="button"
            aria-label={
              lang === "uk"
                ? "Вибрати архів або перетягнути сюди"
                : lang === "ru"
                ? "Выбрать архив или перетащить сюда"
                : "Choose archive or drag here"
            }
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleZoneKeyDown}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="ico">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e6e8ec"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </div>
            <h2>
              {lang === "uk" ? (
                <>
                  Перетягніть архів версії
                  <br />
                  або збірки сюди
                </>
              ) : lang === "ru" ? (
                <>
                  Перетащите архив версии
                  <br />
                  или сборки сюда
                </>
              ) : (
                <>
                  Drop version archive
                  <br />
                  or modpack here
                </>
              )}
            </h2>
            <p>
              {lang === "uk"
                ? "Імпорт автоматично розпакує конфігурацію та встановить моди"
                : lang === "ru"
                ? "Импорт автоматически распакует конфигурацию и установит моды"
                : "Import will automatically unpack configuration and install mods"}
            </p>
            <div className="ext">
              <span className="tag">.zip</span>
              <span className="tag">.mrpack</span>
            </div>
          </div>
        ) : (
          <div className="file" id="file">
            <div className="ico">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e6e8ec"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5" />
              </svg>
            </div>
            <div className="w">
              <b id="fn">{selectedFile.name}</b>
              <span id="fs">{formatSize(selectedFile.size)}</span>
              {installState !== "idle" && (
                <div className="bar" id="bar">
                  <i id="bi" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <span className="tag" id="ft">
              .{ext}
            </span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          id="pick"
          accept=".zip,.mrpack"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {error && (
          <div className="err" id="err" role="alert">
            {error}
          </div>
        )}

        <div className="ft">
          <button
            type="button"
            className="b"
            id="cancel"
            onClick={handleClose}
            disabled={isBusy}
          >
            {lang === "uk" ? "Закрити" : lang === "ru" ? "Закрыть" : "Close"}
          </button>
          <button
            type="button"
            className="b"
            id="choose"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {selectedFile
              ? lang === "uk"
                ? "Замінити"
                : lang === "ru"
                ? "Заменить"
                : "Replace"
              : lang === "uk"
              ? "Вибрати файл"
              : lang === "ru"
              ? "Выбрать файл"
              : "Choose file"}
          </button>
          {selectedFile && (
            <button
              type="button"
              className={`b go ${installState === "installed" ? "on" : ""}`}
              id="go"
              onClick={handleInstall}
              disabled={isBusy || installState === "installed"}
            >
              {installState === "installing"
                ? lang === "uk"
                  ? "Встановлення…"
                  : lang === "ru"
                  ? "Установка…"
                  : "Installing…"
                : installState === "installed"
                ? lang === "uk"
                  ? "Встановлено"
                  : lang === "ru"
                  ? "Установлено"
                  : "Installed"
                : lang === "uk"
                ? "Встановити"
                : lang === "ru"
                ? "Установить"
                : "Install"}
            </button>
          )}
        </div>
      </main>
    </div>,
    document.body
  );
};
