# Omega Launcher - Project Context & Agent Rules

## Project Description (MVP)

Omega Launcher is a highly optimized, lightweight Minecraft launcher focused on low resource consumption and maximum performance.

**Current Tech Stack:**

- **Frontend:** TypeScript
- **Backend:** TypeScript (via Node.js Sidecar), wrapped in Tauri for native OS webview optimization.

**Target Platforms:**

1. Linux (Primary development platform, highest priority)
2. macOS
3. Windows

**Core Features (MVP & Beyond):**

- System for friends and user registration.
- Modrinth API integration for easy mod management.
- Comprehensive modloader support: Forge, Fabric, NeoForge.
- Automatic installation of Minecraft versions and dependencies.
- High focus on automation within the launcher.
- Global system CLI support (`omega` command runs `npm run tauri dev`).
- Immersive 3D character home screen inspired by modern launchers (3D skin view, quick skin customization card, and consolidated version/play launch dock).
- Centralized `useSkin` state management for Ely.by, Microsoft, and custom PNG skins with Steve/Alex models.
- **Layered UI Architecture (5 Layers):**
  1. `AtmosphereLayer` (Layer 0): Matte dark obsidian atmosphere with Minecraft landscape screenshots, subtle floating particles and zero neon.
  2. `Stage3DLayer` (Layer 1): Three.js interactive skinview3d stage with physical platform detection, articulated limbs, mouse grabbing and physics momentum.
  3. `HudLayer` (Layer 2): Modular top navigation bar with profile dropdown, mute, online friends, and direct navigation to all MVP screens.
  4. `DockLayer` (Layer 3): Launch dock with 3D isometric cube/avatar icon, loader tags, version, playtime, and animated PLAY / STOP control.
  5. `ScreensLayer` (Layer 4): 8 full-featured screens (Store, Instances, Modrinth, Accounts, Friends, Servers, Console, Settings).
- Full backend integration with Tauri v2 Rust commands (`launch_minecraft`, `kill_minecraft`, `db_load_instances`, `db_save_instances`, `db_delete_instance`, `db_load_accounts`, `db_save_accounts`, `db_load_servers`, `db_save_server`, `db_delete_server`, `ping_server`, `find_system_java`, `open_folder`, `create_shortcut`, `count_installed_mods`, `login_microsoft`, `get_cached_microsoft_account`, `open_ely_login`, `translate_text`, `download_mod`).
- Live console monitoring (`ConsoleScreen`) receiving real-time `"download-progress"` and `"auth-log"` events with log filters (`INFO`, `WARN`, `ERROR`, `AUTH`), copy and file export.
- Roadmap and missing native endpoints documented in `BACKEND_TODO.md`.
- Authentic Minecraft stepped notched pixel-art UI styling standardized across the entire launcher with a uniform 6px border-width, 6-slice SVG (`24x24`), and 3px polygon clip-path formula, completely eliminating corner protrusion artifacts ("кусочки") on buttons, cards, docks, top bar, instances, friends, store, and settings menus.
- Radiant emerald Minecraft atmosphere background with dynamic radial glow, sunburst rays, and drifting sparkles.
- Top bar with stepped notched widgets: friends online pill with red badge, user profile dropdown, square action buttons (Audio Mute, Stats, Messages with badge), bright lime-green Protection/Bug button with bottom-right cyan `+50` badge, and Settings gear button.
- Dual left action cards: Store ("Магазин Omega") and Play with Friends ("Играть с друзьями").
- Stepped notched Launch Dock: royal blue version selector (`#1d5dc7`) with crisp square 90° icon box (`.millida-dock-cube-icon`) for the custom 3D isometric Minecraft grass block icon, and pastel lilac/purple Play button (`#9f75ff`) with black pixel play icon (`▶`) and bold "Играть".
- Animation wheel (`AnimationWheelModal`) and skeletal Emotecraft animation listeners completely removed to ensure zero runtime lag and 60 FPS UI responsiveness.
- Dedicated Omega Store (`OmegaStorePanel`, tab `"store"`) focused purely on Skins and Official Capes: online skin search by player nickname with official Microsoft Account skin upload/sync via Mojang API (`POST /minecraft/profile/skins`) preserving player's active nickname without renaming the account, visible across all launchers and multiplayer servers, and official Microsoft/Mojang/Minecon capes (Migrator, 15th Anniversary, Vanilla, Cherry Blossom, Twitch, TikTok, Mojang Studios, MCC Prismarine, Minecon).
- Automatic reconciliation of Microsoft account profiles with `ms_auth.json` (`getCachedMicrosoftAccount`) preventing accidental nickname corruption, and strict protection against nickname changes on licensed accounts.
- Online skins catalog integration (54,000+ skins) via Rust Tauri commands `fetch_minecraft_inside_skins` and `fetch_skin_as_data_url` with zero CORS issues, 3D skin render previews, search by nickname/query ("Какой скин ты ищешь?"), zero-lag infinite scroll with native `IntersectionObserver` identical to ModrinthScreen catalog, memoized skin cards (`React.memo`), CSS `content-visibility: auto`, and animated `IsometricCube` load-more spinner.
- Recent skins history ("Недавние скины") stored persistently in `localStorage` (`omega:recent_skins`, up to 30 skins) tracking worn skins with relative timestamp badges ("только что", "5 мин назад", etc.), single-click re-equipping, individual deletion, clear-history actions, and seamless integration with 3D character preview.
- Ely.by account integration and offline skin persistence: dedicated "Войти в Ely.by" action button in store skin settings card and account method selector with authentic pixel-art styling, opening Ely.by authentication window (`open_ely_login`) with fallback to browser, automatic skin association and caching for offline accounts (`omega:ely_skin:${name}`), and real-time syncing between offline profile and Ely.by skin system.
- Legacy "Кастомизация" tab completely removed from Settings panel to eliminate duplicate skin state and unnecessary 3D canvas overhead, focusing all skin and cape management in the dedicated Omega Store and home dock.
- Square Pixel Mosaic Curtain Startup Reveal (`StartupScreen`) on launcher launch: high-performance HTML5 2D Canvas rendering 20px square bedrock/obsidian blocks matching `--launcher-bg` (`#07080e`, `#090c14`, `#0c0f1b`, `#0e1321`, `#111626`). An expanding radial wave over 850ms dissolves blocks in 4 discrete stepped sizes (`1.0 -> 0.75 -> 0.5 -> 0.25 -> 0`) with zero layout thrashing, 60 FPS performance, immediate skip on click/keydown, and zero text or neon.
- **STRICT DESIGN RULE — NO NEON:** The launcher must NEVER use neon glow effects, neon radial highlights, glowing seams, radioactive neon lines, or bright glowing text-shadows. The visual style must be authentic, matte Minecraft/bedrock/obsidian/stone tones with crisp pixel art lines and zero neon.
- Complete elimination of generic round loading wheels ("простых колёс загрузки") across the entire launcher: reusable `PixelLoader` component with animated isometric cubes or 8-step discrete pixel spinners (`image-rendering: pixelated; steps(8)`), replacing round HTML5 circle spinners in `Skin3DViewer`, `ModsPanel`, `OmegaStorePanel`, and global `.spinner` styles.
- **High-Performance 3D Character Stage & Animation Optimizations:**
  - Complete elimination of CSS `filter: drop-shadow` from the live fullscreen WebGL `<canvas>` in `Stage3DLayer.tsx`, preventing massive GPU compositing and per-frame Gaussian blur passes across multi-megapixel resolutions.
  - Hardware-accelerated Three.js ground contact shadow plane directly attached to the 3D scene under character feet, dynamically scaling and fading during jumping/falling with zero CSS compositing overhead, and guarded by delta thresholding (`Math.abs(shadowMat.opacity - target) > 0.02`) to prevent redundant per-frame material uniform dirtying.
  - Elimination of periodic 500ms `setInterval` polling and DOM `getBoundingClientRect()` calls (layout thrashing / reflows), replaced with an efficient `ResizeObserver` on the dock container and debounced window resize listeners.
  - Bounding-box early exit in `isPointerOverCharacter`: cursor position is tested against character AABB bounding limits before initiating Three.js raycasts, completely skipping recursive scene-graph traversal on 99.9% of mousemove events.
  - Early 2D vertical boundary exit in `onWindowPointerMove` and `onWindowPointerDown` (`e.clientY < screenH * 0.45`): completely bypasses all raycasting and 3D matrix math when the cursor is in the upper 45% of the launcher window.
  - Vector reuse (`tempCurWorld`, `tempHitPos`, `tempNDC`, `tempTL`, `tempBR`) and pointermove hover check throttling (~40 FPS) to eliminate heap allocations and garbage collection stutter from high-polling gaming mice.
  - Capped WebGL `pixelRatio` to `1.0` (`Math.min(window.devicePixelRatio || 1, 1.0)`), completely preventing massive 4K fill-rate bottlenecks on HiDPI and scaled Linux displays.
  - Disabled unused Three.js OrbitControls (`enableControls: false`) to eliminate unneeded canvas event listeners and update passes.
  - Adaptive frame rate pacing override in `viewer.draw`: limits WebGL rendering to ~36 FPS during idle/walking and ramps up to ~50 FPS during active cursor dragging, freeing 40%–75% of main-thread and GPU time on 60Hz/144Hz+ monitors while maintaining completely fluid Minecraft motion.
  - Dedicated hardware compositing isolation on the WebGL canvas via `transform: translateZ(0); will-change: transform; contain: strict;` in `layer1-stage.css`, preventing WebKitGTK from repainting the surrounding DOM UI on each render.
  - Cached ground surface support (`isSurfaceDirty`) in `roamingCharacter.ts`, preventing continuous 60 FPS platform array scanning during static `idle` state.
  - Dirty checking on articulated limb joint rotations (`setElbows`, `setKnees`) in `articulatedPlayer.ts` to avoid redundant bone matrix recalculations.
  - Frame-skipping physics accumulator with fixed 60 Hz timestep (`FIXED_STEP = 1/60`) in `roamingCharacter.ts`: completely eliminates slow motion during FPS drops or lag spikes by catching up physics in sub-steps and dropping excess time.
  - Direct WebGL rasterization bypass in `Stage3DLayer.tsx` (`viewer.render = function() { this.renderer.render(...) }`), skipping offscreen render target passes and fullscreen FXAA shaders for ~2x faster rendering.
- **Universal Modrinth & CurseForge Catalog Integration (`ModrinthScreen.tsx`, `catalogService.ts`):**
  - Live unified search service across Modrinth (`/v2/search`) and CurseForge (`/v1/mods/search`) supporting all 4 primary Minecraft content types: Modpacks (`modpacks`), Mods (`mods`), Shaders (`shaders`), and Resource Packs / Textures (`tex`).
  - Pruned legacy mock categories ("Питомцы" and "Косметика") and removed redundant header texts (`Каталог` title and `Готовые сборки...` subtitle) in favor of a sleek, ergonomic dual dock header: Category tabs on the left, Source switcher on the right.
  - Asynchronous request management with 300ms input debouncing, `AbortController` cancellation for fast typing, request sequence guarding (`reqIdRef`), and authentic discrete Minecraft `IsometricCube` loading states with zero neon.
  - Zero-lag infinite scroll pagination (`PAGE_SIZE = 15`) powered by native `IntersectionObserver` with synchronous lock refs (`isLoadingRef`, `isLoadingMoreRef`, `hasMoreRef`), eliminating forced layout reflows on scroll events.
  - High-performance UI architecture: `React.memo(CatalogCard)` prevents existing card re-renders, and CSS `content-visibility: auto; contain-intrinsic-size: auto 142px; contain: layout style paint;` skips rendering offscreen items for smooth 60 FPS scrolling.
  - Strictly uniform card frames (`142px` fixed height) across all mods, modpacks, shaders, and resource packs, with multi-line description truncation ending in ellipsis (`...`) preventing layout shift.
  - Wide ambient blurred backdrop (`.card-ambient-backdrop`) matching reference mockups, softly diffusing the mod's artwork colors with linear gradient masking and lightweight blur (`blur(16px)` instead of `blur(28px)`) for 4x faster GPU compositing without neon violation.
  - Compact vertical loader badge stack (Fabric, Forge, NeoForge, Quilt, etc.) positioned directly under the mod's avatar icon, keeping footers clean and perfectly aligned.
  - Image fallback resilience with automatic error detection falling back to authentic SVG category icons.
  - Loader filtering for Fabric, Forge, NeoForge, and Quilt with sorting by popularity, relevance, and recently updated.
- **Custom UI Components & Native OS Dropdown Replacement:**
  - Replaced native OS/GTK HTML `<select>` elements with custom React dark obsidian dropdown menus (`.sb-folder-dropdown-container`, `.sb-folder-btn`, `.sb-folder-menu`, `.sb-folder-item`) on `InstancesScreen`, eliminating un-stylable bright blue OS popup chrome and matching the launcher's dark obsidian pixel-art aesthetic.
- **TopBar Account Popover & Auth Actions:**
  - Fixed dock popover clipping by removing `overflow: hidden` on `.hud-top-dock.custom-theme-active`.
  - Account popover (`.hud-profile-dropdown`) attaches flush corner-to-corner against the top navigation bar with zero gap (`top: calc(100% + 5px)` and `left: -8px`).
  - Added full-width Microsoft OAuth2 login button (`.ms-btn`) and inline offline account creation (`.offline-btn` / `.hud-acc-offline-form`) matching the dimensions of account items.
  - Dynamically inherits theme colors, grain patterns, borders, and hover states configured in launcher settings (`topBarCustomization`).
- **JVM Arguments & Custom Garbage Collector Execution:**
  - Connected `SettingsScreen` GC presets (`G1GC`, `ZGC`, `Shenandoah`) and custom `jvmArgs` to the native game launch process.
  - `App.tsx` reads persisted launcher settings and forwards `customJvmArgs` through `ipc.launchMinecraft`.
  - Tauri Rust backend (`src-tauri/src/launch.rs`) parses, logs (`[launcher/INFO] Using custom JVM arguments: ...`), and injects custom JVM arguments directly into the spawning `std::process::Command` alongside instance RAM limits.
- **Microsoft Official Capes & 3D Cape Viewer (`StoreScreen`, `Cape3DViewer`, `auth.rs`):**
  - Integrated official Mojang/Microsoft capes API endpoints (`get_microsoft_capes`, `equip_microsoft_cape`, `unequip_microsoft_cape`) in Tauri backend, fetching all licensed player capes directly from `https://api.minecraftservices.com/minecraft/profile` with token auto-refresh and CORS-free data URL texture proxying.
  - Equipping/unequipping saves in real-time to official Mojang servers (`PUT` / `DELETE /minecraft/profile/capes/active`) so capes are immediately visible in-game, on multiplayer servers, and on the launcher's home stage character.
  - Centered offline guard card (`.store-offline-center-card`): when the user has an offline/non-Microsoft account active, the Capes tab displays a centered notice explaining that official capes require a Microsoft account, with a direct "Войти в аккаунт Microsoft" button opening Microsoft OAuth2 login/registration.
  - Dedicated Three.js 3D Cape Component (`Cape3DViewer`): renders Minecraft capes on standard 3D BoxGeometry (`10x16x1`) with `NearestFilter` pixel-art textures, static stable orientation without distracting motion (`animated={false}`), and depth/thickness edge lighting.
  - Automatic artwork face detection (Bedrock vs Java UV layout): Bedrock capes (like Pan Cape) place the artwork on Face 1 (`+Z`, `1..10`), whereas standard Java capes place it on Face 2 (`-Z`, `12..21`). `Cape3DViewer` analyzes pixel color diversity between both faces on an offscreen canvas to dynamically turn the decorated artwork side toward the camera (`baseY = -0.38` for Bedrock, `baseY = Math.PI - 0.38` for Java).
  - Anti-aliasing & True Colors: enabled WebGL MSAA `antialias: true` and removed CSS `image-rendering: pixelated` from the 3D canvas (preserving crisp `NearestFilter` on the texture map while smoothing polygon boundary edges), with calibrated SRGB color space lighting (`ambientLight: 0.85`, `directionalLight: 0.20`, `roughness: 1.0`) preventing washed-out desaturation into grey.
- **Hidden In-Game Cosmetics & Monarch Crown System (`Crown3DViewer`, `cosmetics3D.ts`, `launch.rs`, `omega-crown.jar`):**
  - **Internal Non-Deletable Runtime:** `omega-crown.jar` is stored in the launcher's private system directory (`data_dir/internal/cosmetics/omega-crown.jar`) and embedded directly into the Rust executable via `include_bytes!`. It is NEVER placed into `instances/<id>/minecraft/mods/`, making it impossible for players to accidentally delete or alter it.
  - **Zero Presence in Instance Mod Lists:** `count_installed_mods` and `list_installed_mod_files` only scan `instances/<id>/minecraft/mods/`, ensuring the built-in launcher runtime never pollutes the user's mod count or installed mod files list.
  - **Universal Multi-Loader & Multi-Version Injection on Launch:** Automatically adapts to any Minecraft version across Fabric, Forge, and NeoForge via JVM injection:
    - `-javaagent:<path>=crown` (Universal JavaAgent running on the JVM before any loader initializes).
    - `-Dfabric.addMods=<path>` (Fabric Loader native external mod loading without touching the mods directory).
    - System classpath addition with embedded `META-INF/mods.toml` and `fabric.mod.json` allowing ModLauncher (Forge/NeoForge) and Knot (Fabric) to recognize the container.
    - JVM system properties `-Domega.cosmetics.head=crown` and `-Domega.cosmetics.player=<username>`.
  - **3D Voxel Crown Model (`cosmetics3D.ts`):** Authentic Minecraft 16-voxel model built from `THREE.BoxGeometry` with gold rim, 4 corner peaks, 4 tall center peaks, and 4 ruby gems with metallic sheen and zero neon.
  - **Stage 3D Integration (`Stage3DLayer.tsx`):** Automatically attaches the 3D Crown to `viewer.playerObject.skin.head`, tracking character walking, roaming physics, jumping, head tilting, and mouse look in real time.
  - **Store Integration & 3D Wardrobe Showcase (`StoreScreen.tsx`, `Crown3DViewer.tsx`, `Wardrobe3DViewer.tsx`):**
    - Clean, minimalist card design: displays only the animated 3D Crown preview, the title "Корона Монарха", and the equip action button (star icons, descriptions, subtitles, and rarity badges completely removed).
    - Dedicated static 3D character wardrobe stage (`Wardrobe3DViewer`) on the right side: player stands still in authentic Minecraft posture with current skin and equipped cosmetics.
    - Repositioned "Снять аксессуары" button to the top-left of the cosmetics catalog column, and shifted the 3D wardrobe showcase flush to the top under the header row with zero vertical offset and no intermediate tools row.
    - Synchronized heights of the left tools bar and right wardrobe header (32px), with enlarged full-height framing (camera `Z = 48.0`, card height 440px, width 460px) filling ~88% of vertical viewport without cutoffs or scrolling.
    - Dynamic camera glide & focus: smoothly lerps camera position to close-up head focus when equipping the Crown, with manual toggle tabs for "Голова", "Во весь рост", and "Спина".
    - Single-click equipping/unequipping with instant `omega:cosmetics_updated` event dispatch and persistent storage in `localStorage` (`omega:equipped_cosmetics`).

_Note for Agent: This section must be continuously expanded, refined, and rewritten as the project evolves. Features expand gradually, so always clarify with the user what to implement next._

## Core Agent Workflow

When working on tasks for this repository, the agent MUST follow this strict sequence:

1. **Context & Alignment:** Read the entire relevant project structure, active skills, and memory documentation (in English). **ALWAYS** ask the user what they want to do next and clarify their vision before starting a new feature.
2. **Skill Review:** Check available skills in `.agents/skills` to leverage existing knowledge.
3. **Implementation:** Write the necessary code in TypeScript, strictly adhering to the goals of high optimization and low resource usage.
4. **Self-Verification (Correctness):** Verify the implementation against the original task requirements. Use available validation skills (e.g., Prettier).
5. **Self-Verification (Errors):** Check for potential errors, syntax issues, or logical flaws.
6. **Commit:** Always automatically commit the verified changes with a descriptive message.
7. **Push:** ONLY push changes to the remote repository after receiving explicit approval from the user.

## Continuous Learning & Absolute Automation

- **Proactive Memory Updates:** The agent MUST automatically and constantly update this `AGENTS.md` file to reflect new project decisions, architecture, and current state.
- **Proactive Skill Creation:** The agent MUST automatically create, rewrite, and update skills in the `.agents/skills/` directory as it learns from its own usage and solves problems, without waiting for explicit user commands.

## Mentorship Mode

- **The User is a Beginner:** The user has explicitly stated they are learning to code.
- **Teaching Style:** Do not just write code silently. Explain _how_ and _why_ things work. Break down complex concepts into simple analogies.
- **Step-by-Step:** Guide the user through the process. Encourage them to ask questions and experiment.

## Coding Standards

- **Comments:** NEVER write comments in the code unless absolutely necessary for highly complex logic. If a comment is required, it MUST be written in English. Never write comments in Russian.

## User Environment

- **Editor:** The user is using the **Zed** code editor. Keep this in mind when providing instructions for shortcuts, terminal access, or IDE features.

## Installed Skills & Engineering Tooling

- **Mandatory Skill Review & Usage:** The agent MUST actively inspect and utilize the following specialized skills installed in `.agents/skills/` on EVERY new task, feature, or review:
  - `ui-ux-pro-max`, `design-system`, `ui-styling`, `design`, `brand`, `banner-design`, `slides`: Design Lab & UI/UX engineering intelligence suite. Always consult when designing or refining UI layouts, colors, components, and animations.
  - `senior-frontend`: Advanced React/TypeScript frontend development patterns, accessibility standards, and bundle optimization.
  - `react-best-practices`: 57+ Vercel React and Next.js performance optimization rules (waterfall prevention, bundle size control, rendering and state performance).
  - `prettier-validation`: Formatting and syntax validation for TypeScript and React code.
