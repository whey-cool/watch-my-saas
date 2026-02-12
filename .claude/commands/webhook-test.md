# Webhook Test

Send test GitHub webhook payloads to the local API and verify classification output.

## Steps

1. Verify the API is running at http://localhost:3000 (check GET /api/health)
2. If no test project exists in the database, create one with a known webhook secret
3. Send each of these test payloads to POST /api/webhooks/github:
   - Human commit (no Co-Authored-By)
   - Claude Sonnet commit (Co-Authored-By header)
   - Copilot commit (Co-Authored-By header)
   - Cursor Agent commit (author identity)
   - Dependabot commit (bot)
   - Multi-commit push (3 commits, mixed types)
4. For each payload, verify:
   - Response is 200
   - `processed` count matches commit count
   - `authorTypes` counts are correct
5. Query GET /api/projects/:id/commits and verify stored commits have correct:
   - authorType (human/ai/bot)
   - aiTool (tool name or null)
   - category (conventional commit prefix)
6. Report pass/fail summary

## Expected Output

```
Webhook Test Results:
  Human commit:     PASS (human, null, fix)
  Claude commit:    PASS (ai, Claude Sonnet 4.5, feat)
  Copilot commit:   PASS (ai, GitHub Copilot, refactor)
  Cursor commit:    PASS (ai, Cursor Agent, feat)
  Bot commit:       PASS (bot, null, chore)
  Multi-commit:     PASS (3 processed, 1 human + 2 ai)

6/6 tests passed
```

Use the test fixtures from `src/__tests__/fixtures/webhook-payloads.ts` as reference for payload structure. Generate HMAC signatures using the project's webhook secret.
