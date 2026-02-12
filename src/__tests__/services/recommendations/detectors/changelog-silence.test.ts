import { describe, it, expect } from 'vitest';
import { detectChangelogSilence } from '../../../../services/recommendations/detectors/changelog-silence.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectChangelogSilence', () => {
  it('returns null when feat ratio is healthy (>10%)', () => {
    const commits = [
      makeCommit({ category: 'feat' }),
      makeCommit({ category: 'feat' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'docs' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'feat' }),
      makeCommit({ category: 'fix' }),
    ];

    const current = makeWindow({ totalCommits: 12, featCommits: 3 });
    expect(detectChangelogSilence(current, [], commits)).toBeNull();
  });

  it('returns null when commit count is low (<10)', () => {
    const commits = [
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'docs' }),
    ];

    const current = makeWindow({ totalCommits: 5, featCommits: 0 });
    expect(detectChangelogSilence(current, [], commits)).toBeNull();
  });

  it('detects silence: many commits but few features', () => {
    const commits = [
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'docs' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'feat' }), // Only 1 feat out of 12 = 8.3%
    ];

    const current = makeWindow({ totalCommits: 12, featCommits: 1 });
    const result = detectChangelogSilence(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('changelog-silence');
    expect(result?.severity).toBe('medium');
    expect(result?.description).toContain('shipping code but not features');
  });

  it('excludes bot commits from ratio calculation', () => {
    const commits = [
      makeCommit({ category: 'fix', authorType: 'bot' }),
      makeCommit({ category: 'fix', authorType: 'bot' }),
      makeCommit({ category: 'fix', authorType: 'bot' }),
      makeCommit({ category: 'fix', authorType: 'bot' }),
      makeCommit({ category: 'fix', authorType: 'bot' }),
      makeCommit({ category: 'fix', authorType: 'human' }),
      makeCommit({ category: 'fix', authorType: 'human' }),
      makeCommit({ category: 'refactor', authorType: 'human' }),
      makeCommit({ category: 'refactor', authorType: 'human' }),
      makeCommit({ category: 'chore', authorType: 'human' }),
      makeCommit({ category: 'chore', authorType: 'human' }),
      makeCommit({ category: 'docs', authorType: 'human' }),
      makeCommit({ category: 'test', authorType: 'human' }),
      makeCommit({ category: 'test', authorType: 'human' }),
      makeCommit({ category: 'test', authorType: 'human' }),
      makeCommit({ category: 'feat', authorType: 'human' }),
    ];

    // 16 total, 5 bots, 11 non-bot. 1/11 = 9.09% < 10%
    const current = makeWindow({ totalCommits: 16, featCommits: 1, botCommits: 5 });
    const result = detectChangelogSilence(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('changelog-silence');
  });

  it('includes proper evidence with metrics', () => {
    const commits = [
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'fix' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'refactor' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'chore' }),
      makeCommit({ category: 'docs' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'test' }),
      makeCommit({ category: 'feat' }),
    ];

    const current = makeWindow({ totalCommits: 12, featCommits: 1 });
    const result = detectChangelogSilence(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.commits.length).toBeGreaterThan(0);
    expect(result?.evidence.metrics).toMatchObject({
      totalCommits: 12,
      featCommits: 1,
    });
    expect(result?.evidence.metrics.featRatio).toBeCloseTo(0.083, 2);
  });

  it('returns null when all commits are feat', () => {
    const commits = Array.from({ length: 12 }, () => makeCommit({ category: 'feat' }));

    const current = makeWindow({ totalCommits: 12, featCommits: 12 });
    expect(detectChangelogSilence(current, [], commits)).toBeNull();
  });

  it('returns null when feat ratio is exactly 10%', () => {
    const commits = [
      makeCommit({ category: 'feat' }),
      ...Array.from({ length: 9 }, () => makeCommit({ category: 'fix' })),
    ];

    // Exactly at threshold: 10 non-bot commits but need >10 to trigger
    const current = makeWindow({ totalCommits: 10, featCommits: 1 });
    expect(detectChangelogSilence(current, [], commits)).toBeNull();
  });
});
