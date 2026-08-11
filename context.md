# Omega Launcher - Project Context

## Overview
Modern Minecraft launcher built with **Tauri v2** (Rust backend + React/TypeScript frontend). Features instance management, Modrinth integration, Microsoft authentication, and modpack import/export.

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript + Vite | UI with custom draggable windows, Modrinth integration |
| **Backend** | Rust (Tauri 2) | Native commands, process management, file I/O |
| **Sidecars** | Node.js (tsx) | Minecraft launching, mod downloading, modpack import/export |
| **Storage** | Local filesystem (`~/.local/share/omega-launcher/minecraft_data/`) | Instances, mods, worlds, Java |

## Key Features

1. **Instance Management** - Create/manage multiple isolated Minecraft instances with custom versions, loaders (Fabric/Forge/NeoForge/Quilt), RAM allocation
2. **Modrinth Integration** - Search/install mods, resourcepacks, shaders, datapacks, modpacks directly from Modrinth API
3. **Microsoft Auth** - OAuth2 flow via embedded webview
4. **Auto Java Management** - Downloads correct JDK per MC version via `@xmcl/installer`
5. **Modpack Support** - Import/export Prism, CurseForge, Modrinth (.mrpack), custom Omega format
6. **Draggable/Resizable Windows** - Custom implementation with snap-to-align guides, persisted positions
7. **i18n** - Russian/English

## Project Structure
```
src/                    # React frontend
  App.tsx               # Main app (1000+ lines - all components inline)
  components/
    navigation/FloatingDock.tsx
    catalog/CatalogTabs.tsx
  i18n.ts               # Translations
src-tauri/
  src/lib.rs            # Tauri commands (17 commands)
  Cargo.toml            # Dependencies: tauri, reqwest, tokio, flate2, dirs
sidecar/                # Node.js sidecars (tsx)
  launcher.ts           # Minecraft launch via minecraft-launcher-core
  download.ts           # Modrinth mod downloading + deps
  installer.ts          # Fabric/Quilt/Forge/NeoForge installation
  auth.ts               # Microsoft auth flow
  import_*.ts           # Modpack importers
  export_modpack.ts     # Modpack exporter
  java_installer.ts     # JDK management
```

## Notable Implementation Details

- **Custom window management** - `DraggableWindow` component with pointer events, resize handles, alignment guides, localStorage persistence
- **Sidecar communication** - Rust spawns `npx tsx sidecar/*.ts` processes, streams stdout/stderr via Tauri events
- **Mod dependency resolution** - Recursive download of required dependencies in `download.ts`
- **Shader auto-install** - Auto-installs Iris for Fabric shaders
- **World-aware datapack install** - Lists worlds via NBT parsing (`level.dat`) in Rust

## Commands
```bash
npm run dev      # Vite dev server + Tauri
npm run build    # TypeScript + Vite build
npm run tauri    # Tauri CLI
cd src-tauri && cargo check  # Rust checks
```

## Tauri Commands (lib.rs)
- `login_microsoft` - Microsoft OAuth2 flow
- `launch_minecraft` - Spawns sidecar launcher
- `kill_minecraft` - Kills MC + launcher processes
- `download_mod` - Downloads mod/resourcepack/shader/datapack from Modrinth
- `open_folder` - Opens instance folder
- `create_shortcut` - Creates desktop shortcut
- `count_installed_mods` - Counts mods in instance
- `list_worlds` - Lists worlds (reads level.dat NBT)
- `open_path` - Opens arbitrary path
- `translate_text` - Google Translate API
- `install_modpack` - Installs modpack via sidecar
- `export_modpack` - Exports instance as modpack
- `import_prism` / `import_curseforge` / `import_mrpack` - Modpack importers