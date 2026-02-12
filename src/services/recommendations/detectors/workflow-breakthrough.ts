import type { CommitRecord, MetricWindow, RecommendationInput } from '../../../types.js';

const BREAKTHROUGH_THRESHOLD = 0.15; // 15 percentage points
const MIN_HISTORY_WINDOWS = 2;
const MIN_SUSTAINED_WINDOWS = 2;

/**
 * Detects Workflow Breakthrough pattern: AI% step function (>15% sustained increase over 2+ weeks).
 * This is a POSITIVE pattern indicating accelerating AI-assisted development.
 */
export function detectWorkflowBreakthrough(
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
): RecommendationInput | null {
  // Need at least 2 historical windows to calculate baseline average
  if (history.length < MIN_HISTORY_WINDOWS) {
    return null;
  }

  // Find how many consecutive recent windows (including current) have high AI ratio
  const sustainedWindows = countSustainedHighWindows(current, history);

  // Need at least 2 consecutive windows with elevated AI ratio
  if (sustainedWindows < MIN_SUSTAINED_WINDOWS) {
    return null;
  }

  // Calculate historical baseline (exclude the sustained high windows)
  const baselineWindows = history.slice(0, -(sustainedWindows - 1));
  
  // Need at least 2 baseline windows to compare against
  if (baselineWindows.length < MIN_HISTORY_WINDOWS) {
    return null;
  }

  const historicalAverage = calculateAverageAiRatio(baselineWindows);
  const currentAiRatio = current.aiRatio;
  const increase = currentAiRatio - historicalAverage;

  // Check if increase exceeds threshold
  if (increase <= BREAKTHROUGH_THRESHOLD) {
    return null;
  }

  const historicalPct = Math.round(historicalAverage * 100);
  const currentPct = Math.round(currentAiRatio * 100);

  return {
    pattern: 'workflow-breakthrough',
    severity: 'low',
    title: 'Workflow Breakthrough: AI Acceleration Detected',
    description: `Your AI workflow is accelerating! AI-assisted development jumped from ${historicalPct}% to ${currentPct}% and has been sustained for ${sustainedWindows} weeks. This indicates you've found an effective AI-augmented development flow.`,
    nextSteps: [
      'Document what changed in your workflow to maintain this acceleration',
      'Share your AI prompting patterns with your team',
      'Monitor test coverage to ensure quality stays high during rapid development',
    ],
    evidence: {
      commits: [],
      files: [],
      metrics: {
        currentAiRatio: Math.round(currentAiRatio * 1000) / 1000,
        historicalAverage: Math.round(historicalAverage * 1000) / 1000,
        sustainedWeeks: sustainedWindows,
        increasePct: Math.round(increase * 100),
      },
    },
  };
}

/**
 * Count how many consecutive recent windows (including current) have AI ratio
 * significantly higher than the earlier baseline.
 */
function countSustainedHighWindows(
  current: MetricWindow,
  history: readonly MetricWindow[],
): number {
  // Start with current window
  let count = 1;
  
  // Walk backwards through history to find consecutive high windows
  for (let i = history.length - 1; i >= 0; i--) {
    const window = history[i];
    
    // Calculate baseline from windows before this point
    const baselineWindows = history.slice(0, i);
    if (baselineWindows.length < MIN_HISTORY_WINDOWS) {
      // Not enough baseline data
      break;
    }
    
    const baseline = calculateAverageAiRatio(baselineWindows);
    const increase = window.aiRatio - baseline;
    
    if (increase > BREAKTHROUGH_THRESHOLD) {
      count++;
    } else {
      // Break on first non-high window
      break;
    }
  }
  
  return count;
}

/**
 * Calculate average AI ratio across windows.
 */
function calculateAverageAiRatio(windows: readonly MetricWindow[]): number {
  if (windows.length === 0) return 0;
  
  const sum = windows.reduce((acc, w) => acc + w.aiRatio, 0);
  return sum / windows.length;
}
