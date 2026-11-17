---
title: Redesign Servers Screen to Settings 2-Column Obsidian Layout
author: ApRoGG
date: 2026-11-17
branch: master
id: l-670dcb0a
scope: repo
status: active
src: agent
touches:
  - ".agents/AGENTS.md"
  - AGENTS.md
  - src/components/screens/ServersScreen.tsx
  - src/styles/servers.css
---

Re-architected ServersScreen.tsx and servers.css into a twin of the SettingsScreen design system: 2-column layout (240px sidebar with navigation, filter pills, assembly switcher and stats, right main card with header, search line, add drawer and matte obsidian server cards). All 38 tests passing and production build verified.
