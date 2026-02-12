import type { GitHubPushPayload } from '../../types.js';

export function createPushPayload(
  overrides: Partial<GitHubPushPayload> & { commits?: any[] } = {},
): GitHubPushPayload {
  return {
    ref: 'refs/heads/main',
    repository: { full_name: 'whey-cool/herdmate' },
    head_commit: null,
    commits: [],
    ...overrides,
  };
}

export const humanCommit = {
  id: 'abc123',
  message: 'fix: resolve null pointer in user service',
  timestamp: '2026-01-15T10:30:00Z',
  author: {
    name: 'Megan Developer',
    email: 'megan@example.com',
  },
  added: [],
  removed: [],
  modified: ['src/services/user.ts'],
} as const;

export const claudeCommit = {
  id: 'def456',
  message: 'feat: add webhook validation\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>',
  timestamp: '2026-01-15T11:00:00Z',
  author: {
    name: 'Megan Developer',
    email: 'megan@example.com',
  },
  added: ['src/routes/webhooks.ts', 'src/__tests__/routes/webhooks.test.ts'],
  removed: [],
  modified: ['src/app.ts'],
} as const;

export const copilotCommit = {
  id: 'ghi789',
  message: 'refactor: simplify error handling\n\nCo-Authored-By: Copilot <noreply@github.com>',
  timestamp: '2026-01-15T12:00:00Z',
  author: {
    name: 'Megan Developer',
    email: 'megan@example.com',
  },
  added: [],
  removed: [],
  modified: ['src/middleware/error-handler.ts'],
} as const;

export const cursorCommit = {
  id: 'jkl012',
  message: 'feat: add dashboard layout',
  timestamp: '2026-01-15T13:00:00Z',
  author: {
    name: 'Cursor Agent',
    email: 'cursoragent@cursor.com',
  },
  added: ['dashboard/src/Layout.tsx'],
  removed: [],
  modified: [],
} as const;

export const dependabotCommit = {
  id: 'mno345',
  message: 'chore(deps): bump hono from 4.6.0 to 4.7.0',
  timestamp: '2026-01-15T14:00:00Z',
  author: {
    name: 'dependabot[bot]',
    email: 'dependabot[bot]@users.noreply.github.com',
  },
  added: [],
  removed: [],
  modified: ['package.json', 'package-lock.json'],
} as const;

export const multiCommitPush = createPushPayload({
  commits: [humanCommit, claudeCommit, copilotCommit],
  head_commit: copilotCommit as any,
});

export const pingPayload = {}; // GitHub ping events have no commits
