import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { healthRoute } from '../../routes/health.js';

// Mock Prisma
vi.mock('../../db/client.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '../../db/client.js';

describe('GET /api/health', () => {
  function createApp() {
    const app = new Hono();
    app.route('/api', healthRoute);
    return app;
  }

  it('should return ok status when database is connected', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

    const app = createApp();
    const res = await app.request('/api/health');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('should return degraded status when database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));

    const app = createApp();
    const res = await app.request('/api/health');
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('disconnected');
  });
});
