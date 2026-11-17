---
title: "Purge legacy CSS overrides, replace native selects with obsidian dropdowns, and clean UI buttons"
author: ApRoGG
date: 2026-11-17
branch: master
id: l-a22abaf4
scope: repo
status: active
src: agent
touches:
  - src/components/screens/InstancesScreen.tsx
  - src/components/screens/ModrinthScreen.tsx
  - src/components/screens/ServersScreen.tsx
  - src/styles/screens.css
  - src/styles/servers.css
---

Purged obsolete !important .srv- rules in screens.css that caused double search borders and right card edge clipping in ServersScreen. Replaced native OS select elements in ServersScreen and ModrinthScreen with custom dark obsidian dropdown menus. Removed redundant title header from ServersScreen, and removed Edit and Shortcut buttons from instance cards in InstancesScreen.
