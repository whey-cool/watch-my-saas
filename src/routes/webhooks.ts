import { createHmac, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { processWebhook } from '../services/webhook-processor.js';
import type { GitHubPushPayload } from '../types.js';

export const webhooksRoute = new Hono();

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

webhooksRoute.post('/webhooks/github', async (c) => {
  const event = c.req.header('x-github-event');

  // Handle ping (no auth needed)
  if (event === 'ping') {
    return c.json({ message: 'pong' });
  }

  const signature = c.req.header('x-hub-signature-256');
  if (!signature) {
    return c.json(
      { type: 'about:blank', status: 401, title: 'Unauthorized', detail: 'Missing signature' },
      401,
    );
  }

  // Read body as text for HMAC verification
  const rawBody = await c.req.text();
  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json(
      { type: 'about:blank', status: 400, title: 'Bad Request', detail: 'Invalid JSON' },
      400,
    );
  }

  // Find project by repo name
  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    return c.json(
      { type: 'about:blank', status: 400, title: 'Bad Request', detail: 'Missing repository' },
      400,
    );
  }

  const project = await prisma.project.findUnique({
    where: { repoFullName },
    select: { id: true, webhookSecret: true },
  });

  if (!project) {
    return c.json(
      { type: 'about:blank', status: 404, title: 'Not Found', detail: 'Unknown repository' },
      404,
    );
  }

  // Verify HMAC signature
  if (!verifySignature(rawBody, signature, project.webhookSecret)) {
    return c.json(
      { type: 'about:blank', status: 401, title: 'Unauthorized', detail: 'Invalid signature' },
      401,
    );
  }

  // Only process push events
  if (event !== 'push') {
    return c.json({ message: `Event '${event}' ignored` });
  }

  const result = await processWebhook(payload, project.id);
  return c.json(result);
});
