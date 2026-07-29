# Design Memory

> Captured design decisions to speed up future Design Lab sessions.
> This file is automatically updated after each finalized design session.

## Color Palette

### Primary Colors
| Name | Value | Usage |
|------|-------|-------|
| `primary` | #... | Main actions, links |
| `primary-hover` | #... | Hover state |
| `primary-active` | #... | Active/pressed state |

### Neutral Colors
| Name | Value | Usage |
|------|-------|-------|
| `background` | #... | Page background |
| `surface` | #... | Cards, modals |
| `text-primary` | #... | Primary text |
| `text-secondary` | #... | Secondary text |
| `border` | #... | Borders, dividers |

### Semantic Colors
| Name | Value | Usage |
|------|-------|-------|
| `success` | #... | Success states |
| `warning` | #... | Warning states |
| `error` | #... | Error states |
| `info` | #... | Info states |

## Typography

### Font Families
- **Heading:** [Font Name]
- **Body:** [Font Name]
- **Mono:** [Font Name]

### Type Scale
| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `heading-xl` | 32px | 1.2 | Page titles |
| `heading-lg` | 24px | 1.3 | Section headers |
| `heading-md` | 20px | 1.4 | Subsections |
| `body-lg` | 16px | 1.5 | Large body text |
| `body-md` | 14px | 1.5 | Default body |
| `body-sm` | 12px | 1.4 | Captions, labels |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Tight spacing |
| `space-sm` | 8px | Small gaps |
| `space-md` | 16px | Default spacing |
| `space-lg` | 24px | Section gaps |
| `space-xl` | 32px | Large sections |
| `space-2xl` | 48px | Page sections |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Buttons, inputs |
| `radius-md` | 8px | Cards |
| `radius-lg` | 16px | Modals |
| `radius-full` | 9999px | Pills, avatars |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px ...` | Subtle elevation |
| `shadow-md` | `0 4px 6px ...` | Cards |
| `shadow-lg` | `0 10px 15px ...` | Modals, popovers |

## Component Patterns

### Buttons
- Primary: solid background, white text
- Secondary: border only, no fill
- Ghost: no border, subtle hover background
- Sizes: sm (32px), md (40px), lg (48px)

### Cards
- Background: `surface` color
- Border: 1px `border` color
- Border radius: `radius-md`
- Padding: `space-md` to `space-lg`
- Shadow: `shadow-sm` or `shadow-md`

### Forms
- Label position: above input
- Input height: 40px (md), 32px (sm), 48px (lg)
- Focus ring: 2px primary with 2px offset
- Error state: red border + error message below

## Animation Patterns

### Transitions
- **Hover states:** 150ms ease-out
- **Focus states:** 100ms ease-out
- **Modal open:** 200ms ease-out
- **Modal close:** 150ms ease-in
- **Page transitions:** 300-400ms ease-in-out

### Loading
- Skeleton screens for content loading
- Spinner for button loading (16px)
- Progress bar for file uploads

---

*Last updated: [Date]*
