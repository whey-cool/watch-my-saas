import { describe, it, expect } from 'vitest';
import { detectTestDrift } from '../../../../services/recommendations/detectors/test-drift.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectTestDrift', () => {
  it('returns null when test ratio is healthy (≥15%)', () => {
    const current = makeWindow({
      aiRatio: 0.6,
      testRatio: 0.20, // healthy
      totalCommits: 10,
    });
    const history = [
      makeWindow({ aiRatio: 0.5, testRatio: 0.25 }),
    ];
    const commits = [makeCommit()];

    const result = detectTestDrift(current, history, commits);

    expect(result).toBeNull();
  });

  it('returns null when AI ratio is low (<50%)', () => {
    const current = makeWindow({
      aiRatio: 0.3, // low
      testRatio: 0.10, // low but AI is also low
      totalCommits: 10,
    });
    const history = [
      makeWindow({ aiRatio: 0.4, testRatio: 0.15 }),
    ];
    const commits = [makeCommit()];

    const result = detectTestDrift(current, history, commits);

    expect(result).toBeNull();
  });

  it('detects drift when AI ratio high + test ratio low + declining trend', () => {
    const current = makeWindow({
      aiRatio: 0.65,
      testRatio: 0.10, // below threshold
      totalCommits: 10,
    });
    const history = [
      makeWindow({ aiRatio: 0.55, testRatio: 0.20 }), // was higher
    ];
    const commits = [
      makeCommit({ sha: 'abc123' }),
      makeCommit({ sha: 'def456' }),
    ];

    const result = detectTestDrift(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.severity).toBe('high');
    expect(result?.pattern).toBe('test-drift');
    expect(result?.title).toBe('Test Coverage Falling Behind AI Output');
    expect(result?.description).toContain('10%'); // current ratio
    expect(result?.description).toContain('20%'); // previous ratio
    expect(result?.description).toContain('65%'); // AI ratio
  });

  it('returns null when no history available', () => {
    const current = makeWindow({
      aiRatio: 0.7,
      testRatio: 0.08,
      totalCommits: 10,
    });
    const history: never[] = [];
    const commits = [makeCommit()];

    const result = detectTestDrift(current, history, commits);

    expect(result).toBeNull();
  });

  it('includes proper evidence with ratios and commit SHAs', () => {
    const current = makeWindow({
      aiRatio: 0.70,
      testRatio: 0.12,
      totalCommits: 8,
    });
    const history = [
      makeWindow({ aiRatio: 0.60, testRatio: 0.18 }),
    ];
    const commits = [
      makeCommit({ sha: 'commit1' }),
      makeCommit({ sha: 'commit2' }),
      makeCommit({ sha: 'commit3' }),
    ];

    const result = detectTestDrift(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.commits).toEqual(['commit1', 'commit2', 'commit3']);
    expect(result?.evidence.metrics).toMatchObject({
      currentAiRatio: 0.70,
      currentTestRatio: 0.12,
      previousTestRatio: 0.18,
    });
  });

  it('flags drift even when test ratio was always low if AI ratio is high', () => {
    const current = makeWindow({
      aiRatio: 0.75,
      testRatio: 0.08, // very low
      totalCommits: 12,
    });
    const history = [
      makeWindow({ aiRatio: 0.70, testRatio: 0.09 }), // was also low, slight decline
    ];
    const commits = [makeCommit({ sha: 'xyz789' })];

    const result = detectTestDrift(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.severity).toBe('high');
    expect(result?.pattern).toBe('test-drift');
  });

  it('returns null when test ratio is stable (no decline)', () => {
    const current = makeWindow({
      aiRatio: 0.65, // high
      testRatio: 0.12, // low but equal to previous
      totalCommits: 10,
    });
    const history = [
      makeWindow({ aiRatio: 0.60, testRatio: 0.12 }), // same ratio
    ];
    const commits = [makeCommit()];

    const result = detectTestDrift(current, history, commits);

    expect(result).toBeNull();
  });

  it('returns null when test ratio is improving', () => {
    const current = makeWindow({
      aiRatio: 0.65, // high
      testRatio: 0.14, // still below threshold but improving
      totalCommits: 10,
    });
    const history = [
      makeWindow({ aiRatio: 0.60, testRatio: 0.10 }), // was lower
    ];
    const commits = [makeCommit()];

    const result = detectTestDrift(current, history, commits);

    expect(result).toBeNull();
  });
});
