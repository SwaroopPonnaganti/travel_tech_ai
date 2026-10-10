# Design System

## 1. Colour & theme

**Palette: deep navy-blue surfaces with teal accents.** Dark-first, high-contrast, calm and professional.

### Navy (surfaces, structure)
| Token | Hex | Usage |
|---|---|---|
| `navy-950` | `#070d1f` | App background |
| `navy-900` | `#0a142e` | Cards / sidebar |
| `navy-850` | `#0d1a3a` | Inputs, inset panels |
| `navy-800` | `#102148` | Elevated panels |
| `navy-700` | `#16305f` | Hover / borders |
| `navy-600` | `#1d3f7a` | Brand gradient start |
| `navy-500` | `#27549c` | Highlights |

### Teal (primary accent / actions)
| Token | Hex | Usage |
|---|---|---|
| `teal-400` | `#2dd4bf` | Focus rings, links, active nav |
| `teal-450` | `#25c9b4` | Hover |
| `teal-500` | `#14b8a6` | Primary buttons, brand gradient end |
| `teal-600` | `#0d9488` | Pressed |
| `teal-700` | `#0f766e` | Deep accent |

### Semantic
- **Success / positive:** teal-400/500.
- **Warning:** amber-400 (`#fbbf24`).
- **Critical / danger:** rose-500 (`#f43f5e`).
- **Text:** `slate-100` primary, `slate-300` secondary, `slate-400/500` muted.

### Surfaces & effects
- Background: layered radial gradients (teal top-right, navy left) over `navy-950`, fixed.
- Cards: `bg-navy-900/80`, `1px rgba(255,255,255,0.1)` border, `rounded-2xl`, `shadow-card`.
- Hover: border shifts to `teal-500/40` + soft teal glow.
- Radii: 12px controls, 16px cards, pills for badges/chips.

## 2. Font

- **Body / UI:** `Inter` → system sans fallback stack.
- **Display (headings, numerals):** `Sora` → Inter fallback.
- Numerals in stats use the display font for a crisp dashboard feel.

## 3. Typography scale

| Role | Size | Weight |
|---|---|---|
| Page title (h1) | 1.25–1.5rem (`text-xl`/`text-2xl`) | 700 (bold) |
| Card title (h2) | 1rem (`text-base`) | 600 |
| Body / controls | 0.875rem (`text-sm`) | 400–500 |
| Labels (uppercase) | 0.75rem (`text-xs`) | 600, `tracking-wide` |
| Metric value | 1.5rem (`text-2xl`) | 700 |
| Meta / hints | 0.75rem (`text-xs`) | 400, `slate-400` |

Global spacing rhythm: 4px base; sections stack with `space-y-6`; cards pad `p-5`.

## 4. Accessibility
- Text size scale (S/M/L/XL) via `--app-font-scale` on `<html>`.
- **High contrast** mode: solid background, thicker borders, underlined links, brighter muted text.
- **Reduced motion** mode: animations/transitions collapsed to ~0ms.
- **Reduce transparency** mode: frosted panels become solid.
- Visible focus rings (`teal-400`) on all interactive elements; semantic roles + `aria-live` region.

## 5. Motion & interaction
- Entrance: `fade-up` (opacity + 8px translate, 350ms).
- Loading: `shimmer` skeletons and teal spinners; chat uses a three-dot pulse.
- Transitions: 150–200ms ease, colour/border/shadow only (never layout).
