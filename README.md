# L-Agent

Plan-first skills and sub-agents for AI coding tools.
Think before coding. Keep it simple. Change only what matters. Verify everything.

Works with **Antigravity** and **Claude Code**.

## Install

### Option 1: Using `npx skills` (Recommended — directly from GitHub)

Install all skills into your project or global agent config (Claude Code, Antigravity, Cursor, Codex, etc.):

```bash
npx skills add MaulanaASetiawan/l-agent-skill
```

List available skills or install a single specialist:

```bash
npx skills add MaulanaASetiawan/l-agent-skill --list
npx skills add MaulanaASetiawan/l-agent-skill --skill l-plan
npx skills add MaulanaASetiawan/l-agent-skill --skill ui-builder --global
```

### Option 2: Full Plugin Installer (Antigravity + Claude Code with Sub-Agents & Core Rules)

```bash
npx github:MaulanaASetiawan/l-agent-skill install
```

To target a specific tool:

```bash
npx github:MaulanaASetiawan/l-agent-skill install --target antigravity   # or: claude, all
```

Restart your tool afterwards.

| Tool | Installed to |
|---|---|
| Antigravity | `~/.gemini/config/plugins/l-agent/` (plugin: skills, agents, rules) |
| Claude Code | `~/.claude/skills/`, `~/.claude/agents/`, and a marked block in `~/.claude/CLAUDE.md` |

The installer never overwrites files it didn't create. If a skill or agent with the same name already exists, it stops and lists the conflicts. Your existing `CLAUDE.md` is backed up to `CLAUDE.md.bak` before the first write.

## Uninstall

```bash
npx l-agent-skill uninstall            # all tools
npx l-agent-skill uninstall --target claude
```

This removes only what L-Agent installed, and restores `CLAUDE.md` to its previous content.

## Commands

### Workflows

| Command | What it does | Specialists used |
|---|---|---|
| `/l-plan` | Goal → design → risks → ordered steps. No code until approved. | goal-analyst, architect, risk-scanner, task-planner |
| `/l-build` | Executes the plan step by step, verifying each step. | api-designer, ui-builder, implementer, simplifier (apply) |
| `/l-verify` | Tests → root-cause fixes → security and performance audit. | test-runner, debugger, security-auditor, performance-checker |
| `/l-review` | Read-only review with a merge verdict. | code-reviewer, api-reviewer, simplifier (report), doc-generator (list) |

Every workflow sizes the task first. A trivial change skips the phases it doesn't need.

### Specialists

Each one can be called directly by its name, or used by the workflows as a sub-agent.

| Command | Job |
|---|---|
| `/goal-analyst` | Turn a request into goal, scope, and open questions |
| `/architect` | Design the minimal set of changes |
| `/risk-scanner` | Find risks in a design before coding |
| `/task-planner` | Break a design into verifiable steps |
| `/api-designer` | Define types, signatures, endpoints, schemas |
| `/ui-builder` | Build UI using the project's existing stack |
| `/implementer` | Write the logic and tests for planned steps |
| `/simplifier` | Remove complexity: `apply` mode edits, `report` mode (default) only lists |
| `/test-runner` | Run tests and report exact results |
| `/debugger` | Trace a failure to its root cause and apply the smallest fix |
| `/security-auditor` | Find vulnerabilities with file and line |
| `/performance-checker` | Find N+1, unbounded queries, leaks, heavy renders |
| `/code-reviewer` | Correctness, error handling, edge cases, readability |
| `/api-reviewer` | Interface consistency and backward compatibility |
| `/doc-generator` | Fill doc gaps: `write` mode (default) or `list` mode |

## Core rules (always on)

1. Read before writing
2. Simplicity first
3. Surgical changes
4. Goal-driven execution
5. Report red flags
6. Verify before done

All output is short: result first, one line per finding, one severity scale (`CRITICAL / HIGH / MEDIUM / LOW`).

## Development

```
src/
├── rules.md          # core rules (→ AGENTS.md / CLAUDE.md block)
├── plugin.json       # Antigravity manifest
├── workflows/        # l-plan, l-build, l-verify, l-review → skills
└── specialists/      # 15 files → both a sub-agent and a slash skill
```

Each specialist is written once. The installer emits it as both an agent and a skill, so the two versions can't drift apart.

```bash
npm test
```

Every specialist must have these sections, in this order: `Role, Input, Process, Output, Rules, Stop and ask when`.