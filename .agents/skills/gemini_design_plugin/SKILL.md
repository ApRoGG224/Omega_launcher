---
name: gemini-design-plugin
description: Complete design exploration workflow (Design Lab) for UI components and pages, including preflight detection, design interview, multi-variant generation, browser review, feedback synthesis, and design plan/memory generation.
---

# Gemini Design Plugin (Design Lab Workflow)

This skill provides a complete design exploration workflow for building UI components and pages in web applications.

## Overview & Capabilities

Design Lab generates **multiple distinct UI variations** for any component or page, allows side-by-side browser review, collects feedback, and synthesizes refined versions until the desired result is achieved.

## Core Phases & Instructions

### PHASE 0: PREFLIGHT DETECTION
Before asking any questions, automatically detect and report:
1. **Package Manager:** Check for lock files (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`).
2. **Framework:** Check for config files (`next.config.js`, `vite.config.ts`, `remix.config.js`, `astro.config.mjs`, `tauri.conf.json`).
3. **Styling System:** Check `package.json` and config/CSS files for Tailwind, CSS Modules, MUI, Chakra, styled-components, or Vanilla CSS.
4. **Design Tokens:** Read CSS variables, theme files, or Tailwind config to extract:
   - Color palette
   - Typography scale
   - Spacing values
   - Border radius values
   - Shadow definitions

Report findings to the user and confirm before proceeding.

### PHASE 1: INTERVIEW
Ask key questions one step at a time:
1. **Scope:** Is this a single component or a full page/view? New feature or redesign?
2. **Pain Points:** What are the top pain points or things to avoid?
3. **Inspiration:** What products/brands serve as visual inspiration?
4. **Brand Feel & Density:** Describe brand feel (adjectives) and density preference (Compact/Comfortable/Spacious).
5. **Target User & Context:** Who is the primary user and what is the device context (Desktop/Mobile/Both)?
6. **Constraints:** Technical or design constraints (e.g. WCAG AA, color scheme, no new packages).

### PHASE 2: GENERATE DESIGN BRIEF
Synthesize the interview into `.gemini-design/design-brief.json`.

### PHASE 3: GENERATION (5 VARIANTS)
Create 5 distinct UI variations exploring different approaches:
- **Variant A:** Hierarchy Focus & Proximity
- **Variant B:** Layout Exploration (Cards vs List vs Table vs Split-pane)
- **Variant C:** Density Variation (Compact vs Spacious)
- **Variant D:** Interaction Model & States Focus
- **Variant E:** Expressive Brand Expression

*CRITICAL:* All variants must strictly adhere to the project's existing styling system and design tokens.

### PHASE 4: PRESENT & REVIEW
Direct the user to inspect variants in the dev server / preview, collect feedback on what works and what needs adjustment.

### PHASE 5: REFINEMENT
Synthesize user feedback into a refined variant until full approval is given.

### PHASE 6: FINALIZE & CLEANUP
1. Clean up temporary lab files.
2. Create `DESIGN_PLAN.md` with implementation steps, component API, accessibility checklist, and testing guidance.
3. Create/update `DESIGN_MEMORY.md` with extracted colors, typography, spacing scale, and component patterns.

## Design Principles
- **Cognitive Load:** Minimize. Group related items. Use progressive disclosure.
- **Feedback:** Interactive states for hover, active, focus, loading, success, error.
- **Accessibility:** WCAG AA contrast (4.5:1 text min), 44px touch targets, semantic HTML elements, visible 2px focus ring.
- **Motion:** 150-200ms ease-out for micro-interactions, 300-400ms ease-in-out for transitions.
