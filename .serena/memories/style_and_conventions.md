# Style & Conventions

## Code Style
- **Immutability**: Always create new objects, never mutate. Use spread operator for updates.
- **Small files**: 200-400 lines typical, 800 max. High cohesion, low coupling.
- **Small functions**: Under 50 lines each.
- **No deep nesting**: Max 4 levels.
- **No console.log in production**: Use proper logging.
- **No hardcoded values**: Use constants or config.

## TypeScript Conventions
- **Strict mode** enabled
- **ESM imports** with `.js` extensions (not `.ts`)
- **Zod** for runtime validation at system boundaries
- **Interface-first** design (Repository pattern for data access)

## Error Handling
- Handle errors explicitly at every level
- User-friendly messages in UI-facing code
- Detailed context in server-side logs
- Never silently swallow errors
- RFC 7807 error responses for the API (from HerdMate patterns)

## API Conventions (planned)
- Consistent envelope: `{ success, data?, error?, meta? }`
- Cursor pagination (from HerdMate patterns)
- Bearer token auth

## Testing
- **TDD mandatory**: Write test → fail → implement → pass → refactor
- **vitest** as test runner
- **80%+ coverage** minimum
- Unit + integration + E2E (Playwright for E2E)

## Git
- Conventional commits: `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci)
- No co-author attribution line (disabled in settings)

## Naming
- Files: kebab-case (`tool-transitions.ts`)
- TypeScript: camelCase for variables/functions, PascalCase for types/interfaces/classes
- Test files: `__tests__/` directories with `.test.ts` suffix
