---
description: Spin up the full Marko Pollo team to review the current state of the project
---

Assemble the Marko Pollo development team for a comprehensive review of the project's current state.

**CRITICAL: Use the team infrastructure.** All agents MUST be spawned via the `Task` tool with `team_name: "marko-pollo"` and the agent's `name` parameter. Do NOT spawn standalone agents outside the team — this bypasses team visibility and violates the project workflow.

Spawn the following agents into the `marko-pollo` team and have each review from their specialty:

1. **Ada** (Architect) - `name: "Ada"` - Review architecture, component boundaries, data flow, crash risks
2. **Rex** (Frontend) - `name: "Rex"` - Review React patterns, component quality, CSS, visual fidelity
3. **Sage** (Security) - `name: "Sage"` - Review for vulnerabilities, XSS risks, dependency safety
4. **Turing** (QA) - `name: "Turing"` - Review test coverage, CI config, build correctness, edge cases
5. **Eliza** (AI-native) - `name: "Eliza"` - Review Claude Code instrumentation, CLAUDE.md accuracy, agent definitions

Each agent should read the design doc and implementation plan, then review the current codebase from their perspective. Use `TaskCreate` to track each agent's review as a task. Collect all findings and present a consolidated report.
