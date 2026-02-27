# Fix GitHub Pages Auto-Deploy

**Date:** 2026-02-26
**Status:** Proposed

## Problem

The current CI workflow (`ci.yml`) fails on the deploy step with:

```
Error: Multiple artifacts named "github-pages" were unexpectedly found for this workflow run.
Artifact count is 2.
```

This is a known compatibility issue between `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`. The v3 upload action can create duplicate artifact entries under re-run and concurrency edge cases.

Additionally, the current workflow has structural inefficiency: two separate jobs (`build-and-test` and `deploy`) each independently check out code, install dependencies, and run `npm run build` — duplicating work across jobs.

## Solution

Consolidate the two jobs into a single `build-test-deploy` job. Upgrade `upload-pages-artifact` from v3 to v4. Run E2E tests against the production build (via `vite preview`) rather than the dev server.

## Design

### Single Job: `build-test-deploy`

Steps in order:

1. **Checkout** — `actions/checkout@v4`
2. **Setup Node 20** — `actions/setup-node@v4` with npm cache
3. **Install dependencies** — `npm ci`
4. **Lint** — `npm run lint`
5. **Build for GitHub Pages** — `npm run build -- --base /dekk/`
6. **Run unit tests** — `npx vitest run`
7. **Install Playwright** — `npx playwright install --with-deps chromium`
8. **Run E2E tests** — `npx playwright test` (against `vite preview`)
9. **Upload Pages artifact** — `actions/upload-pages-artifact@v4` (conditional: push to master only)
10. **Deploy to GitHub Pages** — `actions/deploy-pages@v4` (conditional: push to master only)

### E2E Against Production Build

The Playwright `webServer` config changes for CI to use `vite preview` instead of `npm run dev`:

- **CI (`process.env.CI`):** `npx vite preview --port 5173` — serves the built `dist/` directory
- **Local dev:** `npm run dev` — keeps current developer experience

This is an improvement: E2E tests now validate the same build artifact that gets deployed.

### Conditional Deploy Steps

Steps 9 and 10 use `if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')` so PR runs only build and test.

### Permissions

The single job declares:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

These are required for the deploy steps and harmless when those steps are skipped on PRs.

### Concurrency

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

Prevents overlapping deployments.

## Changes Required

1. **`.github/workflows/ci.yml`** — Replace two-job workflow with single consolidated job; upgrade `upload-pages-artifact` from v3 to v4
2. **`playwright.config.ts`** — Change `webServer.command` to use `vite preview --port 5173` in CI
3. **Verify** — Push to master and confirm the workflow succeeds end-to-end

## Risks

- **E2E base path:** The preview server in CI will serve at `/dekk/` base path. Playwright's `baseURL` must account for this (set to `http://localhost:5173/dekk/`).
- **Preview server startup:** `vite preview` requires `dist/` to exist before starting. Since build runs before E2E, this is satisfied.
