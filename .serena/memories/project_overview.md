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
- **Session 6 complete** — Backfill pipeline + milestone detection + dogfood tracking
- GitHub API client with pagination, rate limits, auth
- Two-pass backfill: fast list pass (100/page) + optional enrichment for file data
- Milestone detector: 5 patterns (tool transition, velocity shift, gap recovery, quality signal, structural change)
- Accuracy tracking for dogfood loop (true-positive/false-positive/useful/noisy)
- 14 API routes (health, webhooks, projects, overview, recommendations, reports, timeline, backfill, milestones, metrics)
- Dashboard GPS views: ProjectOverview (L1), Recommendations (L2), QualityReports (L3), Timeline, History, Backfill
- `/recommend-validate` passes 100% (7/7 patterns, 0 false positives)
- `/dogfood` command for accuracy tracking
- 212 tests, 95.54% coverage, zero type errors
- CI: GitHub Actions (test + type check on PR/push)
- Community: GitHub Discussions enabled, issue templates, CONTRIBUTING.md
- **Next: Session 7** — Public Surface + Ship to Others (after personal use phase on HerdMate)
- All open questions resolved (OQ-1 through OQ-5)
