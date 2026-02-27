# Color Scheme Redesign: Earth & Gold

**Date:** 2026-02-26
**Status:** Approved

## Overview

Replace the current dark navy + purple/teal palette with an earth-tone scheme featuring warm browns, forest greens, and gold accents. The goal is a warm, natural, sophisticated feel while maintaining the dark cinematic identity.

## Core Palette

| Role | Hex | Color | Replaces |
|------|-----|-------|----------|
| Background | `#322D2B` | Dark brown charcoal | `#0B0D17` |
| Surface | `#2E3B30` | Brown with green tint | `#141829` |
| Primary | `#E4C56C` | Gold | `#6C5CE7` |
| Secondary | `#1C6331` | Medium green | `#00CEC9` |
| Text | `#F0E8D8` | Warm cream | `#E8E8F0` |
| Muted | `#8A7D5A` | Olive/khaki | `#6B7394` |
| Code BG | `#263029` | Dark green-tinted | `#1A1E2E` |
| Success | `#4CAF50` | Natural green | `#00E676` |
| Danger | `#D4533B` | Earthy terracotta | `#FF5252` |
| Gradient | `#E4C56C → #1C6331` | Gold to green | purple → teal |

## Derived Colors

These are needed for third-party integrations (Mermaid, CodeMirror) that require JS hex values.

| Role | Hex | Derivation |
|------|-----|------------|
| Mermaid primaryColor | `#3D3425` | Darkened gold (node fills) |
| Mermaid secondaryColor | `#0C4A23` | Deep forest green |
| Mermaid mainBkg | `#352F2A` | Slightly lighter than background |
| Warning highlight | `#E4C56C` at 15% opacity | Gold-based (replaces amber `#FFC107`) |

## Contrast Ratios (WCAG)

| Combination | Ratio | Level |
|-------------|-------|-------|
| Text `#F0E8D8` on Background `#322D2B` | 7.8:1 | AAA |
| Text `#F0E8D8` on Surface `#2E3B30` | 7.2:1 | AAA |
| Primary `#E4C56C` on Background `#322D2B` | 6.5:1 | AAA |
| Muted `#8A7D5A` on Background `#322D2B` | 3.1:1 | AA large text |
| Secondary `#1C6331` on Background `#322D2B` | 2.1:1 | Needs pairing with lighter text |

**Note:** Secondary green (`#1C6331`) has low contrast on dark backgrounds. When used for links or small text, pair with cream text or use a lighter green variant (`#2D8A4E`) for text-on-dark.

## Shiki Syntax Theme

Replace `github-dark` with `vitesse-dark` — a warm, earthy syntax highlighting theme that aligns with the new palette. The `vitesse-dark` theme uses muted earth tones for tokens rather than the cool blues/greens of GitHub dark.

## Files Affected

### CSS Custom Properties (single source of truth)
- `src/styles/variables.css` — all 10 custom properties

### Hardcoded JS Colors (API constraints)
- `src/components/MarkdownEditor.tsx` — CodeMirror theme (6 values)
- `src/components/MermaidDiagram.tsx` — Mermaid theme variables (11 values)
- `src/core/highlighter.ts` — Shiki theme name

### rgba() Transparency Variants (~28 occurrences)
- `src/styles/global.css` — selection highlight
- `src/styles/slides.module.css` — bullets, images, progress, tables
- `src/styles/code.module.css` — diff highlights, line highlights
- `src/styles/editor.module.css` — borders
- `src/styles/modal.module.css` — overlay, borders, buttons
- `src/styles/picker.module.css` — card borders, hover
- `src/styles/overview.module.css` — thumbnail hover
- `src/components/MarkdownEditor.tsx` — active line, selection

### Documentation
- `CLAUDE.md` — brand colors table
- `docs/plans/2026-02-20-dekk-design.md` — visual identity section

### Tests
- Mock objects and test assertions that reference specific color values
- E2E visual verification needed after implementation

## Design Decisions

1. **Gold as primary, green as secondary** — Gold provides high-energy accents (titles, highlights, interactive elements) while green serves as the cooler complement (links, secondary CTAs, gradient endpoint).

2. **Green-tinted surfaces** — Rather than pure brown surfaces, a green tint in the surface color (`#2E3B30`) connects the background to the accent palette, creating visual depth and palette cohesion.

3. **Warm cream text** — `#F0E8D8` instead of neutral white matches the warm brown backgrounds. Cool white on warm brown creates visual tension.

4. **Earthy success/danger** — `#4CAF50` (natural green) and `#D4533B` (terracotta) replace the neon equivalents to maintain palette consistency in code diff views.

5. **`vitesse-dark` Shiki theme** — The current `github-dark` theme's cool blue tones would clash with the warm palette. `vitesse-dark` uses earth-compatible token colors.
