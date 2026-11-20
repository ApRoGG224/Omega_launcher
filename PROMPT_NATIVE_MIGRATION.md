# MASTER SPECIFICATION & PROMPT: 1-to-1 Migration of Omega Launcher to Native Rust + Slint

> **Role & Goal**: You are an Elite Systems Architect and UI Engineer specializing in **Rust, Slint UI, wgpu, and Minecraft Launcher Internals**. Your objective is to execute the complete, uncompromising, 1-to-1 migration of **Omega Launcher** from its current hybrid stack (React 19 + TypeScript + Tauri v2 + WebKitGTK) into a **100% Native Single-Binary Application using Rust + Slint UI + wgpu** on the `native-slint` branch.
>
> The result must look, feel, animate, and behave **identically** to the real production launcher on `master`: a sleek, premium, dark obsidian & graphite interface with rounded corners, smooth transitions, and instant responsiveness, cutting RAM consumption down from ~190 MB to **25–35 MB** and launching in under 50ms.

---

## 1. Actual Design System: 1-to-1 Visual Reproduction

The launcher uses a modern, sleek **Dark Obsidian & Graphite** aesthetic standardized across all screens:

### 1. Geometry & Metrics (Border Radii)
- **Base Screen Buttons:** `height: 40px`, **`border-radius: 11px`**, `padding: 0 16px`. Used across back buttons, filter buttons, and primary screen controls.
- **Cards, Panels & Launch Dock:** **`border-radius: 14px`**, `border: 1px solid rgba(255, 255, 255, 0.08)`.
- **Top Navigation Dock (HUD):** **`border-radius: 16px`**, `backdrop-filter: blur(20px)`, `padding: 5px 8px`.
- **Badges, Input Fields & Chips:** **`border-radius: 8px` – `10px`**.
- **Important:** Strict NO NEON glows, NO radioactive seams, and NO pixelated/notched corner cutouts. Pure matte dark obsidian, deep charcoal, and authentic Minecraft accents.

### 2. Color Palette (`tokens.css`)
- **Backgrounds:**
  - Base Deep Abyss: `#06080d` / `#06090f`
  - Screen Overlay Backdrop: `rgba(6, 9, 15, 0.96)` with `backdrop-filter: blur(14px)`
  - Card & Surface Plates: `#0d1117`
  - Row & List Item Background: `#1a1d24` (Hover: `#22262e`)
- **Borders & Dividers:**
  - Subtle Border: `rgba(255, 255, 255, 0.08)`
  - Medium Border: `rgba(255, 255, 255, 0.12)`
  - Active/Hover Border: `rgba(255, 255, 255, 0.22)`
- **Accents:**
  - Primary Play / Action: `#e6e8ec` (with dark text `#0d1117`) or pastel violet `#9b5cff`
  - Stop / Danger: `#b3423f` (Hover: `#c44e4b`, Active: `#9c3735`)
  - Status Online / Success: `#10b981`
  - Text Primary: `#ffffff`, Text Secondary: `#e6e8ec`, Text Muted: `#8b919c`

### 3. Animations & Micro-Interactions
- **Screen Fade-in Transition:**
  ```slint
  in-out property <float> screen-opacity: 1.0;
  in-out property <length> screen-offset-y: 0px;
  animate screen-opacity { duration: 200ms; easing: ease-out; }
  animate screen-offset-y { duration: 200ms; easing: cubic-bezier(0.16, 1, 0.3, 1); }
  ```
  Screens enter with opacity 0 -> 1 and subtle upward glide from +8px to 0px.
- **Button Hover & Press Feedback:**
  - Smooth background and border transition: `animate background { duration: 150ms; }`
  - Press scale feedback: subtle scale(0.98) or opacity dip to 0.92 on active press.
- **Dock Tooltip:**
  - Floating tooltip (`.dock-tooltip`) above the version selector with a triangular pointer, appearing on hover with a 150ms fade-in.

---

## 2. The 5-Layer UI Architecture

The launcher UI consists of 5 stacked layers:

```
+-------------------------------------------------------------------------+
| Layer 4: SCREENS LAYER (Store, Instances, Modrinth, Accounts, etc.)     |
+-------------------------------------------------------------------------+
| Layer 3: DOCK LAYER (Launch Dock: 3D Cube, Version Info, Play/Stop)     |
+-------------------------------------------------------------------------+
| Layer 2: HUD LAYER (Top Bar: Profile Popover, Mute, Friends, Navigation)|
+-------------------------------------------------------------------------+
| Layer 1: STAGE 3D LAYER (Interactive 3D Skinview3d Character & Physics) |
+-------------------------------------------------------------------------+
| Layer 0: ATMOSPHERE LAYER (Minecraft Landscapes, Ken Burns, Vignette)   |
+-------------------------------------------------------------------------+
```

### Layer 0: Atmosphere Layer (`AtmosphereLayer.tsx`)
- Cycles through high-resolution Minecraft landscape screenshots every 28 seconds.
- Ken Burns effect: subtle scale zoom (`transform: scale(1.03)` with a 24s ease-out transition).
- Triple matte vignette scrim (`.atmosphere-matte-scrim`):
  - Top dark gradient (0–230px) for HUD readability.
  - Bottom dark gradient (0–260px) for launch dock contrast.
  - Elliptical radial vignette for soft dark borders.

### Layer 1: Stage 3D Layer (`Stage3DLayer.tsx`)
- Fullscreen 3D character viewport powered by Three.js / wgpu.
- **Articulated Limbs (`articulatedPlayer.ts`):** character has articulated elbows and knees that bend naturally during walking and jumping.
- **Roaming Physics Controller (`RoamingCharacterController.ts`):**
  - Character physically walks along the bottom of the launcher.
  - Dynamically scans the UI and treats the bottom launch dock as a solid physical platform (`WorldPlatform`).
  - Character jumps onto the dock, walks across it, drops back to the floor, and idles with a gentle breathing sway (0.5 Hz).
- **Interactive Mouse Grabbing:**
  - The user can click and drag the character anywhere on the screen.
  - Releasing throws the character with accumulated physics velocity, gravity, and platform collision.
  - Head tracks the mouse cursor in real-time when the character is on the ground.
- **Contact Shadow Plane:**
  - Plane attached directly under the character's feet that dynamically scales and fades as the character jumps or falls.
- **Cosmetics Attachment:**
  - 3D Monarch Crown (`cosmetics3D.ts`) mounted directly to the head bone.
  - Real-time cape rendering with physics sway.

### Layer 2: HUD Layer (`HudLayer.tsx`)
- Floating pill-shaped dock centered at `top: 14px` (`border-radius: 16px`, `backdrop-filter: blur(20px)`).
- **Profile Button:**
  - Round 3D skin head avatar (`SkinHeadAvatar`), username, account type tag (`MICROSOFT`, `ELY.BY`, `OFFLINE`).
  - Clicking opens an obsidian dropdown popover: account switcher, Microsoft login button, Ely.by login, offline account creator, and account deletion.
- **Navigation Controls:**
  - Friends online pill with live numerical badge.
  - Sound mute toggle button.
  - Quick action buttons to open: Servers, Instances, Modrinth, Store, Console, Settings.

### Layer 3: Dock Layer (`DockLayer.tsx`)
- Floating bottom launch dock (`max-width: 560px`, `border-radius: 14px`, `bottom: 28px`, `background: #0e1118`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75)`).
- **Left:** 3D isometric grass block icon or 16x16 authentic pixel item texture (diamond sword, diamond pickaxe, totem, obsidian, etc.).
- **Center:**
  - Instance title ("test1", "Minecraft Rust").
  - Loader chip (`Fabric`, `Forge`, `Rust`), version tag (`1.21.4`, `1.20.1`, `26.3`), playtime (`0 мин`).
  - Hover tooltip with pointer arrow: «Сменить версию» / «Change Version». Clicking opens the Instances screen.
- **Right:**
  - Large Play / Stop button (`.dock-play` / `.dock-stop`).
  - Idle state: «ГРАТИ» / «ИГРАТЬ» (light plate `#e6e8ec` with bold dark text `#0d1117` or lilac `#9b5cff`).
  - Launching state: «ЗАПУСК...».
  - In-game state: «СТОП» / «ОСТАНОВИТЬ» (matte red `#b3423f`).

### Layer 4: Screens Layer (`ScreensLayer.tsx` — All 8 Screens)

1. **Store Screen (`StoreScreen.tsx`):**
   - **Скины:** Online skin search by player nickname, 54,000+ skins catalog, 3D preview render, one-click apply to active account (Microsoft or Ely.by / offline).
   - **Недавние скины:** Persistent history of worn skins with relative time badges («только что», «5 мин назад»), single-click re-equip or delete.
   - **Официальные плащи:** Fetches licensed Microsoft/Mojang capes directly via Mojang API (`GET /minecraft/profile`), real-time equip (`PUT /minecraft/profile/capes/active`), 3D Cape Viewer (`Cape3DViewer`) on BoxGeometry with nearest-neighbor texture filtering. Offline guard card when logged in without Microsoft.
   - **Косметика (Корона):** Showcase card for the 3D Monarch Crown, static wardrobe character preview (`Wardrobe3DViewer`).
2. **Instances Screen (`InstancesScreen.tsx`):**
   - Folders system («Все версии», «Rust (beta)», «Сборки», «Выживание», «PvP», «Ванилла») with custom obsidian dropdowns.
   - Version filter tabs: Популярные, Все релизы (103), Снапшоты (759), Beta & Alpha (61).
   - Authentic 16x16 Minecraft pixel-art icons.
   - Instance cards: avatar, name, loader badge, version, playtime, «Играть», «Настройки сборки», «Удалить».
   - Modals: `InstanceEditorModal` (Java memory limits, mods list, shaderpacks) and `ImportModal` (importing zip / mrpack).
3. **Modrinth & CurseForge Catalog (`ModrinthScreen.tsx`):**
   - Dual-source toggle: **Modrinth** and **CurseForge**.
   - Categories: Моды, Шейдеры, Текстуры, Сборки.
   - 300ms debounced search with request sequence guarding.
   - Uniform 142px fixed-height cards with ambient blurred backdrop (`.card-ambient-backdrop`), loader tags stack, download count, and install button.
   - Infinite scroll pagination (`PAGE_SIZE = 15`) powered by Tokio background requests.
4. **Accounts Screen (`AccountsScreen.tsx`):**
   - Account cards: 3D skin head avatar, username, badge (`MICROSOFT`, `ELY.BY`, `OFFLINE`), active checkmark, delete button.
   - «Войти через Microsoft» (OAuth2 device flow / browser callback).
   - «Войти через Ely.by» (auth popup / token exchange).
   - «Добавить оффлайн-аккаунт» (input with 3–16 Latin/digit regex validation).
5. **Friends Screen (`FriendsScreen.tsx`):**
   - Friends list with statuses: `live` (playing on a server, with a quick join button), `menu` (in launcher), `dnd` (do not disturb), `off` (offline with last seen time).
   - Friend requests tab and direct messages chat panel.
6. **Servers Screen (`ServersScreen.tsx`):**
   - Server cards: live ping latency in ms, player count (`142/500`), server favicon, and Minecraft MOTD with formatting codes (`§e`, `§6`, `§a`).
   - Quick Play direct connect button: launches game directly onto the server (`--quickPlayMultiplayer <ip>`).
   - Add, edit, and delete server dialogs.
7. **Console Screen (`ConsoleScreen.tsx`):**
   - Live streaming terminal connected to stdout/stderr of the game process.
   - Filter chips: `ВСЕ`, `INFO`, `WARN`, `ERROR`, `AUTH`.
   - Line numbers, timestamps, copy logs, export to file, open logs folder, game runtime timer, and kill process button.
8. **Settings Screen (`SettingsScreen.tsx`):**
   - RAM allocation slider (1 GB to 32 GB) with MB readout.
   - Garbage Collector presets: `G1GC`, `ZGC`, `Shenandoah` + custom JVM arguments editor.
   - Auto-detected JRE list via `find_system_java` and manual browser.
   - «Закрывать лаунчер при запуске игры» toggle.
   - Visual customizers: `TopBarCustomizer` and `BottomBarCustomizer` (reorder items, change dock alignment).

---

## 3. Rust Core Backend Architecture (`omega-core`)

All core logic is implemented in pure Rust and must be bound directly to the Slint UI without IPC bridges:

```
+-------------------------------------------------------------------------+
|                             SLINT UI (omega-slint)                      |
|                         Direct Rust Method Calls                        |
+------------------------------------+------------------------------------+
                                     | slint::invoke_from_event_loop
                                     v
+-------------------------------------------------------------------------+
|                           OMEGA CORE ENGINE                             |
|  - launch.rs: JVM command builder, classpath resolver, JavaAgent injection |
|  - java.rs: JRE detection (8/17/21/25), Mojang JRE downloader           |
|  - db.rs: SQLite local storage (instances, accounts, servers, settings)  |
|  - auth.rs: Microsoft OAuth2, Xbox Live, Mojang Services & Ely.by       |
|  - modrinth.rs & curseforge.rs: Unified catalog search & mod downloader |
|  - network.rs & servers.rs: Native Minecraft TCP handshake & MOTD ping  |
|  - instances_edit.rs: Mods, shaders, texturepacks, worlds & NBT parser  |
|  - imports.rs: Prism, CurseForge, MrPack archive importer               |
+-------------------------------------------------------------------------+
```

### Concurrency Directives
- **Slint UI runs synchronously on the main thread.**
- **All I/O operations MUST spawn onto Tokio tasks (`tokio::spawn`).**
- Background results are dispatched to Slint using `ui_weak.upgrade()` inside `slint::invoke_from_event_loop`.

---

## 4. Execution Directives for the Agent

1. **Strict Fidelity:** Follow the exact design tokens (`border-radius: 11px/14px/16px`, `#06080d`, `#0d1117`, `#1a1d24`, `#e6e8ec`, `#9b5cff`, `#b3423f`, no neon).
2. **Direct Backend Integration:** Do not stub or mock backend calls; use `omega_core` functions directly.
3. **Frequent Verification:** Run `cargo check -p omega-slint` after modifying `.slint` or Rust source files to ensure zero compilation or layout errors.
