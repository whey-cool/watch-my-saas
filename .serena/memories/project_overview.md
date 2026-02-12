# Watch My SaaS — Project Overview

## Purpose
Open-source development intelligence API for solo/indie developers ("vibe coders") who build with AI tools (Cursor, Claude Code, Copilot). Ingests GitHub webhook data, classifies commits (AI vs human), detects development patterns, and surfaces actionable recommendations. Auto-generates a public "building in public" timeline.

## Core Value Proposition
Heuristic-based pattern detection from development logs. Not a metrics dashboard — a GPS for AI-assisted development. "Here's how to build better with AI" (not "AI code is bad").

## Key Patterns Detected
- **Sprint-Drift Cycle**: AI sprint → churn spike → cleanup → repeat (primary pattern)
- **Ghost Churn**: AI code committed then deleted within days
- **AI Handoff Cliff**: AI code exceeds developer review capacity
- **Tool Transition Spike**: Velocity changes when switching AI tools
- **Test Coverage Drift**: AI ratio up, test ratio down
- **Changelog Silence**: Commits without user-visible changes
- **Workflow Breakthrough**: Sustained AI% step function

## Origin & Dogfood
Built within the HerdMate ecosystem (whey-cool/herdmate). HerdMate is the first and most important user. The founder uses Watch My SaaS to guide her own HerdMate development.

## Current State
- **Session 4 complete** — Foundation + Learning Infrastructure built
- API scaffold: Hono + Prisma + Zod, 4 routes, 3 middleware, 3 services
- Webhook pipeline: GitHub push → HMAC verify → classify commits → store in Postgres
- Dashboard skeleton: Vite + React + Tailwind, 3 pages, feature-flagged
- Telemetry: opt-in anonymous heartbeat (Pulse)
- 66 tests, 95.37% coverage, zero type errors
- CI: GitHub Actions (test + type check on PR/push)
- Community: GitHub Discussions enabled, issue templates, CONTRIBUTING.md
- **Next: Session 5** — Recommendations + HerdMate Goes Live
- All open questions resolved (OQ-1 through OQ-5)
