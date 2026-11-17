---
title: Restore Servers Screen Layout with Settings Colors and Icons
author: ApRoGG
date: 2026-11-17
branch: master
id: l-72a3d789
scope: repo
status: active
src: agent
touches:
  - ".agents/AGENTS.md"
  - AGENTS.md
  - src/components/screens/ServersScreen.tsx
  - src/styles/servers.css
---

Restored the ergonomic single-column structure of ServersScreen (header bar without back button, assembly hero banner, toolbar with filter tabs and search, and server cards list) while strictly standardizing all colors (matte obsidian #07090d/#0d1117/#0a0d12/#090c11), borders, and icons/buttons (40px height, 11px radius, #1a1d24/#22262e, primary #e6e8ec) to match Settings.
