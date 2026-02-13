/**
 * Milestones API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockPrisma = {
  milestone: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../../db/client.js', () => ({
  prisma: mockPrisma,
}));

const { milestonesRoute } = await import('../../routes/milestones.js');

function createApp() {
  const app = new Hono();
  app.route('/api', milestonesRoute);
  return app;
}

describe('GET /api/projects/:id/milestones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated milestones', async () => {
    mockPrisma.milestone.findMany.mockResolvedValue([
      {
        id: 'ms-1',
        type: 'tool-transition',
        category: 'ai-tool',
        title: 'Started using Claude Code',
        description: 'First commit with Claude Code co-authoring',
        timestamp: new Date('2025-01-15'),
        published: false,
        projectId: 'proj-1',
      },
    ]);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/milestones');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('tool-transition');
    expect(body.data[0].title).toBe('Started using Claude Code');
  });

  it('filters by type query param', async () => {
    mockPrisma.milestone.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/milestones?type=velocity-shift');

    expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'proj-1',
          type: 'velocity-shift',
        }),
      }),
    );
  });

  it('limits results', async () => {
    mockPrisma.milestone.findMany.mockResolvedValue([]);

    const app = createApp();
    await app.request('/api/projects/proj-1/milestones?limit=5');

    expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      }),
    );
  });
});

describe('POST /api/projects/:id/milestones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a milestone', async () => {
    mockPrisma.milestone.create.mockResolvedValue({
      id: 'ms-new',
      type: 'quality-signal',
      category: 'test-coverage',
      title: 'Test coverage reached 80%',
      description: null,
      timestamp: new Date('2025-01-20'),
      published: false,
      projectId: 'proj-1',
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quality-signal',
        category: 'test-coverage',
        title: 'Test coverage reached 80%',
        timestamp: '2025-01-20T00:00:00Z',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe('ms-new');
    expect(body.data.title).toBe('Test coverage reached 80%');
  });

  it('returns 400 for missing required fields', async () => {
    const app = createApp();
    const res = await app.request('/api/projects/proj-1/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quality-signal' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type', async () => {
    const app = createApp();
    const res = await app.request('/api/projects/proj-1/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invalid-type',
        category: 'test',
        title: 'Test',
        timestamp: '2025-01-20T00:00:00Z',
      }),
    });

    expect(res.status).toBe(400);
  });
});
