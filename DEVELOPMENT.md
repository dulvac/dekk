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

All feature and fix work must happen on branches, never directly on `master`.

| Branch type | Pattern                  | Example                        |
|-------------|--------------------------|--------------------------------|
| Feature     | `feat/<description>`     | `feat/user-profile-page`       |
| Bug fix     | `fix/<description>`      | `fix/auth-null-pointer`        |

Use lowercase, hyphen-separated descriptions. Keep them short but descriptive.

## Branching Model

- The default branch is `master`. All pull requests target `master`.
- Create feature/fix branches from the latest `master`:
  ```bash
  git checkout master
  git pull origin master
  git checkout -b feat/<description>
  ```
- Push and open a PR when ready:
  ```bash
  git push -u origin feat/<description>
  gh pr create --base master
  ```

## Git Worktrees (for Claude sessions)

When working in Claude Code sessions, use git worktrees to isolate work without disrupting the main checkout.

### Create a worktree

```bash
git worktree add .claude/worktrees/<name> -b <branch-name> master
```

This creates an isolated working copy with its own branch based on `master`.

### Clean up when done

```bash
git worktree remove .claude/worktrees/<name>
```

### Rules

- Always branch worktrees from `master`.
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
gh pr create --base master --title "feat: description" --body "Summary of changes"
```

### Check PR status

```bash
gh pr status
```
