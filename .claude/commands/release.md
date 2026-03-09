---
description: Create a new release (e.g., /release 1.0.0 or /release patch)
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent
---

Create a new Dekk release, running the full quality gate before tagging.

## Argument Parsing

Parse `$ARGUMENTS` to determine the version:
- **Semver** (e.g., `1.0.0`, `0.2.0`): Use as-is
- **Bump keyword** (`patch`, `minor`, `major`): Read current version from `package.json`, increment accordingly
- **No argument**: Ask the user what version to release

## Pre-Release Checklist

Run these steps sequentially. Stop immediately if any step fails.

1. **Verify clean working tree**: `git status --porcelain` must be empty. If dirty, ask the user to commit or stash first.

2. **Verify on main branch**: `git branch --show-current` must be `main`. If not, ask the user to merge first.

3. **Pull latest**: `git pull origin main`

4. **Install dependencies**: `npm ci`

5. **Lint**: `npm run lint` — must pass with zero errors.

6. **Unit tests**: `npm run test:run` — must pass with zero failures.

7. **Build SPA**: `npm run build` — must succeed.

8. **Build CLI**: `npm run build:cli` — must succeed.

9. **CLI E2E tests**: `npx playwright test --project=cli` — must pass.

10. **Smoke test**: `node bin/dekk.js --version` — must print current version.

## Release Steps

After all checks pass:

1. **Bump version in package.json**: `npm version <version> --no-git-tag-version`

2. **Commit version bump**: `git add package.json package-lock.json && git commit -m "chore: bump version to <version>"`

3. **Create and push tag**:
   ```
   git tag v<version>
   git push origin main
   git push origin v<version>
   ```

4. **Report**: Print summary with:
   - Version released
   - Tag name
   - Link to GitHub Actions release workflow: `https://github.com/dulvac/dekk/actions/workflows/release.yml`
   - Reminder: "The release workflow will build, create the GitHub Release, and update the Homebrew formula automatically."

## Important

- NEVER skip the quality gate steps — a failed release is worse than a delayed one
- NEVER force-push tags
- If E2E tests fail, investigate before retrying
- The actual release (tarball, GitHub Release, Homebrew update) happens in CI via `.github/workflows/release.yml` — this command only tags

Arguments: $ARGUMENTS
