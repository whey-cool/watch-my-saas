import type { MiddlewareHandler } from 'hono';

const SKIP_AUTH_PATHS = ['/api/health', '/api/webhooks/github'];

export function apiKeyAuth(apiKey: string): MiddlewareHandler {
  return async (c, next) => {
    if (SKIP_AUTH_PATHS.includes(c.req.path)) {
      return next();
    }

    const header = c.req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json(
        {
          type: 'about:blank',
          status: 401,
          title: 'Unauthorized',
          detail: 'Missing or invalid Authorization header',
        },
        { status: 401, headers: { 'content-type': 'application/problem+json' } },
      );
    }

    const token = header.slice(7);
    if (token !== apiKey) {
      return c.json(
        {
          type: 'about:blank',
          status: 401,
          title: 'Unauthorized',
          detail: 'Invalid API key',
        },
        { status: 401, headers: { 'content-type': 'application/problem+json' } },
      );
    }

    return next();
  };
}
