# Omega Launcher

Omega Launcher is a desktop Minecraft launcher built with Tauri 2, Rust, React, TypeScript, and Vite. The interface is available in Russian and English and supports customizable accent colors.

## Features

- Create and manage separate Minecraft instances with configurable game versions, mod loaders, memory, and instance icons.
- Launch Minecraft with Microsoft or offline accounts, automatically install the required Java runtime, and view live game logs.
- Browse Modrinth projects and install or update mods, resource packs, shaders, data packs, and modpacks.
- Import instances from Prism Launcher, CurseForge, Modrinth `.mrpack`, and Omega `.omega` archives; export supported modpack formats.
- Save multiplayer servers, check server status and player counts, and launch an instance directly to a server.
- Sign in to an Omega account to use profiles, friend codes, friend requests, online status, and join-game invitations.
- Arrange and resize dashboard panels, including recent instances, servers, friends, and the game console.
- Configure launcher language, accent color, and whether the launcher closes after the game starts.

## Project Structure

- `src/` contains the React and TypeScript interface, shared styles, translations, hooks, and frontend services.
- `src-tauri/` contains the Rust backend, native Tauri configuration, Minecraft installation and launch logic, and platform assets.
- `supabase/migrations/` contains the versioned database schema for Omega accounts and friends.
- `docs/` contains implementation notes and technical documentation.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite development server. For a production frontend build, run:

```bash
npm run build
```

Run the Rust checks from `src-tauri/`:

```bash
cargo check
```

## Omega Accounts and Database

Cloud account and friend features use Supabase Authentication, Postgres, and Realtime. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to enable them. Apply schema changes through new numbered SQL files in `supabase/migrations/`; do not edit migrations that have already been applied.

Migration helpers require `just` and `SUPABASE_ACCESS_TOKEN`:

```bash
just migration
just migration-status
just migration-new descriptive_name
```

## Releases

Release automation builds installers for Windows, Linux, and macOS when a `v*` tag is pushed. See the `justfile` for version and release commands.
