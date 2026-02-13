# Project Structure

```
watch-my-saas/
├── src/
│   ├── index.ts                       # @hono/node-server entry point
│   ├── app.ts                         # Hono app factory (testable without server)
│   ├── config.ts                      # Zod-validated env + feature flags
│   ├── types.ts                       # ProblemDetails, ClassifiedCommit, Recommendation, MetricWindow types
│   ├── routes/
│   │   ├── health.ts                  # GET /api/health
│   │   ├── webhooks.ts                # POST /api/webhooks/github (HMAC verified)
│   │   ├── projects.ts               # GET /api/projects, GET /api/projects/:id overview
│   │   ├── recommendations.ts         # GET/PATCH recommendations, POST analyze
│   │   ├── reports.ts                 # GET /api/projects/:id/reports (paginated)
│   │   └── timeline.ts               # GET /api/projects/:id/timeline
│   ├── middleware/
│   │   ├── auth.ts                    # Bearer token API key validation
│   │   └── error-handler.ts           # RFC 9457 Problem Details
│   ├── services/
│   │   ├── classification.ts          # Author type + category + quality signals
│   │   ├── webhook-processor.ts       # Extract → classify → store pipeline
│   │   ├── telemetry.ts              # Pulse heartbeat generation
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
│   └── __tests__/                     # 161 tests (vitest)
│       ├── config.test.ts
│       ├── app.test.ts
│       ├── middleware/
│       │   ├── auth.test.ts
│       │   └── error-handler.test.ts
│       ├── routes/
│       │   ├── health.test.ts
│       │   ├── projects.test.ts
│       │   ├── webhooks.test.ts
│       │   ├── recommendations.test.ts
│       │   ├── reports.test.ts
│       │   └── timeline.test.ts
│       ├── services/
│       │   ├── classification.test.ts
│       │   ├── webhook-processor.test.ts
│       │   ├── telemetry.test.ts
│       │   ├── recommendations/
│       │   │   ├── engine.test.ts
│       │   │   ├── metrics.test.ts
│       │   │   ├── phase-detector.test.ts
│       │   │   └── detectors.test.ts
│       └── fixtures/
│           ├── webhook-payloads.ts
│           └── known-commits.ts
├── dashboard/                         # Vite + React + Tailwind SPA
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── pages/                     # Health, Projects, Commits, Overview, Recommendations, Reports
│   │   ├── components/                # Layout, AuthorBadge, PhaseBadge, SeverityBadge, MetricCard
│   │   └── api/client.ts             # Fetch wrapper for /api/*
│   ├── vite.config.ts                 # Proxy /api to localhost:3000
│   └── tailwind.config.js
├── prisma/
│   ├── schema.prisma                  # Project, Commit, Milestone, QualityReport, Recommendation
│   └── migrations/                    # Initial migration
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
│   ├── commands/                      # wiki-*, session-*, standards, webhook-test, telemetry-check, recommend-validate
│   ├── hooks/                         # PostToolUse (task state sync)
│   └── rules/workflow.md              # Phase gate protocol, swarm rules
├── .serena/
│   ├── project.yml
│   └── memories/                      # Semantic code intelligence (committed)
├── docker-compose.yml                 # Postgres (port 5433) + app
├── Dockerfile                         # Multi-stage Node 20 build
├── .env.example                       # All vars documented
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
- **`src/`**: Hono API with webhook pipeline, classification, recommendation engine, telemetry
- **`src/services/recommendations/`**: Pattern detection engine (7 detectors, metric aggregation, phase detection)
- **`dashboard/`**: Vite+React+Tailwind SPA with GPS views (overview, recommendations, reports)
- **`prisma/`**: Database schema (5 models) and migrations
- **`scripts/archaeology/`**: Read-only reference pipeline from Sessions 1-3
- **`data/archaeology/`**: Private repo data, always gitignored
- **`.wiki/`**: GitHub wiki clone, managed by `scripts/wiki.sh`
