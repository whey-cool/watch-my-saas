import { describe, it, expect } from 'vitest';
import { detectAiHandoffCliff } from '../../../../services/recommendations/detectors/ai-handoff-cliff.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectAiHandoffCliff', () => {
  it('returns null when AI ratio is low', () => {
    const current = makeWindow({ aiRatio: 0.3, testRatio: 0.05 });
    const commits = [makeCommit({ authorType: 'human' })];

    expect(detectAiHandoffCliff(current, [], commits)).toBeNull();
  });

  it('returns null when test ratio is adequate', () => {
    const current = makeWindow({ aiRatio: 0.8, testRatio: 0.25 });
    const commits = [makeCommit({ authorType: 'ai' })];

    expect(detectAiHandoffCliff(current, [], commits)).toBeNull();
  });

  it('detects cliff when high AI ratio and low test ratio', () => {
    const current = makeWindow({ aiRatio: 0.85, testRatio: 0.05, avgFilesPerCommit: 6 });
    const commits = [
      makeCommit({ sha: 'abc123', authorType: 'ai', filesChanged: 8 }),
      makeCommit({ sha: 'def456', authorType: 'ai', filesChanged: 6 }),
    ];

    const result = detectAiHandoffCliff(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('ai-handoff-cliff');
    expect(result?.severity).toBe('critical');
    expect(result?.evidence.metrics).toMatchObject({
      aiRatio: 0.85,
      testRatio: 0.05,
      avgFilesPerCommit: 6,
    });
    expect(result?.evidence.commits).toContain('abc123');
    expect(result?.evidence.commits).toContain('def456');
  });

  it('detects cliff at threshold boundary', () => {
    const current = makeWindow({ aiRatio: 0.75, testRatio: 0.08, avgFilesPerCommit: 12 });
    const commits = [
      makeCommit({ sha: 'xyz789', authorType: 'ai', filesChanged: 15 }),
    ];

    const result = detectAiHandoffCliff(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('ai-handoff-cliff');
  });

  it('returns null when commits array is empty', () => {
    const current = makeWindow({ aiRatio: 0.9, testRatio: 0.02 });

    expect(detectAiHandoffCliff(current, [], [])).toBeNull();
  });

  it('includes proper evidence fields', () => {
    const current = makeWindow({ aiRatio: 0.82, testRatio: 0.06 });
    const commits = [
      makeCommit({ sha: 'commit1', authorType: 'ai' }),
      makeCommit({ sha: 'commit2', authorType: 'ai' }),
      makeCommit({ sha: 'commit3', authorType: 'human' }),
    ];

    const result = detectAiHandoffCliff(current, [], commits);

    expect(result).not.toBeNull();
    expect(result?.evidence).toHaveProperty('commits');
    expect(result?.evidence).toHaveProperty('files');
    expect(result?.evidence).toHaveProperty('metrics');
    // Only AI commits included in evidence
    expect(result?.evidence.commits).toContain('commit1');
    expect(result?.evidence.commits).toContain('commit2');
    expect(result?.evidence.commits).not.toContain('commit3');
  });

  it('returns null when AI ratio is exactly at threshold but test ratio is good', () => {
    const current = makeWindow({ aiRatio: 0.7, testRatio: 0.15 });
    const commits = [makeCommit({ authorType: 'ai' })];

    expect(detectAiHandoffCliff(current, [], commits)).toBeNull();
  });
});
