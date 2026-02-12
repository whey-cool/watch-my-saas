import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { webhooksRoute } from '../../routes/webhooks.js';
import { humanCommit } from '../fixtures/webhook-payloads.js';

const TEST_SECRET = 'test-webhook-secret';
const TEST_PROJECT_ID = 'project-123';

// Mock Prisma
vi.mock('../../db/client.js', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    commit: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from '../../db/client.js';

function signPayload(payload: object, secret: string): string {
  const body = JSON.stringify(payload);
  const hmac = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

function createApp() {
  const app = new Hono();
  app.route('/api', webhooksRoute);
  return app;
}

describe('POST /api/webhooks/github', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject missing X-Hub-Signature-256 header', async () => {
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ commits: [] }),
    });

    expect(res.status).toBe(401);
  });

  it('should reject invalid HMAC signature', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
      id: TEST_PROJECT_ID,
      webhookSecret: TEST_SECRET,
    } as any);

    const payload = { repository: { full_name: 'whey-cool/herdmate' }, commits: [] };
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid',
        'x-github-event': 'push',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(401);
  });

  it('should reject unknown project', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce(null);

    const payload = { repository: { full_name: 'unknown/repo' }, commits: [] };
    const signature = signPayload(payload, TEST_SECRET);

    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(404);
  });

  it('should handle ping event', async () => {
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': 'sha256=dummy',
      },
      body: JSON.stringify({ zen: 'test' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('pong');
  });

  it('should accept valid signature and store commits', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
      id: TEST_PROJECT_ID,
      webhookSecret: TEST_SECRET,
    } as any);

    const payload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'whey-cool/herdmate' },
      commits: [humanCommit],
      head_commit: humanCommit,
    };
    const body = JSON.stringify(payload);
    const signature = signPayload(payload, TEST_SECRET);

    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
      },
      body,
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.processed).toBe(1);
    expect(prisma.commit.upsert).toHaveBeenCalledTimes(1);
  });
});
