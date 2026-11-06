---
name: l-build
description: Implementation workflow. Executes an approved plan step by step with minimal changes, using api-designer, ui-builder, implementer, and simplifier (apply mode). Use when the user invokes /l-build, approves a plan, or asks to implement a well-defined change.
---

# /l-build

## Step 0: Check readiness

- Trivial change (1 file, obvious): proceed without a plan.
- Otherwise, with no approved plan: suggest `/l-plan` in one line and stop, unless the user says to proceed.
- Read every file you will modify before writing anything.

## Running a phase

If your environment supports sub-agents, delegate the phase to the named sub-agent. Pass it: the goal, the plan steps for that phase, the files in scope, and earlier phase outputs. Otherwise, perform the phase yourself by following the skill with the same name. Skip phases that do not apply and say so in one line.

## Phases

1. `api-designer`: only if types, signatures, endpoints, or schemas change.
2. `ui-builder`: only if the user-facing UI changes.
3. `implementer`: execute the plan steps in order. After each step, run that step's `Verify` check. If a check fails, fix it (follow `debugger`) before starting the next step.
4. `simplifier` in **apply** mode: only the code changed in this task.

## Output

```
Steps: 1 done, 2 done, 3 failed (<reason>)
Changed: <path — one line each>
Verified: <command → result> | not run (<reason>)
Out of scope noticed: <bullets> | None
Next: /l-verify
```
