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
- **Session 4** (Foundation + Learning Infrastructure) is the active session
- Sessions 1-3 completed: archaeology pipeline, config cleanup, competitive analysis, decision-making
- `src/` is empty — API scaffold is Session 4's primary deliverable
- `scripts/archaeology/` contains the existing fetch→analyze→wiki pipeline with 35 tests
