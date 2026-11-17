---
title: Assembly servers.dat integration and direct server launch architecture
author: ApRoGG
date: 2026-11-17
branch: master
id: l-9aaf0174
scope: repo
status: active
src: agent
touches:
  - src/components/screens/ServersScreen.tsx
  - src/styles/screens.css
  - src-tauri/src/servers.rs
  - src-tauri/src/network.rs
---

Implemented assembly servers.dat NBT parsing and writing via src-tauri/src/servers.rs, real-time Minecraft server ping in src-tauri/src/network.rs with connect timeouts, and React memoized ServersScreen.tsx with isolated 60-second auto-refresh and direct game launch (--server and --port args).
