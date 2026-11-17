---
title: Wardrobe skin persistence and Microsoft / Ely.by sync
author: ApRoGG
date: 2026-11-17
branch: master
id: l-1a8b6747
scope: repo
status: active
src: agent
touches:
  - src/App.tsx
  - src/components/layers/ScreensLayer.tsx
  - src/components/screens/StoreScreen.tsx
  - src/i18n.ts
---

Equipped skins in StoreScreen were previously only stored in in-memory state, which caused skins to reset on reload and fail to sync with Mojang or Ely.by. We fixed this by making handleEquipSkin async and syncing to Mojang API via ipc.uploadMicrosoftSkin when the active account is Microsoft, while persisting to omega:ely_skin and omega:activeSkinUrl in localStorage for offline accounts. Recent skins now support single-click re-equipping, individual deletion, and custom PNG uploads.
