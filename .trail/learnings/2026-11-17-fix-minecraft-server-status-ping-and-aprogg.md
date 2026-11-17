---
title: Fix Minecraft Server Status Ping and Clean UI
author: ApRoGG
date: 2026-11-17
branch: master
id: l-92ab93f1
scope: repo
status: active
src: agent
touches:
  - src-tauri/src/network.rs
  - src/App.tsx
  - src/components/layers/HudLayer.tsx
  - src/components/modals/OmegaLoginModal.tsx
  - src/components/screens/AccountsScreen.tsx
  - src/components/screens/InstancesScreen.tsx
  - src/components/screens/ServersScreen.test.tsx
  - src/components/screens/ServersScreen.tsx
---

Handshake packet requires VarInt 0x00 as packet ID before protocol version 47. Purged all sci-fi corner bracket styles, pixel plates, and removed redundant back button from ServersScreen.
