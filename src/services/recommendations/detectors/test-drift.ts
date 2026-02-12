import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const AI_RATIO_THRESHOLD = 0.5;
const TEST_RATIO_THRESHOLD = 0.15;

export function detectTestDrift(
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  // Need at least one history window to compare trends
  if (history.length === 0) {
    return null;
  }

  // Only flag if AI ratio is high
  if (current.aiRatio < AI_RATIO_THRESHOLD) {
    return null;
  }

  // Only flag if test ratio is below threshold
  if (current.testRatio >= TEST_RATIO_THRESHOLD) {
    return null;
  }

  // Get most recent historical test ratio
  const previousTestRatio = history[history.length - 1].testRatio;

  // Only flag if test ratio is declining (or staying low)
  if (current.testRatio >= previousTestRatio) {
    return null;
  }

  // Format ratios as percentages
  const currentTestPercent = Math.round(current.testRatio * 100);
  const previousTestPercent = Math.round(previousTestRatio * 100);
  const aiPercent = Math.round(current.aiRatio * 100);

  return {
    pattern: 'test-drift',
    severity: 'high',
    title: 'Test Coverage Falling Behind AI Output',
    description: `Tests are falling behind your AI output. Your test ratio dropped from ${previousTestPercent}% to ${currentTestPercent}% while AI contributions remain high at ${aiPercent}%.`,
    evidence: {
      commits: commits.map((c) => c.sha),
      files: [],
      metrics: {
        currentAiRatio: current.aiRatio,
        currentTestRatio: current.testRatio,
        previousTestRatio,
      },
    },
    nextSteps: [
      'Review recent AI-generated code for test coverage gaps',
      'Add tests for untested functionality before continuing',
      'Consider slowing feature development to stabilize quality',
    ],
  };
}
