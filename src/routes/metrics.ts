/**
 * Metrics history API route.
 * Returns metric windows computed from commit history.
 */

import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { buildMetricWindows } from '../services/recommendations/metrics.js';
import type { CommitRecord } from '../types.js';

export const metricsRoute = new Hono();

metricsRoute.get('/projects/:id/metrics/history', async (c) => {
  const projectId = c.req.param('id');
  const sinceParam = c.req.query('since');
  const untilParam = c.req.query('until');

  const where: Record<string, unknown> = { projectId };
  if (sinceParam || untilParam) {
    const timestamp: Record<string, Date> = {};
    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (Number.isNaN(sinceDate.getTime())) {
        return c.json(
          { type: 'about:blank', status: 400, title: 'Bad Request', detail: 'Invalid since date' },
          400,
        );
      }
      timestamp.gte = sinceDate;
    }
    if (untilParam) {
      const untilDate = new Date(untilParam);
      if (Number.isNaN(untilDate.getTime())) {
        return c.json(
          { type: 'about:blank', status: 400, title: 'Bad Request', detail: 'Invalid until date' },
          400,
        );
      }
      timestamp.lte = untilDate;
    }
    where.timestamp = timestamp;
  }

  const commits = await prisma.commit.findMany({
    where,
    orderBy: { timestamp: 'asc' },
  });

  const commitRecords: CommitRecord[] = commits.map((c) => ({
    sha: c.sha,
    message: c.message,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    authorType: c.authorType as CommitRecord['authorType'],
    aiTool: c.aiTool,
    category: c.category as CommitRecord['category'],
    filesChanged: c.filesChanged,
    insertions: c.insertions,
    deletions: c.deletions,
    testFilesTouched: c.testFilesTouched,
    typeFilesTouched: c.typeFilesTouched,
    timestamp: c.timestamp,
    projectId: c.projectId,
  }));

  const windows = buildMetricWindows(commitRecords, 7);

  return c.json({
    data: windows.map((w) => ({
      ...w,
      windowStart: w.windowStart.toISOString(),
      windowEnd: w.windowEnd.toISOString(),
    })),
  });
});
