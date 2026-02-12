# Project Structure

```
watch-my-saas/
├── src/
│   ├── index.ts                       # @hono/node-server entry point
│   ├── app.ts                         # Hono app factory (testable without server)
│   ├── config.ts                      # Zod-validated env + feature flags
│   ├── types.ts                       # ProblemDetails, ClassifiedCommit, Payload types
│   ├── routes/
│   │   ├── health.ts                  # GET /api/health
│   │   ├── webhooks.ts                # POST /api/webhooks/github (HMAC verified)
│   │   └── projects.ts               # GET /api/projects, GET /api/projects/:id/commits
│   ├── middleware/
│   │   ├── auth.ts                    # Bearer token API key validation
│   │   └── error-handler.ts           # RFC 9457 Problem Details
│   ├── services/
│   │   ├── classification.ts          # Author type + category + quality signals
│   │   ├── webhook-processor.ts       # Extract → classify → store pipeline
│   │   └── telemetry.ts              # Pulse heartbeat generation
│   ├── db/
│   │   └── client.ts                  # Prisma singleton
│   └── __tests__/                     # 66 tests (vitest)
│       ├── config.test.ts
│       ├── app.test.ts
│       ├── middleware/
│       │   ├── auth.test.ts
│       │   └── error-handler.test.ts
│       ├── routes/
│       │   ├── health.test.ts
│       │   ├── projects.test.ts
│       │   └── webhooks.test.ts
│       ├── services/
│       │   ├── classification.test.ts
│       │   ├── webhook-processor.test.ts
│       │   └── telemetry.test.ts
│       └── fixtures/
│           ├── webhook-payloads.ts
│           └── known-commits.ts
├── dashboard/                         # Vite + React + Tailwind SPA
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── pages/                     # HealthPage, ProjectsPage, CommitsPage
│   │   ├── components/                # Layout, AuthorBadge
│   │   └── api/client.ts             # Fetch wrapper for /api/*
│   ├── vite.config.ts                 # Proxy /api to localhost:3000
│   └── tailwind.config.js
├── prisma/
│   ├── schema.prisma                  # Project, Commit, Milestone, QualityReport
│   └── migrations/                    # Initial migration
├── scripts/
│   ├── telemetry.ts                   # CLI: status | enable | disable
│   ├── wiki.sh                        # Wiki operations wrapper
│   └── archaeology/                   # Fetch + analyze + wiki pipeline (Sessions 1-3)
├── .github/
│   ├── workflows/ci.yml               # Test + type check on PR
│   ├── ISSUE_TEMPLATE/                # bug-report, feature-request, copilot-task
│   └── DISCUSSION_TEMPLATE/           # debugging-my-workflow
├── .claude/
│   ├── commands/                      # wiki-*, session-*, standards, webhook-test, telemetry-check
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
- **`src/`**: Hono API with webhook pipeline, classification, telemetry
- **`dashboard/`**: Vite+React+Tailwind SPA, feature-flagged
- **`prisma/`**: Database schema and migrations
- **`scripts/archaeology/`**: Read-only reference pipeline from Sessions 1-3
- **`data/archaeology/`**: Private repo data, always gitignored
- **`.wiki/`**: GitHub wiki clone, managed by `scripts/wiki.sh`
