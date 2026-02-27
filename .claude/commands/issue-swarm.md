---
description: Retrieve open issues and dispatch a full agent team per issue, all teams working in parallel (e.g., /issue-swarm or /issue-swarm bug)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

Orchestrate parallel full-team dispatch for open GitHub issues. Each issue gets its own dedicated team of agents (Rex, Ada, Turing, Sage) working in an isolated worktree. Multiple issue teams run simultaneously.

**CRITICAL: Follow the Issue Swarm Protocol in `.claude/TEAM_WORKFLOW.md`.**

## Phase 1 — Gather Issues

1. **Verify authentication**: Run `gh auth status` to confirm the active GitHub account is `dulvac`.

2. **Fetch open issues**:
   - If `$ARGUMENTS` is non-empty, filter by label:
     ```
     gh issue list --repo dulvac/dekk --state open --label "$ARGUMENTS" --json number,title,labels,body,assignees --limit 20
     ```
   - If `$ARGUMENTS` is empty:
     ```
     gh issue list --repo dulvac/dekk --state open --json number,title,labels,body,assignees --limit 20
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

### Display Plan
Present the assignment table to the user:
```
| # | Issue | Branch | Team |
|---|-------|--------|------|
| 42 | Fix button contrast | fix/42-fix-button-contrast | Rex (impl) + Ada (review) + Turing (test) + Sage (security) |
| 15 | Add export to PDF | feature/15-add-export-to-pdf | Rex (impl) + Ada (review) + Turing (test) |
```

Proceed without waiting for approval (per Autonomous Fix Policy in TEAM_WORKFLOW.md).

## Phase 3 — Dispatch Issue Team Leads

**Spawn ALL issue team leads in a SINGLE message** (parallel dispatch). For each issue, use the `Task` tool to spawn a **team lead agent** that will coordinate its own sub-team:

```
subagent_type: "general-purpose"
name: "lead-issue-{issue-number}"
isolation: "worktree"
```

### Issue Agent Prompt Template

Each issue agent receives this prompt (filled with issue-specific values):

```
You are an implementation agent for GitHub issue #{number} in the dekk project.
You are working in an isolated worktree. Implement the fix/feature, run tests, and create a PR.

## Issue
**Title:** {title}
**Labels:** {labels}
**Body:**
{body}

## Branch
Create and work on branch: `{branch-name}`
Run: `git checkout -b {branch-name}`

## Your Workflow

### Step 1: Understand the Issue
Read `CLAUDE.md` for project standards.
Analyze the issue to understand scope and the right fix.

### Step 2: Implement
- Follow project standards: TypeScript strict mode, CSS Modules, TDD, small focused components
- Write tests alongside the implementation
- Run `npm run test:run` and `npm run build` to verify

### Step 3: Finalize
1. Commit with a conventional commit message (e.g., `fix: correct button contrast ratio`)
2. Push the branch: `git push -u origin {branch-name}`
3. Create PR:
   ```
   gh pr create --repo dulvac/dekk --title "{conventional-commit-title}" --body "$(cat <<'PREOF'
   ## Summary
   {brief description of changes}

   Closes #{number}

   ## Test plan
   - [ ] Unit tests pass
   - [ ] Build succeeds
   - [ ] Manual verification of the fix/feature

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )"
   ```

## Important Rules
- The PR body MUST include `Closes #{number}` to auto-close the issue on merge
- Follow conventional commits for all commit messages
- Do NOT modify files unrelated to this issue
- Read `CLAUDE.md` before starting — it has the coding standards, brand colors, and architecture
```

## Phase 4 — Monitor & Collect

As issue agents complete and go idle:

1. **Review output**: Check that each agent created its branch, implemented the fix, pushed, and opened a PR
2. **Verify PR linking**: Confirm each PR body contains `Closes #{issue-number}`
3. **Handle failures**: If an agent failed or got stuck, note the failure reason for the summary report

## Phase 4.5 — Post-Hoc Review

After all PRs are created, dispatch the full team (Ada, Rex, Sage, Turing, Eliza) to review:

1. **Create team** via `TeamCreate` with `team_name: "dekk"`
2. **Dispatch all 5 agents** in parallel, each reviewing ALL PRs from their specialty:
   - Ada: architecture, component boundaries, cross-PR interactions, TypeScript type safety
   - Rex: React patterns, CSS consistency, visual coherence, accessibility
   - Sage: XSS risks, injection vectors, dependency safety, OWASP top 10
   - Turing: test coverage, build correctness, CI status, edge cases
   - Eliza: CLAUDE.md accuracy, commit conventions, PR linking, instrumentation health
3. **Each agent posts review comments** directly on the GitHub PRs via `gh pr review`
4. **Collect findings** and present consolidated report to user
5. **If critical/high findings**: dispatch fix agents against affected PRs before merging
6. **Shutdown agents** and clean up team

## Phase 5 — Report & Log

1. **Present summary** to the user:
   ```
   ## Issue Swarm Results
   | # | Issue | PR | Agents | Status |
   |---|-------|----|--------|--------|
   | 42 | Fix button contrast | #5 | Rex, Ada, Turing | ✓ PR created |
   | 15 | Add export to PDF | — | Rex, Ada, Sage, Turing | ✗ Build failed |
   ```

2. **Communication Logging**: Follow the Communication Logging Protocol from `TEAM_WORKFLOW.md`:
   - Create invocation block in `docs/team-execution-log.md` at session start
   - Log every dispatch and agent message
   - Generate Mermaid sequence diagram at session end
   - Prune to last 20 invocations

Arguments: $ARGUMENTS
