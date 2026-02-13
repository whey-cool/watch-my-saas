# Project Structure

```
watch-my-saas/
├── src/
│   ├── index.ts                       # @hono/node-server entry point
│   ├── app.ts                         # Hono app factory (testable without server)
│   ├── config.ts                      # Zod-validated env + feature flags
│   ├── types.ts                       # ProblemDetails, ClassifiedCommit, Recommendation, MetricWindow, Backfill types
│   ├── routes/
│   │   ├── health.ts                  # GET /api/health
│   │   ├── webhooks.ts                # POST /api/webhooks/github (HMAC verified)
│   │   ├── projects.ts               # GET /api/projects, GET /api/projects/:id overview
│   │   ├── recommendations.ts         # GET/PATCH recommendations + accuracy, POST analyze
│   │   ├── reports.ts                 # GET /api/projects/:id/reports (paginated)
│   │   ├── timeline.ts               # GET /api/projects/:id/timeline
│   │   ├── backfill.ts               # POST trigger (202), GET status
│   │   ├── milestones.ts             # GET list, POST create
│   │   └── metrics.ts                # GET /api/projects/:id/metrics/history
│   ├── middleware/
│   │   ├── auth.ts                    # Bearer token API key validation
│   │   └── error-handler.ts           # RFC 9457 Problem Details
│   ├── services/
│   │   ├── classification.ts          # Author type + category + quality signals
│   │   ├── webhook-processor.ts       # Extract → classify → store pipeline
│   │   ├── telemetry.ts              # Pulse heartbeat generation
│   │   ├── github-client.ts          # GitHub API: listCommits, getCommitDetail, pagination, rate limits
│   │   ├── backfill.ts               # Historical commit backfill orchestrator (two-pass)
│   │   ├── milestone-detector.ts     # 5-pattern milestone detection from commit history
│   │   └── recommendations/           # Pattern detection engine
│   │       ├── engine.ts              # Orchestrator: fetch → aggregate → detect → store
│   │       ├── metrics.ts             # MetricWindow aggregation + trend calculation
│   │       ├── phase-detector.ts      # Project phase synthesis (Building/Drifting/Stabilizing/Ship-Ready)
│   │       └── detectors/             # 7 pure-function pattern detectors
│   │           ├── index.ts           # DETECTORS array export
│   │           ├── sprint-drift.ts
│   │           ├── ghost-churn.ts
│   │           ├── ai-handoff-cliff.ts
│   │           ├── tool-transition.ts
│   │           ├── test-drift.ts
│   │           ├── changelog-silence.ts
│   │           └── workflow-breakthrough.ts
│   ├── db/
│   │   └── client.ts                  # Prisma singleton
│   └── __tests__/                     # 212 tests (vitest)
├── dashboard/                         # Vite + React + Tailwind SPA
│   └── src/
│       ├── pages/                     # Health, Projects, Commits, Overview, Recommendations, Reports, Timeline, History, Backfill
│       └── components/                # Layout, AuthorBadge, PhaseBadge, SeverityBadge, MetricCard, TimelineEvent
├── prisma/
│   └── schema.prisma                  # Project, Commit, Milestone, QualityReport, Recommendation (+ accuracy)
├── scripts/
│   ├── telemetry.ts                   # CLI: status | enable | disable
│   ├── recommend-validate.ts          # Recommendation engine ground truth validation
│   ├── wiki.sh                        # Wiki operations wrapper
│   └── archaeology/                   # Fetch + analyze + wiki pipeline (Sessions 1-3)
├── .github/
│   ├── workflows/ci.yml               # Test + type check on PR
│   ├── ISSUE_TEMPLATE/                # bug-report, feature-request, copilot-task
│   └── DISCUSSION_TEMPLATE/           # debugging-my-workflow
├── .claude/
│   ├── commands/                      # wiki-*, session-*, standards, webhook-test, telemetry-check, recommend-validate, dogfood
│   ├── hooks/                         # PostToolUse (task state sync)
│   └── rules/workflow.md              # Phase gate protocol, swarm rules
├── .serena/
│   ├── project.yml
│   └── memories/                      # Semantic code intelligence (committed)
├── docker-compose.yml                 # Postgres (port 5433) + app
├── Dockerfile                         # Multi-stage Node 20 build
├── .env.example                       # All vars documented (incl GITHUB_TOKEN)
├── vitest.config.ts                   # 80% coverage thresholds
├── CONTRIBUTING.md                    # Setup, TDD, PR guidelines
├── CLAUDE.md                          # Project instructions
├── docs/
│   └── wms-prd.md                     # PRD (gitignored)
├── tsconfig.json
├── package.json
└── README.md
```

## Key Directories
- **`src/`**: Hono API with webhook pipeline, classification, recommendation engine, backfill, telemetry
- **`src/services/recommendations/`**: Pattern detection engine (7 detectors, metric aggregation, phase detection)
- **`src/services/`**: Also includes github-client.ts, backfill.ts, milestone-detector.ts (Session 6)
- **`dashboard/`**: Vite+React+Tailwind SPA with GPS views (overview, recommendations, reports, timeline, history, backfill)
- **`prisma/`**: Database schema (5 models) and migrations
- **`scripts/archaeology/`**: Read-only reference pipeline from Sessions 1-3
- **`data/archaeology/`**: Private repo data, always gitignored
- **`.wiki/`**: GitHub wiki clone, managed by `scripts/wiki.sh`
