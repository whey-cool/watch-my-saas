/**
 * Analyzes commit velocity over time, detecting acceleration/plateau/decline phases.
 */
import type {
  RawCommit,
  WeekBucket,
  VelocityPhase,
  VelocityPhaseType,
  VelocityAnalysis,
} from '../types.js';

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function bucketCommitsByWeek(commits: readonly RawCommit[]): readonly WeekBucket[] {
  if (commits.length === 0) return [];

  const bucketMap = new Map<string, {
    commitCount: number;
    repos: Set<string>;
    aiAssistedCount: number;
  }>();

  for (const commit of commits) {
    const weekStart = getWeekStart(commit.date);
    const existing = bucketMap.get(weekStart);
    const isAiAssisted = commit.coAuthors.length > 0;

    if (existing) {
      existing.commitCount += 1;
      existing.repos.add(commit.repo);
      if (isAiAssisted) existing.aiAssistedCount += 1;
    } else {
      const repos = new Set<string>();
      repos.add(commit.repo);
      bucketMap.set(weekStart, {
        commitCount: 1,
        repos,
        aiAssistedCount: isAiAssisted ? 1 : 0,
      });
    }
  }

  // Fill in gap weeks
  const sortedWeeks = [...bucketMap.keys()].sort();
  const firstWeek = new Date(sortedWeeks[0]);
  const lastWeek = new Date(sortedWeeks[sortedWeeks.length - 1]);
  const allWeeks: WeekBucket[] = [];

  const current = new Date(firstWeek);
  while (current <= lastWeek) {
    const weekStart = current.toISOString().slice(0, 10);
    const data = bucketMap.get(weekStart);
    if (data) {
      allWeeks.push({
        weekStart,
        weekEnd: getWeekEnd(weekStart),
        commitCount: data.commitCount,
        repos: [...data.repos],
        aiAssistedCount: data.aiAssistedCount,
        aiPercentage: Math.round((data.aiAssistedCount / data.commitCount) * 100),
      });
    } else {
      allWeeks.push({
        weekStart,
        weekEnd: getWeekEnd(weekStart),
        commitCount: 0,
        repos: [],
        aiAssistedCount: 0,
        aiPercentage: 0,
      });
    }
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return allWeeks;
}

function calculateMovingAverage(
  buckets: readonly WeekBucket[],
  windowSize: number = 3,
): readonly { readonly week: string; readonly avg: number }[] {
  if (buckets.length === 0) return [];

  const result: { week: string; avg: number }[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = buckets.slice(windowStart, i + 1);
    const avg = window.reduce((sum, b) => sum + b.commitCount, 0) / window.length;
    result.push({
      week: buckets[i].weekStart,
      avg: Math.round(avg * 10) / 10,
    });
  }

  return result;
}

function classifyPhases(
  buckets: readonly WeekBucket[],
  movingAvg: readonly { readonly week: string; readonly avg: number }[],
): readonly VelocityPhase[] {
  if (buckets.length === 0) return [];

  const phases: VelocityPhase[] = [];
  let currentType: VelocityPhaseType | null = null;
  let phaseStartIdx = 0;

  for (let i = 0; i < buckets.length; i++) {
    const phaseType = classifyWeek(i, buckets, movingAvg);

    if (phaseType !== currentType) {
      if (currentType !== null) {
        phases.push(buildPhase(currentType, phaseStartIdx, i - 1, buckets));
      }
      currentType = phaseType;
      phaseStartIdx = i;
    }
  }

  // Close final phase
  if (currentType !== null) {
    phases.push(buildPhase(currentType, phaseStartIdx, buckets.length - 1, buckets));
  }

  return mergeShortPhases(phases);
}

function classifyWeek(
  idx: number,
  buckets: readonly WeekBucket[],
  movingAvg: readonly { readonly week: string; readonly avg: number }[],
): VelocityPhaseType {
  const current = buckets[idx].commitCount;

  // Gap: 0 commits
  if (current === 0) return 'gap';

  if (idx === 0) return 'sustained';

  const prevAvg = movingAvg[idx - 1]?.avg ?? 0;
  const currAvg = movingAvg[idx]?.avg ?? current;

  // Check if previous period was a gap
  if (idx > 0 && buckets[idx - 1].commitCount === 0) return 'recovery';

  const changeRatio = prevAvg > 0 ? (currAvg - prevAvg) / prevAvg : 1;

  if (changeRatio > 0.25) return 'acceleration';
  if (changeRatio < -0.25) return 'decline';
  return changeRatio >= -0.1 && changeRatio <= 0.1 ? 'plateau' : 'sustained';
}

function buildPhase(
  type: VelocityPhaseType,
  startIdx: number,
  endIdx: number,
  buckets: readonly WeekBucket[],
): VelocityPhase {
  const phaseBuckets = buckets.slice(startIdx, endIdx + 1);
  const totalCommits = phaseBuckets.reduce((sum, b) => sum + b.commitCount, 0);
  const weekCount = phaseBuckets.length;
  const avgCommitsPerWeek = Math.round((totalCommits / weekCount) * 10) / 10;

  const descriptions: Record<VelocityPhaseType, string> = {
    gap: 'No development activity',
    acceleration: 'Increasing development velocity',
    plateau: 'Stable development pace',
    decline: 'Decreasing development velocity',
    recovery: 'Development resuming after gap',
    sustained: 'Consistent development activity',
  };

  return {
    type,
    startWeek: buckets[startIdx].weekStart,
    endWeek: buckets[endIdx].weekStart,
    weekCount,
    avgCommitsPerWeek,
    description: descriptions[type],
  };
}

function mergeShortPhases(phases: readonly VelocityPhase[]): readonly VelocityPhase[] {
  if (phases.length <= 1) return phases;

  const merged: VelocityPhase[] = [];
  for (const phase of phases) {
    // Keep gap phases even if short (they're significant)
    // Merge single-week non-gap phases into adjacent phases
    if (phase.weekCount === 1 && phase.type !== 'gap' && merged.length > 0) {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = {
        ...prev,
        endWeek: phase.endWeek,
        weekCount: prev.weekCount + 1,
        avgCommitsPerWeek: Math.round(
          ((prev.avgCommitsPerWeek * prev.weekCount + phase.avgCommitsPerWeek) / (prev.weekCount + 1)) * 10
        ) / 10,
      };
    } else {
      merged.push(phase);
    }
  }

  return merged;
}

export function analyzeVelocityPhases(commits: readonly RawCommit[]): VelocityAnalysis {
  if (commits.length === 0) {
    return {
      weeklyBuckets: [],
      movingAverage: [],
      phases: [],
      totalCommits: 0,
      totalWeeks: 0,
      overallAvgPerWeek: 0,
    };
  }

  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));
  const weeklyBuckets = bucketCommitsByWeek(sorted);
  const movingAverage = calculateMovingAverage(weeklyBuckets);
  const phases = classifyPhases(weeklyBuckets, movingAverage);

  const totalCommits = sorted.length;
  const totalWeeks = weeklyBuckets.length;
  const overallAvgPerWeek = Math.round((totalCommits / totalWeeks) * 10) / 10;

  return {
    weeklyBuckets,
    movingAverage,
    phases,
    totalCommits,
    totalWeeks,
    overallAvgPerWeek,
  };
}
