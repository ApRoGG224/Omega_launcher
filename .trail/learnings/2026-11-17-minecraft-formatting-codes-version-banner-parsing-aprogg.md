---
title: "Minecraft Formatting Codes & Version Banner Parsing"
author: ApRoGG
date: 2026-11-17
branch: master
id: l-1deb8215
scope: repo
status: active
src: agent
touches:
  - src-tauri/src/network.rs
  - src/components/screens/ServersScreen.test.tsx
  - src/components/screens/ServersScreen.tsx
  - src/styles/servers.css
---

Russian and Spigot Minecraft servers (like SunnyWorld) often hijack the Server Ping version.name field with multi-line marketing banners containing raw section-sign formatting codes (§2⚔§r §e§lSunny§b§lWorld...). In ServersScreen, we now parse formatting codes into colored spans and styles (renderMinecraftFormattedText), sanitize and extract actual version ranges (cleanServerVersion), strip codes for tooltips and search (cleanMinecraftText), and limit chip width with CSS ellipsis. In network.rs, motd_from_chat converts structured chat color and style fields to standard section codes so colors are preserved.
