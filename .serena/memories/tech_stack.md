# Tech Stack

## Language & Runtime
- **TypeScript** (strict mode, ES2022 target)
- **ESM modules** (`"type": "module"` in package.json)
- **Node16** module resolution
- ESM imports require `.js` extension (not `.ts`)

## Core Dependencies
- **Hono** — HTTP framework (API routes + static file serving)
- **@hono/node-server** — Node.js adapter for Hono
- **@hono/zod-openapi** — Zod validation with OpenAPI docs
- **Prisma** — ORM (PostgreSQL)
- **@prisma/client** — Generated database client
- **Zod** — Schema validation
- **Vite + React** — Dashboard SPA (feature-flagged)
- **Tailwind CSS** — Dashboard styling
- **react-router-dom** — Client-side routing

## Dev Dependencies
- **vitest** — Test runner
- **@vitest/coverage-v8** — Coverage provider (80% threshold)
- **tsx** — TypeScript execution (scripts)
- **typescript** — Compiler
- **prisma** — CLI for migrations

## Database
- **PostgreSQL 16** (via Docker Compose, port 5433 to avoid HerdMate conflict)
- 4 models: Project, Commit, Milestone, QualityReport
- Compound unique: [projectId, sha] on Commit

## Deployment
- **Docker Compose** — Canonical self-hosted deployment
- **Render Blueprint** — Managed onboarding path
- Stateful server (not serverless)
- Multi-stage Dockerfile (Node 20 alpine)

## Auth
- Simple API key (Bearer token) for API endpoints
- HMAC-SHA256 for webhook verification (per-project secret)

## Feature Flags
- `WATCHMYSAAS_FEATURE_DASHBOARD` — Enable dashboard SPA serving
- `WATCHMYSAAS_FEATURE_PUBLIC_TIMELINE` — Enable public timeline
- `WATCHMYSAAS_TELEMETRY` — Enable anonymous telemetry
- All default to false, Zod-validated from env vars
