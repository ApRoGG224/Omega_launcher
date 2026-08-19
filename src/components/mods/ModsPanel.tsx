import React, { useCallback, useEffect, useState } from "react";
import type { ModpackInstance, ProjectType } from "../../types";
import { useModrinthSearch } from "../../hooks/useModrinth";
import { ipc } from "../../services/ipc";
import { useToast } from "../../ui/ToastProvider";
import { Dropdown } from "../../ui/Dropdown";
import { IconSearch } from "../../ui/icons";
import { ModCard } from "./ModCard";
import { InstallTargetModal } from "./InstallTargetModal";
import { WorldSelectModal, type WorldSelectState } from "./WorldSelectModal";
import { ShaderInstallModal, type ShaderInstallState } from "./ShaderInstallModal";

const LOADER_OPTIONS = ["", "fabric", "forge", "quilt", "neoforge"];

export const ModsPanel = React.memo(({
  instances,
  t,
  language,
  projectType = "mod",
  onCreateModpack,
  versionsList = [],
}: {
  instances: ModpackInstance[];
  t: any;
  language: string;
  projectType?: ProjectType;
  onCreateModpack?: (name: string, mcVer: string, loader: string, iconUrl?: string, projectId?: string) => void;
  versionsList?: string[];
}) => {
  const search = useModrinthSearch(projectType, language, t);
  const { showToast } = useToast();

  const [installModalOpen, setInstallModalOpen] = useState<string | null>(null);
  const [worldSelectState, setWorldSelectState] = useState<WorldSelectState | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<string>("");
  const [shaderInstallState, setShaderInstallState] = useState<ShaderInstallState | null>(null);

  // Escape closes any open install flow modal.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setInstallModalOpen(null);
      setWorldSelectState(null);
      setShaderInstallState(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const showNotification = useCallback((message: string, type: "success" | "error" = "success") => {
    showToast(message, type);
  }, [showToast]);

  const handleInstallClick = (projectId: string) => {
    if (projectType === "modpack") {
      const mod = search.mods.find((m) => m.project_id === projectId);
      if (mod && onCreateModpack) {
        const loader = mod.categories?.includes("forge")
          ? "forge"
          : mod.categories?.includes("neoforge")
            ? "neoforge"
            : mod.categories?.includes("quilt")
              ? "quilt"
              : "fabric";
        onCreateModpack(mod.title, search.mcVersion, loader, mod.icon_url, mod.project_id);
      }
      return;
    }
    setInstallModalOpen(projectId);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 50;
    if (bottom && !search.loading && search.mods.length >= 24) {
      void search.searchMods(true);
    }
  };

  const confirmInstall = async (instanceId: string) => {
    const inst = instances.find((i) => i.id === instanceId);
    const modIdToDownload = installModalOpen;
    if (!inst || !modIdToDownload) return;
    const isShader = projectType === "shader";

    if (projectType === "datapack") {
      try {
        const worlds = await ipc.listWorlds(instanceId);
        setInstallModalOpen(null);
        setWorldSelectState({ modId: modIdToDownload, instanceId, worlds: worlds || [], loading: false, error: null });
        setSelectedWorld(worlds?.[0] || "");
      } catch (e: any) {
        setInstallModalOpen(null);
        setWorldSelectState({ modId: modIdToDownload, instanceId, worlds: [], loading: false, error: t.errorLoadWorlds });
      }
      return;
    }

    if (isShader) {
      setInstallModalOpen(null);
      setShaderInstallState({ modId: modIdToDownload, instanceId, loader: "" });
      return;
    }

    setInstallModalOpen(null);
    try {
      await ipc.downloadMod({
        modId: modIdToDownload,
        mcVersion: inst.mcVersion,
        loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
        instanceId,
        projectType,
        worldName: null,
      });
      showNotification(projectType === "mod" ? t.modInstallSuccess : t.modInstallSuccessRes, "success");
    } catch (e: any) {
      if (typeof e === "string" && e.includes("ALREADY_EXISTS")) {
        showNotification(projectType === "mod" ? t.modAlreadyInstalled : t.modAlreadyInstalledRes, "error");
      } else {
        showNotification((projectType === "mod" ? t.modInstallError : t.modInstallErrorRes) + e, "error");
      }
    }
  };

  const confirmWorldInstall = async () => {
    if (!worldSelectState) return;
    const inst = instances.find((i) => i.id === worldSelectState.instanceId);
    if (!inst || !selectedWorld) return;
    const modIdToDownload = worldSelectState.modId;
    setWorldSelectState(null);
    try {
      await ipc.downloadMod({
        modId: modIdToDownload,
        mcVersion: inst.mcVersion,
        loader: inst.loader === "Vanilla" ? "fabric" : inst.loader,
        instanceId: inst.id,
        projectType: "datapack",
        worldName: selectedWorld,
      });
      showNotification(t.datapackInstallSuccess, "success");
    } catch (e: any) {
      if (typeof e === "string" && e.includes("ALREADY_EXISTS")) {
        showNotification(t.datapackAlreadyInstalled, "error");
      } else {
        showNotification(t.datapackInstallError + e, "error");
      }
    }
  };

  const confirmShaderInstall = async (loader: "fabric" | "forge") => {
    if (!shaderInstallState) return;
    const inst = instances.find((i) => i.id === shaderInstallState.instanceId);
    if (!inst) return;
    setShaderInstallState(null);
    try {
      await ipc.downloadMod({
        modId: shaderInstallState.modId,
        mcVersion: inst.mcVersion,
        loader,
        instanceId: inst.id,
        projectType: "shader",
        worldName: null,
      });
      showNotification(loader === "fabric" ? t.shaderInstallSuccessFabric : t.shaderInstallSuccessForge, "success");
    } catch (e: any) {
      if (typeof e === "string" && e.includes("ALREADY_EXISTS")) {
        showNotification(t.shaderAlreadyInstalled, "error");
      } else {
        showNotification(t.shaderInstallError + e, "error");
      }
    }
  };

  const searchPlaceholder = `${
    projectType === "mod"
      ? t.searchModPlaceholder
      : projectType === "modpack"
        ? t.searchPackPlaceholder
        : projectType === "shader"
          ? t.searchShaderPlaceholder
          : projectType === "datapack"
            ? t.searchDatapackPlaceholder
            : t.searchRespackPlaceholder
  } ${search.mcVersion === "" ? t.anyVersion : search.mcVersion}...`;

  const sortLabel = (value: string) => {
    switch (value) {
      case "downloads":
        return t.sortDownloads;
      case "follows":
        return projectType === "modpack" ? t.bestPacks : projectType === "shader" ? t.bestShaders : t.sortFollows;
      case "optimization":
        return t.sortOptimization;
      case "newest":
        return t.sortNewest;
      default:
        return t.sortUpdated;
    }
  };

  return (
    <div
      className="settings-panel"
      style={{
        marginTop: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        padding: "10px 0 0 0",
        background: "transparent",
        border: "none",
        boxShadow: "none",
      }}
    >
      <div className="mods-search-bar" style={{ flexShrink: 0 }}>
        <Dropdown
          value={search.mcVersion}
          emptyLabel={t.anyVersion}
          options={[{ value: "", label: t.anyVersion }, ...versionsList.map((v) => ({ value: v, label: v }))]}
          onSelect={search.setMcVersion}
          searchable
          style={{ minWidth: "100px" }}
        />

        {projectType !== "resourcepack" && (
          <Dropdown
            value={search.modLoader}
            emptyLabel={t.anyLoader}
            options={LOADER_OPTIONS.map((l) => ({ value: l, label: l === "" ? t.anyLoader : l }))}
            onSelect={search.setModLoader}
            style={{ minWidth: "110px" }}
          />
        )}

        {projectType !== "resourcepack" && (
          <Dropdown
            value={sortLabel(search.sortBy)}
            options={[
              { value: "downloads", label: t.sortDownloads },
              ...(projectType !== "datapack"
                ? [{ value: "follows", label: sortLabel("follows") }]
                : []),
              ...(projectType !== "datapack" && projectType !== "shader"
                ? [{ value: "optimization", label: t.sortOptimization }]
                : []),
              { value: "newest", label: t.sortNewest },
              { value: "updated", label: t.sortUpdated },
            ]}
            onSelect={search.setSortBy}
            style={{ minWidth: "160px" }}
          />
        )}

        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search.searchMods(false)}
        />
        <button onClick={() => void search.searchMods(false)} disabled={search.loading}>
          {search.loading ? "..." : <IconSearch />}
        </button>
      </div>

      {search.fetchError && (
        <div style={{ color: "#e46d4c", textAlign: "center", padding: "20px" }}>{search.fetchError}</div>
      )}
      {!search.fetchError && (
        <div className="mods-grid" style={{ flex: 1, overflowY: "auto" }} onScroll={handleScroll}>
          {search.mods.map((mod, idx) => (
            <ModCard
              key={`${mod.project_id}-${idx}`}
              mod={mod}
              t={t}
              onInstall={handleInstallClick}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/x-omega-mod",
                  JSON.stringify({ projectId: mod.project_id, projectType: mod.project_type || "mod" }),
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
            />
          ))}
          {search.loading && (
            <div style={{ width: "100%", gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>
              <div className="spinner" />
            </div>
          )}
        </div>
      )}

      {installModalOpen && (
        <InstallTargetModal
          projectType={projectType}
          instances={instances}
          t={t}
          onPick={(id) => void confirmInstall(id)}
          onClose={() => setInstallModalOpen(null)}
        />
      )}

      {worldSelectState && (
        <WorldSelectModal
          t={t}
          state={worldSelectState}
          selectedWorld={selectedWorld}
          onSelectWorld={setSelectedWorld}
          onConfirm={() => void confirmWorldInstall()}
          onCancel={() => setWorldSelectState(null)}
        />
      )}

      {shaderInstallState && (
        <ShaderInstallModal
          t={t}
          onPickLoader={(loader) => void confirmShaderInstall(loader)}
          onCancel={() => setShaderInstallState(null)}
        />
      )}
    </div>
  );
});