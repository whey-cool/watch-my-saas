/**
 * Quality report API routes.
 * GET paginated quality reports for a project.
 */

import { Hono } from 'hono';
import { prisma } from '../db/client.js';

export const reportsRoute = new Hono();

reportsRoute.get('/projects/:id/reports', async (c) => {
  const projectId = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const cursor = c.req.query('cursor');
  const typeFilter = c.req.query('type');

  const where: Record<string, unknown> = { projectId };
  if (typeFilter) {
    where.type = typeFilter;
  }

  const reports = await prisma.qualityReport.findMany({
    where,
    orderBy: { windowEnd: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = reports.length > limit;
  const results = hasMore ? reports.slice(0, limit) : reports;
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

  return c.json({
    data: results.map((r) => ({
      id: r.id,
      type: r.type,
      windowStart: r.windowStart.toISOString(),
      windowEnd: r.windowEnd.toISOString(),
      data: r.data,
    })),
    meta: { limit, hasMore, nextCursor },
  });
});
