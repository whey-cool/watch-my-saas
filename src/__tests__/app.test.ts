import { describe, it, expect, vi } from 'vitest';

vi.mock('../db/client.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

import { createApp } from '../app.js';

describe('app', () => {
  const app = createApp({ apiKey: 'test-key' });

  it('should mount health route at /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('should return 404 for unknown paths', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should require auth for protected routes', async () => {
    const res = await app.request('/api/projects');
    expect(res.status).toBe(401);
  });

  it('should pass auth with valid API key', async () => {
    const res = await app.request('/api/projects', {
      headers: { Authorization: 'Bearer test-key' },
    });
    // May be 200 or other status, but not 401
    expect(res.status).not.toBe(401);
  });
});
