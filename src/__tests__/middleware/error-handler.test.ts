import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { errorHandler, HttpError } from '../../middleware/error-handler.js';

function createTestApp() {
  const app = new Hono();

  app.get('/throw', () => {
    throw new HttpError(422, 'Validation failed', 'The input was invalid');
  });

  app.get('/zod-error', () => {
    throw new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);
  });

  app.get('/unknown-error', () => {
    throw new Error('something broke');
  });

  app.onError(errorHandler);

  return app;
}

describe('error-handler', () => {
  const app = createTestApp();

  it('should return application/problem+json content type', async () => {
    const res = await app.request('/throw');
    expect(res.headers.get('content-type')).toContain('application/problem+json');
  });

  it('should include type, status, title, detail fields', async () => {
    const res = await app.request('/throw');
    const body = await res.json();

    expect(body.type).toBe('about:blank');
    expect(body.status).toBe(422);
    expect(body.title).toBe('Validation failed');
    expect(body.detail).toBe('The input was invalid');
  });

  it('should format ZodError with field-level details', async () => {
    const res = await app.request('/zod-error');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.title).toBe('Validation Error');
    expect(body.errors).toEqual([
      { field: 'email', message: 'Expected string, received number' },
    ]);
  });

  it('should handle unknown errors as 500', async () => {
    const res = await app.request('/unknown-error');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.title).toBe('Internal Server Error');
    // Should not leak error details in production-style response
    expect(body.detail).toBeUndefined();
  });

  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent');

    expect(res.status).toBe(404);
  });
});
