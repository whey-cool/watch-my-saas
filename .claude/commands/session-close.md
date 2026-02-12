Run at the end of every session to ensure documentation is complete and nothing went stale.

## Instructions

### 1. Session Deliverables Verification

Read `wms-prd.md` for the current session's exit conditions. For each exit condition:
- **Met**: Confirm with evidence (test output, file exists, command works)
- **Not met**: Flag with explanation of what remains
- **Deferred**: Note if deliberately moved to a future session (and update PRD)

### 2. Documentation Completeness

#### a) CLAUDE.md Update
Read current `CLAUDE.md` and verify it reflects:
- Any new decisions made this session
- Updated session history (add this session's summary)
- Any new commands/skills created
- Updated project structure if files were added/removed
- Any resolved open questions

If stale, draft the update for user review.

#### b) Wiki Changelog
Check if a changelog entry exists for today. If not, prepare one by reviewing:
- Git log for commits made this session
- Files created or modified
- Decisions made
- Key accomplishments

Invoke `/wiki-changelog` to create the entry.

#### c) Wiki Page Index
Verify `.wiki/Home.md` includes links to any new wiki pages created this session.

#### d) Developers Guide
If new commands, setup steps, or prerequisites were added this session, verify they're reflected in `.wiki/Developers-Guide.md`.

#### e) Decision Pages
If any decisions were made this session (even informal ones during implementation), verify they have wiki decision pages or are at least documented in the changelog.

### 3. Forward Reference Check

Search all files modified this session for:
- "TODO" or "FIXME" comments — ensure they're tracked
- "Session N" references — ensure they point to the correct future session
- Placeholder values — ensure they're either filled in or explicitly noted as deferred

### 4. Cross-Session Invariant Verification

Check all 10 invariants from CLAUDE.md:
1. Wiki updated? (changelog entry exists for this session)
2. CLAUDE.md current? (reflects session work)
3. TDD followed? (coverage >= 80% on new code)
4. No HerdMate leakage? (no private repo references in public files)
5. Archaeology data gitignored? (data/archaeology/ not in git)
6. Wiki records history? (session documented)
7. Telemetry reviewed? (after Session 4)
8. Community signals reviewed? (after Session 4)
9. Dogfood loop active? (after Session 5)
10. Recommendations constructive? (no judgmental language in new code)

### 5a. Claude Code Memory Update

Review if any patterns, conventions, or lessons learned this session should be saved to the auto memory at `/home/megan/.claude/projects/-home-megan-Workspace-watch-my-saas/memory/MEMORY.md`.

### 5b. Serena Memory Update

Review Serena memories for staleness caused by this session's work:

1. Activate the Serena project (`activate_project`) and list memories (`list_memories`)
2. Check each memory file against session changes:
   - **project_structure.md**: New directories or files added? Update the tree.
   - **tech_stack.md**: New dependencies added (e.g., Hono, Prisma)? Update.
   - **suggested_commands.md**: New npm scripts or commands created? Update.
   - **project_overview.md**: Session state changed? Update current state section.
   - **style_and_conventions.md**: New patterns established? Update.
   - **task_completion_checklist.md**: New invariants or checks? Update.
3. Use `write_memory` to update any stale memories
4. Only update what actually changed — don't rewrite memories that are still accurate

## Output

Present:
1. **Exit conditions**: Checklist with status (met/not met/deferred)
2. **Documentation status**: What was updated, what needs attention
3. **Invariant compliance**: All 10 invariants checked
4. **Carried forward**: Any items deferred to future sessions
5. **Claude Code memory updates**: Any new patterns or conventions recorded
6. **Serena memory updates**: List of memories updated with brief reason (or "all fresh")
