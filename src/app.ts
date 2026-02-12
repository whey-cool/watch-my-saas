import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler.js';
import { apiKeyAuth } from './middleware/auth.js';
import { healthRoute } from './routes/health.js';
import { webhooksRoute } from './routes/webhooks.js';
import { projectsRoute } from './routes/projects.js';

export interface AppOptions {
  readonly apiKey: string;
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
