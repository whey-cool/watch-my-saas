# Development Workflow

## Phase Gate Protocol

Every piece of work follows: **Build → Verify → Commit**. No skipping verify.

1. **Build** (TDD): Write test → run (RED) → implement → run (PASS)
2. **Verify** (3 parallel Haiku agents): code-reviewer + doc-updater + Serena refresh
3. **Fix** issues found by verify agents
4. **Commit** with conventional message

## Swarm vs Sequential Decision Tree

```
Is this work a shared contract (types, interfaces, config, app entry)?
  YES → Sequential (main thread). Other code depends on this.
  NO ↓

Does this file import from or export to another file being created in the same phase?
  YES → Sequential. Build the dependency first, then the dependent.
  NO ↓

Is the logic complex, interconnected, or requires full project context?
  YES → Sequential (main thread, Opus-level reasoning).
  NO ↓

Is there a clear file ownership boundary? (Agent A owns file X, Agent B owns file Y, no overlap)
  YES → Swarm eligible. Launch parallel Task agents with explicit file assignments.
  NO ↓

Default → Sequential.
```

## Swarm Rules

1. Define shared types/interfaces BEFORE launching parallel agents
2. Each agent gets explicit file ownership (list of files it may create/edit)
3. Agents must not import from files owned by other agents in the same swarm
4. Main thread integrates and resolves any interface mismatches after swarm completes
5. Verify checkpoint runs AFTER swarm integration, not per-agent

## Scope Enforcement

- Every file must trace to a plan deliverable. No speculative features.
- No backup, archive, staging, or temporary directories. Git is the backup.
- If the same file is modified >3 times in a phase, stop and review the approach.

## Model Assignment

| Work Type | Model | Examples |
|-----------|-------|---------|
| Architecture, complex pipeline | **Opus** (main thread) | Webhook processor, classification |
| Test writing, module implementation | **Sonnet** (Task agents) | Independent services, routes |
| Search, code review, doc checks | **Haiku** (Task agents) | Verify agents, fixture generation |

## Copilot Handoff Rules

1. Task must be completable from issue description alone (no verbal context)
2. Acceptance criteria must be testable by CI (tests pass, types check)
3. Files to touch must be listed explicitly in the issue
4. Never assign Copilot work that touches files being actively developed
