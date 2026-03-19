<!-- gg:convention=conventional -->
<!-- gg:autoreview-model=us.anthropic.claude-opus-4-6-v1 -->
<!-- gg:autoreview-effort=high -->
<!-- gg:autoreview-timeout=15 -->
<!-- gg:base-branch=main -->
<!-- gg:autofix-scope=all -->
<!-- gg:autofix-model=us.anthropic.claude-opus-4-6-v1 -->
<!-- gg:autofix-test=true -->
<!-- gg:autofix-test-cmd=npm run test:run && npm run build -- --base /dekk/ && npx playwright test --project=chromium -->
<!-- gg:autofix-timeout=60 -->
<!-- gg:autofix-max-files=50 -->
<!-- gg:autofix-effort=high -->
<!-- gg:autofix-max-revisions=5 -->


# Development Workflow

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>: <short description>
```

Allowed types:

| Type       | Use when...                                      |
|------------|--------------------------------------------------|
| `feat`     | Adding a new feature                             |
| `fix`      | Fixing a bug                                     |
| `chore`    | Maintenance tasks, dependency updates, config    |
| `docs`     | Documentation-only changes                       |
| `refactor` | Code restructuring with no behavior change       |
| `test`     | Adding or updating tests                         |

Examples:
- `feat: add user profile page`
- `fix: resolve null pointer in auth middleware`
- `chore: update eslint config`

## Branch Naming

All feature and fix work must happen on branches, never directly on `main`.

| Branch type | Pattern                  | Example                        |
|-------------|--------------------------|--------------------------------|
| Feature     | `feat/<description>`     | `feat/user-profile-page`       |
| Bug fix     | `fix/<description>`      | `fix/auth-null-pointer`        |

Use lowercase, hyphen-separated descriptions. Keep them short but descriptive.

## Branching Model

- The default branch is `main`. All pull requests target `main`.
- Create feature/fix branches from the latest `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feat/<description>
  ```
- Push and open a PR when ready:
  ```bash
  git push -u origin feat/<description>
  gh pr create --base main
  ```

## Git Worktrees (for Claude sessions)

When working in Claude Code sessions, use git worktrees to isolate work without disrupting the main checkout.

### Create a worktree

```bash
git worktree add .claude/worktrees/<name> -b <branch-name> main
```

This creates an isolated working copy with its own branch based on `main`.

### Clean up when done

```bash
git worktree remove .claude/worktrees/<name>
```

### Rules

- Always branch worktrees from `main`.
- Name the worktree after the feature or fix (e.g., `.claude/worktrees/user-profile`).
- Commit, push, and open PRs from the worktree branch, then clean up.

## GitHub CLI

This project uses `gh` (GitHub CLI) for authentication and pull request operations.

### Verify authentication

```bash
gh auth status
```

### Switch accounts (if multiple are configured)

```bash
gh auth switch
```

### Create a pull request

```bash
gh pr create --base main --title "feat: description" --body "Summary of changes"
```

### Check PR status

```bash
gh pr status
```

## Code Review Guidelines

<!-- gg:review-guidelines=true -->

### Review Focus Areas
- **Correctness** — Does the code do what the PR claims? Edge cases handled?
- **Security** — OWASP top 10, input validation at boundaries, auth checks
- **Performance** — Obvious inefficiencies, N+1 queries, unnecessary allocations
- **Conventions** — Follows project conventions from this document
- **Test coverage** — Changed/added code has appropriate tests
- **Error handling** — Failures handled gracefully at system boundaries
- **Readability** — Code is clear without excessive comments

### Review Principles
- Only flag issues that matter. No nitpicking style preferences.
- Suggest fixes, don't just point out problems.
- Acknowledge genuinely clever solutions.
