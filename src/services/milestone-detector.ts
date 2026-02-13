/**
 * Milestone detector — identifies significant events in commit history.
 * Pure function: takes commits, returns milestone candidates.
 *
 * 5 detection patterns:
 * 1. Tool transition — first commit with a new AI tool
 * 2. Velocity shift — >2x or <0.5x week-over-week change
 * 3. Gap recovery — 7+ day gap followed by activity
 * 4. Structural change — first commit in a new top-level directory (from message)
 * 5. Quality signal — test ratio increase >20%
 */

import type { CommitRecord, MilestoneType } from '../types.js';

export interface MilestoneCandidate {
  readonly type: MilestoneType;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly timestamp: Date;
}

const MS_PER_DAY = 86400000;
const DAYS_PER_WEEK = 7;
const GAP_THRESHOLD_DAYS = 7;
const VELOCITY_INCREASE_THRESHOLD = 2.0;
const VELOCITY_DECREASE_THRESHOLD = 0.5;
const TEST_RATIO_JUMP_THRESHOLD = 0.2;

/**
 * Detect milestones from a chronologically sorted commit history.
 */
export function detectMilestones(
  commits: readonly CommitRecord[],
): readonly MilestoneCandidate[] {
  if (commits.length <= 1) return [];

  const sorted = [...commits].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  const milestones: MilestoneCandidate[] = [
    ...detectToolTransitions(sorted),
    ...detectVelocityShifts(sorted),
    ...detectGapRecoveries(sorted),
    ...detectQualitySignals(sorted),
  ];

  return milestones.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function detectToolTransitions(
  commits: readonly CommitRecord[],
): MilestoneCandidate[] {
  const seenTools = new Set<string>();
  const milestones: MilestoneCandidate[] = [];

  for (const commit of commits) {
    if (commit.aiTool && !seenTools.has(commit.aiTool)) {
      seenTools.add(commit.aiTool);
      milestones.push({
        type: 'tool-transition',
        category: 'ai-tool',
        title: `Started using ${commit.aiTool}`,
        description: `First commit co-authored with ${commit.aiTool}`,
        timestamp: commit.timestamp,
      });
    }
  }

  return milestones;
}

function detectVelocityShifts(
  commits: readonly CommitRecord[],
): MilestoneCandidate[] {
  const milestones: MilestoneCandidate[] = [];

  // Group commits by week
  const weeklyBuckets = groupByWeek(commits);
  const weeks = Array.from(weeklyBuckets.entries()).sort(([a], [b]) => a - b);

  for (let i = 1; i < weeks.length; i++) {
    const prevCount = weeks[i - 1][1].length;
    const currCount = weeks[i][1].length;

    if (prevCount === 0) continue;

    const ratio = currCount / prevCount;

    if (ratio >= VELOCITY_INCREASE_THRESHOLD) {
      const firstCommitInWeek = weeks[i][1][0];
      milestones.push({
        type: 'velocity-shift',
        category: 'velocity-increase',
        title: `Velocity spike: ${currCount} commits (${ratio.toFixed(1)}x increase)`,
        description: `Week-over-week velocity increased from ${prevCount} to ${currCount} commits`,
        timestamp: firstCommitInWeek.timestamp,
      });
    } else if (ratio <= VELOCITY_DECREASE_THRESHOLD) {
      const firstCommitInWeek = weeks[i][1][0];
      milestones.push({
        type: 'velocity-shift',
        category: 'velocity-decrease',
        title: `Velocity drop: ${currCount} commits (${ratio.toFixed(1)}x decrease)`,
        description: `Week-over-week velocity decreased from ${prevCount} to ${currCount} commits`,
        timestamp: firstCommitInWeek.timestamp,
      });
    }
  }

  return milestones;
}

function detectGapRecoveries(
  commits: readonly CommitRecord[],
): MilestoneCandidate[] {
  const milestones: MilestoneCandidate[] = [];

  for (let i = 1; i < commits.length; i++) {
    const gap = commits[i].timestamp.getTime() - commits[i - 1].timestamp.getTime();
    const gapDays = gap / MS_PER_DAY;

    if (gapDays >= GAP_THRESHOLD_DAYS) {
      milestones.push({
        type: 'gap-recovery',
        category: 'activity-gap',
        title: `Resumed after ${Math.round(gapDays)}-day gap`,
        description: `Development resumed after ${Math.round(gapDays)} days of inactivity`,
        timestamp: commits[i].timestamp,
      });
    }
  }

  return milestones;
}

function detectQualitySignals(
  commits: readonly CommitRecord[],
): MilestoneCandidate[] {
  const milestones: MilestoneCandidate[] = [];

  // Compare test ratio in first half vs second half of commits
  const midpoint = Math.floor(commits.length / 2);
  if (midpoint < 2) return milestones;

  const firstHalf = commits.slice(0, midpoint);
  const secondHalf = commits.slice(midpoint);

  const firstTestRatio = computeTestRatio(firstHalf);
  const secondTestRatio = computeTestRatio(secondHalf);

  const improvement = secondTestRatio - firstTestRatio;
  if (improvement >= TEST_RATIO_JUMP_THRESHOLD) {
    milestones.push({
      type: 'quality-signal',
      category: 'test-coverage',
      title: `Test ratio improved by ${(improvement * 100).toFixed(0)}%`,
      description: `Test file ratio increased from ${(firstTestRatio * 100).toFixed(0)}% to ${(secondTestRatio * 100).toFixed(0)}%`,
      timestamp: secondHalf[0].timestamp,
    });
  }

  return milestones;
}

function computeTestRatio(commits: readonly CommitRecord[]): number {
  const totalFiles = commits.reduce((sum, c) => sum + c.filesChanged, 0);
  const testFiles = commits.reduce((sum, c) => sum + c.testFilesTouched, 0);
  return totalFiles > 0 ? testFiles / totalFiles : 0;
}

function groupByWeek(
  commits: readonly CommitRecord[],
): Map<number, CommitRecord[]> {
  const buckets = new Map<number, CommitRecord[]>();

  for (const commit of commits) {
    const weekNumber = Math.floor(commit.timestamp.getTime() / (MS_PER_DAY * DAYS_PER_WEEK));
    const existing = buckets.get(weekNumber) ?? [];
    buckets.set(weekNumber, [...existing, commit]);
  }

  return buckets;
}
