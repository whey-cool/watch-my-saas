Run the recommendation validation script against synthetic ground truth data.

## Instructions

Run the validation script:

```bash
npx tsx scripts/recommend-validate.ts
```

This script:
1. Generates 120+ synthetic commits representing archaeology ground truth patterns
2. Builds metric windows (7-day aggregation)
3. Runs all 7 pattern detectors against each window
4. Compares detected patterns to expected ground truth
5. Reports accuracy: detected/missed/false-positive per pattern

## Expected Output

All 7 patterns should be detected:
- Sprint-Drift Cycle (medium)
- Ghost Churn (high)
- AI Handoff Cliff (critical)
- Tool Transition Spike (low)
- Test Coverage Drift (high)
- Changelog Silence (medium)
- Workflow Breakthrough (low, positive)

Exit code 0 = all patterns detected, no false positives.
Exit code 1 = missed patterns or false positives.

## When to Run

- After modifying any detector in `src/services/recommendations/detectors/`
- After changing `src/services/recommendations/metrics.ts`
- Before committing recommendation engine changes
- As part of Session 5 exit verification
