---
description: Retrieve open issues and dispatch parallel agents to work on each in isolated worktrees (e.g., /issue-swarm or /issue-swarm bug)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

Orchestrate parallel agent dispatch for open GitHub issues. Each issue gets a dedicated agent working in an isolated worktree.

**CRITICAL: Follow the Issue Swarm Protocol in `.claude/TEAM_WORKFLOW.md`.**

## Phase 1 — Gather Issues

1. **Verify authentication**: Run `gh auth status` to confirm the active GitHub account is `dulvac`.

2. **Fetch open issues**:
   - If `$ARGUMENTS` is non-empty, filter by label:
     ```
     gh issue list --repo dulvac/marko-pollo --state open --label "$ARGUMENTS" --json number,title,labels,body,assignees --limit 20
     ```
   - If `$ARGUMENTS` is empty:
     ```
     gh issue list --repo dulvac/marko-pollo --state open --json number,title,labels,body,assignees --limit 20
     ```

3. **If zero issues found**: Report "No open issues to work on" and stop.

4. **If more than 5 issues**: Take the 5 with the lowest issue numbers (oldest first). Warn the user that remaining issues will be handled in a subsequent swarm.

## Phase 2 — Plan Assignments

For each issue (up to 5), determine:

### Branch Prefix
- Issue has `bug` label -> `fix/`
- Issue has `documentation` label -> `docs/`
- Otherwise (including `enhancement`) -> `feature/`

### Branch Name
Format: `{prefix}{issue-number}-{slug}`
- Slug: issue title lowercased, spaces replaced with hyphens, non-alphanumeric characters removed, truncated to 50 characters
- Example: Issue #42 "Fix button contrast ratio" with `bug` label -> `fix/42-fix-button-contrast-ratio`

### Agent Selection
Based on issue labels and title/body keyword analysis:
- `bug` + title/body mentions CSS, UI, component, visual, styling, layout, color -> **Rex**
- `bug` + title/body mentions test, CI, build, deploy, pipeline, workflow -> **Turing**
- `bug` + title/body mentions security, XSS, vulnerability, sanitize, injection -> **Sage**
- `documentation` label -> **Eliza**
- `enhancement` or no matching label -> **Rex** (default — most features in this SPA project are frontend)
- Title/body mentions architecture, refactor, performance, structure -> **Ada**

### Display Plan
Present the assignment table to the user:
```
| # | Issue | Branch | Agent |
|---|-------|--------|-------|
| 42 | Fix button contrast | fix/42-fix-button-contrast | Rex |
| 15 | Add export to PDF | feature/15-add-export-to-pdf | Rex |
```

Proceed without waiting for approval (per Autonomous Fix Policy in TEAM_WORKFLOW.md).

## Phase 3 — Dispatch Agents

**Spawn ALL agents in a SINGLE message** (parallel dispatch). For each assignment, use the `Task` tool with:

```
subagent_type: "general-purpose"
team_name: "marko-pollo"
name: "{Agent}-issue-{issue-number}"
isolation: "worktree"
```

### Agent Prompt Template

Each agent receives this prompt (filled with issue-specific values):

```
You are working on GitHub issue #{number} for the marko-pollo project.

## Issue
**Title:** {title}
**Labels:** {labels}
**Body:**
{body}

## Your Task

1. **Create branch**: `git checkout -b {branch-name}`
2. **Read the project context**: Read `CLAUDE.md` for coding standards and `docs/plans/2026-02-20-marko-pollo-design.md` for design specs
3. **Implement the fix/feature** following project standards:
   - TypeScript strict mode, no `any`
   - CSS Modules + CSS custom properties for styling
   - TDD: write failing tests first, then implement
   - Small, focused components (one per file)
4. **Run tests**: `npm run test:run` — all must pass
5. **Run build**: `npm run build` — must succeed
6. **Commit** with conventional commit message (e.g., `fix: correct button contrast ratio` or `feat: add export to PDF`)
7. **Push**: `git push -u origin {branch-name}`
8. **Create PR**:
   ```
   gh pr create --repo dulvac/marko-pollo --title "{conventional-commit-title}" --body "$(cat <<'EOF'
   ## Summary
   {brief description of changes}

   Closes #{number}

   ## Test plan
   - [ ] Unit tests pass
   - [ ] Build succeeds
   - [ ] Manual verification of the fix/feature

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

## Important
- The PR body MUST include `Closes #{number}` to auto-close the issue on merge
- Follow conventional commits for the commit message
- Do NOT modify files unrelated to this issue
- If the issue is unclear or too large, implement what you can and note limitations in the PR description
```

## Phase 4 — Monitor & Collect

As agents complete and go idle:

1. **Review output**: Check that each agent created its branch, committed, pushed, and opened a PR
2. **Verify PR linking**: Confirm each PR body contains `Closes #{issue-number}`
3. **Handle failures**: If an agent failed, note the failure reason for the summary report
4. **Shutdown**: Send `shutdown_request` to each completed agent

## Phase 5 — Report & Log

1. **Present summary** to the user:
   ```
   ## Issue Swarm Results
   | # | Issue | PR | Status |
   |---|-------|----|--------|
   | 42 | Fix button contrast | #5 | ✓ PR created |
   | 15 | Add export to PDF | — | ✗ Build failed |
   ```

2. **Communication Logging**: Follow the Communication Logging Protocol from `TEAM_WORKFLOW.md`:
   - Create invocation block in `docs/team-execution-log.md` at session start
   - Log every dispatch and agent message
   - Generate Mermaid sequence diagram at session end
   - Prune to last 20 invocations

Arguments: $ARGUMENTS
