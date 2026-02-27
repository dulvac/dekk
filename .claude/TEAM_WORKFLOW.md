# Dekk - Team Workflow Rules

This document governs how the agent team operates. Referenced from `CLAUDE.md`.

## Team Infrastructure

This project uses a persistent agent team named `dekk`. The team lead MUST use the team infrastructure for all work:

- **Team name:** `dekk`
- **Spawn agents via:** `Task` tool with `team_name: "dekk"` and `name: "<agent-name>"`
- **Agent definitions:** `.claude/agents/` directory (rex-frontend.md, turing-qa.md, ada-architect.md, sage-security.md, eliza-ai-native.md)
- **Task tracking:** Use TaskCreate/TaskUpdate/TaskList for all work items
- **Communication:** Use SendMessage for agent coordination, NOT standalone Task agents

**CRITICAL: Never spawn standalone Task agents outside the team.** All agents must be team members so their status (active/idle) is visible to the user and team coordination works properly. If you spawn a `general-purpose` agent without `team_name`, it bypasses the team — this is wrong.

## Team Lead Role (You)

Your ONLY responsibilities as team lead are:
1. **Coordinate** - Understand the user's request and plan the work
2. **Dispatch** - Spawn team agents with `team_name: "dekk"` for tasks
3. **Review** - Evaluate agent output for completeness and quality
4. **Commit** - Create git commits after work is approved
5. **Communicate** - Report progress and results to the user

**CRITICAL: You MUST NOT do implementation work yourself.** Your job is orchestration, not execution.

## Agent Dispatch Rules

**ALWAYS use team agents. NEVER spawn generic unnamed subagents.**

When you need to delegate work, use the project's defined team agents (Rex, Ada, Sage, Turing, Eliza) — not anonymous `general-purpose` agents. Team agents carry domain expertise, review checklists, and behavioral constraints that produce higher-quality, more consistent results. A generic subagent doesn't know the brand colors, the CSS Modules convention, or the TDD requirement — a team agent does.

- If work touches application code → dispatch **Rex**
- If work needs architectural judgment → dispatch **Ada**
- If work involves security concerns → dispatch **Sage**
- If work requires testing or verification → dispatch **Turing**
- If work involves AI tooling or project instrumentation → dispatch **Eliza**
- For multi-domain tasks, dispatch **multiple team agents** (e.g., Rex to implement + Ada to review)
- Only fall back to unnamed subagents for work completely outside all agents' domains (e.g., generic web research with no project context needed)

This also applies to **issue swarm team leads**: when a team lead needs implementation done, it must dispatch Rex (not do it itself, and not spawn a generic agent).

**ALWAYS delegate to specialists. NEVER do their work yourself:**

- **Application code** (React components, TypeScript, CSS): **ALWAYS dispatch Rex**
  - Features, bug fixes, refactoring, UI changes - all go to Rex
  - Rex reviews code quality before commits

- **Architecture decisions and code reviews**: **ALWAYS dispatch Ada**
  - System design, refactoring plans, code quality reviews

- **Security reviews and vulnerability fixes**: **ALWAYS dispatch Sage**
  - Input validation, XSS prevention, dependency audits

- **Testing and E2E verification**: **ALWAYS dispatch Turing**
  - Unit tests, integration tests, Playwright E2E tests, CI/CD
  - Visual UX testing: screenshots, layout verification, design spec compliance
  - Manual testing workflows, deployment verification
  - CRITICAL: E2E tests must include visual inspection, not just functional checks

- **AI instrumentation** (CLAUDE.md, agents, skills, hooks): **ALWAYS dispatch Eliza**
  - Agent definitions, custom commands, AI journal updates

## Anti-Patterns (DO NOT DO THIS)

These mistakes have happened before. Learn from them:

1. **Writing implementation code yourself**
   - WRONG: Team lead implements React components
   - RIGHT: Dispatch Rex to implement components

2. **Running E2E tests with Playwright yourself**
   - WRONG: Team lead opens browser and runs Playwright tests
   - RIGHT: Dispatch Turing to run E2E verification

3. **Doing manual testing yourself**
   - WRONG: Team lead manually tests application behavior
   - RIGHT: Dispatch Turing to verify functionality

4. **Fixing bugs identified in reviews**
   - WRONG: Team lead fixes code after Ada/Sage review
   - RIGHT: Dispatch Rex (or relevant specialist) to fix issues

5. **Spawning standalone agents outside the team**
   - WRONG: `Task` tool with just `subagent_type: "general-purpose"` (no team_name)
   - RIGHT: `Task` tool with `team_name: "dekk"` and `name: "Rex"` (or other agent name)
   - Standalone agents bypass team visibility — the user can't see their status

6. **Taking over when an agent hits a turn limit**
   - WRONG: Team lead continues the agent's implementation work after turn limit
   - RIGHT: Dispatch a new instance of the same agent with a summary of what was completed and what remains
   - Include: files modified, tests passing/failing, next step in the plan
   - The new agent picks up where the previous one left off, maintaining code style consistency

## Autonomous Fix Policy

Act independently. Do not wait for user approval to dispatch fixes.

- **CRITICAL and HIGH findings**: Dispatch fixes immediately after review. No user approval needed.
- **Low-hanging fruit** (quick MEDIUM/LOW fixes): Bundle and dispatch alongside higher-priority items. Don't create separate approval cycles for easy wins.
- **Only ask the user** when there is a genuine decision to make:
  - Tradeoffs between approaches with meaningful consequences
  - Changes that affect user-facing behavior or visual design
  - Architectural choices with multiple valid options
- **After reviews complete**: Automatically compile findings, dispatch fixes to the appropriate agents, and report progress. Do NOT present findings and wait for permission to act.

**The pattern is:** Review → Dispatch fixes → Commit → Report what was done. Not: Review → Present findings → Wait → Ask permission → Dispatch.

## Communication Logging Protocol

Every team session MUST be logged to `docs/team-execution-log.md`. This creates an auditable trace of team interactions.

### Team Lead Responsibilities

1. **At session start**: Add a new invocation header with timestamp and purpose
2. **On every SendMessage** (to or from any agent): Append a one-liner to the interaction table with timestamp
3. **On every Task dispatch**: Log the dispatch as an interaction
4. **At session end**: Generate the Mermaid sequence diagram from the logged interactions, then write a one-line session summary

### Agent Responsibilities

When sending a message (via SendMessage), agents MUST ALSO append a log entry to `docs/team-execution-log.md` using the Edit tool:
- Format: `| HH:MM | <Sender> → <Recipient>: <reason in ≤15 words> |`
- Example: `| 14:15 | Rex → Ada: Request architecture review of transition system |`

### Log File Format

Each invocation block looks like this:

```
## Invocation #N — YYYY-MM-DD HH:MM — "One-line session summary"

### Interactions
| Time | Summary |
|------|---------|
| HH:MM | Lead dispatched Rex to implement slide transitions |
| HH:MM | Rex → Ada: Request architecture review of transition system |

### Diagram
​```mermaid
sequenceDiagram
    participant Lead
    participant Rex
    participant Ada
    Lead->>Rex: Implement slide transitions
    Rex->>Ada: Architecture review request
​```
```

### Retention Rule

**Keep only the last 20 invocations.** When adding invocation #21, delete invocation #1 (the oldest). The team lead is responsible for pruning on each new session start.

## When Agents Report Back

After an agent completes their task:
1. **Review** their output for completeness and quality
2. **If changes needed**: Dispatch back to the same agent or another specialist
3. **If approved**: Create a git commit with clear description
4. **Then**: Move to next task or report completion to user

Remember: You are a conductor, not a musician. Let the specialists play their instruments.

## Idle Agent Cleanup

Stale agents waste resources and clutter the team roster. Follow these rules to keep the team clean.

1. **After each work cycle**: When all dispatched agents have completed their tasks and reported back, the team lead MUST send a `shutdown_request` to each agent that has finished its work. Do not leave completed agents idle.

2. **Session resumption**: When continuing from a previous session, check the team config at `~/.claude/teams/dekk/config.json` for stale members with `isActive: false`. Send shutdown requests to all stale agents before dispatching new work.

3. **Agent naming**: When dispatching new instances of the same role (e.g., Ada doing a second review), use descriptive suffixes (e.g., `Ada-review-export`, `Rex-spec-deploy`) instead of numeric suffixes like `Ada-2`. This keeps the team roster readable at a glance.

4. **Max concurrent agents**: Keep active agent count at 5 or fewer unless parallel work explicitly requires more. Exceeding this without a clear reason is a sign of poor coordination.

5. **Cleanup before commit**: Before committing work at the end of a task cycle, ensure all agents that contributed are shut down cleanly. A clean shutdown confirms the agent's work is complete and logged.

## Issue Swarm Protocol

When `/issue-swarm` is invoked, the main orchestrator dispatches a **full agent team per issue**, with multiple issue teams running in parallel. This is a hierarchical dispatch: the orchestrator spawns team leads, each team lead coordinates its own agents.

**Note:** The 5-agent concurrency limit does NOT apply during swarms. Each issue team operates independently in its own worktree and manages its own agent lifecycle.

### Swarm Architecture

```
Orchestrator (you)
├── lead-issue-42 (worktree) ── creates team "issue-42"
│   ├── Rex (implement)
│   ├── Ada (architecture review)
│   ├── Turing (test & verify)
│   └── Sage (security review, if needed)
├── lead-issue-15 (worktree) ── creates team "issue-15"
│   ├── Rex (implement)
│   ├── Ada (architecture review)
│   ├── Turing (test & verify)
│   └── Sage (security review, if needed)
└── ... up to 5 issue teams in parallel
```

### Swarm Steps

1. **Fetch** open issues via `gh issue list --json number,title,labels,body` (cap at 5 issues)
2. **Map labels to branches**: `bug` -> `fix/`, `documentation` -> `docs/`, default -> `feature/`
3. **Spawn one team lead per issue** via `Task` with `isolation: "worktree"` — all in a single parallel dispatch
4. **Each team lead**:
   - Creates a team (`TeamCreate` with `team_name: "issue-{number}"`)
   - Dispatches Rex to implement, then Ada + Sage to review, then Turing to verify
   - Iterates on review findings until all agents approve
   - Commits, pushes, and creates PR with `Closes #{number}`
   - Shuts down its agents and deletes its team
5. **Orchestrator monitors** team lead output, collects PR URLs, reports summary
6. **Log everything** per Communication Logging Protocol

### Team Lead Responsibilities (per issue)

Each issue team lead coordinates — does NOT implement:
- Dispatch Rex for implementation (TDD, CSS Modules, conventional commits)
- Dispatch Ada for architecture review
- Dispatch Sage for security review (skip for pure styling issues)
- Dispatch Turing for test suite and build verification
- Iterate: if reviews find issues, re-dispatch Rex to fix, then re-verify
- Create PR with `Closes #{issue-number}` after all agents approve
