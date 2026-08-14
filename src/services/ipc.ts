import { invoke } from "@tauri-apps/api/core";
import type { ProjectType } from "../types";

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

export const ipc = {
  async loginMicrosoft(): Promise<string> {
    return invoke<string>("login_microsoft");
  },

  async launchMinecraft(args: {
    version: string;
    server: string;
    username: string;
    ram: number;
    instanceId: string;
  }): Promise<void> {
    await invoke("launch_minecraft", args);
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

  async openFolder(instanceId: string): Promise<void> {
    await invoke("open_folder", { instanceId });
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

  async dbSaveServerFavicon(host: string, port: number, favicon: string): Promise<void> {
    await invoke("db_save_server_favicon", { host, port, favicon });
  },

  async findSystemJava(mcVersion = "1.20.1"): Promise<string | null> {
    return invoke<string | null>("find_system_java", { mcVersion });
  },
};

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
  instanceId: string;
  modId: string;
  version: string;
  filename: string;
}