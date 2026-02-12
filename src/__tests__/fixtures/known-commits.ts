/**
 * Known commits with expected classification results.
 * Ported from archaeology ground truth (validated on 1223 commits).
 */

import type { AuthorType, CommitCategory } from '../../types.js';

interface ExpectedClassification {
  readonly message: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly expectedAuthorType: AuthorType;
  readonly expectedAiTool: string | null;
  readonly expectedCategory: CommitCategory;
  readonly files: readonly string[];
}

export const knownCommits: readonly ExpectedClassification[] = [
  // --- Human commits ---
  {
    message: 'fix: resolve null pointer in user service',
    authorName: 'Megan Developer',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'human',
    expectedAiTool: null,
    expectedCategory: 'fix',
    files: ['src/services/user.ts'],
  },
  {
    message: 'initial commit',
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    expectedAuthorType: 'human',
    expectedAiTool: null,
    expectedCategory: 'other',
    files: ['README.md'],
  },

  // --- AI commits (Co-Authored-By) ---
  {
    message: 'feat: add webhook validation\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>',
    authorName: 'Megan Developer',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'ai',
    expectedAiTool: 'Claude Sonnet 4.5',
    expectedCategory: 'feat',
    files: ['src/routes/webhooks.ts'],
  },
  {
    message: 'refactor: simplify auth\n\nCo-Authored-By: Copilot <noreply@github.com>',
    authorName: 'Megan Developer',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'ai',
    expectedAiTool: 'GitHub Copilot',
    expectedCategory: 'refactor',
    files: ['src/middleware/auth.ts'],
  },
  {
    message: 'feat: add layout\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>',
    authorName: 'Megan Developer',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'ai',
    expectedAiTool: 'Claude Opus 4.6',
    expectedCategory: 'feat',
    files: ['src/layout.ts'],
  },
  {
    message: 'docs: update readme\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>',
    authorName: 'Megan Developer',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'ai',
    expectedAiTool: 'Claude Code',
    expectedCategory: 'docs',
    files: ['README.md'],
  },

  // --- AI commits (author identity) ---
  {
    message: 'feat: add dashboard layout',
    authorName: 'Cursor Agent',
    authorEmail: 'cursoragent@cursor.com',
    expectedAuthorType: 'ai',
    expectedAiTool: 'Cursor Agent',
    expectedCategory: 'feat',
    files: ['dashboard/src/Layout.tsx'],
  },

  // --- Bot commits ---
  {
    message: 'chore(deps): bump hono from 4.6.0 to 4.7.0',
    authorName: 'dependabot[bot]',
    authorEmail: 'dependabot[bot]@users.noreply.github.com',
    expectedAuthorType: 'bot',
    expectedAiTool: null,
    expectedCategory: 'chore',
    files: ['package.json', 'package-lock.json'],
  },
  {
    message: 'ci: update workflow',
    authorName: 'github-actions[bot]',
    authorEmail: 'github-actions[bot]@users.noreply.github.com',
    expectedAuthorType: 'bot',
    expectedAiTool: null,
    expectedCategory: 'ci',
    files: ['.github/workflows/ci.yml'],
  },

  // --- Category detection ---
  {
    message: 'test: add classification tests',
    authorName: 'Megan',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'human',
    expectedAiTool: null,
    expectedCategory: 'test',
    files: ['src/__tests__/services/classification.test.ts'],
  },
  {
    message: 'perf: optimize query with index',
    authorName: 'Megan',
    authorEmail: 'megan@example.com',
    expectedAuthorType: 'human',
    expectedAiTool: null,
    expectedCategory: 'perf',
    files: ['prisma/schema.prisma'],
  },
];
