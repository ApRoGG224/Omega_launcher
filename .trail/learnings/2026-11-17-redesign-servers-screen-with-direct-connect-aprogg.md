---
title: "Redesign Servers Screen with Direct Connect, Live Ping Preview, Sorting and Obsidian Standard"
author: ApRoGG
date: 2026-11-17
branch: master
id: l-fb8d1de1
scope: repo
status: active
src: agent
touches:
  - src/components/screens/ServersScreen.test.tsx
  - src/components/screens/ServersScreen.tsx
  - src/styles/servers.css
---

Redesigned ServersScreen.tsx and servers.css adhering strictly to the Settings dark obsidian design system and zero neon rule. Added Direct Connect modal for fast IP connection without saving, Add/Edit server modal with live ping preview before saving, server sorting (default, ping, players, name), player capacity progress gauge, and status badges. All 40/40 tests passing.
