/**
 * Metric aggregation for the recommendation engine.
 * Pure functions: commits → MetricWindow with AI%, velocity, churn, test ratio.
 */

import type { CommitRecord, CommitCategory, MetricWindow, MetricTrend, TrendDirection } from '../../types.js';

const ALL_CATEGORIES: readonly CommitCategory[] = [
  'feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'ci', 'perf', 'other',
];

const STABLE_THRESHOLD = 0.10; // 10% change considered stable

export function aggregateMetrics(
  commits: readonly CommitRecord[],
  windowStart: Date,
  windowEnd: Date,
): MetricWindow {
  const categoryDistribution = Object.fromEntries(
    ALL_CATEGORIES.map((cat) => [cat, 0]),
  ) as Record<CommitCategory, number>;

  let aiCommits = 0;
  let humanCommits = 0;
  let botCommits = 0;
  let totalFilesChanged = 0;
  let totalTestFilesTouched = 0;
  const aiToolSet = new Set<string>();

  for (const commit of commits) {
    if (commit.authorType === 'ai') {
      aiCommits++;
      if (commit.aiTool) aiToolSet.add(commit.aiTool);
    } else if (commit.authorType === 'human') {
      humanCommits++;
    } else {
      botCommits++;
    }

    categoryDistribution[commit.category] =
      (categoryDistribution[commit.category] ?? 0) + 1;
    totalFilesChanged += commit.filesChanged;
    totalTestFilesTouched += commit.testFilesTouched;
  }

  const totalCommits = commits.length;

  return {
    windowStart,
    windowEnd,
    totalCommits,
    aiCommits,
    humanCommits,
    botCommits,
    aiRatio: totalCommits > 0 ? aiCommits / totalCommits : 0,
    featCommits: categoryDistribution.feat,
    fixCommits: categoryDistribution.fix,
    refactorCommits: categoryDistribution.refactor,
    testCommits: categoryDistribution.test,
    choreCommits: categoryDistribution.chore,
    otherCommits:
      categoryDistribution.other +
      categoryDistribution.docs +
      categoryDistribution.ci +
      categoryDistribution.perf,
    totalFilesChanged,
    totalTestFilesTouched,
    testRatio: totalFilesChanged > 0 ? totalTestFilesTouched / totalFilesChanged : 0,
    avgFilesPerCommit: totalCommits > 0 ? totalFilesChanged / totalCommits : 0,
    uniqueAiTools: [...aiToolSet].sort(),
    categoryDistribution,
  };
}

export function buildMetricWindows(
  commits: readonly CommitRecord[],
  windowDays: number,
): readonly MetricWindow[] {
  if (commits.length === 0) return [];

  const sorted = [...commits].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  const earliest = sorted[0].timestamp;
  const latest = sorted[sorted.length - 1].timestamp;

  const windows: MetricWindow[] = [];
  const msPerDay = 24 * 60 * 60 * 1000;
  let windowStart = new Date(earliest);

  while (windowStart.getTime() <= latest.getTime()) {
    const windowEnd = new Date(windowStart.getTime() + windowDays * msPerDay);
    const windowCommits = sorted.filter(
      (c) => c.timestamp >= windowStart && c.timestamp < windowEnd,
    );

    if (windowCommits.length > 0) {
      windows.push(aggregateMetrics(windowCommits, windowStart, windowEnd));
    }

    windowStart = windowEnd;
  }

  return windows;
}

export function calculateTrend(current: number, previous: number): MetricTrend {
  if (current === 0 && previous === 0) {
    return { current, previous, direction: 'stable', changePercent: 0 };
  }

  if (previous === 0) {
    return {
      current,
      previous,
      direction: current > 0 ? 'up' : 'stable',
      changePercent: current > 0 ? 100 : 0,
    };
  }

  const changePercent = ((current - previous) / previous) * 100;
  let direction: TrendDirection = 'stable';

  if (Math.abs(changePercent) > STABLE_THRESHOLD * 100) {
    direction = changePercent > 0 ? 'up' : 'down';
  }

  return { current, previous, direction, changePercent };
}
