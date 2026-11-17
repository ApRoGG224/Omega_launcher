---
title: Standardize All Base Buttons and Theme Colors to Settings Screen
author: ApRoGG
date: 2026-11-17
branch: master
id: l-71ea9bb0
scope: repo
status: active
src: agent
touches:
  - ".agents/AGENTS.md"
  - AGENTS.md
  - src/styles/instance-editor.css
  - src/styles/screens.css
  - src/styles/servers.css
  - src/styles/tokens.css
---

Synchronized global design tokens and all base screen buttons across the entire launcher to inherit the Settings screen styling (height 40px, border-radius 11px, background #1a1d24, border rgba(255,255,255,0.08), hover #22262e/rgba(255,255,255,0.22), primary #e6e8ec with dark #0d1117 text). Persisted the rule permanently into AGENTS.md and .agents/AGENTS.md.
