import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import type { HealthResponse } from '../types.js';

export const healthRoute = new Hono();

healthRoute.get('/health', async (c) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    // Database unreachable
  }

  const response: HealthResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    version: process.env.npm_package_version ?? '0.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };

  const status = dbStatus === 'connected' ? 200 : 503;
  return c.json(response, status as any);
});
