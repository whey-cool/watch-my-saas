/**
 * Metrics history API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  commit: {
    findMany: vi.fn(),
  },
};

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

const { metricsRoute } = await import('../../routes/metrics.js');

function createApp() {
  const app = new Hono();
  app.route('/api', metricsRoute);
  return app;
}

const mockCommits = [
  {
    sha: 'abc123',
    message: 'feat: add login',
    authorName: 'Megan',
    authorEmail: 'megan@test.com',
    authorType: 'human',
    aiTool: null,
    category: 'feat',
    filesChanged: 5,
    insertions: 50,
    deletions: 10,
    testFilesTouched: 1,
    typeFilesTouched: 0,
    timestamp: new Date('2025-01-10'),
    projectId: 'proj-1',
  },
  {
    sha: 'def456',
    message: 'feat: add auth\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>',
    authorName: 'Megan',
    authorEmail: 'megan@test.com',
    authorType: 'ai',
    aiTool: 'Claude Code',
    category: 'feat',
    filesChanged: 8,
    insertions: 80,
    deletions: 5,
    testFilesTouched: 2,
    typeFilesTouched: 1,
    timestamp: new Date('2025-01-12'),
    projectId: 'proj-1',
  },
];

describe('GET /api/projects/:id/metrics/history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns metric windows from commits', async () => {
    mockPrisma.commit.findMany.mockResolvedValue(mockCommits);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/metrics/history');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toHaveProperty('totalCommits');
    expect(body.data[0]).toHaveProperty('aiRatio');
  });

  it('filters commits by since and until', async () => {
    mockPrisma.commit.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/metrics/history?since=2025-01-01&until=2025-02-01');

    expect(mockPrisma.commit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'proj-1',
          timestamp: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('returns empty data for no commits', async () => {
    mockPrisma.commit.findMany.mockResolvedValue([]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/metrics/history');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('returns serializable window dates', async () => {
    mockPrisma.commit.findMany.mockResolvedValue(mockCommits);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/metrics/history');
    const body = await res.json();

    if (body.data.length > 0) {
      expect(typeof body.data[0].windowStart).toBe('string');
      expect(typeof body.data[0].windowEnd).toBe('string');
    }
  });
});
