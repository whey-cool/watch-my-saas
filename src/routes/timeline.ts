/**
 * Timeline API route.
 * GET chronological events for a project (recommendations, milestones, reports, phase changes).
 * API-only in Session 5; visual timeline in Session 6.
 */

import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import type { TimelineEvent } from '../types.js';

export const timelineRoute = new Hono();

timelineRoute.get('/projects/:id/timeline', async (c) => {
  const projectId = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);

  const [recommendations, milestones, reports] = await Promise.all([
    prisma.recommendation.findMany({
      where: { projectId },
      orderBy: { detectedAt: 'desc' },
      take: limit,
      select: {
        id: true, pattern: true, title: true, description: true,
        severity: true, status: true, detectedAt: true,
      },
    }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true, type: true, title: true, description: true,
        category: true, timestamp: true,
      },
    }),
    prisma.qualityReport.findMany({
      where: { projectId },
      orderBy: { windowEnd: 'desc' },
      take: limit,
      select: { id: true, type: true, windowStart: true, windowEnd: true },
    }),
  ]);

  const events: TimelineEvent[] = [
    ...recommendations.map((r) => ({
      id: r.id,
      type: 'recommendation' as const,
      title: r.title,
      description: r.description,
      timestamp: r.detectedAt.toISOString(),
      metadata: { pattern: r.pattern, severity: r.severity, status: r.status },
    })),
    ...milestones.map((m) => ({
      id: m.id,
      type: 'milestone' as const,
      title: m.title,
      description: m.description ?? '',
      timestamp: m.timestamp.toISOString(),
      metadata: { milestoneType: m.type, category: m.category },
    })),
    ...reports.map((r) => ({
      id: r.id,
      type: 'report' as const,
      title: `${r.type} report`,
      description: `${r.windowStart.toISOString().split('T')[0]} — ${r.windowEnd.toISOString().split('T')[0]}`,
      timestamp: r.windowEnd.toISOString(),
      metadata: { reportType: r.type },
    })),
  ];

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json({ data: events.slice(0, limit) });
});
