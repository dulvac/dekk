# Marko Pollo - Project Context

## What is this?

Marko Pollo is a static single-page web application for presenting markdown-authored slides with a branded dark cinematic visual identity. It targets developer talks at tech conferences, meetups, and internal engineering presentations.

## Key Documents

- **Design Document:** `docs/plans/2026-02-20-marko-pollo-design.md` - Full specification including requirements, architecture, visual identity, and component tree
- **Original Implementation Plan:** `docs/plans/2026-02-20-marko-pollo-implementation.md` - 16-task build plan (core SPA)
- **Cohesive Implementation Plan:** `docs/plans/2026-02-20-cohesive-implementation.md` - 4-phase feature suite (deploy, multi-deck, export, persistence)
- **AI Activity Journal:** `docs/ai-journal.md` - Chronological record of all AI-assisted development sessions, decisions, and lessons learned

## Technology Stack

- **Build:** Vite 6 + React 19 + TypeScript
- **Markdown:** unified/remark/rehype pipeline with custom remark-slides plugin
- **Rendering:** react-markdown with custom component mappings
- **Code Highlighting:** Shiki with @shikijs/transformers (diff, focus, highlight)
- **Diagrams:** Mermaid.js v11 (client-side, lazy)
- **Editor:** CodeMirror 6 (@uiw/react-codemirror)
- **Styling:** CSS Modules + CSS custom properties (no runtime CSS-in-JS)
- **State:** React Context + useReducer (no external state library)
- **Persistence:** Environment-aware save (Vite dev plugin, GitHub API, file download fallback)
- **Testing:** Vitest + @testing-library/react + Playwright E2E
- **CI/CD:** GitHub Actions (build, test, deploy to GitHub Pages)

## Architecture

Four views: PickerView (`/#/`), PresentationView (`/#deck/{id}/{n}`), EditorView (`/#deck/{id}/editor`), OverviewGrid (`/#deck/{id}/overview`). Deck-scoped hash routing via `useRoute` hook. Presentations live in `presentations/*/slides.md` and are discovered at build time via Vite's `import.meta.glob`. State flows through React Context with `LOAD_DECK`/`UNLOAD_DECK` actions. Editor persistence detects environment (dev server → file write, GitHub Pages → GitHub API PR, unknown → download fallback).

## Coding Standards

- TypeScript strict mode, no `any` types
- CSS Modules for scoped styling, CSS custom properties for brand tokens
- Small, focused component files (one component per file)
- Tests written before implementation (TDD)
- No external state management libraries
- Prefer named exports
- No light mode - dark theme is the brand identity

## Quality Standards

- **Functional Testing**: Unit and E2E tests must pass (Vitest + Playwright)
- **Visual Testing**: UI must be visually inspected and match design specifications
  - Passing tests (e.g., "26/26 PASS") only verify functionality, NOT visual quality
  - Layout, padding, margins, proportions must be manually verified against design doc
  - Screenshots should be taken during E2E testing to verify visual correctness
  - Rex must visually verify all UI changes before declaring work complete
  - Turing must include visual inspection as part of E2E verification
- **GFM Feature Requirement**: When "GFM support" (GitHub Flavored Markdown) is listed as a feature:
  - ALL GFM elements must have branded styling, not just parsing support
  - Tables, strikethrough, task lists, autolinks must be visually styled
  - Rex must verify custom styling for every GFM element type during visual checks
  - Implementation plans must include tasks for styling GFM elements, not just parsing

## Brand Colors

| Role | Hex |
|------|-----|
| Background | #0B0D17 |
| Surface | #141829 |
| Primary (purple) | #6C5CE7 |
| Secondary (teal) | #00CEC9 |
| Text | #E8E8F0 |
| Muted | #6B7394 |

## Team

This project uses a team of specialized agents. See `.claude/agents/` for their definitions:

- **Ada** (Architect) - Architecture, clean code, refactoring, crash prevention
- **Rex** (Frontend) - React components, CSS, modern patterns, UI implementation
- **Sage** (Security) - Vulnerability review, security scanning, input sanitization
- **Turing** (QA/Infra) - Testing, CI/CD, deployment, end-to-end verification
- **Eliza** (AI-native) - Claude Code instrumentation, agents, skills, hooks optimization

## Team Workflow

See `.claude/TEAM_WORKFLOW.md` for full team delegation rules, dispatch guidelines, and anti-patterns.

**Quick reference:** Team name is `marko-pollo`. Spawn agents via `Task` tool with `team_name: "marko-pollo"`. Team lead coordinates only — never implements.
