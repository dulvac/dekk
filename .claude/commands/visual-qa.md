---
description: Run a systematic visual quality audit after CSS or UI changes. Catches contrast violations, spacing issues, and responsive breakage that tests miss.
---

Run a visual quality audit on the current state of the application. This skill exists because automated tests verify functionality but not visual correctness -- issues like poor text contrast, clipped content, or broken layouts slip through passing test suites.

## Setup

1. Start the dev server if not already running: `npm run dev`
2. Open the application in the Playwright browser via MCP tools
3. Navigate to each view that was affected by the recent changes

## 1. Contrast Ratio Checks

These ratios are pre-calculated for the current brand palette. Flag any usage that violates them.

**SAFE pairs (pass WCAG AA for normal text, 4.5:1+):**

| Pair | Ratio | Verdict |
|------|-------|---------|
| Text (#F0E8D8) on Background (#322D2B) | 11.15:1 | PASS |
| Text (#F0E8D8) on Surface (#2E3B30) | 9.66:1 | PASS |
| Text (#F0E8D8) on Code BG (#263029) | 11.21:1 | PASS |
| Primary (#E4C56C) on Background (#322D2B) | 8.09:1 | PASS |
| Primary (#E4C56C) on Surface (#2E3B30) | 7.01:1 | PASS |
| Background (#322D2B) on Primary (#E4C56C) | 8.09:1 | PASS (use for gold buttons) |
| Text (#F0E8D8) on Secondary (#1C6331) | 5.99:1 | PASS |

**DANGEROUS pairs (fail WCAG AA for normal text):**

| Pair | Ratio | Verdict |
|------|-------|---------|
| Text (#F0E8D8) on Primary (#E4C56C) | 1.38:1 | FAIL -- never use light text on gold |
| Background (#322D2B) on Secondary (#1C6331) | 1.86:1 | FAIL -- never use dark text on green |
| Text (#F0E8D8) on Success (#4CAF50) | 2.28:1 | FAIL -- use dark text on success green |
| Muted (#8A7D5A) on Surface (#2E3B30) | 2.89:1 | FAIL -- muted text illegible on surface |
| Muted (#8A7D5A) on Background (#322D2B) | 3.34:1 | Large text only (3:1+) |
| Text (#F0E8D8) on Danger (#D4533B) | 3.38:1 | Large text only (3:1+) |
| Background (#322D2B) on Danger (#D4533B) | 3.30:1 | Large text only (3:1+) |

**Action:** Scan all CSS files for hardcoded color values and verify every text-on-background combination against this table. Use `grep` to find inline hex colors that bypass CSS custom properties.

## 2. Hardcoded Color Audit

Search the codebase for colors that bypass the design token system:

```
Search for: #[0-9a-fA-F]{3,8} in src/**/*.css and src/**/*.tsx
```

Every color should reference a `--mp-*` custom property. Hardcoded hex values are bugs unless they appear inside `variables.css`.

## 3. Spacing and Overflow Checks

Using Playwright MCP browser tools, inspect each affected view:

- [ ] No text is clipped or overflowing its container
- [ ] No elements overlap at the default viewport size (1920x1080)
- [ ] Padding inside slide frames matches `--mp-slide-padding` (80px)
- [ ] Content gap between elements matches `--mp-content-gap` (24px)
- [ ] Button text has adequate internal padding (min 8px vertical, 16px horizontal)
- [ ] No scrollbars appear where they should not

## 4. Interactive State Coverage

For every interactive element (buttons, links, inputs, navigation controls):

- [ ] **Hover** state has a visible change (color shift, underline, or opacity)
- [ ] **Focus** state has a visible outline or ring (keyboard accessibility)
- [ ] **Active/pressed** state provides feedback
- [ ] **Disabled** state (if applicable) is visually distinct and has reduced opacity or muted color
- [ ] No interactive element uses a DANGEROUS contrast pair from the table above

## 5. Responsive Layout Checks

Take a Playwright screenshot at each of these widths. Verify no breakage:

- [ ] 1920px (full HD -- primary target)
- [ ] 1440px (common laptop)
- [ ] 1024px (tablet landscape)
- [ ] 768px (tablet portrait)

At each width check:
- Content does not overflow horizontally
- Text remains readable (not too small, not truncated)
- Navigation elements remain accessible
- Slide content scales proportionally

## 6. Screenshot Evidence

Take screenshots of each affected view using Playwright MCP `browser_take_screenshot`. Save them with descriptive names. If any check above fails, include the screenshot path in your report.

## Report Format

After completing all checks, produce a summary:

```
## Visual QA Report

**Date:** YYYY-MM-DD
**Views checked:** [list views]
**Triggered by:** [what CSS/visual change prompted this audit]

### Contrast: [PASS/FAIL]
[List any violations found]

### Hardcoded Colors: [PASS/FAIL]
[List any hex values outside variables.css]

### Spacing/Overflow: [PASS/FAIL]
[List any clipping, overflow, or spacing issues]

### Interactive States: [PASS/FAIL]
[List any missing hover/focus/active/disabled states]

### Responsive: [PASS/FAIL]
[List any breakage at tested widths]

### Action Items
- [ ] [Specific fix needed, with file path]
```
