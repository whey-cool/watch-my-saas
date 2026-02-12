# Watch My SaaS

## Project Overview

An open-source development intelligence API for vibe coders. You plug it into your GitHub repo via webhook, and it tells you what's actually happening with your AI-assisted development — what percentage is AI-generated, whether quality is trending up or down, and it auto-generates a public "building in public" timeline so you never have to write a changelog again.

The audience builds fast with AI tools (Cursor, Claude Code, Copilot). They want signal, not ceremony.

### The Core: Heuristic Pattern Detection

Metrics and dashboards are table stakes. The real product is **heuristic-based pattern detection from development logs**. After ingesting your commit history, PR patterns, tool transitions, quality signals, and velocity data, Watch My SaaS detects actionable patterns — sprint-drift cycles, workflow breakthroughs, test coverage drift, file churn hot spots — and surfaces them as recommendations. v1 is pure heuristics (no LLM dependency). v2 adds optional BYOK LLM narration.

### Origin

Developed within the HerdMate ecosystem (`whey-cool/herdmate`). HerdMate provides battle-tested patterns (Hono API, Zod validation, Prisma ORM, RFC 7807 error responses, cursor pagination) and the first dogfood dataset. HerdMate itself is never exposed — Watch My SaaS is standalone open-source.

## Decisions Already Made

- **Repo:** `whey-cool/watch-my-saas` (public, clean OSS history)
- **Hosting:** Open-source core, self-hostable via Docker Compose. Full product works self-hosted.
- **Integration:** GitHub webhook + API key
- **Stack:** Hono (API), Zod (validation), Prisma + PostgreSQL (data), Vite + React (dashboard SPA), vanilla TS (embed widget)
- **Auth:** Simple API key (Bearer token). No OAuth, no Clerk.
- **Tooling:** Claude Code as primary dev agent, Copilot Coding Agent for background tasks. `.claude/` config ported from HerdMate, optimized in Session 2 for this stack (Hono/Prisma/vitest/RFC 7807).
- **Recommendation Engine (OQ-1):** Heuristics-only v1 (sprint-drift cycle detection, velocity tracking, file churn, tool transitions, workflow breakthroughs). Optional BYOK LLM narration in v2.
- **Deployment (OQ-2):** Docker Compose canonical, Railway one-click template for onboarding. Stateful server, no serverless.
- **AI Tooling (OQ-3):** Claude Code for primary development (architecture, features, debugging). Copilot Coding Agent for background tasks (tests, docs, small fixes via GitHub issues).
- **Report Windowing (OQ-5):** Weekly digest (suppressed if <5 commits) + sprint retrospectives on velocity drop + event-driven public timeline + immediate alerts for revert spikes/coverage drops.

## Session History

### Session 1: Git Archaeology Pipeline
Built the three-stage archaeology pipeline (fetch → analyze → wiki) that extracts the development narrative from 1223 commits across 7 whey-cool repos. 5 analyzers (tool transitions, velocity phases, quality evolution, structural growth, unified timeline), 35 tests, 5 wiki pages generated with real data. Added author-identity detection bringing AI commit detection from 47% to 64%.

### Session 2: ECC Optimization & Config Cleanup
Audited and aligned all Claude Code configuration to the project stack. Fixed settings hook format. Deleted 18 irrelevant skills (Django, Spring Boot, Go, Python, Java, C++, etc.) and 6 irrelevant commands. Fixed framework mismatches in 3 skills (tdd-workflow, security-review, coding-standards) — replacing jest/Next.js/Supabase/Express patterns with vitest/Hono/Prisma/RFC 7807. Self-reviewed and caught 3 additional missed issues. Zero stale references remaining.

### Session 3: Archaeology Debrief & Decision Session
Brainstorm session validating archaeology findings against developer memory. Confirmed sprint-drift cycle as the core pattern of AI-assisted development. Resolved OQ-1 (heuristics-only v1), OQ-2 (Docker Compose + Railway), OQ-3 (Claude Code primary + Copilot background), OQ-5 (hybrid weekly + event windowing). 4 brainstorm pages + 4 decision pages + Architecture.md updated.

## Open Questions

### OQ-4: Testing the thing that tests things [Session 4]

Testing strategy for a code quality analysis tool. Needs unit tests for classification heuristics, integration tests for webhook pipeline, snapshot tests for recommendation output, and test fixtures from archaeology data.

## Commands

### Wiki Commands

- `/wiki-decision` — Record an architectural/technical decision to the wiki
- `/wiki-changelog` — Append a changelog entry for recent work
- `/wiki-brainstorm` — Capture a brainstorm session to the wiki

### Archaeology Commands

- `npm run archaeology:fetch` — Fetch commit data from local repos + GitHub API
- `npm run archaeology:analyze` — Run all analyzers on raw commit data
- `npm run archaeology:wiki` — Generate wiki pages from analysis results
- `npm run archaeology:all` — Run full pipeline (fetch → analyze → wiki)
- `npm test` — Run analyzer tests (vitest)

## Project Structure

```
watch-my-saas/
├── scripts/
│   ├── wiki.sh                        # Wiki operations wrapper
│   └── archaeology/
│       ├── fetch-commits.sh           # Fetches from local git + GitHub API
│       ├── parse-git-log.mjs          # Parses git log → JSON
│       ├── transform-api-commits.mjs  # Normalizes GitHub API → JSON
│       ├── analyze.ts                 # Orchestrator: runs all analyzers
│       ├── generate-wiki-pages.ts     # Orchestrator: analysis → wiki markdown
│       ├── types.ts                   # Shared TypeScript interfaces
│       ├── analyzers/
│       │   ├── tool-transitions.ts    # Co-Author signature timeline
│       │   ├── velocity-phases.ts     # Weekly commit frequency + phases
│       │   ├── quality-evolution.ts   # Test adoption, churn, reverts
│       │   ├── structural-growth.ts   # Directory timeline, size trajectory
│       │   └── unified-timeline.ts    # Merges all signals chronologically
│       ├── wiki-generators/           # One per wiki page
│       └── __tests__/
│           └── analyzers.test.ts      # 30 tests covering all analyzers
├── data/archaeology/                  # Gitignored — raw + analysis JSON
├── .claude/
│   ├── commands/                      # Claude Code slash commands (wiki-*)
│   └── hooks/                         # PostToolUse hooks (task state sync)
├── CLAUDE.md                          # This file
├── tsconfig.json
├── package.json
└── README.md
```

## Cross-Session Invariants

1. **Wiki is updated every session.** Decisions → `Decisions/`, session end → `Changelog/`.
2. **CLAUDE.md stays current.** Reflects current project state.
3. **Tests before code.** TDD: write test → fail → implement → pass. Coverage ≥ 80%.
4. **No HerdMate leakage.** Patterns ported, never imported.
5. **Archaeology data is gitignored.** Private repo data never enters the public repo.
6. **The project builds its own history.** Wiki records the full development story.
