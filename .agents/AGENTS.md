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
- Clean, modern rounded border UI styling (`border-radius: 6px`–`8px`, `border: 1.5px solid rgba(255,255,255,0.12)`) across all cards, dock, top-bar, instances panel, settings panel, friends panel, and catalog/mods store, eliminating artificial notched SVG borders and clip-paths for crisp rendering matching the settings gear button standard.
- Radiant emerald Minecraft atmosphere background with dynamic radial glow, sunburst rays, and drifting sparkles.
- Balanced top bar layout: friends online pill with mini heads and badge in the top-left, center Omega Launcher badge, and right-hand user profile widget, audio mute toggle, and messages.
- Dual left action cards: Store ("Магазин Omega") and Play with Friends ("Играть с друзьями").
- Interactive Emotecraft-Style Animation Donut Wheel (`AnimationWheelModal`): triggered by holding 'B' (or clicking badge), features a hollow cutout center, no top arrows, dynamic polar mouse angle tracking, and hold-to-select/release-to-play mechanics. Includes 8 smooth Emotecraft animations with native `skinview3d` joint manipulation (Wave, Clap, Point, Bow, Shrug, Facepalm, Disco, Twerk) with clean skeletal resets and zero artificial child mesh geometry artifacts.
- Dedicated Omega Store (`OmegaStorePanel`, tab `"store"`) focused purely on Skins and Official Capes: online skin search by player nickname with in-game account synchronization and preset catalog of famous players (Notch, Dream, Technoblade, etc.), plus official Microsoft/Mojang/Minecon capes (Migrator, 15th Anniversary, Vanilla, Cherry Blossom, Twitch, TikTok, Mojang Studios, MCC Prismarine, Minecon). All distracting launcher theme switchers removed in favor of a unified emerald aesthetic.

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

