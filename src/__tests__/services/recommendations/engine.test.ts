/**
 * Recommendation engine integration tests.
 * Tests the full pipeline: fetch commits → aggregate → detect → store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommitRecord, RecommendationInput, MetricWindow, PatternType, Severity, Detector } from '../../../types.js';
import { makeCommit, makeWindow } from './helpers.js';

// Mock Prisma
const mockPrisma = {
  commit: {
    findMany: vi.fn(),
  },
  recommendation: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  },
  project: {
    update: vi.fn(),
  },
};

vi.mock('../../../db/client.js', () => ({
  prisma: mockPrisma,
}));

// Mock detectors — we control what they return
const mockDetectors: Detector[] = [];

vi.mock('../../../services/recommendations/detectors/index.js', () => ({
  get DETECTORS() {
    return mockDetectors;
  },
}));

// Import after mocks
const { analyzeProject } = await import('../../../services/recommendations/engine.js');

function makeDbCommit(overrides: Partial<CommitRecord> = {}): CommitRecord & { id: string } {
  const commit = makeCommit(overrides);
  return { id: `commit-${commit.sha}`, ...commit };
}

function makeRecommendation(pattern: PatternType, severity: Severity = 'medium'): RecommendationInput {
  return {
    pattern,
    severity,
    title: `Test ${pattern}`,
    description: `Detected ${pattern} pattern`,
    evidence: { commits: ['sha-1'], files: ['file.ts'], metrics: { score: 0.8 } },
    nextSteps: ['Fix it'],
  };
}

describe('analyzeProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectors.length = 0;
  });

  it('fetches commits, runs detectors, stores recommendations', async () => {
    const commits = Array.from({ length: 15 }, (_, i) =>
      makeDbCommit({
        timestamp: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`),
        category: i < 10 ? 'feat' : 'fix',
      }),
    );

    mockPrisma.commit.findMany.mockResolvedValue(commits);
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.project.update.mockResolvedValue({});

    const rec = makeRecommendation('sprint-drift');
    mockDetectors.push((_c, _h, _commits) => rec);

    const result = await analyzeProject('proj-1');

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].pattern).toBe('sprint-drift');
    expect(result.phase.phase).toBeDefined();
    expect(mockPrisma.recommendation.createMany).toHaveBeenCalled();
    expect(mockPrisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-1' },
        data: expect.objectContaining({ lastAnalyzedAt: expect.any(Date) }),
      }),
    );
  });

  it('deduplicates against existing active recommendations', async () => {
    const commits = Array.from({ length: 10 }, (_, i) =>
      makeDbCommit({ timestamp: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`) }),
    );

    mockPrisma.commit.findMany.mockResolvedValue(commits);
    mockPrisma.recommendation.findMany.mockResolvedValue([
      { id: 'existing-1', pattern: 'sprint-drift', status: 'active' },
    ]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.project.update.mockResolvedValue({});

    mockDetectors.push((_c, _h, _commits) => makeRecommendation('sprint-drift'));

    const result = await analyzeProject('proj-1');

    // Should not create a duplicate
    const createCall = mockPrisma.recommendation.createMany.mock.calls[0]?.[0];
    const createdPatterns = (createCall?.data ?? []).map((r: { pattern: string }) => r.pattern);
    expect(createdPatterns).not.toContain('sprint-drift');
  });

  it('resolves previously active recommendations that are no longer detected', async () => {
    const commits = Array.from({ length: 10 }, (_, i) =>
      makeDbCommit({ timestamp: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`) }),
    );

    mockPrisma.commit.findMany.mockResolvedValue(commits);
    mockPrisma.recommendation.findMany.mockResolvedValue([
      { id: 'existing-1', pattern: 'ghost-churn', status: 'active' },
    ]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.recommendation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.project.update.mockResolvedValue({});

    // No detectors fire → ghost-churn should be resolved
    mockDetectors.push((_c, _h, _commits) => null);

    const result = await analyzeProject('proj-1');

    expect(mockPrisma.recommendation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['existing-1'] },
        }),
      }),
    );
  });

  it('returns empty results for projects with no commits', async () => {
    mockPrisma.commit.findMany.mockResolvedValue([]);
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.project.update.mockResolvedValue({});

    const result = await analyzeProject('proj-1');

    expect(result.recommendations).toHaveLength(0);
    expect(result.phase.phase).toBe('building');
    expect(result.windows).toHaveLength(0);
  });

  it('includes metric windows in the result', async () => {
    // 3 weeks of commits → should produce multiple windows
    const commits = Array.from({ length: 21 }, (_, i) =>
      makeDbCommit({
        timestamp: new Date(2026, 0, i + 1), // Jan 1 through Jan 21
        category: 'feat',
      }),
    );

    mockPrisma.commit.findMany.mockResolvedValue(commits);
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.project.update.mockResolvedValue({});

    const result = await analyzeProject('proj-1');

    expect(result.windows.length).toBeGreaterThan(0);
    expect(result.windows[0]).toHaveProperty('totalCommits');
    expect(result.windows[0]).toHaveProperty('aiRatio');
  });

  it('passes commit records to detectors', async () => {
    const commits = Array.from({ length: 10 }, (_, i) =>
      makeDbCommit({ timestamp: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`) }),
    );

    mockPrisma.commit.findMany.mockResolvedValue(commits);
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.recommendation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.project.update.mockResolvedValue({});

    let receivedCommits: readonly CommitRecord[] = [];
    mockDetectors.push((current, history, commitRecords) => {
      receivedCommits = commitRecords;
      return null;
    });

    await analyzeProject('proj-1');

    expect(receivedCommits).toHaveLength(10);
    expect(receivedCommits[0]).toHaveProperty('sha');
  });
});
