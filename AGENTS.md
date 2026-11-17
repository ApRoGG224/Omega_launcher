# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the React + TypeScript UI (`App.tsx`, `main.tsx`, shared styles, and i18n helpers).
- `src-tauri/` contains the Rust backend, Tauri config, native assets, and app capabilities.
- Keep frontend-only logic in `src/` and Tauri/native integration in `src-tauri/src/`.
- Static icons and platform assets live under `src-tauri/icons/`.

## Build, Test, and Development Commands

- `npm install` — install frontend dependencies.
- `npm run dev` — start the Vite dev server for the UI.
- `npm run build` — type-check the frontend and produce a production build.
- `npm run preview` — preview the production build locally.
- `npm run tauri` — run the Tauri CLI for native app tasks.
- Rust-side checks should be run from `src-tauri/` when needed, for example with `cargo check` or `cargo test`.
- `just build` — apply pending Supabase migrations, then build frontend + run tests + `cargo check` (needs `just` and `SUPABASE_ACCESS_TOKEN` in `.env`).
- `just migration` / `just migration-new <name>` / `just migration-status` / `just migration-import` — Supabase DB migrations.

## Database Migrations

- DB schema is managed via numbered SQL files in `supabase/migrations/` (applied in order by `scripts/migrations.mjs`).
- NEVER edit an already-applied migration. Add a new `NNNN_description.sql` file via `just migration-new <name>` instead.
- If a DB change was ever applied manually outside migrations, use `just migration-import` to mark current files as applied before relying on `just migration`.

## Coding Style & Naming Conventions

- Use TypeScript with React function components and explicit, readable props/state names.
- Follow the existing formatting style: 2-space indentation in frontend code, short imports, and small focused components.
- Prefer `PascalCase` for React components, `camelCase` for variables/functions, and descriptive file names.
- Keep Rust code idiomatic and small; separate pure logic from Tauri command handlers where possible.

## Testing Guidelines

- No dedicated test runner is currently defined in `package.json`.
- Before opening a PR, at minimum run `npm run build`.
- If you touch native code, also run the relevant Cargo checks in `src-tauri/`.
- Add tests near the code they cover when introducing new test infrastructure.

## Commit & Pull Request Guidelines

- Recent commits use short conventional prefixes like `feat:` and `fix:` with a clear scope when useful.
- Keep commits focused on one change.
- PRs should include a concise summary, validation steps, and screenshots or screen recordings for UI changes.
- Mention any platform-specific impact, especially for Windows, Linux, or macOS packaging behavior.
- **IMPORTANT: The user has requested that every change made during a working session must be committed and pushed to `origin/master` (github.com/ApRoGG224/Omega_launcher, auth via `gh` at `~/.local/bin/gh`).** After completing any task or logical group of changes: run `npm run build` (+ `cargo check` in `src-tauri` if native code touched), then `git add -A`, commit with a conventional message describing the bug fix / feature, and `git push origin HEAD`. Do not wait to be asked.

## Agent-Specific Instructions

- Check for an existing `AGENTS.md` before creating or editing it.
- Avoid overwriting user changes in unrelated files.
- Prefer small, repo-local edits that preserve the current architecture.
- **ABSOLUTE MANDATORY SKILLS RULE (БЕЗ ИСКЛЮЧЕНИЙ)**:
  Агент ОБЯЗАН БУКВАЛЬНО ВСЕГДА — на любой задаче, даже когда кажется, что это не нужно, не обязательно или не хочется — активно открывать и применять следующие скилы:
  1. **Навигация, поиск и память проекта (`trail` / `graft`)**:
     - **СТРОГО ЗАПРЕЩЕНО** начинать поиск вслепую через обычный `find` или `grep`.
     - **ВСЕГДА** начинать поиск с `trail ask "<запрос>"` или `trail grep` для мгновенного нахождения точных файлов и строк (`file:line`).
     - Использовать `trail skeleton <file>` и `trail callers <symbol>` для изучения структуры до редактирования.
     - Фиксировать ключевые архитектурные решения через `trail note`.
  2. **Фронтенд, UI/UX и валидация кода (все 6 обязательных скилов из `.agents/skills/`)**:
     - `ui-ux-pro-max`: строгий контроль UI/UX, контрастности, доступности, пиксель-арт эстетики и железное соблюдение правила **NO NEON** (никаких неоновых подсветок и размытий).
     - `react-best-practices`: 57+ правил оптимизации Vercel React/Next (мемоизация `useCallback`/`useMemo`, `useRef` для синхронных флагов, обязательная очистка таймеров/листенеров `on unmount`, защита от лишних ре-рендеров).
     - `senior-frontend`: архитектурные паттерны, строгий TypeScript без `any`, обработка граничных условий.
     - `ui-styling`: системная стилизация, obsidian/stone палитры, адаптивные сетки.
     - `design-system`: 3-слойные дизайн-токены (цвета, отступы, шрифты, радиусы), компонентные спецификации.
     - `prettier-validation`: обязательная проверка чистоты форматирования, корректности и синтаксиса TypeScript.
- **Mentorship Mode**: The user is learning to code. Explain how and why solutions work in clear Russian with helpful analogies, while keeping all source code comments strictly in English.

## Unified Design System & Base Button Standard (Settings Archetype)

- **Settings Design System as the Single Source of Truth**:
  - All launcher buttons, input fields, cards, and navigation controls across all screens must strictly inherit the base styling of the Settings screen (`SettingsScreen.tsx` / `.set-b`, `.set-nav button`, `.set-seg button`, `.set-card`, `.set-input`).
  - **Base Button Specs (`.btn-base`, `.btn-default`, `.screen-back-btn`, `.sb-btn`, `.set-b`)**:
    - Height: `40px` (or min-height `40px`).
    - Border radius: `11px` (`--btn-radius`).
    - Background: `#1a1d24` (`--btn-bg-default`).
    - Border: `1px solid rgba(255, 255, 255, 0.08)` (`--btn-bc-default`).
    - Text color: `#e6e8ec` (`--btn-text-default`), font-weight `600`, font-size `13px`.
    - Hover state: Background `#22262e` (`--btn-bg-hover`), border `1px solid rgba(255, 255, 255, 0.22)` (`--btn-bc-hover`), text `#ffffff`.
    - Active state: `transform: translateY(1px)`.
  - **Primary Action Buttons (`.btn-primary`, `.btn-go`, `.set-b.go`, `.srv-btn-save`)**:
    - Background: `#e6e8ec` (`--btn-bg-primary`).
    - Border: `1px solid #ffffff` (`--btn-bc-primary`).
    - Text color: `#0d1117` (`--btn-text-primary`), font-weight `700`.
    - Hover state: Background `#ffffff`, text `#0d1117`.
  - **Delete/Danger Buttons (`.btn-delete`, `.srv-btn-delete`)**:
    - Border radius: `11px`.
    - Background: `rgba(239, 68, 68, 0.12)`.
    - Border: `1px solid rgba(248, 113, 113, 0.25)`.
    - Text color: `#f87171`.
    - Hover state: Background `rgba(239, 68, 68, 0.22)`, border `#ef4444`, text `#ffffff`.
  - **Color Palette & Dark Obsidian Theme**:
    - Global Canvas: `#090c11` (`--bg-canvas`).
    - Surface / Cards: `#0d1117` (`--bg-surface`, `--bg-plate`) with `14px` - `18px` border-radius and `1px solid rgba(255, 255, 255, 0.08)`.
    - Inner Rows / Containers: `#0a0d12` (`--bg-row`) with `14px` border-radius.
    - Inputs: `#090c11` with `11px` radius and `1px solid rgba(255, 255, 255, 0.08)`.
    - Hover Surface: `#121721` with border `rgba(255, 255, 255, 0.22)`.
    - Strictly **NO NEON**: no glowing seams, radioactive text-shadows, or bright neon badges.

