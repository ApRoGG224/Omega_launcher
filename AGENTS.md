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
