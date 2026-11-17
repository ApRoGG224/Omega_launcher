import { invoke } from "@tauri-apps/api/core";
import type { ProjectType, ImportSummary } from "../types";

export interface DownloadModArgs {
  modId: string;
  mcVersion: string;
  loader: string;
  instanceId: string;
  projectType: ProjectType;
  worldName?: string | null;
}

export interface ImportResult {
  name?: string;
  mcVersion?: string;
  loader?: string;
}

export interface MinecraftInsideSkinItem {
  nickname: string;
  skinUrl: string;
  renderUrl: string;
}

export interface MicrosoftCapeItem {
  id: string;
  state: "ACTIVE" | "INACTIVE" | string;
  url: string;
  alias: string;
}

export interface MinecraftInsidePage {
  skins: MinecraftInsideSkinItem[];
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface SystemMemoryInfo {
  totalRamMb: number;
  availableRamMb: number;
  usedRamMb: number;
  launcherRssMb: number;
}

export interface BackendOptimizationResult {
  dbFreedBytes: number;
  tempFreedBytes: number;
  logsFreedBytes: number;
  totalFreedBytes: number;
  message: string;
}

export const ipc = {
  async loginMicrosoft(): Promise<string> {
    return invoke<string>("login_microsoft");
  },

  async logoutMicrosoft(): Promise<void> {
    await invoke("logout_microsoft");
  },

  async getMicrosoftSkin(username: string): Promise<string | null> {
    return invoke<string | null>("get_microsoft_skin", { username });
  },

  async openElyLogin(): Promise<void> {
    await invoke("open_ely_login");
  },

  async openUrl(url: string): Promise<void> {
    await invoke("open_url", { url });
  },

  async getCachedMicrosoftAccount(): Promise<{ name: string; uuid: string; type: "microsoft" } | null> {
    return invoke<{ name: string; uuid: string; type: "microsoft" } | null>("get_cached_microsoft_account");
  },

  async getMicrosoftCapes(): Promise<MicrosoftCapeItem[]> {
    return invoke<MicrosoftCapeItem[]>("get_microsoft_capes");
  },

  async equipMicrosoftCape(capeId: string): Promise<string> {
    return invoke<string>("equip_microsoft_cape", { capeId });
  },

  async unequipMicrosoftCape(): Promise<string> {
    return invoke<string>("unequip_microsoft_cape");
  },

  async uploadMicrosoftSkin(skinData: string, variant: string): Promise<string> {
    return invoke<string>("upload_microsoft_skin", { skinData, variant });
  },

  async fetchMinecraftInsideSkins(
    page: number,
    query?: string,
  ): Promise<MinecraftInsidePage> {
    return invoke<MinecraftInsidePage>("fetch_minecraft_inside_skins", {
      page,
      query: query ?? null,
    });
  },

  async fetchSkinAsDataUrl(url: string): Promise<string> {
    return invoke<string>("fetch_skin_as_data_url", { url });
  },

  async launchMinecraft(args: {
    version: string;
    server: string;
    username: string;
    ram: number;
    instanceId: string;
    customJvmArgs?: string;
    enableGamemode?: boolean;
    fullscreen?: boolean;
    resolution?: string;
  }): Promise<void> {
    await invoke("launch_minecraft", {
      version: args.version,
      server: args.server,
      username: args.username,
      ram: args.ram,
      instanceId: args.instanceId,
      customJvmArgs: args.customJvmArgs ?? null,
      enableGamemode: args.enableGamemode ?? null,
      fullscreen: args.fullscreen ?? null,
      resolution: args.resolution ?? null,
    });
  },

  async clearLauncherCache(): Promise<number> {
    return invoke<number>("clear_launcher_cache");
  },

  async clearLauncherLogs(): Promise<number> {
    return invoke<number>("clear_launcher_logs");
  },

  async getLauncherCacheSize(): Promise<number> {
    return invoke<number>("get_launcher_cache_size");
  },

  async clearGameLogs(gameDir?: string): Promise<number> {
    return invoke<number>("clear_game_logs", { gameDir: gameDir ?? null });
  },

  async clearTempFiles(): Promise<number> {
    return invoke<number>("clear_temp_files");
  },

  async optimizeDatabase(): Promise<string> {
    return invoke<string>("db_optimize");
  },

  async getDatabaseSize(): Promise<number> {
    return invoke<number>("db_get_size");
  },

  async getSystemMemoryInfo(): Promise<SystemMemoryInfo> {
    return invoke<SystemMemoryInfo>("get_system_memory_info");
  },

  async optimizeLauncherBackend(): Promise<BackendOptimizationResult> {
    return invoke<BackendOptimizationResult>("optimize_launcher_backend");
  },

  async killMinecraft(instanceId: string): Promise<string> {
    return invoke<string>("kill_minecraft", { instanceId });
  },

  async appExit(): Promise<void> {
    await invoke("app_exit");
  },

  async getLocalIp(): Promise<string | null> {
    return invoke<string | null>("get_local_ip");
  },

  async downloadMod(args: DownloadModArgs): Promise<string> {
    return invoke<string>("download_mod", {
      modId: args.modId,
      mcVersion: args.mcVersion,
      loader: args.loader,
      instanceId: args.instanceId,
      projectType: args.projectType,
      worldName: args.worldName ?? null,
    });
  },

  async installModpack(args: {
    modId: string;
    mcVersion: string;
    loader: string;
    instanceId: string;
  }): Promise<string> {
    return invoke<string>("install_modpack", args);
  },

  async exportModpack(args: {
    instanceId: string;
    instanceName: string;
    exportPath: string;
  }): Promise<string> {
    return invoke<string>("export_modpack", args);
  },

  async importModpack(
    kind: "prism" | "curseforge" | "mrpack",
    instanceId: string,
    zipPath: string,
  ): Promise<string> {
    return invoke<string>(`import_${kind}`, { instanceId, zipPath });
  },

  async inspectArchive(zipPath: string): Promise<ImportSummary> {
    const raw = await invoke<string>("inspect_archive", { zipPath });
    return JSON.parse(raw);
  },

  async inspectArchiveBytes(
    fileName: string,
    fileBytes: number[],
  ): Promise<ImportSummary> {
    const raw = await invoke<string>("inspect_archive_bytes", {
      fileName,
      fileBytes,
    });
    return JSON.parse(raw);
  },

  async importArchive(
    instanceId: string,
    zipPath: string,
  ): Promise<ImportSummary> {
    const raw = await invoke<string>("import_archive", { instanceId, zipPath });
    return JSON.parse(raw);
  },

  async importArchiveBytes(
    instanceId: string,
    fileName: string,
    fileBytes: number[],
  ): Promise<ImportSummary> {
    const raw = await invoke<string>("import_archive_bytes", {
      instanceId,
      fileName,
      fileBytes,
    });
    return JSON.parse(raw);
  },

  async findLocalArchive(fileName: string): Promise<string | null> {
    return invoke<string | null>("find_local_archive", { fileName });
  },

  async openFolder(instanceId: string): Promise<void> {
    await invoke("open_folder", { instanceId });
  },

  async openInstanceLogs(instanceId: string): Promise<void> {
    try {
      await invoke("open_instance_logs", { instanceId });
    } catch {
      await invoke("open_folder", { instanceId });
    }
  },

  async openPath(path: string): Promise<void> {
    await invoke("open_path", { path });
  },

  async createShortcut(instanceId: string): Promise<string> {
    return invoke<string>("create_shortcut", { instanceId });
  },

  async countInstalledMods(instanceId: string): Promise<number> {
    return invoke<number>("count_installed_mods", { instanceId });
  },

  async listInstalledModFiles(instanceId: string): Promise<string[]> {
    return invoke<string[]>("list_installed_mod_files", { instanceId });
  },

  async listInstalledInstanceItems(instanceId: string): Promise<InstalledInstanceContent> {
    return invoke<InstalledInstanceContent>("list_installed_instance_items", { instanceId });
  },

  async listInstanceMods(instanceId: string): Promise<InstanceModItem[]> {
    return invoke<InstanceModItem[]>("list_instance_mods", { instanceId });
  },

  async toggleInstanceMod(instanceId: string, filename: string, enable: boolean): Promise<string> {
    return invoke<string>("toggle_instance_mod", { instanceId, filename, enable });
  },

  async deleteInstanceMod(instanceId: string, filename: string): Promise<void> {
    await invoke("delete_instance_mod", { instanceId, filename });
  },

  async addInstanceModFile(instanceId: string, sourcePath: string): Promise<string> {
    return invoke<string>("add_instance_mod_file", { instanceId, sourcePath });
  },

  async listInstanceResourcepacks(instanceId: string): Promise<InstancePackItem[]> {
    return invoke<InstancePackItem[]>("list_instance_resourcepacks", { instanceId });
  },

  async toggleInstanceResourcepack(instanceId: string, filename: string, enable: boolean): Promise<string> {
    return invoke<string>("toggle_instance_resourcepack", { instanceId, filename, enable });
  },

  async deleteInstanceResourcepack(instanceId: string, filename: string): Promise<void> {
    await invoke("delete_instance_resourcepack", { instanceId, filename });
  },

  async addInstanceResourcepackFile(instanceId: string, sourcePath: string): Promise<string> {
    return invoke<string>("add_instance_resourcepack_file", { instanceId, sourcePath });
  },

  async listInstanceShaderpacks(instanceId: string): Promise<InstancePackItem[]> {
    return invoke<InstancePackItem[]>("list_instance_shaderpacks", { instanceId });
  },

  async toggleInstanceShaderpack(instanceId: string, filename: string, enable: boolean): Promise<string> {
    return invoke<string>("toggle_instance_shaderpack", { instanceId, filename, enable });
  },

  async deleteInstanceShaderpack(instanceId: string, filename: string): Promise<void> {
    await invoke("delete_instance_shaderpack", { instanceId, filename });
  },

  async addInstanceShaderpackFile(instanceId: string, sourcePath: string): Promise<string> {
    return invoke<string>("add_instance_shaderpack_file", { instanceId, sourcePath });
  },

  async listInstanceWorldsDetail(instanceId: string): Promise<InstanceWorldItem[]> {
    return invoke<InstanceWorldItem[]>("list_instance_worlds_detail", { instanceId });
  },

  async deleteInstanceWorld(instanceId: string, folderName: string): Promise<void> {
    await invoke("delete_instance_world", { instanceId, folderName });
  },

  async listInstanceScreenshots(instanceId: string): Promise<InstanceScreenshotItem[]> {
    return invoke<InstanceScreenshotItem[]>("list_instance_screenshots", { instanceId });
  },

  async deleteInstanceScreenshot(instanceId: string, filename: string): Promise<void> {
    await invoke("delete_instance_screenshot", { instanceId, filename });
  },

  async getInstanceNotes(instanceId: string): Promise<string> {
    return invoke<string>("get_instance_notes", { instanceId });
  },

  async saveInstanceNotes(instanceId: string, notes: string): Promise<void> {
    await invoke("save_instance_notes", { instanceId, notes });
  },

  async listInstanceLogFiles(instanceId: string): Promise<string[]> {
    return invoke<string[]>("list_instance_log_files", { instanceId });
  },

  async getInstanceLogContent(instanceId: string, fileRelPath: string): Promise<string> {
    return invoke<string>("get_instance_log_content", { instanceId, fileRelPath });
  },

  async getInstanceConfig(instanceId: string): Promise<InstanceConfigData> {
    return invoke<InstanceConfigData>("get_instance_config", { instanceId });
  },

  async saveInstanceConfig(instanceId: string, config: InstanceConfigData): Promise<void> {
    await invoke("save_instance_config", { instanceId, config });
  },

  async openInstanceSubfolder(instanceId: string, subfolder: string): Promise<void> {
    await invoke("open_instance_subfolder", { instanceId, subfolder });
  },

  async listWorlds(instanceId: string): Promise<string[]> {
    return invoke<string[]>("list_worlds", { instanceId });
  },

  async translateText(text: string, targetLang: string): Promise<string> {
    return invoke<string>("translate_text", { text, targetLang });
  },

  async dbLoadInstances(): Promise<DbInstance[]> {
    return invoke<DbInstance[]>("db_load_instances");
  },

  async dbSaveInstances(instances: DbInstance[]): Promise<void> {
    await invoke("db_save_instances", { instances });
  },

  async dbDeleteInstance(id: string): Promise<void> {
    await invoke("db_delete_instance", { id });
  },

  async dbLoadAccounts(): Promise<DbAccount[]> {
    return invoke<DbAccount[]>("db_load_accounts");
  },

  async dbSaveAccounts(accounts: DbAccount[]): Promise<void> {
    await invoke("db_save_accounts", { accounts });
  },

  async dbListInstalledMods(instanceId: string): Promise<DbModRecord[]> {
    return invoke<DbModRecord[]>("db_list_installed_mods", { instanceId });
  },

  async dbSaveIcon(instanceId: string, dataUrl: string): Promise<string> {
    return invoke<string>("db_save_icon", { instanceId, dataUrl });
  },

  async cacheModIcon(url: string): Promise<string> {
    return invoke<string>("cache_mod_icon", { url });
  },

  async getCachedVersionManifest(): Promise<unknown> {
    return invoke<unknown>("get_cached_version_manifest");
  },

  async updateAllMods(instanceId: string): Promise<number> {
    return invoke<number>("update_all_mods", { instanceId });
  },

  async exportOmega(args: {
    instanceId: string;
    instanceName: string;
    mcVersion: string;
    loader: string;
    exportPath: string;
  }): Promise<string> {
    return invoke<string>("export_omega", args);
  },

  async pingServer(host: string, port?: number): Promise<ServerInfo> {
    return invoke<ServerInfo>("ping_server", { host, port: port ?? 25565 });
  },

  async dbLoadServers(): Promise<ServerRow[]> {
    return invoke<ServerRow[]>("db_load_servers");
  },

  async dbSaveServer(server: ServerRow): Promise<void> {
    await invoke("db_save_server", { server });
  },

  async dbDeleteServer(host: string, port: number): Promise<void> {
    await invoke("db_delete_server", { host, port });
  },

  async dbSaveServerFavicon(
    host: string,
    port: number,
    favicon: string,
  ): Promise<void> {
    await invoke("db_save_server_favicon", { host, port, favicon });
  },

  async findSystemJava(mcVersion = "1.20.1"): Promise<string | null> {
    return invoke<string | null>("find_system_java", { mcVersion });
  },

  async listInstanceServers(instanceId: string): Promise<InstanceServerEntry[]> {
    return invoke<InstanceServerEntry[]>("list_instance_servers", { instanceId });
  },

  async saveInstanceServers(instanceId: string, servers: InstanceServerEntry[]): Promise<void> {
    await invoke("save_instance_servers", { instanceId, servers });
  },

  async addInstanceServer(instanceId: string, name: string, ip: string): Promise<InstanceServerEntry> {
    return invoke<InstanceServerEntry>("add_instance_server", { instanceId, name, ip });
  },

  async deleteInstanceServer(instanceId: string, ip: string): Promise<void> {
    await invoke("delete_instance_server", { instanceId, ip });
  },
};

export interface InstanceServerEntry {
  name: string;
  ip: string;
  icon?: string | null;
  acceptTextures?: number | null;
}

export interface ServerInfo {
  host: string;
  port: number;
  name: string;
  motd: string;
  playersOnline: number;
  playersMax: number;
  online: boolean;
  latencyMs: number;
  favicon?: string | null;
  version?: string | null;
}

export interface ServerRow {
  host: string;
  port: number;
  name: string;
  favicon?: string | null;
}

export interface DbInstance {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  x: number;
  y: number;
  icon?: string;
  groupName?: string;
  playTimeMs?: number;
  lastPlayedAt?: string;
}

export interface DbAccount {
  name: string;
  type: string;
}

export interface DbModRecord {
  instanceId?: string;
  modId?: string;
  instance_id?: string;
  mod_id?: string;
  version: string | null;
  filename: string;
}

export interface InstalledInstanceContent {
  db_records: DbModRecord[];
  mod_files: string[];
  shader_files: string[];
  resourcepack_files: string[];
}

export interface InstanceModItem {
  filename: string;
  name: string;
  version?: string | null;
  enabled: boolean;
  fileSize: number;
  modId?: string | null;
  modUrl?: string | null;
}

export interface InstancePackItem {
  filename: string;
  name: string;
  enabled: boolean;
  fileSize: number;
}

export interface InstanceWorldItem {
  folderName: string;
  displayName: string;
  lastPlayed?: number | null;
  sizeBytes: number;
  iconBase64?: string | null;
}

export interface InstanceScreenshotItem {
  filename: string;
  dateModified: number;
  sizeBytes: number;
  dataUrl?: string | null;
}

export interface InstanceConfigData {
  fullscreen?: boolean;
  windowWidth?: number;
  windowHeight?: number;
  hideLauncherOnStart?: boolean;
  closeLauncherOnExit?: boolean;

  showConsoleOnStart?: boolean;
  showConsoleOnCrash?: boolean;
  hideConsoleOnExit?: boolean;

  showPlaytime?: boolean;
  recordPlaytime?: boolean;

  overrideAccount?: string;
  autoconnectServer?: string;
  autoconnectWorld?: string;

  overrideLoaders?: string[];

  javaPath?: string;
  skipJavaCompatibility?: boolean;
  minMemoryMb?: number;
  maxMemoryMb?: number;
  permGenMb?: number;
  warnMemory?: boolean;
  customJvmArgs?: string;

  systemGlfwPath?: string;
  systemOpenalPath?: string;
  enableGamemode?: boolean;
  enableMangohud?: boolean;
  useDiscreteGpu?: boolean;
  useZink?: boolean;

  preLaunchCommand?: string;
  wrapperCommand?: string;
  postExitCommand?: string;

  overrideEnvVars?: boolean;
  envVars?: Record<string, string>;
}
