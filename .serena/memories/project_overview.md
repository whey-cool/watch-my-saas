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
- **Session 5 complete** — Recommendation engine (heuristics v1)
- 7 pattern detectors: Sprint-Drift, Ghost Churn, AI Handoff Cliff, Tool Transition, Test Drift, Changelog Silence, Workflow Breakthrough
- Metric aggregation: 7-day windows from commit streams
- Phase detector: Building / Drifting / Stabilizing / Ship-Ready
- Engine orchestrator: fetch → aggregate → detect → deduplicate → store
- 10 API routes (health, webhooks, projects, overview, recommendations, reports, timeline)
- Dashboard GPS views: ProjectOverview (L1), RecommendationsPage (L2), QualityReportsPage (L3)
- `/recommend-validate` passes 100% (7/7 patterns, 0 false positives)
- 161 tests, 97.54% coverage, zero type errors
- CI: GitHub Actions (test + type check on PR/push)
- Community: GitHub Discussions enabled, issue templates, CONTRIBUTING.md
- **Next: Session 6** — Backfill + Full HerdMate History + HerdMate Goes Live
- All open questions resolved (OQ-1 through OQ-5)
