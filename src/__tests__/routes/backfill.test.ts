/**
 * Backfill API route tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('../../services/backfill.js', () => ({
  backfillProject: vi.fn(),
  getBackfillStatus: vi.fn(),
}));

const { backfillRoute } = await import('../../routes/backfill.js');
import { backfillProject, getBackfillStatus } from '../../services/backfill.js';

function createApp() {
  const app = new Hono();
  app.route('/api', backfillRoute);
  return app;
}

describe('POST /api/projects/:id/backfill', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 202 Accepted when backfill starts', async () => {
    vi.mocked(backfillProject).mockResolvedValue(undefined);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'ghp_test123' }),
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.message).toContain('started');
  });

  it('returns 400 when no GitHub token provided', async () => {
    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toContain('GitHub token required');
  });

  it('passes options to backfillProject', async () => {
    vi.mocked(backfillProject).mockResolvedValue(undefined);

    const app = createApp();
    await app.request('/api/projects/proj-1/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        since: '2025-01-01T00:00:00Z',
        until: '2025-02-01T00:00:00Z',
        enrich: true,
        token: 'ghp_test123',
      }),
    });

    expect(backfillProject).toHaveBeenCalledWith(
      'proj-1',
      expect.any(String),
      expect.objectContaining({
        since: '2025-01-01T00:00:00Z',
        until: '2025-02-01T00:00:00Z',
        enrich: true,
      }),
    );
  });

  it('returns 409 when backfill already in progress', async () => {
    vi.mocked(getBackfillStatus).mockReturnValue({
      projectId: 'proj-1',
      status: 'listing',
      progress: { phase: 'listing', processed: 10, total: 100, message: 'In progress' },
      startedAt: '2025-01-15T10:00:00Z',
      completedAt: null,
      error: null,
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid since date', async () => {
    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ since: 'not-a-date' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/projects/:id/backfill/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns current backfill status', async () => {
    vi.mocked(getBackfillStatus).mockReturnValue({
      projectId: 'proj-1',
      status: 'listing',
      progress: { phase: 'listing', processed: 50, total: 100, message: 'Listing...' },
      startedAt: '2025-01-15T10:00:00Z',
      completedAt: null,
      error: null,
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill/status');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('listing');
    expect(body.progress.processed).toBe(50);
  });

  it('returns 404 when no backfill has been run', async () => {
    vi.mocked(getBackfillStatus).mockReturnValue(null);

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill/status');

    expect(res.status).toBe(404);
  });

  it('returns completed status', async () => {
    vi.mocked(getBackfillStatus).mockReturnValue({
      projectId: 'proj-1',
      status: 'completed',
      progress: { phase: 'completed', processed: 1156, total: 1156, message: 'Done' },
      startedAt: '2025-01-15T10:00:00Z',
      completedAt: '2025-01-15T10:05:00Z',
      error: null,
    });

    const app = createApp();
    const res = await app.request('/api/projects/proj-1/backfill/status');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
    expect(body.completedAt).toBe('2025-01-15T10:05:00Z');
  });
});
