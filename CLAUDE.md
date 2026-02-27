# Dekk - Project Context

## What is this?

Dekk is a static single-page web application for presenting markdown-authored slides with a branded dark cinematic visual identity. It targets developer talks at tech conferences, meetups, and internal engineering presentations.

## Key Documents

- **Design Document:** `docs/plans/2026-02-20-dekk-design.md` - Full specification including requirements, architecture, visual identity, and component tree
- **Original Implementation Plan:** `docs/plans/2026-02-20-dekk-implementation.md` - 16-task build plan (core SPA)
- **Cohesive Implementation Plan:** `docs/plans/2026-02-20-cohesive-implementation.md` - 4-phase feature suite (deploy, multi-deck, export, persistence)
- **AI Activity Journal:** `docs/ai-journal.md` - Chronological record of all AI-assisted development sessions, decisions, and lessons learned
- **Team Execution Log:** `docs/team-execution-log.md` - Rolling log of last 20 team sessions with interaction summaries and Mermaid diagrams

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

## Git Worktrees

Worktree directory: `.worktrees/` (project-local, hidden). Feature branches are created as worktrees under this directory (e.g., `.worktrees/feature-name`).

## Git Workflow

- **Never commit directly to master.** All work must be on a branch.
- **Branch naming:** Include the GitHub issue number when working on a tracked issue:
  - `feature/<issue#>-<short-desc>` — new features (e.g., `feature/15-export-pdf`)
  - `fix/<issue#>-<short-desc>` — bug fixes (e.g., `fix/42-button-contrast`)
  - `docs/<issue#>-<short-desc>` — documentation (e.g., `docs/7-update-readme`)
  - Without an issue: `feature/<short-desc>` or `fix/<short-desc>` (unchanged)
- **PR linking:** PR body MUST include `Closes #<issue-number>` to auto-close the issue on merge.
- **Conventional Commits:** All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:
  - `feat: add export to PDF` — new feature
  - `fix: correct button contrast ratio` — bug fix
  - `refactor: extract keyboard hooks from App.tsx` — code restructuring
  - `docs: update color scheme design doc` — documentation only
  - `test: add MermaidDiagram unit tests` — tests only
  - `chore: update dependencies` — maintenance
  - `style: fix CSS formatting` — formatting, no logic change
  - `perf: lazy-load Shiki highlighter` — performance improvement
  - Scope is optional: `feat(editor): add save shortcut`
  - Breaking changes: `feat!: change slide metadata format` or add `BREAKING CHANGE:` footer
- **Create a PR** to merge back into master when work is complete.

## Issue Management

- `/issue-list [label]` — list open issues, optionally filtered by label
- `/issue-create "title" [--label name] [--body "text"]` — create an issue
- `/issue-close <number> ["comment"]` — close an issue
- `/issue-swarm [label]` — dispatch parallel agents to work on open issues
- Label-to-branch mapping: `bug` -> `fix/`, `enhancement` -> `feature/`, `documentation` -> `docs/`

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
- **PR Screenshots**: PRs that fix visual bugs or change visual aspects MUST include before/after screenshots in the PR body. Capture the relevant area before starting work and after completing it.
- **GFM Feature Requirement**: When "GFM support" (GitHub Flavored Markdown) is listed as a feature:
  - ALL GFM elements must have branded styling, not just parsing support
  - Tables, strikethrough, task lists, autolinks must be visually styled
  - Rex must verify custom styling for every GFM element type during visual checks
  - Implementation plans must include tasks for styling GFM elements, not just parsing

## Brand Colors

| Role | Hex |
|------|-----|
| Background | #322D2B |
| Surface | #2E3B30 |
| Primary (gold) | #E4C56C |
| Secondary (green) | #1C6331 |
| Text | #F0E8D8 |
| Muted | #8A7D5A |

## Team

This project uses a team of specialized agents. See `.claude/agents/` for their definitions:

- **Ada** (Architect) - Architecture, clean code, refactoring, crash prevention
- **Rex** (Frontend) - React components, CSS, modern patterns, UI implementation
- **Sage** (Security) - Vulnerability review, security scanning, input sanitization
- **Turing** (QA/Infra) - Testing, CI/CD, deployment, end-to-end verification
- **Eliza** (AI-native) - Claude Code instrumentation, agents, skills, hooks optimization

## Team Workflow

See `.claude/TEAM_WORKFLOW.md` for full team delegation rules, dispatch guidelines, and anti-patterns.

**Quick reference:** Team name is `dekk`. Spawn agents via `Task` tool with `team_name: "dekk"`. Team lead coordinates only — never implements.
