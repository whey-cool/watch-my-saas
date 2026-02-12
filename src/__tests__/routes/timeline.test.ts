/**
 * Timeline API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  recommendation: { findMany: vi.fn() },
  milestone: { findMany: vi.fn() },
  qualityReport: { findMany: vi.fn() },
};

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

const { timelineRoute } = await import('../../routes/timeline.js');

function createApp() {
  const app = new Hono();
  app.route('/api', timelineRoute);
  return app;
}

describe('GET /api/projects/:id/timeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges and sorts events from all sources', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        pattern: 'ghost-churn',
        title: 'Ghost Churn',
        description: 'AI code reverting',
        severity: 'high',
        status: 'active',
        detectedAt: new Date('2026-01-15'),
      },
    ]);
    mockPrisma.milestone.findMany.mockResolvedValue([
      {
        id: 'ms-1',
        type: 'release',
        title: 'v0.1.0',
        description: 'First release',
        category: 'feat',
        timestamp: new Date('2026-01-20'),
      },
    ]);
    mockPrisma.qualityReport.findMany.mockResolvedValue([
      {
        id: 'rpt-1',
        type: 'weekly-digest',
        windowStart: new Date('2026-01-06'),
        windowEnd: new Date('2026-01-13'),
      },
    ]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/timeline');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    // Sorted newest first: milestone (Jan 20) → recommendation (Jan 15) → report (Jan 13)
    expect(body.data[0].type).toBe('milestone');
    expect(body.data[1].type).toBe('recommendation');
    expect(body.data[2].type).toBe('report');
  });

  it('returns empty array when no events exist', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.milestone.findMany.mockResolvedValue([]);
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/timeline');
    const body = await res.json();

    expect(body.data).toHaveLength(0);
  });

  it('respects limit param capped at 200', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.milestone.findMany.mockResolvedValue([]);
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/timeline?limit=999');

    // Each query uses the capped limit of 200
    expect(mockPrisma.recommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it('maps recommendation events correctly', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        pattern: 'sprint-drift',
        title: 'Sprint-Drift Cycle',
        description: 'Pattern detected',
        severity: 'medium',
        status: 'acknowledged',
        detectedAt: new Date('2026-01-10'),
      },
    ]);
    mockPrisma.milestone.findMany.mockResolvedValue([]);
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/timeline');
    const body = await res.json();

    const event = body.data[0];
    expect(event.type).toBe('recommendation');
    expect(event.title).toBe('Sprint-Drift Cycle');
    expect(event.metadata.pattern).toBe('sprint-drift');
    expect(event.metadata.severity).toBe('medium');
    expect(event.metadata.status).toBe('acknowledged');
  });

  it('maps milestone events with null description', async () => {
    mockPrisma.recommendation.findMany.mockResolvedValue([]);
    mockPrisma.milestone.findMany.mockResolvedValue([
      {
        id: 'ms-1',
        type: 'release',
        title: 'v0.2.0',
        description: null,
        category: 'feat',
        timestamp: new Date('2026-01-20'),
      },
    ]);
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/timeline');
    const body = await res.json();

    expect(body.data[0].description).toBe('');
    expect(body.data[0].metadata.milestoneType).toBe('release');
  });
});
