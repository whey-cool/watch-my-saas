/**
 * Detects "Changelog Silence" pattern: lots of commits but few user-facing features.
 *
 * Triggers when:
 * - Total non-bot commits > 10 in the window
 * - Feat commits < 10% of total
 *
 * This indicates work is happening (fixes, refactors, chores) but nothing
 * user-visible is shipping.
 */

import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const MIN_COMMITS = 10;
const FEAT_RATIO_THRESHOLD = 0.1;

export function detectChangelogSilence(
  _current: MetricWindow,
  _history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  const nonBotCommits = commits.filter((c) => c.authorType !== 'bot');
  const nonBotCount = nonBotCommits.length;

  if (nonBotCount <= MIN_COMMITS) return null;

  const featCount = nonBotCommits.filter((c) => c.category === 'feat').length;
  const featRatio = featCount / nonBotCount;

  if (featRatio >= FEAT_RATIO_THRESHOLD) return null;

  return {
    pattern: 'changelog-silence',
    severity: 'medium',
    title: 'Changelog Silence',
    description:
      `${nonBotCount} commits but only ${featCount} features (${(featRatio * 100).toFixed(0)}%). ` +
      "You're shipping code but not features. Consider prioritizing user-visible work.",
    evidence: {
      commits: nonBotCommits.slice(0, 10).map((c) => c.sha),
      files: [],
      metrics: {
        totalCommits: nonBotCount,
        featCommits: featCount,
        featRatio,
      },
    },
    nextSteps: [
      'Identify the next user-visible feature and prioritize it.',
      'Check if cleanup work is blocking feature delivery.',
      'Consider whether refactoring is producing diminishing returns.',
    ],
  };
}
