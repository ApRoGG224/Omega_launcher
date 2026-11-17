---
title: Make MenuCustomizerModal fit screen with responsive compact styling
author: ApRoGG
date: 2026-11-17
branch: master
id: l-c1ea8655
scope: repo
status: active
src: agent
touches:
  - src/components/common/MenuCustomizerModal.tsx
  - src/styles/menu-customizer.css
---

The style customizer card exceeded viewport height on Linux webview because of fixed 290px canvas and unconstrained container height without overflow rules. We added max-height calc(100vh - 24px), overflow-y auto with margin auto, and reduced canvas and gap spacing so all controls fit completely on screen.
