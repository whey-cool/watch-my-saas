# Watch My SaaS

## Project Overview

An open-source development intelligence API for vibe coders. You plug it into your GitHub repo via webhook, and it tells you what's actually happening with your AI-assisted development — what percentage is AI-generated, whether quality is trending up or down, and it auto-generates a public "building in public" timeline so you never have to write a changelog again.

The audience builds fast with AI tools (Cursor, Claude Code, Copilot). They want signal, not ceremony.

### The Core: AI Recommendations

Metrics and dashboards are table stakes. The real product is **AI-generated recommendations from analyzing development logs**. After ingesting your commit history, PR patterns, tool transitions, quality signals, and velocity data, Watch My SaaS produces actionable, context-aware recommendations.

### Origin

Developed within the HerdMate ecosystem (`whey-cool/herdmate`). HerdMate provides battle-tested patterns (Hono API, Zod validation, Prisma ORM, RFC 7807 error responses, cursor pagination) and the first dogfood dataset. HerdMate itself is never exposed — Watch My SaaS is standalone open-source.

## Decisions Already Made

- **Repo:** `whey-cool/watch-my-saas` (public, clean OSS history)
- **Hosting:** Open-source core, self-hostable via Docker Compose. Full product works self-hosted.
- **Integration:** GitHub webhook + API key
- **Stack:** Hono (API), Zod (validation), Prisma + PostgreSQL (data), Vite + React (dashboard SPA), vanilla TS (embed widget)
- **Auth:** Simple API key (Bearer token). No OAuth, no Clerk.
- **Tooling:** Claude Code as primary dev agent, GitHub Copilot cloud agents for background tasks. `.claude/` config ported from HerdMate.

## Open Questions

### OQ-1: The LLM dependency problem [Session 3]

The recommendation engine needs an LLM strategy: pure heuristics, LLM-powered (BYOK), hybrid (rules detect + LLM narrates), or local model. To be resolved after archaeology data informs which recommendations need LLM reasoning vs heuristics.

### OQ-2: Deployment model for vibe coders [Session 3]

Docker Compose vs Railway/Render one-click deploy vs Vercel + Neon/Supabase serverless. Affects architecture (stateless vs persistent, connection pooling, etc.).

### OQ-3: Copilot cloud agents — what's real? [Session 3]

Research needed on current Copilot agent capabilities in CI/CD workflows, alternatives, and cost models before designing the agent division of labor.

### OQ-4: Testing the thing that tests things [Session 4]

Testing strategy for a code quality analysis tool. Needs unit tests for classification heuristics, integration tests for webhook pipeline, snapshot tests for recommendation output, and test fixtures from archaeology data.

### OQ-5: Report windowing [Session 3]

Fixed commit count vs time-based vs event-based vs configurable. Archaeology data will inform natural development rhythms.

## Commands

### Wiki Commands

- `/wiki-decision` — Record an architectural/technical decision to the wiki
- `/wiki-changelog` — Append a changelog entry for recent work
- `/wiki-brainstorm` — Capture a brainstorm session to the wiki

## Project Structure

```
watch-my-saas/
├── src/                  # API source code (Hono + Prisma)
├── dashboard/            # Dashboard SPA (Vite + React)
├── scripts/              # Automation scripts
│   └── wiki.sh           # Wiki operations wrapper
├── .claude/
│   └── commands/         # Claude Code slash commands
├── CLAUDE.md             # This file
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
