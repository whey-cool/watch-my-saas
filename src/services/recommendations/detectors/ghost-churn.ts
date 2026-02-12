import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const GHOST_CHURN_THRESHOLD = 0.2; // 20%
const GHOST_WINDOW_DAYS = 7;

const GHOST_PATTERNS = /\b(revert|delete|remove|undo|rollback)\b/i;

/**
 * Detects Ghost Churn pattern: AI-generated code that gets reverted/deleted within days.
 * 
 * Algorithm:
 * 1. Identify all AI commits in the window
 * 2. For each subsequent commit within 7 days, check if message matches ghost patterns
 * 3. Calculate ghost ratio = ghost commits / AI commits
 * 4. Trigger if ratio > 20%
 */
export function detectGhostChurn(
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  // Filter commits within the current window
  const windowCommits = commits.filter(
    (c) => c.timestamp >= current.windowStart && c.timestamp <= current.windowEnd
  );

  if (windowCommits.length === 0) {
    return null;
  }

  // Find all AI commits
  const aiCommits = windowCommits.filter((c) => c.authorType === 'ai');

  if (aiCommits.length === 0) {
    return null;
  }

  // Find ghost commits: commits within 7 days of any AI commit that match ghost patterns
  const ghostCommits: CommitRecord[] = [];
  const sevenDaysMs = GHOST_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (const commit of windowCommits) {
    if (commit.authorType === 'ai') {
      continue; // Skip AI commits themselves
    }

    // Check if this commit is within 7 days after any AI commit
    const hasRecentAICommit = aiCommits.some(
      (aiCommit) =>
        commit.timestamp >= aiCommit.timestamp &&
        commit.timestamp.getTime() - aiCommit.timestamp.getTime() <= sevenDaysMs
    );

    if (hasRecentAICommit && GHOST_PATTERNS.test(commit.message)) {
      ghostCommits.push(commit);
    }
  }

  if (ghostCommits.length === 0) {
    return null;
  }

  // Calculate ghost ratio
  const ghostRatio = ghostCommits.length / aiCommits.length;

  if (ghostRatio <= GHOST_CHURN_THRESHOLD) {
    return null;
  }

  // Build evidence
  const ghostPercentage = Math.round(ghostRatio * 100);

  return {
    pattern: 'ghost-churn',
    severity: 'high',
    title: 'AI-generated code is being reverted shortly after commit',
    description:
      'A significant portion of AI-generated commits are being reverted, deleted, or removed within days. This suggests the AI-generated code may not be meeting quality standards or may be introducing issues that require rollback.',
    evidence: {
      commits: [...aiCommits.map((c) => c.sha), ...ghostCommits.map((c) => c.sha)],
      files: [],
      metrics: {
        aiCommitCount: aiCommits.length,
        ghostCommitCount: ghostCommits.length,
        ghostRatioPercent: ghostPercentage,
      },
    },
    nextSteps: [
      'Review the reverted commits to identify common patterns or quality issues',
      'Consider adjusting your AI prompts or context to improve code quality',
      'Add integration tests to catch issues before committing AI-generated code',
      'Increase code review rigor for AI-generated changes',
    ],
  };
}
