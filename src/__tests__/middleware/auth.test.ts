import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { apiKeyAuth } from '../../middleware/auth.js';

function createTestApp(apiKey: string) {
  const app = new Hono();

  // Health and webhook routes skip auth
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.post('/api/webhooks/github', (c) => c.json({ processed: 0 }));

  // Protected routes use auth middleware
  app.use('/api/*', apiKeyAuth(apiKey));
  app.get('/api/projects', (c) => c.json({ data: [] }));

  return app;
}

describe('apiKeyAuth', () => {
  const TEST_KEY = 'test-api-key-12345';
  const app = createTestApp(TEST_KEY);

  it('should reject missing Authorization header', async () => {
    const res = await app.request('/api/projects');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.title).toBe('Unauthorized');
  });

  it('should reject invalid Bearer token', async () => {
    const res = await app.request('/api/projects', {
      headers: { Authorization: 'Bearer wrong-key' },
    });

    expect(res.status).toBe(401);
  });

  it('should reject non-Bearer auth schemes', async () => {
    const res = await app.request('/api/projects', {
      headers: { Authorization: `Basic ${TEST_KEY}` },
    });

    expect(res.status).toBe(401);
  });

  it('should pass with valid API key', async () => {
    const res = await app.request('/api/projects', {
      headers: { Authorization: `Bearer ${TEST_KEY}` },
    });

    expect(res.status).toBe(200);
  });

  it('should skip auth for health check', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);
  });

  it('should skip auth for webhook route', async () => {
    const res = await app.request('/api/webhooks/github', { method: 'POST' });

    expect(res.status).toBe(200);
  });
});
