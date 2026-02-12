# Task Completion Checklist

When a coding task is completed, verify the following:

## Code Quality
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling at every level
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)
- [ ] No console.log statements

## Testing
- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests pass: `npm test`
- [ ] Coverage ≥ 80%

## TypeScript
- [ ] Type-check passes: `npx tsc --noEmit`
- [ ] ESM imports use `.js` extensions
- [ ] Strict mode satisfied (no `any` escape hatches)

## Security
- [ ] No hardcoded secrets
- [ ] All user inputs validated (Zod at boundaries)
- [ ] No SQL injection (parameterized queries via Prisma)
- [ ] Error messages don't leak sensitive data

## Documentation
- [ ] CLAUDE.md reflects current state
- [ ] Wiki updated if decisions were made
