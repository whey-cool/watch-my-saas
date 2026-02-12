Run at the start of every session to detect stale documentation and set up the session context.

## Instructions

### 1. Documentation Freshness Audit

Read these files and cross-reference for staleness:

- `CLAUDE.md` — project state, decisions, structure, commands, invariants
- `wms-prd.md` — session plan, deliverables, exit conditions
- `.wiki/Home.md` — page index completeness
- `.wiki/Developers-Guide.md` — setup instructions, commands list, prerequisites
- `.wiki/Architecture.md` — stack, data flow, open questions

Check for these staleness patterns:

#### a) Naming Drift
Search all wiki pages for references to commands, skills, or concepts that have been renamed. Compare command names in:
- `.claude/commands/` (actual commands)
- `CLAUDE.md` Commands section
- `.wiki/Developers-Guide.md` commands list
- Any brainstorm or decision pages that reference commands

Flag mismatches.

#### b) Session Number Drift
Search wiki and docs for "Session N" references (e.g., "Coming in Session 3"). Compare against the current session plan in `wms-prd.md`. Flag any that point to the wrong session.

#### c) Placeholder Rot
Check for:
- "TBD" or "Coming in Session" entries that should now be resolved
- Empty directories with only `.gitkeep` that are no longer needed or premature
- Stub pages that should have been filled in by now

#### d) Command/Skill Inventory
Compare the actual `.claude/commands/` directory against what's documented in:
- `CLAUDE.md` Commands section
- `.wiki/Developers-Guide.md`

Flag any commands that exist but aren't documented, or documented commands that don't exist.

#### e) Cross-Document Facts
Verify these facts are consistent across CLAUDE.md, PRD, and wiki:
- Current session number and name
- Which OQs are resolved vs open
- Named patterns list (should be identical everywhere)
- Stack decisions
- Session roadmap

#### f) Serena Memory Freshness
Activate the Serena project (`activate_project`) and list memories (`list_memories`). For each memory file, verify:
- `project_overview.md` — matches current session state in CLAUDE.md
- `tech_stack.md` — reflects actual dependencies in package.json
- `suggested_commands.md` — matches actual scripts in package.json and documented commands
- `project_structure.md` — matches actual directory layout (run `ls` to compare)
- `style_and_conventions.md` — consistent with CLAUDE.md conventions
- `task_completion_checklist.md` — consistent with cross-session invariants

Flag any drift for auto-fix or user decision.

### 2. Fix or Flag

For each issue found:
- **Auto-fixable** (typo, naming update, missing command in a list): Fix it immediately
- **Needs decision** (structural change, content rewrite): Flag it for the user with the specific concern

### 3. Session Context Setup

After the audit, run `/standards` to present the standards briefing with session alignment.

### 4. Permission Cleanup (Optional)

Review `.claude/settings.local.json` permissions. Flag any one-off entries from previous sessions that are no longer needed (e.g., commands referencing specific repos or paths that were only relevant to archaeology).

## Output

Present:
1. **Staleness report**: Table of issues found, categorized as Fixed / Flagged
2. **Serena memory status**: Fresh / Updated / Flagged for each memory file
3. **Standards briefing** (from `/standards`)
4. **Session ready**: Confirm entry conditions are met for the current session
