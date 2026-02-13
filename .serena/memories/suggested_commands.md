# Suggested Commands

## Development
- `npm run dev` — Start API server in watch mode (tsx)
- `npm run build` — Compile TypeScript to dist/
- `npm start` — Run compiled production build

## Testing
- `npm test` or `vitest run` — Run all tests once
- `npm run test:coverage` — Run tests with coverage report (80% threshold)
- `vitest` — Run tests in watch mode

## Database
- `npx prisma migrate dev` — Run migrations in dev mode
- `npx prisma migrate deploy` — Run migrations in production
- `npm run db:generate` — Regenerate Prisma client
- `npm run db:push` — Push schema changes without migration

## Docker
- `docker compose up db -d` — Start Postgres (port 5433)
- `docker compose up` — Start full stack (Postgres + app)
- `docker compose down` — Stop all services

## Telemetry
- `npm run telemetry -- status` — Check telemetry state
- `npm run telemetry -- enable` — Enable anonymous telemetry
- `npm run telemetry -- disable` — Disable telemetry

## TypeScript
- `npx tsc --noEmit` — Type-check without emitting

## Recommendation Validation
- `npm run recommend:validate` — Run recommendation engine against synthetic ground truth (7/7 patterns expected)

## Archaeology Pipeline
- `npm run archaeology:all` — Full pipeline: fetch → analyze → wiki
- `npm run archaeology:fetch` — Fetch commit data
- `npm run archaeology:analyze` — Run analyzers
- `npm run archaeology:wiki` — Generate wiki pages

## Wiki Management
- `bash scripts/wiki.sh` — Wiki operations wrapper

## Dashboard
- `cd dashboard && npm run dev` — Start dashboard dev server (port 5173, proxies /api to :3000)
- `cd dashboard && npm run build` — Build dashboard for production

## Git & GitHub
- `gh pr create` — Create pull request
- `gh label list` — List repo labels
- `gh api repos/whey-cool/watch-my-saas/milestones` — List milestones

## Backfill
- `GITHUB_TOKEN` env var — Required for private repos, recommended for rate limits (60 req/hr → 5000 req/hr)
- Trigger via API: `POST /api/projects/:id/backfill` with `{ token: "ghp_...", enrich: true }`
- Poll status: `GET /api/projects/:id/backfill/status`
