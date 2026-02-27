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

### Issue Team Lead Prompt Template

Each team lead receives this prompt (filled with issue-specific values):

```
You are the team lead for GitHub issue #{number} in the dekk project.
You are working in an isolated worktree. Your job is to coordinate a full team to resolve this issue.

## Issue
**Title:** {title}
**Labels:** {labels}
**Body:**
{body}

## Branch
Create and work on branch: `{branch-name}`
Run: `git checkout -b {branch-name}`

## Your Workflow

You are a team lead — coordinate, don't implement. Follow these steps:

### Step 1: Understand the Issue
Read `CLAUDE.md` for project standards and `docs/plans/2026-02-20-dekk-design.md` for design specs.
Analyze the issue to understand scope and which agents are needed.

### Step 2: Create Team and Tasks
Create a team via `TeamCreate` with `team_name: "issue-{number}"`.
Create tasks via `TaskCreate` for each work item.

### Step 3: Dispatch Agents in Parallel
Spawn the following agents into your team via the `Task` tool (with `team_name: "issue-{number}"`):

- **Rex** (`name: "Rex"`, `subagent_type: "general-purpose"`) — Primary implementer.
  Implements the fix/feature following project standards: TypeScript strict mode, CSS Modules,
  TDD (write failing tests first), small focused components. Rex writes both the implementation
  code AND the tests.

- **Ada** (`name: "Ada"`, `subagent_type: "general-purpose"`) — Architecture reviewer.
  Reviews Rex's implementation for clean code, proper component boundaries, data flow,
  TypeScript type safety. Reports findings back to you.

- **Turing** (`name: "Turing"`, `subagent_type: "general-purpose"`) — QA verification.
  Runs the full test suite (`npm run test:run`), runs the build (`npm run build`),
  and verifies the changes work correctly. Reports pass/fail status.

- **Sage** (`name: "Sage"`, `subagent_type: "general-purpose"`) — Security review.
  Reviews changes for XSS risks, injection vulnerabilities, unsafe patterns.
  Only dispatch Sage if the issue involves user input, markdown rendering, or external data.
  Skip for pure styling/layout issues.

### Step 4: Coordinate the Work
1. First dispatch Rex to implement the fix/feature (assign the implementation task).
2. Once Rex completes, dispatch Ada and Sage in parallel to review Rex's work.
3. If Ada or Sage find issues, dispatch Rex again to fix them.
4. Once reviews pass, dispatch Turing to run tests and verify the build.
5. If Turing reports failures, dispatch Rex to fix, then re-verify.

### Step 5: Finalize
Once all agents approve and tests pass:
1. Ensure all changes are committed with conventional commit messages
   (e.g., `fix: correct button contrast ratio` or `feat: add export to PDF`)
2. Push the branch: `git push -u origin {branch-name}`
3. Create PR:
   ```
   gh pr create --repo dulvac/dekk --title "{conventional-commit-title}" --body "$(cat <<'PREOF'
   ## Summary
   {brief description of changes}

   Closes #{number}

   ## Review
   - Implemented by Rex
   - Architecture reviewed by Ada
   - Security reviewed by Sage
   - Tests verified by Turing

   ## Test plan
   - [ ] Unit tests pass
   - [ ] Build succeeds
   - [ ] Manual verification of the fix/feature

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )"
   ```

### Step 6: Cleanup
Send `shutdown_request` to all team agents after work is complete.
Then clean up the team with `TeamDelete`.

## Important Rules
- The PR body MUST include `Closes #{number}` to auto-close the issue on merge
- Follow conventional commits for all commit messages
- Do NOT modify files unrelated to this issue
- You are a team lead — coordinate and review, do NOT write implementation code yourself
- If the issue is unclear or too large, implement what you can and note limitations in the PR description
```

## Phase 4 — Monitor & Collect

As issue team leads complete and go idle:

1. **Review output**: Check that each team lead created its branch, coordinated its agents, pushed, and opened a PR
2. **Verify PR linking**: Confirm each PR body contains `Closes #{issue-number}`
3. **Handle failures**: If a team lead failed or got stuck, note the failure reason for the summary report
4. **Cleanup**: The team leads handle their own agent shutdown and team cleanup. Verify this happened.

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
