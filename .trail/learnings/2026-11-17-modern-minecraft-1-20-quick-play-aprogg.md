---
title: Modern Minecraft 1.20+ Quick Play and Address Sanitization for Direct Server Connect
author: ApRoGG
date: 2026-11-17
branch: master
id: l-a0f66649
scope: repo
status: active
src: agent
touches:
  - src-tauri/src/launch.rs
  - src/App.tsx
  - src/components/screens/ServersScreen.test.tsx
  - src/components/screens/ServersScreen.tsx
---

Resolved issue where clicking Play on a server launched Minecraft but opened the Main Menu instead of connecting. Root cause: Mojang deprecated and removed --server and --port CLI options starting in Minecraft 1.20 (23w14a), replacing them with unified --quickPlayMultiplayer <host:port>. Pre-1.20 versions still require --server and --port. Added is_quick_play_version detection in launch.rs and parse_server_address / sanitizeServerAddress to strip URL schemes, paths, and trailing slashes.
