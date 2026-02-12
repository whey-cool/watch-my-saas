import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { projectsRoute } from '../../routes/projects.js';

vi.mock('../../db/client.js', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
    commit: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../db/client.js';

function createApp() {
  const app = new Hono();
  app.route('/api', projectsRoute);
  return app;
}

describe('GET /api/projects', () => {
  it('should return project list with commit counts', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
      {
        id: 'proj-1',
        name: 'herdmate',
        repoFullName: 'whey-cool/herdmate',
        _count: { commits: 42 },
        commits: [{ timestamp: new Date('2026-01-15T10:00:00Z') }],
      },
    ] as any);

    const app = createApp();
    const res = await app.request('/api/projects');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].repoFullName).toBe('whey-cool/herdmate');
    expect(body.data[0].commitCount).toBe(42);
  });

  it('should return empty array when no projects', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValueOnce([]);

    const app = createApp();
    const res = await app.request('/api/projects');
    const body = await res.json();

    expect(body.data).toEqual([]);
  });
});

describe('GET /api/projects/:id/commits', () => {
  it('should return paginated commits', async () => {
    vi.mocked(prisma.commit.findMany).mockResolvedValueOnce([
      {
        id: 'commit-1',
        sha: 'abc123',
        message: 'feat: add webhook',
        authorName: 'Megan',
        authorEmail: 'megan@example.com',
        authorType: 'human',
        aiTool: null,
        category: 'feat',
        filesChanged: 3,
        insertions: 50,
        deletions: 10,
        testFilesTouched: 1,
        typeFilesTouched: 0,
        timestamp: new Date('2026-01-15T10:00:00Z'),
      },
    ] as any);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/commits');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].sha).toBe('abc123');
    expect(body.meta.hasMore).toBe(false);
  });
});
