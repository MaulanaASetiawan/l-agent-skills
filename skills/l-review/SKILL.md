---
name: l-review
description: Read-only code review workflow. Checks correctness, interface consistency, unnecessary complexity, and documentation gaps, using code-reviewer, api-reviewer, simplifier (report mode), and doc-generator (list mode). Use when the user invokes /l-review or asks for a review before merging.
---

# /l-review

This workflow is read-only. It never edits files.

## Scope

Review what the user names. Otherwise, review the current branch diff (`git diff <base>...HEAD`), or the uncommitted diff if there is no branch. State the scope in one line.

## Running a phase

If your environment supports sub-agents, delegate each phase to the named sub-agent with the files in scope. Phases are independent and may run in parallel. Otherwise, perform each phase yourself by following the skill with the same name.

## Phases

1. `code-reviewer`: correctness, error handling, edge cases, naming, readability.
2. `api-reviewer`: only if public interfaces (exports, endpoints, schemas, CLI) changed.
3. `simplifier` in **report** mode.
4. `doc-generator` in **list** mode.

## Output

Merge all findings. Remove duplicates (keep the higher severity). Group by file, sort by severity.

```
Scope: <what was reviewed>

path/to/file
  [SEVERITY] line — problem. Fix: action.

Missing docs: <items> | None
Verdict: READY | NOT READY — <N CRITICAL, M HIGH>
```
