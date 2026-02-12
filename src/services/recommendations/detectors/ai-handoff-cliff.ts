import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const AI_RATIO_THRESHOLD = 0.7;
const TEST_RATIO_THRESHOLD = 0.1;

/**
 * Detects AI Handoff Cliff pattern:
 * AI-generated code exceeds developer's review capacity.
 *
 * Triggers when:
 * - AI ratio > 70% AND test ratio < 10%
 * - Suggests developer is not adequately reviewing/testing AI output
 */
export function detectAiHandoffCliff(
  current: MetricWindow,
  _history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  if (commits.length === 0) return null;
  if (current.aiRatio <= AI_RATIO_THRESHOLD) return null;
  if (current.testRatio >= TEST_RATIO_THRESHOLD) return null;

  const aiCommitShas = commits
    .filter((c) => c.authorType === 'ai')
    .map((c) => c.sha);

  return {
    pattern: 'ai-handoff-cliff',
    severity: 'critical',
    title: 'AI Handoff Cliff',
    description:
      `AI ratio is ${(current.aiRatio * 100).toFixed(0)}% but test ratio is only ${(current.testRatio * 100).toFixed(0)}%. ` +
      'AI-generated code may be exceeding your review capacity.',
    evidence: {
      commits: aiCommitShas,
      files: [],
      metrics: {
        aiRatio: current.aiRatio,
        testRatio: current.testRatio,
        avgFilesPerCommit: current.avgFilesPerCommit,
      },
    },
    nextSteps: [
      'Add tests for recent AI-generated code before generating more.',
      'Review large AI commits for correctness before moving on.',
      'Consider smaller, more focused AI prompts.',
    ],
  };
}
