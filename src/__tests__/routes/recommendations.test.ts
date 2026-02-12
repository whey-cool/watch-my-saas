/**
 * Recommendation API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  recommendation: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

const mockAnalyzeProject = vi.fn();

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/recommendations/engine.js', () => ({
  analyzeProject: (...args: unknown[]) => mockAnalyzeProject(...args),
}));

const { recommendationsRoute } = await import('../../routes/recommendations.js');

function createApp() {
  const app = new Hono();
  app.route('/api', recommendationsRoute);
  return app;
}

describe('GET /api/projects/:id/recommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns active recommendations by default', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        pattern: 'sprint-drift',
        severity: 'medium',
        title: 'Sprint-Drift Cycle',
        description: 'Detected pattern',
        evidence: { commits: [], files: [], metrics: {} },
        nextSteps: ['Fix it'],
        status: 'active',
        detectedAt: new Date('2026-01-15'),
        acknowledgedAt: null,
        dismissedAt: null,
        resolvedAt: null,
      },
    ]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/recommendations');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].pattern).toBe('sprint-drift');
  });

  it('filters by status query param', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/recommendations?status=dismissed');

    expect(mockPrisma.recommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'proj-1',
          status: 'dismissed',
        }),
      }),
    );
  });

  it('filters by severity query param', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/recommendations?severity=critical');

    expect(mockPrisma.recommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          severity: 'critical',
        }),
      }),
    );
  });
});

describe('PATCH /api/projects/:id/recommendations/:rid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('acknowledges a recommendation', async () => {
    mockPrisma.recommendation.update.mockResolvedValue({
      id: 'rec-1',
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/recommendations/rec-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'acknowledged' }),
    });

    expect(res.status).toBe(200);
    expect(mockPrisma.recommendation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec-1' },
        data: expect.objectContaining({ status: 'acknowledged' }),
      }),
    );
  });

  it('dismisses a recommendation', async () => {
    mockPrisma.recommendation.update.mockResolvedValue({
      id: 'rec-1',
      status: 'dismissed',
      dismissedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/recommendations/rec-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });

    expect(res.status).toBe(200);
  });

  it('rejects invalid status', async () => {
    const app = createApp();
    const res = await app.request('/api/projects/proj-1/recommendations/rec-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/projects/:id/analyze', () => {
  beforeEach(() => vi.clearAllMocks());

  it('triggers analysis and returns results', async () => {
    mockAnalyzeProject.mockResolvedValue({
      recommendations: [{ pattern: 'ghost-churn', severity: 'high', title: 'Ghost Churn' }],
      phase: { phase: 'building', confidence: 0.8, signals: ['Active'], guidance: 'Keep shipping.' },
      windows: [],
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/analyze', { method: 'POST' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.phase.phase).toBe('building');
    expect(body.recommendations).toHaveLength(1);
    expect(mockAnalyzeProject).toHaveBeenCalledWith('proj-1');
  });
});
