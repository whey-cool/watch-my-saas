# Suggested Commands

## Testing
- `vitest run` or `npm test` — Run all tests once
- `vitest` or `npm run test:watch` — Run tests in watch mode

## Archaeology Pipeline
- `npm run archaeology:fetch` — Fetch commit data from local repos + GitHub API
- `npm run archaeology:analyze` — Run all analyzers on raw data (uses tsx)
- `npm run archaeology:wiki` — Generate wiki pages from analysis
- `npm run archaeology:all` — Full pipeline: fetch → analyze → wiki

## TypeScript
- `npx tsc --noEmit` — Type-check without emitting
- `npx tsx <file.ts>` — Run a TypeScript file directly

## Wiki Management
- `bash scripts/wiki.sh` — Wiki operations wrapper (clone, sync, push)

## Git
- `git status` — Check working tree
- `git log --oneline -20` — Recent commit history
- `git diff` — Unstaged changes
- `gh pr create` — Create pull request (GitHub CLI)

## System
- `ls`, `find`, `grep` — Standard Linux utilities
