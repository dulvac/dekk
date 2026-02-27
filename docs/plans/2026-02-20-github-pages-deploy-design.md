# GitHub Pages Auto-Deploy — Design Spec

## Problem

Dekk has no public URL. Sharing a presentation deck requires the recipient to clone the repo, install dependencies, and run `npm run dev`. There is no automated path from a merged commit to a live, accessible deployment.

## Goal

Automatically publish Dekk to GitHub Pages on every push to `main`, with full CI checks (lint, test, build) as a required gate before any deployment proceeds.

## Requirements

### Must Have

1. **GitHub Actions deploy workflow** — On push to `main`, run a workflow that builds the app and deploys to GitHub Pages. No manual steps after merging.

2. **CI gate** — The deploy job must `needs` the existing CI job. A failing lint, test, or build blocks deployment entirely.

3. **Vite `base` configuration** — The app is served at `https://{owner}.github.io/dekk/`, not at the root. Vite must be told the sub-path so asset URLs in the built HTML are correct. Local dev must continue to work at `/`.

4. **Upload and deploy via official GitHub actions** — Use `actions/upload-pages-artifact@v3` to stage the `dist/` directory and `actions/deploy-pages@v4` to deploy. Do not use third-party publishing actions.

### Nice to Have

5. **Custom domain support** — A `public/CNAME` file with the target domain makes switching to a custom domain a one-line change. The file is only present when the operator wants a custom domain; absence has no effect.

6. **Cache busting for assets** — Vite already outputs content-hashed filenames for JS/CSS chunks (`vendor-mermaid-[hash].js`). The spec must confirm this is not accidentally disabled during the Pages build. No extra work needed if the current `manualChunks` config is preserved.

7. **PR preview deployments** — GitHub Pages supports only one live deployment per repository. True per-PR preview URLs require a different hosting target (e.g., Cloudflare Pages, Netlify). This is deferred and out of scope for the initial Pages deploy. A note in the workflow can document this limitation.

## Non-Goals

- Self-hosted or VPS deployment
- Docker or container builds
- CDN configuration beyond GitHub Pages defaults
- Server-side rendering or dynamic backends
- Per-PR preview URLs (requires non-GitHub Pages hosting)

## Architecture

### Workflow Strategy

**Extend the existing CI workflow** (`ci.yml`) rather than creating a separate file.

Rationale:
- Avoids rebuilding the project twice (CI job artifacts are reused in deploy job)
- The dependency chain (`build-and-test` → `deploy`) is visible in one file
- No `workflow_run` trigger complexity (which has known race conditions and cross-fork security constraints)
- The deploy job is conditioned on `push` to `main`, so it is skipped on pull requests automatically

Alternative considered: a separate `deploy.yml` triggered by `workflow_run: [CI]`. Rejected because `workflow_run` does not have access to the triggering workflow's artifacts without explicit upload/download steps, and adds a second workflow file that must be kept in sync with CI.

### Vite Base Configuration

The `vite.config.ts` currently has no `base` set, which defaults to `/`. On GitHub Pages, the app is served under `/dekk/`, so asset references in the built `index.html` must use that prefix.

**Strategy:** Pass `--base` via the CLI in the deploy build step. No change to `vite.config.ts` is required for the common case; local `npm run dev` and `npm run build` remain unaffected.

Deploy build command:
```
tsc -b && vite build --base /dekk/
```

Note: if the repository is ever renamed or moved to a different Pages path, only the workflow file changes — not the source code.

Vite rewrites `index.html` asset references automatically when `--base` is set. The existing `href="/vite.svg"` in `index.html` will be rewritten to `/dekk/vite.svg` in the build output. Hash-based routing (`/#/`, `/#/edit`, `/#/overview`) is unaffected by the base path because hash fragments are purely client-side.

### New Files

- `.github/workflows/ci.yml` — Modified (not new); adds a `deploy` job (see below)
- `public/CNAME` — Optional; only added when a custom domain is configured. Contents: the bare domain (`slides.example.com`). Not committed to the repo by default.

### Modified Files

- `.github/workflows/ci.yml` — Add `deploy` job with Pages-specific permissions, artifact upload, and deploy step

### Workflow: Updated `ci.yml`

```yaml
name: CI

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build project
        run: npm run build

      - name: Run tests
        run: npx vitest run

  deploy:
    needs: build-and-test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for GitHub Pages
        run: npm run build -- --base /dekk/
        # Equivalent to: tsc -b && vite build --base /dekk/
        # Hash-based routing is unaffected by base path changes.
        # Asset filenames include content hashes (Vite default) — cache busting is automatic.

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Build Command Note

`npm run build` expands to `tsc -b && vite build`. To pass `--base` to `vite build` only, use:
```
npm run build -- --base /dekk/
```
The `--` separator passes trailing arguments to the underlying script. `tsc -b` runs first (no `--base` argument), then `vite build --base /dekk/`.

### GitHub Pages Repository Settings

Before the workflow runs successfully, Pages must be enabled in the repository:

1. Repository → Settings → Pages
2. Source: **GitHub Actions** (not "Deploy from a branch")

This is a one-time manual step. The workflow handles all subsequent deploys automatically.

### Permissions

The `deploy` job requires elevated permissions that the `build-and-test` job does not need. Using job-level `permissions` (not workflow-level) keeps the CI job's permissions minimal (`contents: read` only by default).

| Permission | Reason |
|---|---|
| `contents: read` | Checkout the repo |
| `pages: write` | Write to the GitHub Pages deployment |
| `id-token: write` | OIDC token for trusted deployment (required by `deploy-pages@v4`) |

### Concurrency

The `concurrency: group: pages` block ensures that only one deployment runs at a time. If a second push to `main` arrives while a deploy is in progress, the in-progress deploy completes before the next one starts (`cancel-in-progress: false`). This prevents a slow deploy from being cancelled mid-flight and leaving the site in an inconsistent state.

### Cache Busting

Vite outputs content-hashed filenames by default:
- `assets/vendor-mermaid-[hash].js`
- `assets/vendor-shiki-[hash].js`
- `assets/index-[hash].js`

The `manualChunks` config in `vite.config.ts` splits heavy vendors into separate chunks. This already provides optimal cache behaviour: when the app code changes, vendor hashes remain stable.

GitHub Pages serves assets with `Cache-Control: max-age=600` (10 minutes) and does not allow custom headers. Content-hashed filenames mean stale caches never serve wrong asset versions — the browser fetches a new file on every deployment.

### Custom Domain (Nice to Have)

To configure a custom domain:

1. Add `public/CNAME` with a single line: the target domain (e.g., `slides.example.com`)
2. Configure DNS: CNAME record pointing to `{owner}.github.io`
3. Enable HTTPS in repository Settings → Pages

Vite copies files from `public/` into `dist/` unchanged. GitHub Pages reads `CNAME` from the deployed artifact root. No workflow changes needed.

When a custom domain is active, the `--base /dekk/` flag must be changed to `--base /` (or omitted), since the site is at the domain root. This is the only change required.

### Preview Deployments (Deferred)

GitHub Pages supports a single live deployment per repository. PR preview URLs would require one of:

- **Cloudflare Pages**: Native PR preview support. Trigger from the same repo via Cloudflare's GitHub App.
- **Netlify**: Same capability via Netlify's GitHub integration.
- **GitHub Pages + orphan branches**: Technically possible but fragile; not recommended.

If preview deployments become a priority, the cleanest path is migrating the deploy target to Cloudflare Pages while keeping the GitHub Actions workflow structure unchanged.

## Security Considerations

- `GITHUB_TOKEN` permissions are scoped to the minimum required at the job level
- The `id-token: write` permission is required only by `deploy-pages@v4` and only for the deploy job
- No secrets are required for standard GitHub Pages deployment (OIDC replaces deploy keys)
- The build runs `npm ci` from a pinned lockfile — no `npm install` with floating versions

## Testing / Verification

- **CI gate**: Push a breaking change to a PR; verify the deploy job is skipped (does not appear or is skipped in the workflow run)
- **Deploy on merge**: Merge a trivial change to `main`; verify the deploy job runs and the Pages URL serves the app
- **Base path**: Navigate to `https://{owner}.github.io/dekk/` — the app loads, fonts render, mermaid diagrams render (requires the correct base to load vendor chunks)
- **Hash routing**: Navigate to `https://{owner}.github.io/dekk/#/edit` directly — the editor view loads (confirms hash routing is unaffected by base path)
- **Asset cache busting**: Inspect built `index.html` — all `<script>` and `<link>` `src`/`href` attributes include content hashes
