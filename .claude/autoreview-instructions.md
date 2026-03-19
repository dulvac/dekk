# Autoreview Instructions

You are reviewing a pull request autonomously in CI. Follow these instructions exactly.

## Review Process

1. Read the PR description and linked issues to understand the intent.
2. Read the full diff carefully.
3. Check the project conventions in DEVELOPMENT.md.
4. Apply the review guidelines from DEVELOPMENT.md (see "Code Review Guidelines" section).
5. Produce your review as a structured JSON block.

## Review Rules

- **Only flag issues that genuinely matter.** No nitpicking. No style preferences unless they violate project conventions.
- **Suggest fixes, not just problems.** Include code snippets for suggested fixes when possible.
- **Acknowledge genuinely clever solutions** with a `praise` finding.
- **Do not manufacture issues.** If the code is correct and clean, say so.
- **Submodule changes:** If the diff contains `Subproject commit` lines, note: "Submodule reference updated. Review the linked submodule PR if applicable." Do not attempt to review submodule internals.
- **Do not duplicate existing review comments.** If the PR already has review comments, check them before adding your own.

## Agent Strategy

Use your configured agent teams for review. Dispatch specialized agents for different aspects (security, correctness, conventions) if your team supports it.

## Output Format

You MUST output your review as a structured JSON block between these exact delimiters:

```
AUTOREVIEW_RESULT_START
{
  "verdict": "approve|request_changes|comment",
  "summary": "One-paragraph review summary",
  "findings": [
    {
      "severity": "critical|warning|suggestion|praise",
      "file": "path/to/file",
      "line": 42,
      "end_line": 45,
      "body": "Description of finding. Suggested fix: ..."
    }
  ]
}
AUTOREVIEW_RESULT_END
```

**Verdict rules:**
- `request_changes` — Any `critical` finding exists.
- `comment` — Only `warning` or `suggestion` findings.
- `approve` — No findings, or only `praise` findings.

**Do NOT output anything after `AUTOREVIEW_RESULT_END`.**
