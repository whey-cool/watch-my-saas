import { describe, it, expect } from 'vitest';
import {
  aggregateMetrics,
  buildMetricWindows,
  calculateTrend,
} from '../../../services/recommendations/metrics.js';
import type { CommitRecord, MetricWindow } from '../../../types.js';

function makeCommit(overrides: Partial<CommitRecord> = {}): CommitRecord {
  return {
    sha: 'abc123',
    message: 'feat: something',
    authorName: 'Megan',
    authorEmail: 'megan@example.com',
    authorType: 'human',
    aiTool: null,
    category: 'feat',
    filesChanged: 3,
    insertions: 0,
    deletions: 0,
    testFilesTouched: 0,
    typeFilesTouched: 0,
    timestamp: new Date('2026-01-15'),
    projectId: 'proj-1',
    ...overrides,
  };
}

describe('aggregateMetrics', () => {
  it('calculates AI ratio from mixed commits', () => {
    const commits: readonly CommitRecord[] = [
      makeCommit({ authorType: 'ai', aiTool: 'Claude Code' }),
      makeCommit({ authorType: 'ai', aiTool: 'Claude Code' }),
      makeCommit({ authorType: 'human' }),
      makeCommit({ authorType: 'bot' }),
    ];

    const window = aggregateMetrics(
      commits,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(window.totalCommits).toBe(4);
    expect(window.aiCommits).toBe(2);
    expect(window.humanCommits).toBe(1);
    expect(window.botCommits).toBe(1);
    expect(window.aiRatio).toBeCloseTo(0.5);
  });

  it('returns zero AI ratio for empty commit set', () => {
    const window = aggregateMetrics(
      [],
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(window.totalCommits).toBe(0);
    expect(window.aiRatio).toBe(0);
    expect(window.testRatio).toBe(0);
    expect(window.avgFilesPerCommit).toBe(0);
  });

  it('counts category distribution', () => {
    const commits: readonly CommitRecord[] = [
      makeCommit({ category: 'feat' }),
      makeCommit({ category: 'feat' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'refactor' }),
    ];

    const window = aggregateMetrics(
      commits,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(window.featCommits).toBe(2);
    expect(window.fixCommits).toBe(1);
    expect(window.testCommits).toBe(1);
    expect(window.refactorCommits).toBe(1);
    expect(window.categoryDistribution.feat).toBe(2);
    expect(window.categoryDistribution.fix).toBe(1);
  });

  it('calculates test ratio', () => {
    const commits: readonly CommitRecord[] = [
      makeCommit({ filesChanged: 5, testFilesTouched: 2 }),
      makeCommit({ filesChanged: 3, testFilesTouched: 1 }),
      makeCommit({ filesChanged: 2, testFilesTouched: 0 }),
    ];

    const window = aggregateMetrics(
      commits,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(window.totalFilesChanged).toBe(10);
    expect(window.totalTestFilesTouched).toBe(3);
    expect(window.testRatio).toBeCloseTo(0.3);
    expect(window.avgFilesPerCommit).toBeCloseTo(10 / 3);
  });

  it('collects unique AI tools', () => {
    const commits: readonly CommitRecord[] = [
      makeCommit({ authorType: 'ai', aiTool: 'Claude Code' }),
      makeCommit({ authorType: 'ai', aiTool: 'Claude Code' }),
      makeCommit({ authorType: 'ai', aiTool: 'GitHub Copilot' }),
      makeCommit({ authorType: 'human', aiTool: null }),
    ];

    const window = aggregateMetrics(
      commits,
      new Date('2026-01-01'),
      new Date('2026-01-31'),
    );

    expect(window.uniqueAiTools).toEqual(['Claude Code', 'GitHub Copilot']);
  });
});

describe('buildMetricWindows', () => {
  it('builds weekly windows from commits', () => {
    const commits: readonly CommitRecord[] = [
      makeCommit({ timestamp: new Date('2026-01-06') }), // week 1
      makeCommit({ timestamp: new Date('2026-01-07') }), // week 1
      makeCommit({ timestamp: new Date('2026-01-13') }), // week 2
      makeCommit({ timestamp: new Date('2026-01-20') }), // week 3
      makeCommit({ timestamp: new Date('2026-01-21') }), // week 3
      makeCommit({ timestamp: new Date('2026-01-22') }), // week 3
    ];

    const windows = buildMetricWindows(commits, 7);

    // Should have windows covering the 3 weeks of data
    expect(windows.length).toBeGreaterThanOrEqual(3);
    // All commits accounted for across windows
    const totalFromWindows = windows.reduce((sum, w) => sum + w.totalCommits, 0);
    expect(totalFromWindows).toBe(6);
  });

  it('returns empty array for no commits', () => {
    const windows = buildMetricWindows([], 7);
    expect(windows).toEqual([]);
  });
});

describe('calculateTrend', () => {
  it('detects upward trend', () => {
    const trend = calculateTrend(0.8, 0.5);
    expect(trend.direction).toBe('up');
    expect(trend.current).toBe(0.8);
    expect(trend.previous).toBe(0.5);
    expect(trend.changePercent).toBeCloseTo(60);
  });

  it('detects downward trend', () => {
    const trend = calculateTrend(0.3, 0.6);
    expect(trend.direction).toBe('down');
    expect(trend.changePercent).toBeCloseTo(-50);
  });

  it('detects stable when change is within threshold', () => {
    const trend = calculateTrend(0.51, 0.50);
    expect(trend.direction).toBe('stable');
  });

  it('handles zero previous value', () => {
    const trend = calculateTrend(0.5, 0);
    expect(trend.direction).toBe('up');
    expect(trend.changePercent).toBe(100);
  });

  it('handles both zero', () => {
    const trend = calculateTrend(0, 0);
    expect(trend.direction).toBe('stable');
    expect(trend.changePercent).toBe(0);
  });
});
