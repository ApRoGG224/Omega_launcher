# Omega Launcher - Project Context

## Overview
Modern Minecraft launcher built with **Tauri v2** (Rust backend + React/TypeScript frontend). Features instance management, Modrinth integration, Microsoft authentication, modpack import/export, Supabase-backed accounts/friends, and server tracking.

## Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript + Vite + Vitest | UI: dashboard, instances, mods, catalog, friends, settings |
| **Backend** | Rust (Tauri 2, rusqlite, reqwest, tokio) | Native commands, process management, file I/O, SQLite state, network |
| **Cloud** | Supabase (Postgres + auth + Realtime presence) | Omega accounts, friend codes, friends, game presence/sessions |
| **Storage** | SQLite (rusqlite) + local filesystem (`~/.local/share/omega-launcher/minecraft_data/`) | Instances, mods, servers, worlds, Java |

## Key Features

1. **Instance Management** - Create/manage multiple isolated Minecraft instances with custom versions, loaders (Fabric/Forge/NeoForge/Quilt), RAM allocation, mod counts
2. **Modrinth Integration** - Search/install mods, resourcepacks, shaders, datapacks, modpacks directly from Modrinth API; update-all-mods
3. **Microsoft Auth** - OAuth2 flow via embedded webview
4. **Auto Java Management** - Downloads correct JDK per MC version (Java 25 for year-based versions, Java 8/17/21 for 1.x)
5. **Modpack Support** - Import/export Prism, CurseForge, Modrinth (.mrpack), custom Omega format (`.omega`)
6. **Omega Accounts + Friends** - Supabase auth, friend codes (`OMG-XXXXXX`), friend requests, profiles, avatars
7. **Presence & Game Sessions** - Realtime presence via Supabase Realtime channels; game session tracking
8. **Server Tracking** - Save servers, ping (online/players), fetch favicons
9. **Draggable/Resizable Windows** - Custom implementation with snap-to-align guides, persisted positions
10. **i18n** - Russian/English; **theme** - accent color customization (react-colorful)

## Project Structure
```
src/                        # React frontend
  App.tsx                   # Main app (~470 lines), routes between panels
  components/
    accounts/AccountModal.tsx
    catalog/                # CatalogTabs, AnimatedIcon, catalogAssets
    friends/FriendsTab.tsx
    home/                   # HomeDashboard, ConsolePanel, CreateInstanceModal, FriendsPanel, RecentInstancesPanel, ServersPanel
    instances/              # InstancesPanel, InstanceModals, ImportModal, ImportProgressPopup
    mods/                   # ModsPanel, ModCard, CachedImage, InstallTargetModal, ShaderInstallModal, WorldSelectModal
    navigation/FloatingDock.tsx
    settings/SettingsPanel.tsx
  hooks/                    # useAccounts, useInstances, useFriends, usePresence, useGameSession, useModrinth, useOmegaAuth, useVersions
  services/                 # api (Modrinth), ipc (typed Tauri invoke), omega (Supabase), friends, supabase, storage
  ui/                       # DraggableWindow, Dropdown, ToastProvider, icons
  types/index.ts
  i18n.ts                   # RU/EN translations
  test/setup.ts
src-tauri/
  src/
    lib.rs                  # Tauri setup + core commands
    auth.rs                 # Microsoft OAuth2
    launch.rs               # Minecraft launch/kill
    download.rs             # Modrinth downloads + deps
    installer.rs            # Vanilla/loader installation
    java.rs                 # Java version resolution
    imports.rs              # Prism/CurseForge/mrpack/Omega import + export
    db.rs                   # SQLite (rusqlite) state
    network.rs              # Server ping, favicons, local IP
    cache.rs                # Version manifest/icon caching
    util.rs                 # Helpers (extract_zip, download_file, emit_line)
    validate.rs             # Asset/version validation
  Cargo.toml                # tauri 2, rusqlite, reqwest, tokio, flate2, dirs
supabase/migrations/        # Versioned SQL migrations (0001_init, 0002_avatar_url)
scripts/                    # migrations.mjs, build-linux.sh, bump-version.mjs, setup-cli.sh
.github/workflows/          # ci.yml, release.yml (Windows/Linux/macOS builds)
docs/                       # tauri_v2_capabilities_issue.md
```

## Notable Implementation Details

- **Custom window management** - `DraggableWindow` component with pointer events, resize handles, alignment guides, localStorage persistence
- **SQLite state** - `Db(Mutex<Connection>)` in `db.rs`; instances, accounts, servers, installed mods, icons, favicons persisted via `db_*` commands
- **Supabase** - Omega accounts (magic-link style), friend codes + RPC `search_profiles`, Realtime presence channel `presence:omega` for online status and game sessions
- **Rust-native launcher** - Everything previously in Node.js sidecars (launcher/download/installer/import) moved into Rust modules; sidecar processes no longer used
- **Server ping** - Raw TCP handshake parsing (SMP status protocol) in `network.rs`, stored servers in SQLite
- **Mod dependency resolution** - Recursive download of required dependencies
- **Shader auto-install** - Auto-installs Iris for Fabric shaders
- **World-aware datapack install** - Lists worlds via NBT parsing (`level.dat`)
- **Streaming events** - Rust emits stdout/stderr lines as Tauri events to the frontend

## Commands
```bash
npm run dev          # Vite dev server + Tauri
npm run build        # TypeScript + Vite build
npm run test         # Vitest unit tests
npm run tauri        # Tauri CLI
cd src-tauri && cargo check  # Rust checks
just build           # migrations + build + tests + cargo check
just migration(-status|-new <name>|-import)  # Supabase migrations
just version / just release  # bump version / release (tag v* → CI builds installers)
```

## Tauri Commands (33 total, grouped by module)

**lib.rs**: `launch_minecraft`, `kill_minecraft`, `login_microsoft`, `open_folder`, `open_path`, `create_shortcut`, `count_installed_mods`, `list_worlds`, `translate_text`, `app_exit`

**imports.rs**: `install_modpack`, `export_modpack`, `export_omega`, `import_prism`, `import_curseforge`, `import_mrpack`

**download.rs**: `download_mod`, `update_all_mods`

**network.rs**: `ping_server`, `get_local_ip`, `create_server`, `load_servers`, `save_server_favicon`

**db.rs**: `db_load_instances`, `db_save_instances`, `db_delete_instance`, `db_load_accounts`, `db_save_accounts`, `db_load_servers`, `db_save_server`, `db_delete_server`

**cache.rs**: `cache_mod_icon`, `get_cached_version_manifest`

**auth.rs**: `find_system_java`

## Supabase Schema (migrations)
- `0001_init.sql` - `profiles` (username, friend_code, avatar_url), `friends` (pending/accepted, RLS), `search_profiles` RPC
- `0002_avatar_url.sql` - avatar_url column
- Game sessions are NOT a DB table — live game status (instance/server) is broadcast via Realtime presence (`presence:omega`)