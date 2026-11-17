---
title: Account deletion button in HudLayer dropdown and full i18n parity
author: ApRoGG
date: 2026-11-17
branch: master
id: l-af611376
scope: repo
status: active
src: agent
touches:
  - src/App.tsx
  - src/components/common/MenuCustomizerModal.tsx
  - src/components/layers/HudLayer.tsx
  - src/components/modals/ImportModal.tsx
  - src/components/modals/InstanceEditorModal.tsx
  - src/components/modals/OmegaLoginModal.tsx
  - src/components/screens/AccountsScreen.tsx
  - src/components/screens/FriendsScreen.tsx
  - src/components/screens/InstancesScreen.tsx
  - src/components/screens/ServersScreen.tsx
---

Added compact delete button next to each account item in the HudLayer topbar dropdown (when accounts.length > 1) with confirmation dialog, and completed 100% localization parity across Ukrainian, English, and Russian for all launcher screens.
