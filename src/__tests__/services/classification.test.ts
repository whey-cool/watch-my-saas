import { describe, it, expect } from 'vitest';
import {
  detectAuthorType,
  classifyCategory,
  extractQualitySignals,
  classifyCommit,
} from '../../services/classification.js';
import { knownCommits } from '../fixtures/known-commits.js';
import type { GitHubCommit } from '../../types.js';

describe('detectAuthorType', () => {
  it('should detect Claude Sonnet from Co-Authored-By', () => {
    const result = detectAuthorType(
      'feat: add stuff\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>',
      'Megan',
      'megan@example.com',
    );
    expect(result.authorType).toBe('ai');
    expect(result.aiTool).toBe('Claude Sonnet 4.5');
  });

  it('should detect Claude Opus from Co-Authored-By', () => {
    const result = detectAuthorType(
      'feat: thing\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>',
      'Megan',
      'megan@example.com',
    );
    expect(result.authorType).toBe('ai');
    expect(result.aiTool).toBe('Claude Opus 4.6');
  });

  it('should detect Claude Code from Co-Authored-By', () => {
    const result = detectAuthorType(
      'fix: bug\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>',
      'Megan',
      'megan@example.com',
    );
    expect(result.authorType).toBe('ai');
    expect(result.aiTool).toBe('Claude Code');
  });

  it('should detect Copilot from Co-Authored-By', () => {
    const result = detectAuthorType(
      'refactor: simplify\n\nCo-Authored-By: Copilot <noreply@github.com>',
      'Megan',
      'megan@example.com',
    );
    expect(result.authorType).toBe('ai');
    expect(result.aiTool).toBe('GitHub Copilot');
  });

  it('should detect Cursor Agent from author email', () => {
    const result = detectAuthorType(
      'feat: add layout',
      'Cursor Agent',
      'cursoragent@cursor.com',
    );
    expect(result.authorType).toBe('ai');
    expect(result.aiTool).toBe('Cursor Agent');
  });

  it('should detect dependabot as bot', () => {
    const result = detectAuthorType(
      'chore(deps): bump hono',
      'dependabot[bot]',
      'dependabot[bot]@users.noreply.github.com',
    );
    expect(result.authorType).toBe('bot');
    expect(result.aiTool).toBeNull();
  });

  it('should detect github-actions as bot', () => {
    const result = detectAuthorType(
      'ci: update workflow',
      'github-actions[bot]',
      'github-actions[bot]@users.noreply.github.com',
    );
    expect(result.authorType).toBe('bot');
    expect(result.aiTool).toBeNull();
  });

  it('should default to human with no AI signals', () => {
    const result = detectAuthorType(
      'fix: resolve null pointer',
      'Megan Developer',
      'megan@example.com',
    );
    expect(result.authorType).toBe('human');
    expect(result.aiTool).toBeNull();
  });

  it('should handle empty message', () => {
    const result = detectAuthorType('', 'Megan', 'megan@example.com');
    expect(result.authorType).toBe('human');
  });
});

describe('classifyCategory', () => {
  it('should parse conventional commit prefixes', () => {
    expect(classifyCategory('feat: add new feature')).toBe('feat');
    expect(classifyCategory('fix: resolve bug')).toBe('fix');
    expect(classifyCategory('refactor: clean up code')).toBe('refactor');
    expect(classifyCategory('docs: update readme')).toBe('docs');
    expect(classifyCategory('test: add unit tests')).toBe('test');
    expect(classifyCategory('chore: update deps')).toBe('chore');
    expect(classifyCategory('ci: add workflow')).toBe('ci');
    expect(classifyCategory('perf: optimize query')).toBe('perf');
  });

  it('should handle scoped conventional commits', () => {
    expect(classifyCategory('feat(auth): add login')).toBe('feat');
    expect(classifyCategory('chore(deps): bump hono')).toBe('chore');
  });

  it('should default to other for non-conventional messages', () => {
    expect(classifyCategory('initial commit')).toBe('other');
    expect(classifyCategory('WIP')).toBe('other');
    expect(classifyCategory('stuff')).toBe('other');
  });
});

describe('extractQualitySignals', () => {
  it('should count test files', () => {
    const signals = extractQualitySignals([
      'src/__tests__/auth.test.ts',
      'src/auth.ts',
      'src/__tests__/health.test.ts',
    ]);
    expect(signals.testFilesTouched).toBe(2);
  });

  it('should count type files', () => {
    const signals = extractQualitySignals([
      'src/types.ts',
      'src/interfaces.d.ts',
    ]);
    expect(signals.typeFilesTouched).toBe(2);
  });

  it('should count docs files', () => {
    const signals = extractQualitySignals([
      'README.md',
      'docs/guide.md',
      'CHANGELOG.md',
    ]);
    expect(signals.docsFilesTouched).toBe(3);
  });

  it('should count config files', () => {
    const signals = extractQualitySignals([
      'tsconfig.json',
      'package.json',
      '.env.example',
    ]);
    expect(signals.configFilesTouched).toBe(3);
  });

  it('should handle empty file list', () => {
    const signals = extractQualitySignals([]);
    expect(signals.testFilesTouched).toBe(0);
    expect(signals.typeFilesTouched).toBe(0);
    expect(signals.docsFilesTouched).toBe(0);
    expect(signals.configFilesTouched).toBe(0);
  });
});

describe('classifyCommit (integration with known commits)', () => {
  it.each(knownCommits)(
    'should classify "$message" as $expectedAuthorType/$expectedCategory',
    (known) => {
      const ghCommit: GitHubCommit = {
        id: 'test-sha',
        message: known.message,
        timestamp: '2026-01-15T10:00:00Z',
        author: {
          name: known.authorName,
          email: known.authorEmail,
        },
        added: known.files.filter(() => true) as string[],
        removed: [],
        modified: [],
      };

      const result = classifyCommit(ghCommit);

      expect(result.authorType).toBe(known.expectedAuthorType);
      expect(result.aiTool).toBe(known.expectedAiTool);
      expect(result.category).toBe(known.expectedCategory);
    },
  );
});
