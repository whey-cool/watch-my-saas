/**
 * Recommendation API routes.
 * GET recommendations, PATCH status, POST analyze.
 */

import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { analyzeProject } from '../services/recommendations/engine.js';
import type { RecommendationStatus, AccuracyLabel } from '../types.js';

const VALID_STATUSES: readonly RecommendationStatus[] = ['acknowledged', 'dismissed'];
const VALID_FILTER_STATUSES: readonly RecommendationStatus[] = ['active', 'acknowledged', 'dismissed', 'resolved'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const VALID_ACCURACY_LABELS: readonly AccuracyLabel[] = ['true-positive', 'false-positive', 'useful', 'noisy'];

export const recommendationsRoute = new Hono();

recommendationsRoute.get('/projects/:id/recommendations', async (c) => {
  const projectId = c.req.param('id');
  const statusParam = c.req.query('status') ?? 'active';
  const severityParam = c.req.query('severity');

  const statusFilter = VALID_FILTER_STATUSES.includes(statusParam as RecommendationStatus)
    ? statusParam
    : 'active';

  const where: Record<string, unknown> = { projectId, status: statusFilter };
  if (severityParam && VALID_SEVERITIES.includes(severityParam as typeof VALID_SEVERITIES[number])) {
    where.severity = severityParam;
  }

  const recommendations = await prisma.recommendation.findMany({
    where,
    orderBy: { detectedAt: 'desc' },
  });

  return c.json({
    data: recommendations.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      severity: r.severity,
      title: r.title,
      description: r.description,
      evidence: r.evidence,
      nextSteps: r.nextSteps,
      status: r.status,
      accuracy: r.accuracy,
      detectedAt: r.detectedAt.toISOString(),
      acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
      dismissedAt: r.dismissedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    })),
  });
});

recommendationsRoute.patch('/projects/:id/recommendations/:rid', async (c) => {
  const recId = c.req.param('rid');

  let body: { status?: string; accuracy?: string };
  try {
    body = await c.req.json<{ status?: string; accuracy?: string }>();
  } catch {
    return c.json(
      {
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid JSON body',
      },
      400,
    );
  }

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as RecommendationStatus)) {
      return c.json(
        {
          type: 'about:blank',
          status: 400,
          title: 'Bad Request',
          detail: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        400,
      );
    }
    data.status = body.status;
    const timestampField = body.status === 'acknowledged' ? 'acknowledgedAt' : 'dismissedAt';
    data[timestampField] = new Date();
  }

  if (body.accuracy !== undefined) {
    if (!VALID_ACCURACY_LABELS.includes(body.accuracy as AccuracyLabel)) {
      return c.json(
        {
          type: 'about:blank',
          status: 400,
          title: 'Bad Request',
          detail: `Invalid accuracy. Must be one of: ${VALID_ACCURACY_LABELS.join(', ')}`,
        },
        400,
      );
    }
    data.accuracy = body.accuracy;
  }

  if (Object.keys(data).length === 0) {
    return c.json(
      {
        type: 'about:blank',
        status: 400,
        title: 'Bad Request',
        detail: 'Must provide status or accuracy',
      },
      400,
    );
  }

  const updated = await prisma.recommendation.update({
    where: { id: recId },
    data,
  });

  return c.json({
    data: {
      id: updated.id,
      status: updated.status,
      accuracy: updated.accuracy,
    },
  });
});

recommendationsRoute.post('/projects/:id/analyze', async (c) => {
  const projectId = c.req.param('id');

  try {
    const result = await analyzeProject(projectId);

    return c.json({
      phase: result.phase,
      recommendations: result.recommendations,
      windowCount: result.windows.length,
    });
  } catch (error) {
    return c.json(
      {
        type: 'about:blank',
        status: 500,
        title: 'Analysis Failed',
        detail: error instanceof Error ? error.message : 'Internal server error',
      },
      500,
    );
  }
});
