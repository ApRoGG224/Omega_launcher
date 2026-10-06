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
- Stepped pixel-art notched corner UI styling (8px and 4px step cutouts using 9-slice SVG border-image) across cards, dock, top-bar, instances panel, settings panel, friends panel, and catalog/mods store, maintaining a strict non-rounded square aesthetic.
- Radiant emerald Minecraft atmosphere background with dynamic radial glow, sunburst rays, and drifting sparkles.
- Balanced top bar layout: friends online pill with mini heads and badge in the top-left, center Omega Launcher badge, and right-hand user profile widget, audio mute toggle, and messages.
- Dual left action cards: Store ("Магазин Omega") and Play with Friends ("Играть с друзьями").
- Interactive Procedural Animation Wheel (`AnimationWheelModal`) triggered by pressing 'B' (or clicking the on-screen badge), supporting Take the L, Get Griddy, Twerk, Floss, Gangnam Style, Dab, Wave, Disco, Clap, and Zombie with clean skeletal joint resets in Three.js/skinview3d.
- Dedicated Omega Store (`OmegaStorePanel`, tab `"store"`) with three tabs: Skins (popular presets + custom PNG upload + model switch + 3D live viewport), Accessories (cape collection + custom cape upload + visibility toggle + back-facing 3D stage), and Launcher Customization (neon themes, base themes, custom accent color, atmosphere particle toggles).
- Polished pixel-notched launch dock with deep navy instance selector, rich 3D isometric shaded block icon, loader/version chips, and vibrant lime-green Play button ("▶ Играть").
- Stepped notched styling across "Ваши сборки" (InstancesPanel), "Настройки" (SettingsPanel), "Друзья" (FriendsTab), "Каталог" (CatalogTabs & ModsPanel), and "Магазин Omega" (OmegaStorePanel).

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

