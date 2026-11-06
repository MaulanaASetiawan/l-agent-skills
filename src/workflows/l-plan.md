---
name: l-plan
description: Planning workflow. Produces a reviewed, step-by-step plan before any code is written, using goal-analyst, architect, risk-scanner, and task-planner. Use when the user invokes /l-plan or asks to plan a feature, refactor, migration, or design change.
---

# /l-plan

No code changes until the user approves the plan.

## Step 0: Size the task

State the size in one line, then run what the table says.

| Size | Signal | Run |
|---|---|---|
| Trivial | 1 file, obvious change, no interface change | Phase 1 in one line, then a 1–3 step plan. Skip phases 2–3. |
| Standard | Several files or new behavior | All phases |
| Large | >10 files, schema/API change, migration, or new dependency | All phases. Get user confirmation of the design after Phase 2. |

## Running a phase

If your environment supports sub-agents, delegate the phase to the named sub-agent. Pass it: the goal, the files in scope, and the previous phase's output verbatim. Otherwise, perform the phase yourself by following the skill with the same name (e.g. `/goal-analyst`). If you skip a phase, say why in one line.

## Phases

1. `goal-analyst`: goal, scope, open questions. If questions remain that change the work, ask the user and stop.
2. `architect`: the minimal set of changes.
3. `risk-scanner`: risks in the design. If any are CRITICAL, revise the design (back to Phase 2) before continuing.
4. `task-planner`: ordered, verifiable steps.

## Output

One plan with these sections: **Goal, Scope, Design, Risks, Steps, Verification**. Paste phase outputs as they are; do not expand them into prose. Then stop and wait for approval. After approval, the next command is `/l-build`.
