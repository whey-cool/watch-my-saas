/**
 * Project overview endpoint tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  project: {
    findUnique: vi.fn(),
  },
  recommendation: {
    count: vi.fn(),
  },
  commit: {
    findMany: vi.fn(),
  },
};

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

// Mock the engine to avoid full pipeline
vi.mock('../../services/recommendations/engine.js', () => ({
  analyzeProject: vi.fn(),
}));

const { projectsRoute } = await import('../../routes/projects.js');

function createApp() {
  const app = new Hono();
  app.route('/api', projectsRoute);
  return app;
}

describe('GET /api/projects/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns project overview with phase and metrics', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'proj-1',
      name: 'HerdMate',
      repoFullName: 'whey-cool/herdmate',
      lastAnalyzedAt: new Date('2026-01-15'),
      _count: { commits: 50 },
    });

    mockPrisma.recommendation.count.mockResolvedValue(2);

    // Recent commits for metric calculation
    mockPrisma.commit.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        sha: `sha-${i}`,
        message: 'feat: something',
        authorName: 'Megan',
        authorEmail: 'megan@example.com',
        authorType: i < 5 ? 'ai' : 'human',
        aiTool: i < 5 ? 'Claude Code' : null,
        category: 'feat',
        filesChanged: 3,
        insertions: 0,
        deletions: 0,
        testFilesTouched: 1,
        typeFilesTouched: 0,
        timestamp: new Date(2026, 0, i + 1),
        projectId: 'proj-1',
      })),
    );

    const app = createApp();
    const res = await app.request('/api/projects/proj-1');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('proj-1');
    expect(body.data.name).toBe('HerdMate');
    expect(body.data.phase).toBeDefined();
    expect(body.data.phase.phase).toBeDefined();
    expect(body.data.activeRecommendations).toBe(2);
  });

  it('returns 404 for unknown project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request('/api/projects/nonexistent');

    expect(res.status).toBe(404);
  });
});
