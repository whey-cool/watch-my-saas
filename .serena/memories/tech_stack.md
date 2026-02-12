# Tech Stack

## Language & Runtime
- **TypeScript** (strict mode, ES2022 target)
- **ESM modules** (`"type": "module"` in package.json)
- **Node16** module resolution
- ESM imports require `.js` extension (not `.ts`)

## Core Dependencies (planned for Session 4)
- **Hono** — HTTP framework (API)
- **Prisma** — ORM (PostgreSQL)
- **Zod** — Schema validation
- **Vite + React** — Dashboard SPA (feature-flagged)

## Current Dependencies
- **tsx** — TypeScript execution (scripts)
- **vitest** — Test runner
- **typescript** — Compiler

## Deployment
- **Docker Compose** — Canonical self-hosted deployment
- **Render Blueprint** — Managed onboarding path
- Stateful server (not serverless)

## Auth
- Simple API key (Bearer token). No OAuth, no Clerk.
