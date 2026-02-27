---
description: Close a GitHub issue by number with optional comment (e.g., /issue-close 42 "Fixed in PR #5")
allowed-tools: Bash
---

Close a GitHub issue on the `dulvac/dekk` repository.

## Argument Parsing

Parse `$ARGUMENTS` to extract:
- **Issue number** (required): The first numeric value
- **Comment** (optional): Any remaining text after the number (may be quoted or unquoted)

If no issue number is provided, ask the user for one.

## Steps

1. **Verify authentication**: Run `gh auth status` to confirm the active GitHub account.

2. **Confirm issue exists**: Run `gh issue view <number> --repo dulvac/dekk --json state,title` to verify the issue exists and is currently open. If already closed, report that and stop.

3. **Add comment** (if provided): Run `gh issue comment <number> --repo dulvac/dekk --body "<comment>"` before closing.

4. **Close the issue**: Run `gh issue close <number> --repo dulvac/dekk`.

5. **Report**: Output confirmation with the issue title and URL.

Arguments: $ARGUMENTS
