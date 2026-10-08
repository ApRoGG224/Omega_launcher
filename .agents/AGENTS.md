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
- Authentic Minecraft stepped notched pixel-art UI styling standardized across the entire launcher with a uniform 6px border-width, 6-slice SVG (`24x24`), and 3px polygon clip-path formula, completely eliminating corner protrusion artifacts ("кусочки") on buttons, cards, docks, top bar, instances, friends, store, and settings menus.
- Radiant emerald Minecraft atmosphere background with dynamic radial glow, sunburst rays, and drifting sparkles.
- Top bar with stepped notched widgets: friends online pill with red badge, user profile dropdown, square action buttons (Audio Mute, Stats, Messages with badge), bright lime-green Protection/Bug button with bottom-right cyan `+50` badge, and Settings gear button.
- Dual left action cards: Store ("Магазин Omega") and Play with Friends ("Играть с друзьями").
- Stepped notched Launch Dock: royal blue version selector (`#1d5dc7`) with crisp square 90° icon box (`.millida-dock-cube-icon`) for the custom 3D isometric Minecraft grass block icon, and pastel lilac/purple Play button (`#9f75ff`) with black pixel play icon (`▶`) and bold "Играть".
- Animation wheel (`AnimationWheelModal`) and skeletal Emotecraft animation listeners completely removed to ensure zero runtime lag and 60 FPS UI responsiveness.
- Dedicated Omega Store (`OmegaStorePanel`, tab `"store"`) focused purely on Skins and Official Capes: online skin search by player nickname with official Microsoft Account skin upload/sync via Mojang API (`POST /minecraft/profile/skins`) preserving player's active nickname without renaming the account, visible across all launchers and multiplayer servers, and official Microsoft/Mojang/Minecon capes (Migrator, 15th Anniversary, Vanilla, Cherry Blossom, Twitch, TikTok, Mojang Studios, MCC Prismarine, Minecon).
- Automatic reconciliation of Microsoft account profiles with `ms_auth.json` (`getCachedMicrosoftAccount`) preventing accidental nickname corruption, and strict protection against nickname changes on licensed accounts.
- Online skins catalog integration (54,000+ skins) via Rust Tauri commands `fetch_minecraft_inside_skins` and `fetch_skin_as_data_url` with zero CORS issues, 3D skin render previews, search by nickname/query ("Какой скин ты ищешь?"), authentic stepped-notch Minecraft pixel-art pagination bar with hidden browser spinner controls, preserving scroll position when paging.
- Recent skins history ("Недавние скины") stored persistently in `localStorage` (`omega:recent_skins`, up to 30 skins) tracking worn skins with relative timestamp badges ("только что", "5 мин назад", etc.), single-click re-equipping, individual deletion, clear-history actions, and seamless integration with 3D character preview.

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

- `ui-ux-pro-max`, `design-system`, `ui-styling`, `design`, `brand`, `banner-design`, `slides`: Design Lab & UI/UX engineering intelligence suite.
- `senior-frontend`: Advanced React/TypeScript frontend development patterns, accessibility standards, and bundle optimization.
- `react-best-practices`: 57+ Vercel React and Next.js performance optimization rules (waterfall prevention, bundle size control, rendering and state performance).
