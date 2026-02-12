import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import type { ProblemDetails } from '../types.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
  ) {
    super(title);
    this.name = 'HttpError';
  }
}

function problemResponse(c: Parameters<ErrorHandler>[1], problem: ProblemDetails) {
  return c.body(JSON.stringify(problem), {
    status: problem.status as any,
    headers: { 'content-type': 'application/problem+json' },
  });
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return problemResponse(c, {
      type: 'about:blank',
      status: 400,
      title: 'Validation Error',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return problemResponse(c, {
      type: 'about:blank',
      status: err.status,
      title: err.title,
      detail: err.detail,
    });
  }

  // Unknown errors — don't leak details
  return problemResponse(c, {
    type: 'about:blank',
    status: 500,
    title: 'Internal Server Error',
  });
};
