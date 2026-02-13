/**
 * Milestones API routes.
 * GET list, POST create.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db/client.js';

const VALID_TYPES = [
  'tool-transition',
  'velocity-shift',
  'quality-signal',
  'structural-change',
  'gap-recovery',
] as const;

const createMilestoneSchema = z.object({
  type: z.enum(VALID_TYPES),
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const milestonesRoute = new Hono();

milestonesRoute.get('/projects/:id/milestones', async (c) => {
  const projectId = c.req.param('id');
  const typeParam = c.req.query('type');
  const limitParam = c.req.query('limit');

  const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
  const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(parsedLimit, 100);

  const where: Record<string, unknown> = { projectId };
  if (typeParam && VALID_TYPES.includes(typeParam as typeof VALID_TYPES[number])) {
    where.type = typeParam;
  }

  const milestones = await prisma.milestone.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return c.json({
    data: milestones.map((m) => ({
      id: m.id,
      type: m.type,
      category: m.category,
      title: m.title,
      description: m.description,
      timestamp: m.timestamp.toISOString(),
      published: m.published,
    })),
  });
});

milestonesRoute.post('/projects/:id/milestones', async (c) => {
  const projectId = c.req.param('id');

  let body: z.infer<typeof createMilestoneSchema>;
  try {
    const raw = await c.req.json();
    body = createMilestoneSchema.parse(raw);
  } catch (error) {
    return c.json(
      {
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid request body. Required: type, category, title, timestamp',
      },
      400,
    );
  }

  const milestone = await prisma.milestone.create({
    data: {
      type: body.type,
      category: body.category,
      title: body.title,
      description: body.description ?? null,
      timestamp: new Date(body.timestamp),
      projectId,
    },
  });

  return c.json(
    {
      data: {
        id: milestone.id,
        type: milestone.type,
        category: milestone.category,
        title: milestone.title,
        description: milestone.description,
        timestamp: milestone.timestamp.toISOString(),
        published: milestone.published,
      },
    },
    201,
  );
});
