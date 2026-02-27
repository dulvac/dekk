# Color Scheme Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dark navy + purple/teal color scheme with an earth-tone palette (brown backgrounds, gold primary, green secondary, warm cream text).

**Architecture:** All brand colors are defined as CSS custom properties in `variables.css`. Most of the codebase references these variables. However, CodeMirror, Mermaid, and rgba() transparency variants use hardcoded hex/RGB values that must be updated manually. The Shiki syntax theme changes from `github-dark` to `vitesse-dark`.

**Tech Stack:** CSS custom properties, Shiki, Mermaid.js, CodeMirror 6

**Design doc:** `docs/plans/2026-02-26-color-scheme-redesign.md`

---

### Task 1: Update CSS Custom Properties (Source of Truth)

**Files:**
- Modify: `src/styles/variables.css:1-40`

**Step 1: Update all color variables**

Replace the color block (lines 2-11) with:

```css
  /* Colors */
  --mp-bg: #322D2B;
  --mp-surface: #2E3B30;
  --mp-primary: #E4C56C;
  --mp-secondary: #1C6331;
  --mp-text: #F0E8D8;
  --mp-muted: #8A7D5A;
  --mp-success: #4CAF50;
  --mp-danger: #D4533B;
  --mp-code-bg: #263029;
```

**Step 2: Run build to verify no breakage**

Run: `npm run build`
Expected: Build succeeds (no CSS parse errors)

**Step 3: Commit**

```
git add src/styles/variables.css
git commit -m "feat(colors): update CSS custom properties to earth & gold palette"
```

---

### Task 2: Update rgba() Variants in CSS Files

All rgba() values that reference old brand colors must be updated to use the new palette's RGB channels.

**Files:**
- Modify: `src/styles/global.css:21`
- Modify: `src/styles/slides.module.css:84,112,157,216,224,229,233,237`
- Modify: `src/styles/code.module.css:5,65,69,73,86,90`
- Modify: `src/styles/editor.module.css:14,22`
- Modify: `src/styles/modal.module.css:7,16,21,77,99,109,154,164`
- Modify: `src/styles/picker.module.css:41,51,54`
- Modify: `src/styles/overview.module.css:25`

**Color mapping for rgba() values:**

| Old RGB | Old Hex | New RGB | New Hex | Role |
|---------|---------|---------|---------|------|
| `108, 92, 231` | `#6C5CE7` | `228, 197, 108` | `#E4C56C` | Primary |
| `107, 115, 148` | `#6B7394` | `138, 125, 90` | `#8A7D5A` | Muted |
| `11, 13, 23` | `#0B0D17` | `50, 45, 43` | `#322D2B` | Background |
| `20, 24, 41` | `#141829` | `46, 59, 48` | `#2E3B30` | Surface |
| `0, 230, 118` | `#00E676` | `76, 175, 80` | `#4CAF50` | Success |
| `255, 82, 82` | `#FF5252` | `212, 83, 59` | `#D4533B` | Danger |
| `255, 193, 7` | `#FFC107` | `228, 197, 108` | `#E4C56C` | Warning (use primary gold) |
| `0, 0, 0` | black | `0, 0, 0` | black | Keep as-is (shadows) |
| `255, 255, 255` | white | `255, 255, 255` | white | Keep as-is (subtle tints) |

**Step 1: Update `global.css`**

Line 21: `rgba(108, 92, 231, 0.3)` → `rgba(228, 197, 108, 0.3)`

**Step 2: Update `slides.module.css`**

- Line 84: `rgba(108, 92, 231, 0.4)` → `rgba(228, 197, 108, 0.4)` (bullet glow)
- Line 112: Keep `rgba(0, 0, 0, 0.3)` (image shadow — black is fine)
- Line 157: Keep `rgba(255, 255, 255, 0.1)` (progress bar — white is fine)
- Line 216: `rgba(108, 92, 231, 0.15)` → `rgba(228, 197, 108, 0.15)` (table header)
- Line 224: `rgba(107, 115, 148, 0.2)` → `rgba(138, 125, 90, 0.2)` (table header cell border)
- Line 229: `rgba(107, 115, 148, 0.2)` → `rgba(138, 125, 90, 0.2)` (table cell border)
- Lines 233, 237: Keep `rgba(255, 255, 255, ...)` (even/odd rows — white is fine)

**Step 3: Update `code.module.css`**

- Line 5: Keep `rgba(0, 0, 0, 0.3)` (code block shadow — black is fine)
- Line 65: `rgba(0, 230, 118, 0.15)` → `rgba(76, 175, 80, 0.15)` (diff add)
- Line 69: `rgba(255, 82, 82, 0.15)` → `rgba(212, 83, 59, 0.15)` (diff remove)
- Line 73: `rgba(108, 92, 231, 0.15)` → `rgba(228, 197, 108, 0.15)` (highlighted line)
- Line 86: `rgba(255, 82, 82, 0.15)` → `rgba(212, 83, 59, 0.15)` (error highlight)
- Line 90: `rgba(255, 193, 7, 0.15)` → `rgba(228, 197, 108, 0.15)` (warning highlight)

**Step 4: Update `editor.module.css`**

- Line 14: `rgba(107, 115, 148, 0.2)` → `rgba(138, 125, 90, 0.2)` (pane border)
- Line 22: `rgba(107, 115, 148, 0.2)` → `rgba(138, 125, 90, 0.2)` (toolbar border)

**Step 5: Update `modal.module.css`**

- Line 7: `rgba(11, 13, 23, 0.9)` → `rgba(50, 45, 43, 0.9)` (overlay)
- Line 16: `rgba(107, 115, 148, 0.3)` → `rgba(138, 125, 90, 0.3)` (modal border)
- Line 21: Keep `rgba(0, 0, 0, 0.3)` (modal shadow — black is fine)
- Line 77: `rgba(107, 115, 148, 0.3)` → `rgba(138, 125, 90, 0.3)` (input border)
- Line 99: `rgba(107, 115, 148, 0.3)` → `rgba(138, 125, 90, 0.3)` (reveal btn border)
- Line 109: `rgba(107, 115, 148, 0.1)` → `rgba(138, 125, 90, 0.1)` (reveal btn hover)
- Line 154: `rgba(107, 115, 148, 0.3)` → `rgba(138, 125, 90, 0.3)` (cancel btn border)
- Line 164: `rgba(107, 115, 148, 0.1)` → `rgba(138, 125, 90, 0.1)` (cancel btn hover)

**Step 6: Update `picker.module.css`**

- Line 41: `rgba(107, 115, 148, 0.2)` → `rgba(138, 125, 90, 0.2)` (card border)
- Line 51: `rgba(20, 24, 41, 0.8)` → `rgba(46, 59, 48, 0.8)` (card hover bg)
- Line 54: `rgba(108, 92, 231, 0.2)` → `rgba(228, 197, 108, 0.2)` (card hover shadow)

**Step 7: Update `overview.module.css`**

- Line 25: `rgba(108, 92, 231, 0.2)` → `rgba(228, 197, 108, 0.2)` (thumbnail hover shadow)

**Step 8: Run tests and build**

Run: `npm run test:run && npm run build`
Expected: All tests pass, build succeeds

**Step 9: Commit**

```
git add src/styles/
git commit -m "feat(colors): update all rgba() variants to earth & gold palette"
```

---

### Task 3: Update CodeMirror Theme

**Files:**
- Modify: `src/components/MarkdownEditor.tsx:8-43`

**Step 1: Update hardcoded hex values in the editor theme**

Replace the `editorTheme` block (lines 8-43) with updated colors:

```typescript
const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#322D2B',
      color: '#F0E8D8',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#E4C56C',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '15px',
      lineHeight: '1.6',
      padding: '24px',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(228, 197, 108, 0.05)',
    },
    '.cm-gutters': {
      backgroundColor: '#322D2B',
      color: '#8A7D5A',
      border: 'none',
      paddingLeft: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(228, 197, 108, 0.1)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(228, 197, 108, 0.3)',
    },
    '.cm-cursor': {
      borderLeftColor: '#E4C56C',
      borderLeftWidth: '2px',
    },
  },
  { dark: true }
)
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Commit**

```
git add src/components/MarkdownEditor.tsx
git commit -m "feat(colors): update CodeMirror theme to earth & gold palette"
```

---

### Task 4: Update Mermaid Theme Variables

**Files:**
- Modify: `src/components/MermaidDiagram.tsx:13-24`

**Step 1: Update Mermaid themeVariables**

Replace lines 13-24 with:

```typescript
        themeVariables: {
          primaryColor: '#3D3425',
          primaryTextColor: '#F0E8D8',
          primaryBorderColor: '#E4C56C',
          lineColor: '#8A7D5A',
          secondaryColor: '#0C4A23',
          secondaryBorderColor: '#1C6331',
          tertiaryColor: '#263029',
          background: '#2E3B30',
          mainBkg: '#352F2A',
          nodeBorder: '#E4C56C',
          textColor: '#F0E8D8',
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Commit**

```
git add src/components/MermaidDiagram.tsx
git commit -m "feat(colors): update Mermaid theme to earth & gold palette"
```

---

### Task 5: Switch Shiki Theme to vitesse-dark

**Files:**
- Modify: `src/core/highlighter.ts:22,41`
- Test: `src/components/CodeBlock.test.tsx` (verify no test breakage)

**Step 1: Verify vitesse-dark is available in Shiki**

Check the Shiki docs to confirm `vitesse-dark` is a bundled theme. If not, use the closest warm-toned alternative.

**Step 2: Update theme references**

Line 22: `themes: ['github-dark']` → `themes: ['vitesse-dark']`
Line 41: `theme: 'github-dark'` → `theme: 'vitesse-dark'`

**Step 3: Run tests**

Run: `npm run test:run`
Expected: All tests pass. Note: CodeBlock tests mock the highlighter, so the theme name change shouldn't break them. If any test asserts on the theme name, update it.

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds (Shiki bundles the vitesse-dark theme automatically)

**Step 5: Commit**

```
git add src/core/highlighter.ts
git commit -m "feat(colors): switch Shiki theme from github-dark to vitesse-dark"
```

---

### Task 6: Update Documentation

**Files:**
- Modify: `CLAUDE.md:62-71` (Brand Colors table)
- Modify: `docs/plans/2026-02-20-dekk-design.md` (Visual Identity section)

**Step 1: Update CLAUDE.md brand colors table**

Replace lines 62-71 with:

```markdown
| Role | Hex |
|------|-----|
| Background | #322D2B |
| Surface | #2E3B30 |
| Primary (gold) | #E4C56C |
| Secondary (green) | #1C6331 |
| Text | #F0E8D8 |
| Muted | #8A7D5A |
```

**Step 2: Update design doc visual identity section**

Find the color table in `docs/plans/2026-02-20-dekk-design.md` and update it to match the new palette. Also update any text that says "purple" or "teal" to say "gold" and "green".

**Step 3: Commit**

```
git add CLAUDE.md docs/plans/2026-02-20-dekk-design.md
git commit -m "docs: update brand colors documentation to earth & gold palette"
```

---

### Task 7: Visual Verification

**Files:**
- None modified — this is a verification task

**Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All 258+ tests pass

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Visual inspection**

Run: `npm run dev`

Verify in browser:
- [ ] Background is warm dark brown, not navy
- [ ] Slide surfaces have subtle green tint
- [ ] Titles and accents are gold
- [ ] Links are green
- [ ] Code blocks have green-tinted dark background
- [ ] Mermaid diagrams use gold/green colors
- [ ] CodeMirror editor has warm brown background with gold caret
- [ ] Text is warm cream, not cool gray
- [ ] Selection highlights are gold-tinted
- [ ] Table headers have gold tint
- [ ] Card hover effects use gold glow
- [ ] Modal overlays are warm-tinted
- [ ] Code diff additions are natural green, removals are terracotta
- [ ] Syntax highlighting uses warm earth tones (vitesse-dark)

**Step 5: Final commit if any visual fixes needed**

```
git commit -m "fix(colors): visual polish for earth & gold palette"
```
