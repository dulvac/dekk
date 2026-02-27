#!/bin/bash
# Claude Code PreToolUse hook: block git commit on master branch.
# Input: JSON on stdin with { tool_input: { command: "..." } }
# Exit 0 = allow, exit 2 = block with error message.
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')

# Only check git commit commands (not git status, git log, etc.)
if [[ ! "$command" =~ ^git\ commit ]]; then
  exit 0
fi

# Check if we're on master (or main)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ "$branch" == "master" || "$branch" == "main" ]]; then
  echo '{"decision":"block","reason":"BLOCKED: You are on the '"$branch"' branch. Never commit directly to '"$branch"'. Switch to a feature/fix branch first. See CLAUDE.md Git Workflow rules."}' >&2
  exit 2
fi

exit 0
