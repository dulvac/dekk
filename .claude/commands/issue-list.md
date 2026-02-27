---
description: List open GitHub issues, optionally filtered by label (e.g., /issue-list bug)
allowed-tools: Bash
---

List open GitHub issues for the `dulvac/dekk` repository.

## Steps

1. **Verify authentication**: Run `gh auth status` to confirm the active GitHub account.

2. **Fetch issues**:
   - If `$ARGUMENTS` is non-empty, treat it as a label filter:
     ```
     gh issue list --repo dulvac/dekk --state open --label "$ARGUMENTS" --json number,title,labels,assignees,createdAt --limit 50
     ```
   - If `$ARGUMENTS` is empty, list all open issues:
     ```
     gh issue list --repo dulvac/dekk --state open --json number,title,labels,assignees,createdAt --limit 50
     ```

3. **Format output** as a readable table with columns: `#`, `Title`, `Labels`, `Assignees`, `Created`.

4. **Show summary**: Total count of open issues. If a label filter was applied, mention it (e.g., "3 open issues with label 'bug'").

5. If no issues are found, report "No open issues found" (with label context if filtered).

Arguments: $ARGUMENTS
