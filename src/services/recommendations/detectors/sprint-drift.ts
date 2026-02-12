import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const AI_RATIO_THRESHOLD = 0.6; // 60% AI commits
const CLEANUP_RATIO_THRESHOLD = 0.5; // 50% cleanup commits

/**
 * Detects Sprint-Drift Cycle pattern.
 * 
 * Signal: AI% high → churn spike → cleanup commits → repeat
 * 
 * Detection logic:
 * - AI ratio is high (>60%)
 * - Current window has high ratio of fix+refactor+chore commits (>50% of non-bot commits)
 */
export function detectSprintDrift(
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  // Return null if no commits
  if (commits.length === 0) {
    return null;
  }

  // Check AI ratio threshold
  if (current.aiRatio < AI_RATIO_THRESHOLD) {
    return null;
  }

  // Filter out bot commits for cleanup ratio calculation
  const nonBotCommits = commits.filter((c) => c.authorType !== 'bot');

  if (nonBotCommits.length === 0) {
    return null;
  }

  // Identify cleanup commits (fix, refactor, chore)
  const cleanupCategories = new Set(['fix', 'refactor', 'chore']);
  const cleanupCommits = nonBotCommits.filter((c) => cleanupCategories.has(c.category));
  const cleanupRatio = cleanupCommits.length / nonBotCommits.length;

  // Check cleanup ratio threshold
  if (cleanupRatio < CLEANUP_RATIO_THRESHOLD) {
    return null;
  }

  // Pattern detected
  return {
    pattern: 'sprint-drift',
    severity: 'medium',
    title: 'Sprint-Drift Cycle Detected',
    description:
      'High AI-assisted development followed by cleanup commits. This pattern suggests rapid AI-generated code followed by human refinement.',
    nextSteps: [
      'Review AI-generated code before committing to reduce cleanup cycles',
      'Consider pairing AI generation with immediate human review',
      'Track whether cleanup reduces over time as AI prompts improve',
    ],
    evidence: {
      commits: cleanupCommits.map((c) => c.sha),
      files: [],
      metrics: {
        aiRatio: current.aiRatio,
        cleanupRatio,
        cleanupCommitCount: cleanupCommits.length,
        totalNonBotCommits: nonBotCommits.length,
      },
    },
  };
}
