---
name: l-verify
description: Verification workflow. Runs tests, fixes failures at the root cause, then audits security and performance of the changed code, using test-runner, debugger, security-auditor, and performance-checker. Use when the user invokes /l-verify, after /l-build, or when something is broken.
---

# /l-verify

## Scope

Verify the code changed in this task. If unclear, use the uncommitted diff (`git diff HEAD`) or ask which files.

## Running a phase

If your environment supports sub-agents, delegate the phase to the named sub-agent with the changed files and any prior output. Phases 3 and 4 are independent and may run in parallel. Otherwise, perform each phase yourself by following the skill with the same name.

## Phases

1. `test-runner`: run the tests.
2. `debugger`: only if Phase 1 has failures. Fix, then re-run Phase 1. After 3 failed fix cycles, stop and report what you know.
3. `security-auditor`: changed code. May be skipped only if the change touches no input handling, auth, data access, secrets, or external calls. State the skip.
4. `performance-checker`: changed code. May be skipped only if the change touches no loops over data, queries, I/O, or rendering. State the skip.

## Output

```
Tests:       <X passed, Y failed, Z skipped | no tests>
Fixed:       <root cause, one line each> | None
Security:    <findings> | None | skipped (<reason>)
Performance: <findings> | None | skipped (<reason>)
Verdict:     READY | NOT READY — <count of CRITICAL/HIGH>
```
