/**
 * Shared test helpers for recommendation detector tests.
 */

import type { CommitRecord, MetricWindow, CommitCategory } from '../../../types.js';

export function makeCommit(overrides: Partial<CommitRecord> = {}): CommitRecord {
  return {
    sha: `sha-${Math.random().toString(36).slice(2, 8)}`,
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

const ZERO_CATEGORIES: Readonly<Record<CommitCategory, number>> = {
  feat: 0, fix: 0, refactor: 0, docs: 0, test: 0, chore: 0, ci: 0, perf: 0, other: 0,
};

export function makeWindow(overrides: Partial<MetricWindow> = {}): MetricWindow {
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
