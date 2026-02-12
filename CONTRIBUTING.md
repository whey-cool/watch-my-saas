# Contributing to Watch My SaaS

Thank you for your interest in contributing! Watch My SaaS is an open-source development intelligence tool for AI-augmented workflows.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/whey-cool/watch-my-saas.git
cd watch-my-saas

# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Start Postgres
docker compose up db -d

# Run migrations
cp .env.example .env
npx prisma migrate dev

# Start the API
npm run dev

# Start the dashboard (separate terminal)
cd dashboard && npm run dev
```

## Development Workflow

We follow strict TDD:

1. **Write the test first** (it should fail)
2. **Implement** the minimum code to pass
3. **Refactor** if needed
4. **Verify** coverage is >= 80%

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhook validation
fix: resolve null pointer in classification
refactor: simplify error handling
docs: update setup instructions
test: add classification edge cases
chore: update dependencies
```

## Pull Request Guidelines

1. Branch from `main`
2. Write tests for all new code
3. Ensure `npx tsc --noEmit` passes (zero type errors)
4. Ensure `npm test` passes with >= 80% coverage
5. Follow existing code patterns (Hono routes, Zod validation, Prisma queries)
6. Keep PRs focused — one feature or fix per PR

## Project Structure

- `src/` — API server (Hono + Prisma)
- `dashboard/` — React SPA (Vite + Tailwind)
- `prisma/` — Database schema and migrations
- `scripts/` — CLI tools (telemetry, archaeology)

## Code Style

- TypeScript strict mode
- Immutable patterns (spread, no mutation)
- Functions < 50 lines, files < 800 lines
- No `console.log` in production code
- Zod for all validation

## Need Help?

- Open a [Discussion](https://github.com/whey-cool/watch-my-saas/discussions)
- Check the [wiki](https://github.com/whey-cool/watch-my-saas/wiki) for architecture decisions
