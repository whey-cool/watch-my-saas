import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { errorHandler } from './middleware/error-handler.js';
import { apiKeyAuth } from './middleware/auth.js';
import { healthRoute } from './routes/health.js';
import { webhooksRoute } from './routes/webhooks.js';
import { projectsRoute } from './routes/projects.js';

export interface AppOptions {
  readonly apiKey: string;
  readonly dashboardEnabled?: boolean;
}

export function createApp(options: AppOptions) {
  const app = new Hono();

  // Error handler
  app.onError(errorHandler);

  // No-auth routes (health + webhooks)
  app.route('/api', healthRoute);
  app.route('/api', webhooksRoute);

  // Auth middleware for remaining /api/* routes
  app.use('/api/*', apiKeyAuth(options.apiKey));

  // Protected routes
  app.route('/api', projectsRoute);

  // Dashboard SPA (feature-flagged)
  if (options.dashboardEnabled) {
    app.use('/*', serveStatic({ root: './dashboard/dist' }));
    // SPA fallback — serve index.html for client-side routing
    app.get('*', serveStatic({ root: './dashboard/dist', path: 'index.html' }));
  }

  // 404 fallback
  app.notFound((c) => {
    return c.json(
      {
        type: 'about:blank',
        status: 404,
        title: 'Not Found',
      },
      404,
    );
  });

  return app;
}
