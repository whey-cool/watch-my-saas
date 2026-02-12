/**
 * Quality reports API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  qualityReport: {
    findMany: vi.fn(),
  },
};

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

const { reportsRoute } = await import('../../routes/reports.js');

function createApp() {
  const app = new Hono();
  app.route('/api', reportsRoute);
  return app;
}

describe('GET /api/projects/:id/reports', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated reports', async () => {
    mockPrisma.qualityReport.findMany.mockResolvedValue([
      {
        id: 'rpt-1',
        type: 'weekly-digest',
        windowStart: new Date('2026-01-06'),
        windowEnd: new Date('2026-01-13'),
        data: { aiRatio: 0.65 },
      },
    ]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/reports');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('weekly-digest');
    expect(body.data[0].windowStart).toBe('2026-01-06T00:00:00.000Z');
    expect(body.meta.hasMore).toBe(false);
  });

  it('filters by type query param', async () => {
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/reports?type=sprint-retro');

    expect(mockPrisma.qualityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'proj-1',
          type: 'sprint-retro',
        }),
      }),
    );
  });

  it('respects limit param capped at 100', async () => {
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/reports?limit=500');

    expect(mockPrisma.qualityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // limit + 1 for hasMore check, capped at 100+1
      }),
    );
  });

  it('paginates with cursor', async () => {
    mockPrisma.qualityReport.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/reports?cursor=rpt-5');

    expect(mockPrisma.qualityReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'rpt-5' },
        skip: 1,
      }),
    );
  });

  it('returns hasMore and nextCursor when more results exist', async () => {
    // Default limit=20, so return 21 items to trigger hasMore
    const reports = Array.from({ length: 21 }, (_, i) => ({
      id: `rpt-${i}`,
      type: 'weekly-digest',
      windowStart: new Date('2026-01-06'),
      windowEnd: new Date('2026-01-13'),
      data: {},
    }));
    mockPrisma.qualityReport.findMany.mockResolvedValue(reports);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/reports');
    const body = await res.json();

    expect(body.data).toHaveLength(20);
    expect(body.meta.hasMore).toBe(true);
    expect(body.meta.nextCursor).toBe('rpt-19');
  });
});
