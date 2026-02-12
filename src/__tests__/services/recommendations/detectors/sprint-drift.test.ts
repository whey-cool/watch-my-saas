import { describe, it, expect } from 'vitest';
import { detectSprintDrift } from '../../../../services/recommendations/detectors/sprint-drift.js';
import { makeCommit, makeWindow } from '../helpers.js';
import type { CommitRecord } from '../../../../types.js';

describe('detectSprintDrift', () => {
  it('returns null when AI ratio is low', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'human', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'human', category: 'feat' }),
      makeCommit({ sha: 'abc3', authorType: 'ai', category: 'fix' }),
    ];

    const current = makeWindow({
      aiRatio: 0.33, // Low AI ratio
      totalCommits: 3,
    });

    const result = detectSprintDrift(current, [], commits);

    expect(result).toBeNull();
  });

  it('returns null when cleanup ratio is low', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc3', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc4', authorType: 'human', category: 'feat' }),
    ];

    const current = makeWindow({
      aiRatio: 0.75, // High AI ratio
      totalCommits: 4,
    });

    const result = detectSprintDrift(current, [], commits);

    expect(result).toBeNull();
  });

  it('detects drift when AI ratio high AND cleanup ratio high', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc3', authorType: 'human', category: 'fix' }),
      makeCommit({ sha: 'abc4', authorType: 'human', category: 'refactor' }),
      makeCommit({ sha: 'abc5', authorType: 'human', category: 'chore' }),
    ];

    const current = makeWindow({
      aiRatio: 0.65, // High AI ratio
      totalCommits: 5,
    });

    const result = detectSprintDrift(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('sprint-drift');
    expect(result?.severity).toBe('medium');
    expect(result?.title).toContain('Sprint-Drift');
  });

  it('returns null when commits array is empty', () => {
    const current = makeWindow({
      aiRatio: 0.70,
      totalCommits: 0,
    });

    const result = detectSprintDrift(current, [], []);

    expect(result).toBeNull();
  });

  it('includes proper evidence in recommendation', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc3', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc4', authorType: 'human', category: 'fix' }),
      makeCommit({ sha: 'abc5', authorType: 'human', category: 'refactor' }),
      makeCommit({ sha: 'abc6', authorType: 'human', category: 'chore' }),
      makeCommit({ sha: 'abc7', authorType: 'human', category: 'fix' }),
    ];

    const current = makeWindow({
      aiRatio: 0.70, // High AI ratio
      totalCommits: 7,
    });

    const result = detectSprintDrift(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.commits).toHaveLength(4); // fix, refactor, chore, fix
    expect(result?.evidence.files).toEqual([]);
    expect(result?.evidence.metrics.aiRatio).toBeCloseTo(0.70, 2);
    expect(result?.evidence.metrics.cleanupRatio).toBeGreaterThan(0.5);
    expect(result?.evidence.metrics.cleanupCommitCount).toBe(4);
    expect(result?.evidence.metrics.totalNonBotCommits).toBe(7);
  });

  it('excludes bot commits from cleanup ratio calculation', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'bot1', authorType: 'bot', category: 'chore' }), // Bot commit (excluded)
      makeCommit({ sha: 'bot2', authorType: 'bot', category: 'chore' }), // Bot commit (excluded)
      makeCommit({ sha: 'abc3', authorType: 'human', category: 'fix' }),
      makeCommit({ sha: 'abc4', authorType: 'human', category: 'refactor' }),
    ];

    const current = makeWindow({
      aiRatio: 0.65, // High AI ratio
      totalCommits: 6,
    });

    const result = detectSprintDrift(current, [], commits);

    // Non-bot commits: 4 (2 AI feat + 2 cleanup)
    // Cleanup commits: 2 (fix, refactor)
    // Cleanup ratio: 2/4 = 0.5 (at threshold, should detect)
    expect(result).not.toBeNull();
    expect(result?.evidence.commits).toHaveLength(2);
    expect(result?.evidence.commits).toEqual(['abc3', 'abc4']);
    expect(result?.evidence.metrics.totalNonBotCommits).toBe(4);
  });

  it('detects drift with mixed commit types and high cleanup', () => {
    const commits: CommitRecord[] = [
      makeCommit({ sha: 'abc1', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc2', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'abc3', authorType: 'ai', category: 'feat' }),
      makeCommit({ sha: 'bot1', authorType: 'bot', category: 'chore' }), // Excluded
      makeCommit({ sha: 'abc4', authorType: 'human', category: 'fix' }),
      makeCommit({ sha: 'abc5', authorType: 'human', category: 'refactor' }),
      makeCommit({ sha: 'abc6', authorType: 'human', category: 'chore' }),
    ];

    const current = makeWindow({
      aiRatio: 0.65, // High AI ratio
      totalCommits: 7,
    });

    const result = detectSprintDrift(current, [], commits);

    expect(result).not.toBeNull();
    // Non-bot commits: 6 (3 AI feat + 3 cleanup)
    // Cleanup commits: 3 (fix, refactor, chore)
    // Cleanup ratio: 3/6 = 0.5 (exactly at threshold)
    expect(result?.evidence.metrics.cleanupRatio).toBeCloseTo(0.5, 2);
    expect(result?.evidence.metrics.totalNonBotCommits).toBe(6);
  });
});
