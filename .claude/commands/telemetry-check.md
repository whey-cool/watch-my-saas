# Telemetry Check

Review the current telemetry state and validate the heartbeat payload.

## Steps

1. Run `npm run telemetry -- status` to check current state
2. If telemetry is enabled:
   - Verify the instance ID exists and is a valid UUID
   - Verify the .env file has WATCHMYSAAS_TELEMETRY=true
3. If the API is running, generate a heartbeat payload:
   - Check that schemaVersion is current
   - Check that no PII is present (no emails, names, URLs, commit messages)
   - Report aggregate metrics (repos connected, total commits)
4. Report summary

## Expected Output

```
Telemetry Status: ENABLED|DISABLED
Instance ID: <uuid> (or "not set")
Heartbeat Schema: v1
Repos Connected: N
Total Commits: N
PII Check: CLEAN
```

This command fulfills Cross-Session Invariant 7: "Telemetry is reviewed every session."
