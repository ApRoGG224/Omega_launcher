import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ModpackInstance, ToastType } from "../types";
import { loadInstances, persistInstances } from "../services/storage";
import { ipc } from "../services/ipc";
import type { ImportResult } from "../services/ipc";

export type ImportKind = "prism" | "curseforge" | "mrpack";

export interface InstancesApi {
  instances: ModpackInstance[];
  instancesLoaded: boolean;
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  visibleInstances: ModpackInstance[];
  modCount: number;
  contextMenu: { visible: boolean; x: number; y: number; instanceId: string } | null;
  desktopContextMenu: { visible: boolean; x: number; y: number } | null;
  renameModalOpen: string | null;
  renameInput: string;
  setRenameInput: (v: string) => void;
  setRenameModalOpen: (v: string | null) => void;
  editModalOpen: string | null;
  editNameInput: string;
  setEditNameInput: (v: string) => void;
  editVersionInput: string;
  setEditVersionInput: (v: string) => void;
  editLoaderInput: string;
  setEditLoaderInput: (v: string) => void;
  setEditModalOpen: (v: string | null) => void;
  groupModalOpen: string | null;
  groupInput: string;
  setGroupInput: (v: string) => void;
  setGroupModalOpen: (v: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  exportPath: string;
  setExportPath: (v: string) => void;
  importModalOpen: boolean;
  setImportModalOpen: (v: boolean) => void;
  importStep: "menu" | "prism" | "curseforge" | "mrpack";
  setImportStep: (v: "menu" | "prism" | "curseforge" | "mrpack") => void;
  setSelectedInstanceId: (id: string | null) => void;
  setContextMenu: (m: InstancesApi["contextMenu"]) => void;
  setDesktopContextMenu: (m: InstancesApi["desktopContextMenu"]) => void;
  addInstance: (inst: ModpackInstance) => void;
  deleteInstance: (instanceId: string) => void;
  updateInstance: (id: string, patch: Partial<ModpackInstance>) => void;
  openRenameModal: (instanceId: string) => void;
  openEditModal: (instanceId: string) => void;
  openGroupModal: (instanceId: string) => void;
  saveRename: () => void;
  saveEdit: () => void;
  saveGroup: () => void;
  handleIconChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importFromArchive: (kind: ImportKind, zipPath: string) => Promise<void>;
  createFromCatalog: (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => Promise<void>;
  installModByDrag: (instanceId: string, payload: { projectId: string; projectType: string }) => Promise<void>;
  installProgress: { step: string; current: number; total: number } | null;
}

export function useInstances(
  onLog: (line: string) => void,
  onToast: (message: string, type?: ToastType) => void,
): InstancesApi {
  const [instances, setInstances] = useState<ModpackInstance[]>(() => loadInstances());
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [modCount, setModCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<InstancesApi["contextMenu"]>(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState<InstancesApi["desktopContextMenu"]>(null);
  const [renameModalOpen, setRenameModalOpen] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [editModalOpen, setEditModalOpen] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editVersionInput, setEditVersionInput] = useState("");
  const [editLoaderInput, setEditLoaderInput] = useState("");
  const [groupModalOpen, setGroupModalOpen] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState("");
  const [installProgress, setInstallProgress] = useState<InstancesApi["installProgress"]>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exportPath, setExportPath] = useState(() => localStorage.getItem("exportPath") || "~/Downloads");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<"menu" | "prism" | "curseforge" | "mrpack">("menu");

  const selectedInstance = useMemo(
    () => instances.find((i) => i.id === selectedInstanceId) || instances[0] || null,
    [instances, selectedInstanceId],
  );

  const visibleInstances = useMemo(() => [...instances].reverse(), [instances]);

  useEffect(() => {
    persistInstances(instances);
    void ipc.dbSaveInstances(instances).catch(() => {});
  }, [instances]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ipc.dbLoadInstances();
        if (cancelled) return;
        if (rows.length > 0) {
          setInstances(
            rows.map((row) => ({
              id: row.id,
              name: row.name,
              mcVersion: row.mcVersion,
              loader: row.loader,
              x: row.x,
              y: row.y,
              icon: row.icon,
              group: row.groupName,
            })),
          );
        } else {
          const local = loadInstances();
          if (local.length > 0) {
            void ipc.dbSaveInstances(local).catch(() => {});
          }
        }
      } catch {
        // Tauri backend unavailable (browser dev) - localStorage cache is used.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    listen("install-progress", (event) => {
      if (cancelled) return;
      const raw = event.payload;
      if (raw && typeof raw === "object") {
        const p = raw as { step?: string; current?: number; total?: number };
        if (p.step === "done") setInstallProgress(null);
        else setInstallProgress({ step: p.step || "", current: p.current || 0, total: p.total || 0 });
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) setContextMenu(null);
      if (desktopContextMenu) setDesktopContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu, desktopContextMenu]);

  useEffect(() => {
    let cancelled = false;
    const loadModCount = async () => {
      if (!selectedInstanceId) {
        if (!cancelled) setModCount(0);
        return;
      }
      try {
        const count = await ipc.countInstalledMods(selectedInstanceId);
        if (!cancelled) setModCount(typeof count === "number" ? count : Number(count) || 0);
      } catch (error) {
        console.error("Failed to load mod count", error);
        if (!cancelled) setModCount(0);
      }
    };
    loadModCount();
    return () => {
      cancelled = true;
    };
  }, [selectedInstanceId, instances]);

  const addInstance = useCallback((inst: ModpackInstance) => {
    setInstances((prev) => [...prev, inst]);
  }, []);

  const deleteInstance = useCallback((instanceId: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== instanceId));
    setSelectedInstanceId((current) => {
      if (current !== instanceId) return current;
      return instances.filter((i) => i.id !== instanceId)[0]?.id || null;
    });
    void ipc.dbDeleteInstance(instanceId).catch(() => {});
    void ipc.killMinecraft(instanceId).catch(() => {});
  }, [instances]);

  const updateInstance = useCallback((id: string, patch: Partial<ModpackInstance>) => {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const openRenameModal = useCallback((instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    setRenameModalOpen(instanceId);
    setRenameInput(inst.name);
  }, [instances]);

  const openEditModal = useCallback((instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    setEditModalOpen(instanceId);
    setEditNameInput(inst.name);
    setEditVersionInput(inst.mcVersion);
    setEditLoaderInput(inst.loader);
  }, [instances]);

  const openGroupModal = useCallback((instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    setGroupModalOpen(instanceId);
    setGroupInput(inst.group || "");
  }, [instances]);

  const saveRename = useCallback(() => {
    if (!renameModalOpen) return;
    updateInstance(renameModalOpen, { name: renameInput });
    setRenameModalOpen(null);
  }, [renameModalOpen, renameInput, updateInstance]);

  const saveEdit = useCallback(() => {
    if (!editModalOpen) return;
    const inst = instances.find((i) => i.id === editModalOpen);
    if (!inst) return;
    updateInstance(editModalOpen, {
      name: editNameInput.trim() || inst.name,
      mcVersion: editVersionInput.trim() || inst.mcVersion,
      loader: editLoaderInput.trim() || inst.loader,
    });
    setEditModalOpen(null);
  }, [editModalOpen, editNameInput, editVersionInput, editLoaderInput, instances, updateInstance]);

  const saveGroup = useCallback(() => {
    if (!groupModalOpen) return;
    updateInstance(groupModalOpen, { group: groupInput.trim() });
    setGroupModalOpen(null);
  }, [groupModalOpen, groupInput, updateInstance]);

  const handleIconChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedInstanceId) {
      if (e.target) e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/png");
        void ipc
          .dbSaveIcon(selectedInstanceId, dataUrl)
          .then((path) => updateInstance(selectedInstanceId, { icon: path }))
          .catch(() => {
            // Fallback: keep the icon inline when the backend is unavailable.
            updateInstance(selectedInstanceId, { icon: dataUrl });
          });
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  }, [selectedInstanceId, updateInstance]);

  const importFromArchive = useCallback(async (kind: ImportKind, zipPath: string) => {
    setImportModalOpen(false);
    const tempId = Date.now().toString();
    const kindLabel = kind === "prism" ? "Prism" : kind === "curseforge" ? "CurseForge" : "Modrinth/Omega";
    onLog(`[IMPORT] Запуск импорта из архива...`);
    try {
      const result = await ipc.importModpack(kind, tempId, zipPath);
      const data: ImportResult = JSON.parse(result);
      const newInst: ModpackInstance = {
        id: tempId,
        name: data.name || "Imported Instance",
        mcVersion: data.mcVersion || "1.20.1",
        loader: data.loader || "Vanilla",
        icon: undefined,
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 2 - 80,
      };
      addInstance(newInst);
      setSelectedInstanceId(newInst.id);
      onToast("Импорт завершён!", "success");
      onLog(`[IMPORT] Сборка "${newInst.name}" (${newInst.mcVersion} ${newInst.loader}) импортирована (${kindLabel})`);
    } catch (e) {
      onToast("Ошибка импорта: " + e, "error");
      onLog(`[IMPORT ERROR]: ${e}`);
    }
  }, [addInstance, onLog, onToast, setImportModalOpen]);

  const createFromCatalog = useCallback(async (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => {
    const newInst: ModpackInstance = {
      id: Date.now().toString(),
      name,
      mcVersion: mcVer,
      loader,
      icon: iconUrl,
      x: 24 + Math.random() * 160,
      y: 24 + Math.random() * 160,
    };
    addInstance(newInst);
    setSelectedInstanceId(newInst.id);
    onLog(`[Modpack] Инициализация скачивания сборки "${name}"...`);
    if (!projectId) return;
    try {
      await ipc.installModpack({ modId: projectId, mcVersion: mcVer, loader, instanceId: newInst.id });
      onLog(`[Modpack] Сборка "${name}" успешно установлена и готова к запуску!`);
    } catch (e: any) {
      onLog(`[ERROR] Ошибка установки сборки: ${e}`);
    }
  }, [addInstance, onLog]);

  const installModByDrag = useCallback(async (instanceId: string, payload: { projectId: string; projectType: string }) => {
    const inst = instances.find((i) => i.id === instanceId);
    if (!inst) return;
    onLog(`[Drag&Drop] Установка "${payload.projectId}" в сборку "${inst.name}"...`);
    try {
      await ipc.downloadMod({
        modId: payload.projectId,
        mcVersion: inst.mcVersion,
        loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
        instanceId,
        projectType: (payload.projectType || "mod") as "mod" | "resourcepack",
        worldName: null,
      });
      onToast(payload.projectType === "mod" ? "Мод установлен в сборку!" : "Ресурспак установлен в сборку!", "success");
    } catch (e: any) {
      onToast("Ошибка установки: " + e, "error");
    }
  }, [instances, onLog, onToast]);

  return {
    instances,
    instancesLoaded: true,
    selectedInstanceId,
    selectedInstance,
    visibleInstances,
    modCount,
    contextMenu,
    desktopContextMenu,
    renameModalOpen,
    renameInput,
    setRenameInput,
    setRenameModalOpen,
    editModalOpen,
    editNameInput,
    setEditNameInput,
    editVersionInput,
    setEditVersionInput,
    editLoaderInput,
    setEditLoaderInput,
    setEditModalOpen,
    groupModalOpen,
    groupInput,
    setGroupInput,
    setGroupModalOpen,
    fileInputRef,
    exportPath,
    setExportPath,
    importModalOpen,
    setImportModalOpen,
    importStep,
    setImportStep,
    setSelectedInstanceId,
    setContextMenu,
    setDesktopContextMenu,
    addInstance,
    deleteInstance,
    updateInstance,
    openRenameModal,
    openEditModal,
    openGroupModal,
    saveRename,
    saveEdit,
    saveGroup,
    handleIconChange,
    importFromArchive,
    createFromCatalog,
    installModByDrag,
    installProgress,
  };
}