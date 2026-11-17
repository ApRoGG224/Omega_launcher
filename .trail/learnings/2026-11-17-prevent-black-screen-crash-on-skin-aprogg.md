---
title: Prevent black screen crash on skin change with ErrorBoundary and Canvas guards
author: ApRoGG
date: 2026-11-17
branch: master
id: l-4dcea6e1
scope: repo
status: active
src: agent
touches:
  - src/components/common/SkinHeadAvatar.tsx
  - src/components/common/Wardrobe3DViewer.tsx
  - src/components/layers/Stage3DLayer.tsx
  - src/components/screens/StoreScreen.tsx
  - src/main.tsx
---

When equipping skins, setting crossOrigin on data: URLs in SkinHeadAvatar and uncaught exceptions in Stage3DLayer/Wardrobe3DViewer loadSkin could crash the React commit phase, leading to a completely blank black screen because there was no React ErrorBoundary. We resolved this by adding a global ErrorBoundary in main.tsx with recovery actions, skipping crossOrigin on data: URLs in SkinHeadAvatar with try-catch on drawImage, wrapping viewer.loadSkin and buildArticulatedLimbs in try-catch in both 3D viewers, and null-guarding activeSkin and recentList string operations in StoreScreen.
