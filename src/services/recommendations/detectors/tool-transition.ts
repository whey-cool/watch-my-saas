/**
 * Detects tool transition spikes by comparing AI tools used between current
 * and previous windows. Flags when tools change (new tool appears or tool disappears)
 * and calculates velocity impact.
 */

import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

export function detectToolTransition(
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  if (history.length === 0) return null;

  const previous = history[history.length - 1];

  if (current.uniqueAiTools.length === 0 && previous.uniqueAiTools.length === 0) {
    return null;
  }

  const currentTools = new Set(current.uniqueAiTools);
  const previousTools = new Set(previous.uniqueAiTools);

  const toolsMatch =
    currentTools.size === previousTools.size &&
    [...currentTools].every((tool) => previousTools.has(tool));

  if (toolsMatch) return null;

  const velocityChange = formatVelocityChange(
    current.avgFilesPerCommit,
    previous.avgFilesPerCommit,
  );

  const commitShas = commits.map((c) => c.sha);

  return {
    pattern: 'tool-transition',
    severity: 'low',
    title: 'Tool Transition Detected',
    description:
      "You switched AI tools recently. Here's how it's affecting your workflow.",
    evidence: {
      commits: commitShas,
      files: [],
      metrics: {
        currentAvgFiles: current.avgFilesPerCommit,
        previousAvgFiles: previous.avgFilesPerCommit,
      },
    },
    nextSteps: [
      'Monitor velocity for the next 1-2 weeks to see if it stabilizes.',
      'Note which tool works better for different types of tasks.',
    ],
  };
}

function formatVelocityChange(current: number, previous: number): string {
  if (previous === 0) return '+100%';
  const percentChange = Math.round(((current - previous) / previous) * 100);
  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange}%`;
}
