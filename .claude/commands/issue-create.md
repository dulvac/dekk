---
description: Create a new GitHub issue (e.g., /issue-create "Fix button contrast" --label bug --body "The primary button fails WCAG AA")
allowed-tools: Bash
---

Create a new GitHub issue on the `dulvac/dekk` repository.

## Argument Parsing

Parse `$ARGUMENTS` to extract:
- **Title** (required): The first quoted string, or all text before the first `--` flag
- **`--label <name>`** (optional, repeatable): Labels to apply
- **`--body "text"`** (optional): Issue body text

If no arguments are provided, ask the user for at least a title.

## Steps

1. **Verify authentication**: Run `gh auth status` to confirm the active GitHub account.

2. **Validate labels** (if any provided): Run `gh label list --repo dulvac/dekk --json name` and verify each requested label exists. Warn and skip any invalid labels.

3. **Create the issue**: Build and run the `gh issue create` command:
   ```
   gh issue create --repo dulvac/dekk --title "<title>" [--label "<label>"] [--body "<body>"]
   ```
   - If no `--body` was provided, use `--body ""` to skip the interactive editor.

4. **Report**: Output the created issue's URL and number.

## Label Reference

Common labels for this project:
- `bug` — Something isn't working (maps to `fix/` branches)
- `enhancement` — New feature or request (maps to `feature/` branches)
- `documentation` — Improvements or additions to documentation (maps to `docs/` branches)

Arguments: $ARGUMENTS
