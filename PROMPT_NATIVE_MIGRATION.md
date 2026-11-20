# MASTER PROMPT: Complete 1-to-1 Migration of Omega Launcher to Native Rust + Slint

> **Role & Context**: You are an Elite Systems Architect and UI Engineer specializing in **Rust, Slint UI, wgpu, and Minecraft Launcher Internals**. Your task is to execute the complete, uncompromising, 1-to-1 migration of **Omega Launcher** from its current hybrid stack (React 19 + TypeScript + Tauri v2 + WebKitGTK) into a **100% Native, Single-Binary Application using Rust + Slint UI + wgpu** on the `native-slint` branch.
>
> The result must look, feel, animate, and behave **identically** to the real production launcher UI on `master`: a sleek, premium, dark obsidian & graphite interface with rounded corners, smooth transitions, and instant responsiveness, cutting RAM consumption down from ~190 MB to **25–35 MB** and launching in under 50ms.

---

## 1. Core Architecture & System Bridge

### The Dual-Layer Separation
```
+-------------------------------------------------------------------------+
|                        SLINT UI LAYER (crates/omega-slint)              |
|  - Modern Dark Obsidian & Graphite Design System                        |
|  - border-radius: 11px (buttons), 14px (cards/dock), 8px (badges)       |
|  - Smooth transitions (cubic-bezier, ease-out hover/fade animations)    |
|  - Custom 3D Character Stage & Skin/Cape Viewer (wgpu / Slint Buffer)   |
|  - Reactive Properties & Direct Callbacks (No IPC bridge overhead)      |
+------------------------------------+------------------------------------+
                                     | slint::Weak<MainWindow> / tokio::sync::mpsc
                                     v
+-------------------------------------------------------------------------+
|                      RUST CORE ENGINE (crates/omega-core)               |
|  - launch.rs: JVM argument injector, GC profiles, Process management    |
|  - java.rs: JRE 8/17/21/25 auto-detection & Mojang JRE downloader       |
|  - db.rs: SQLite local storage (instances, accounts, servers, settings)  |
|  - auth.rs: Microsoft OAuth2 Device/Webview flow & Ely.by session sync  |
|  - modrinth.rs & curseforge.rs: Unified catalog search & mod downloader |
|  - ping.rs: Server list MOTD pinging, color codes, player counts        |
+-------------------------------------------------------------------------+
```

### Threading & Concurrency Rule
- The **UI thread** runs the Slint event loop (`ui.run()`).
- All asynchronous I/O (network requests, game launching, disk scanning, database queries, hashing) **MUST** run on the `tokio` multi-threaded runtime.
- Background tasks communicate with the UI exclusively through thread-safe `slint::invoke_from_event_loop` or `ui.as_weak()`. **Never block the Slint thread.**

---

## 2. Actual Design System: 1-to-1 Visual Reproduction

The launcher uses a modern, sleek **Dark Obsidian & Graphite** aesthetic standardized across all screens:

### 1. Color Palette & Geometry
- **Backgrounds:**
  - Base Deep Abyss: `#06080d`
  - Canvas / Overlay: `#090c11` (with `backdrop-filter: blur(14px)`)
  - Surface Plates / Cards: `#0d1117`
  - Row / Card Background: `#1a1d24` (Hover: `#22262e`)
- **Borders & Strokes:**
  - Subtle Border: `rgba(255, 255, 255, 0.08)`
  - Medium Border: `rgba(255, 255, 255, 0.12)`
  - Active/Hover Border: `rgba(255, 255, 255, 0.22)`
- **Accents:**
  - Play / Primary Action: `#e6e8ec` (Dark text `#0d1117`) or pastel violet `#9b5cff`
  - Stop / Danger: `#b3423f` (Hover: `#c44e4b`, Active: `#9c3735`)
  - Status Online / Emerald: `#10b981`
- **Border Radii & Metrics:**
  - Base Screen Buttons: `height: 40px`, `border-radius: 11px`, `padding: 0 16px`
  - Cards & Panels: `border-radius: 14px`, `border: 1px solid rgba(255, 255, 255, 0.08)`
  - Badges & Small Tags: `border-radius: 6px` - `8px`
  - Bottom Dock: `max-width: 560px`, `border-radius: 14px`, `box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75)`

### 2. Animations & Transitions
- **Screen Fade-in Transition:**
  ```slint
  in-out property <float> screen-opacity: 1.0;
  in-out property <length> screen-offset-y: 0px;
  animate screen-opacity { duration: 200ms; easing: ease-out; }
  animate screen-offset-y { duration: 200ms; easing: cubic-bezier(0.16, 1, 0.3, 1); }
  ```
- **Button Hover & Press Feedback:**
  - Smooth background & border transition: `animate background { duration: 150ms; }`
  - Scale press effect: slight scale(0.98) or opacity dip to 0.92 on active press.
- **Dock Tooltip:**
  - Smooth floating tooltip (`.dock-tooltip`) above the version selector with triangular pointer, appearing on hover with 150ms fade-in.

---

## 3. 3D Character Stage & Skin Viewer (wgpu / Slint Buffer)

1. **Voxel Mesh Definition:**
   - 6 rectangular cuboids (Head: 8x8x8, Torso: 8x12x4, Left Arm: 4x12x4, Right Arm: 4x12x4, Left Leg: 4x12x4, Right Leg: 4x12x4).
   - Support both standard (4px arm) and slim/Alex (3px arm) models.
2. **Skin Texture UV Mapping:**
   - Unpack official 64x64 PNG textures with nearest-neighbor (`FilterMode::Nearest`) filtering.
   - Second layer (jacket, hat, sleeves, pants) with 0.5px dilation.
3. **Motion & Interaction:**
   - Idle breathing sway (sinusoidal rotation on arms and legs at 0.5 Hz).
   - Mouse hover head tracking: map cursor X/Y coordinates relative to window center into neck yaw (-35°..+35°) and pitch (-25°..+25°).
   - Dynamic ground contact shadow plane fading with jump height.

---

## 4. Complete Screen Implementations (The 8 Screens)

### Screen 0: Top HUD & Navigation Bar
- **Friends Online Pill:** Red/green badge with online count (`В сети: 3`).
- **Profile Popover:** Click avatar to open graphite popover (`border-radius: 12px`) with account switcher, Ely.by badge, and logout.
- **Navigation Buttons:** Mute audio toggle, Messages/News, Bug Report / Shield button with cyan `+50` badge, Settings gear button.

### Screen 1: Home Screen (`HomeScreenView`)
- 3D Character Stage occupying center/left.
- Left action cards:
  - "Магазин Omega" -> switches to Store screen.
  - "Играть с друзьями" -> opens Servers/Friends screen.
- Bottom Dock:
  - 3D Grass Block isometric icon (`32x32`).
  - Active version & loader info ("test1", "1.21.4 Fabric", "Готово к запуску").
  - Big Play Button: states `ИГРАТЬ` -> `ЗАПУСК...` -> `В ИГРЕ / ОСТАНОВИТЬ`.

### Screen 2: Instances Screen (`InstancesScreenView`)
- Top category filter tabs: `⭐ Популярные`, `Все релизы (103)`, `Снапшоты (759)`, `Beta & Alpha (61)`.
- Search input with real-time filtering and graphite input box.
- Authentic 16x16 Minecraft pixel-art icons (Diamond Sword, Diamond Pickaxe, Obsidian, End Crystal, Totem, etc.).
- Instance cards with graphite background (`#1a1d24`), 11px border-radius, version tag, playtime, and launch/edit buttons.

### Screen 3: Modrinth & CurseForge Catalog (`ModrinthScreenView`)
- Dual-dock header: left categories (Modpacks, Mods, Shaders, Resource Packs), right source toggle (Modrinth / CurseForge).
- Real-time debounced search input (300ms) with request cancellation.
- Uniform 142px card layout: ambient blurred backdrop, loader stack (Fabric, Forge, Quilt), download count, author, install button.
- Virtualized or paginated list powered by Tokio background fetching.

### Screen 4: Store & Capes Showcase (`StoreScreenView`)
- Top tabs: "Скины", "Официальные плащи", "Косметика (Корона)".
- **Skins:** Online search catalog (54,000+ skins via Rust scraper), recent skins history with relative time badges ("только что", "5 мин назад"), single-click equip.
- **Capes:** Official Microsoft capes fetcher via Mojang API (`GET /minecraft/profile`), real-time equip (`PUT /minecraft/profile/capes/active`), offline guard card when logged in without Microsoft.
- **Cosmetics:** Monarch Crown 3D showcase card, static wardrobe character preview.

### Screen 5: Accounts Screen (`AccountsScreenView`)
- Account list with active checkmark, avatar head, type badge (Microsoft / Ely.by / Offline).
- "Войти через Microsoft" (OAuth2 device flow / browser callback).
- "Войти через Ely.by" (auth popup / token exchange).
- "Добавить оффлайн-аккаунт" (username input, auto skin cache).

### Screen 6: Servers Screen (`ServersScreenView`)
- Server cards with live ping indicator, ping latency in ms, player count (`142/500`), server icon, and MOTD with Minecraft color codes formatting.
- "Быстрое подключение", "Добавить сервер", "Пинг всех серверов".

### Screen 7: Console & Live Logs Screen (`ConsoleScreenView`)
- Live scrolling log terminal connected to stdout/stderr of the launched game process.
- Filter chips: `ВСЕ`, `INFO`, `WARN`, `ERROR`, `AUTH`.
- Actions: "Копировать логи", "Очистить", "Экспорт в файл".

### Screen 8: Settings Screen (`SettingsScreenView`)
- **Java Configuration:** Auto-detected JRE list via `omega_core::java::find_system_java`, custom path browser, version verification.
- **Memory & Performance:** RAM allocation slider (1 GB to 32 GB) with MB readout.
- **Garbage Collector Presets:** Toggle buttons for `G1GC`, `ZGC`, `Shenandoah`, and raw `custom_jvm_args` text editor.
- **Game Behavior:** Resolution width/height, auto-close launcher on start, Discord Rich Presence toggle.

---

## 5. Execution Directives for the Agent

When executing this port:
1. **Never mock the backend:** Bind UI callbacks directly to the robust Rust functions in `omega-core` (`launch_game`, `load_instances`, `save_instance`, `ping_server`, `login_microsoft`).
2. **Compile-Check Frequently:** Run `cargo check -p omega-slint` after editing `.slint` files to catch layout or type errors early.
3. **Preserve State Persistence:** Ensure all settings, instances, accounts, and server lists persist to SQLite via `omega-core::db`.
4. **Clean Git Hygiene:** Keep commits scoped with conventional prefixes (`feat(slint):`, `fix(slint):`).
