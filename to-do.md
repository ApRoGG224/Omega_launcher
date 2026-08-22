# To-Do: AuthKit-style spotlight / glow effect on Home Screen

## Reference
Screenshot: `/home/bogdan/Картинки/Screenshots/Снимок экрана_20260822_133800.png`

The reference shows:
- Dark (`#05060f`) background
- A centered logo/icon at the top middle
- A wide, soft **white/light-blue spotlight cone** radiating downward from the icon
  (like a stage light hitting from above-center, fading out radially)
- Subtle corner decorations (small `<>` glyphs)
- Text content sitting on top of the glow

## What to implement

### 1. `HomeDashboard.tsx` — add glow overlay element
- Add a `<div className="home-glow-overlay">` as the **first** child inside `.home-sketch-dashboard`
- Inside it: a `<div className="home-glow-icon">` containing the launcher icon (`128x128.png`)
- The overlay is `position: absolute; inset: 0; pointer-events: none; z-index: 0`
- All existing panels must sit on `position: relative; z-index: 1`

### 2. `App.css` — glow styles
- `.home-glow-overlay` — absolute overlay, flex, center-top aligned
- `.home-glow-icon img` — drop-shadow with blueprint-blue + void-violet glow
- `.home-glow-overlay::after` — radial-gradient ellipse spreading downward as spotlight cone

### 3. z-index management
- Ensure existing panels in HomeDashboard are above the glow overlay

## Done checklist
- [ ] `home-glow-overlay` div added to HomeDashboard.tsx
- [ ] Launcher icon displayed at top-center of home screen
- [ ] Spotlight cone CSS radiating downward from icon
- [ ] Icon has glow/drop-shadow matching AuthKit palette
- [ ] No existing panels displaced
- [ ] `npm run build` passes
- [ ] Committed & pushed
