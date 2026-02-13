import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { projectsRoute } from '../../routes/projects.js';
import { errorHandler } from '../../middleware/error-handler.js';

vi.mock('../../db/client.js', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    commit: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../db/client.js';

function createApp() {
  const app = new Hono();
  app.onError(errorHandler);
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

describe('POST /api/projects', () => {
  it('should create a project and return 201', async () => {
    const mockProject = {
      id: 'proj-new',
      name: 'HerdMate',
      repoFullName: 'whey-cool/herdmate',
      webhookSecret: 'generated-secret',
      apiKey: 'generated-api-key',
      createdAt: new Date('2026-02-12T10:00:00Z'),
      updatedAt: new Date('2026-02-12T10:00:00Z'),
      lastAnalyzedAt: null,
    };
    vi.mocked(prisma.project.create).mockResolvedValueOnce(mockProject as any);

    const app = createApp();
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HerdMate', repoFullName: 'whey-cool/herdmate' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('proj-new');
    expect(body.data.name).toBe('HerdMate');
    expect(body.data.repoFullName).toBe('whey-cool/herdmate');
    expect(body.data.webhookSecret).toBe('generated-secret');
    expect(body.data.apiKey).toBe('generated-api-key');
    expect(body.data.createdAt).toBeDefined();

    // Verify prisma.project.create was called with generated secrets
    const createCall = vi.mocked(prisma.project.create).mock.calls[0][0];
    expect(createCall.data.name).toBe('HerdMate');
    expect(createCall.data.repoFullName).toBe('whey-cool/herdmate');
    expect(createCall.data.webhookSecret).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex
    expect(createCall.data.apiKey).toBeDefined();
  });

  it('should return 400 when name is missing', async () => {
    const app = createApp();
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName: 'whey-cool/herdmate' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when repoFullName is missing', async () => {
    const app = createApp();
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HerdMate' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when repoFullName has invalid format', async () => {
    const app = createApp();
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HerdMate', repoFullName: 'no-slash-here' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 409 when repoFullName already exists', async () => {
    const prismaError = new Error('Unique constraint failed') as any;
    prismaError.code = 'P2002';
    vi.mocked(prisma.project.create).mockRejectedValueOnce(prismaError);

    const app = createApp();
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HerdMate', repoFullName: 'whey-cool/herdmate' }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.title).toBe('Conflict');
  });
});
