import { describe, it, expect } from 'vitest';
import { detectPhase } from '../../../services/recommendations/phase-detector.js';
import type { MetricWindow, CommitCategory } from '../../../types.js';

const ZERO_CATEGORIES: Readonly<Record<CommitCategory, number>> = {
  feat: 0, fix: 0, refactor: 0, docs: 0, test: 0, chore: 0, ci: 0, perf: 0, other: 0,
};

function makeWindow(overrides: Partial<MetricWindow> = {}): MetricWindow {
  return {
    windowStart: new Date('2026-01-01'),
    windowEnd: new Date('2026-01-07'),
    totalCommits: 10,
    aiCommits: 5,
    humanCommits: 4,
    botCommits: 1,
    aiRatio: 0.5,
    featCommits: 4,
    fixCommits: 2,
    refactorCommits: 1,
    testCommits: 1,
    choreCommits: 1,
    otherCommits: 1,
    totalFilesChanged: 30,
    totalTestFilesTouched: 5,
    testRatio: 5 / 30,
    avgFilesPerCommit: 3,
    uniqueAiTools: ['Claude Code'],
    categoryDistribution: { ...ZERO_CATEGORIES, feat: 4, fix: 2, refactor: 1, test: 1, chore: 1, other: 1 },
    ...overrides,
  };
}

describe('detectPhase', () => {
  it('detects Building phase: high velocity, features landing', () => {
    const current = makeWindow({
      featCommits: 8,
      fixCommits: 1,
      refactorCommits: 0,
      choreCommits: 1,
      testCommits: 2,
      totalCommits: 12,
      testRatio: 0.2,
    });

    const result = detectPhase(current, []);

    expect(result.phase).toBe('building');
    expect(result.guidance).toContain('shipping');
  });

  it('detects Drifting phase: high AI%, high churn, cleanup dominating', () => {
    const current = makeWindow({
      aiRatio: 0.8,
      aiCommits: 8,
      humanCommits: 2,
      featCommits: 1,
      fixCommits: 4,
      refactorCommits: 3,
      choreCommits: 2,
      totalCommits: 10,
      testRatio: 0.05,
    });

    const result = detectPhase(current, []);

    expect(result.phase).toBe('drifting');
    expect(result.guidance).toContain('Slow down');
  });

  it('detects Stabilizing phase: churn declining, test ratio increasing', () => {
    const history = [
      makeWindow({
        fixCommits: 6,
        refactorCommits: 3,
        featCommits: 1,
        testRatio: 0.1,
        totalCommits: 10,
      }),
    ];
    const current = makeWindow({
      fixCommits: 2,
      refactorCommits: 2,
      featCommits: 2,
      testCommits: 4,
      totalCommits: 10,
      testRatio: 0.3,
      choreCommits: 0,
    });

    const result = detectPhase(current, history);

    expect(result.phase).toBe('stabilizing');
    expect(result.guidance).toContain('Polish');
  });

  it('detects Ship-Ready phase: stable velocity, good tests, low churn', () => {
    const history = [
      makeWindow({ testRatio: 0.25, featCommits: 2, fixCommits: 1, refactorCommits: 1, choreCommits: 1, totalCommits: 10 }),
      makeWindow({ testRatio: 0.28, featCommits: 2, fixCommits: 1, refactorCommits: 0, choreCommits: 1, totalCommits: 10 }),
    ];
    const current = makeWindow({
      featCommits: 2,
      fixCommits: 1,
      refactorCommits: 0,
      choreCommits: 1,
      testCommits: 4,
      otherCommits: 2,
      totalCommits: 10,
      testRatio: 0.35,
      aiRatio: 0.4,
    });

    const result = detectPhase(current, history);

    expect(result.phase).toBe('ship-ready');
    expect(result.guidance).toContain('ship');
  });

  it('returns Building as default for empty window', () => {
    const current = makeWindow({ totalCommits: 0, featCommits: 0, fixCommits: 0, refactorCommits: 0, choreCommits: 0, testCommits: 0 });
    const result = detectPhase(current, []);

    expect(result.phase).toBe('building');
  });

  it('includes confidence score between 0 and 1', () => {
    const current = makeWindow();
    const result = detectPhase(current, []);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('includes signals explaining the phase', () => {
    const current = makeWindow({
      aiRatio: 0.85,
      featCommits: 1,
      fixCommits: 5,
      refactorCommits: 3,
      choreCommits: 1,
      totalCommits: 10,
      testRatio: 0.05,
    });

    const result = detectPhase(current, []);
    expect(result.signals.length).toBeGreaterThan(0);
  });
});
