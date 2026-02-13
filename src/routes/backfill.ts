/**
 * Backfill API routes.
 * POST trigger backfill, GET poll status.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { backfillProject, getBackfillStatus } from '../services/backfill.js';

const backfillBodySchema = z.object({
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  enrich: z.boolean().optional(),
  token: z.string().optional(),
});

export const backfillRoute = new Hono();

backfillRoute.post('/projects/:id/backfill', async (c) => {
  const projectId = c.req.param('id');

  let body: z.infer<typeof backfillBodySchema>;
  try {
    const raw = await c.req.json();
    body = backfillBodySchema.parse(raw);
  } catch {
    return c.json(
      {
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid request body',
      },
      400,
    );
  }

  // Check for concurrent backfill
  const existing = getBackfillStatus(projectId);
  if (existing && (existing.status === 'listing' || existing.status === 'enriching')) {
    return c.json(
      {
        type: 'about:blank',
        status: 409,
        title: 'Conflict',
        detail: `Backfill already in progress for project ${projectId}`,
      },
      409,
    );
  }

  const token = body.token ?? process.env.GITHUB_TOKEN;
  if (!token) {
    return c.json(
      {
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'GitHub token required. Provide token in request body or set GITHUB_TOKEN env var.',
      },
      400,
    );
  }

  // Fire and forget — client polls status endpoint
  backfillProject(projectId, token, {
    since: body.since,
    until: body.until,
    enrich: body.enrich,
  }).catch(() => {
    // Error state tracked in job map
  });

  return c.json({ message: 'Backfill started', projectId }, 202);
});

backfillRoute.get('/projects/:id/backfill/status', (c) => {
  const projectId = c.req.param('id');
  const status = getBackfillStatus(projectId);

  if (!status) {
    return c.json(
      {
        type: 'about:blank',
        status: 404,
        title: 'Not Found',
        detail: 'No backfill job found for this project',
      },
      404,
    );
  }

  return c.json(status);
});
