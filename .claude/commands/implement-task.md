---
description: Implement a specific task from the implementation plan (pass task number as argument)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

Implement the specified task from the implementation plans. Check both:
- `docs/plans/2026-02-20-marko-pollo-implementation.md` (original 16-task plan, Tasks 1-16)
- `docs/plans/2026-02-20-cohesive-implementation.md` (cohesive feature suite, Tasks 1.1-4.8)

Follow the TDD approach defined in the plan:
1. Write the failing tests first
2. Run tests to confirm they fail
3. Implement the code
4. Run tests to confirm they pass
5. Run the full test suite to ensure no regressions
6. Commit with the message specified in the plan

Refer to the design doc at `docs/plans/2026-02-20-marko-pollo-design.md` for any visual or architectural details.

Task number to implement: $ARGUMENTS
