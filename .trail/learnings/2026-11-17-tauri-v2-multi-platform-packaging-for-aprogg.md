---
title: Tauri v2 multi-platform packaging for Linux Windows and macOS
author: ApRoGG
date: 2026-11-17
branch: master
id: l-5f2cd0e2
scope: repo
status: active
src: agent
touches:
  - ".github/workflows/macos-build.yml"
  - ".github/workflows/release.yml"
  - package-lock.json
  - package.json
---

Synchronized NPM plugin-dialog and plugin-opener versions to match Rust crates to prevent build failures. Built native Linux AppImage locally in target/release/bundle/appimage. Updated .github/workflows/release.yml to enable workflow_dispatch matrix builds for Linux, Windows, macOS ARM64 and macOS x64 with artifact uploads and draft release publishing.
