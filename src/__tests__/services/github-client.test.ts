import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listCommits,
  getCommitDetail,
  toGitHubCommit,
  parseRateLimitHeaders,
} from '../../services/github-client.js';

describe('github-client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  describe('listCommits', () => {
    it('should fetch commits from GitHub API with correct URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            sha: 'abc123',
            commit: {
              message: 'feat: add login',
              author: { name: 'Megan', email: 'megan@test.com', date: '2025-01-15T10:00:00Z' },
            },
            author: { login: 'megan' },
          },
        ]),
        headers: new Headers({
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1700000000',
        }),
      };
      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await listCommits('whey-cool', 'herdmate', {});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/repos/whey-cool/herdmate/commits'),
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/vnd.github+json' }),
        }),
      );
      expect(result.commits).toHaveLength(1);
      expect(result.commits[0].sha).toBe('abc123');
    });

    it('should include Authorization header when token is provided', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
      });

      await listCommits('whey-cool', 'herdmate', { token: 'ghp_test123' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer ghp_test123' }),
        }),
      );
    });

    it('should paginate using per_page and page params', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
      });

      await listCommits('whey-cool', 'herdmate', { page: 3, perPage: 50 });

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('page=3');
      expect(url).toContain('per_page=50');
    });

    it('should pass since and until params when provided', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
      });

      await listCommits('whey-cool', 'herdmate', {
        since: '2025-01-01T00:00:00Z',
        until: '2025-02-01T00:00:00Z',
      });

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain('since=2025-01-01T00%3A00%3A00Z');
      expect(url).toContain('until=2025-02-01T00%3A00%3A00Z');
    });

    it('should throw on non-OK response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ message: 'rate limit exceeded' }),
        headers: new Headers({}),
      });

      await expect(listCommits('whey-cool', 'herdmate', {}))
        .rejects.toThrow('GitHub API error 403');
    });

    it('should return rate limit info', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        headers: new Headers({
          'x-ratelimit-remaining': '42',
          'x-ratelimit-reset': '1700000000',
        }),
      });

      const result = await listCommits('whey-cool', 'herdmate', {});
      expect(result.rateLimit.remaining).toBe(42);
      expect(result.rateLimit.resetAt).toBe(1700000000);
    });
  });

  describe('getCommitDetail', () => {
    it('should fetch individual commit with file data', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          sha: 'abc123',
          commit: {
            message: 'feat: add login',
            author: { name: 'Megan', email: 'megan@test.com', date: '2025-01-15T10:00:00Z' },
          },
          author: { login: 'megan' },
          stats: { additions: 50, deletions: 10 },
          files: [
            { filename: 'src/login.ts', status: 'added' },
            { filename: 'src/auth.ts', status: 'modified' },
            { filename: 'src/old.ts', status: 'removed' },
          ],
        }),
        headers: new Headers({ 'x-ratelimit-remaining': '4998' }),
      });

      const result = await getCommitDetail('whey-cool', 'herdmate', 'abc123', {});

      expect(result.commit.sha).toBe('abc123');
      expect(result.commit.stats.additions).toBe(50);
      expect(result.commit.stats.deletions).toBe(10);
      expect(result.commit.files).toHaveLength(3);
    });

    it('should throw on non-OK response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Not Found' }),
        headers: new Headers({}),
      });

      await expect(getCommitDetail('whey-cool', 'herdmate', 'bad-sha', {}))
        .rejects.toThrow('GitHub API error 404');
    });
  });

  describe('toGitHubCommit', () => {
    it('should convert list API response to GitHubCommit shape', () => {
      const apiCommit = {
        sha: 'abc123',
        commit: {
          message: 'feat: add login\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>',
          author: { name: 'Megan', email: 'megan@test.com', date: '2025-01-15T10:00:00Z' },
        },
        author: { login: 'megan' },
      };

      const result = toGitHubCommit(apiCommit);

      expect(result.id).toBe('abc123');
      expect(result.message).toBe(apiCommit.commit.message);
      expect(result.timestamp).toBe('2025-01-15T10:00:00Z');
      expect(result.author.name).toBe('Megan');
      expect(result.author.email).toBe('megan@test.com');
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.modified).toEqual([]);
    });

    it('should convert detail API response with files to GitHubCommit shape', () => {
      const apiCommit = {
        sha: 'def456',
        commit: {
          message: 'fix: auth bug',
          author: { name: 'Megan', email: 'megan@test.com', date: '2025-01-16T10:00:00Z' },
        },
        author: { login: 'megan' },
        files: [
          { filename: 'src/login.ts', status: 'added' as const },
          { filename: 'src/auth.ts', status: 'modified' as const },
          { filename: 'src/old.ts', status: 'removed' as const },
          { filename: 'src/rename.ts', status: 'renamed' as const },
        ],
        stats: { additions: 30, deletions: 5 },
      };

      const result = toGitHubCommit(apiCommit);

      expect(result.id).toBe('def456');
      expect(result.added).toEqual(['src/login.ts']);
      expect(result.modified).toEqual(['src/auth.ts', 'src/rename.ts']);
      expect(result.removed).toEqual(['src/old.ts']);
    });
  });

  describe('parseRateLimitHeaders', () => {
    it('should parse rate limit headers', () => {
      const headers = new Headers({
        'x-ratelimit-remaining': '42',
        'x-ratelimit-reset': '1700000000',
      });

      const result = parseRateLimitHeaders(headers);

      expect(result.remaining).toBe(42);
      expect(result.resetAt).toBe(1700000000);
    });

    it('should default to 0 when headers are missing', () => {
      const headers = new Headers({});

      const result = parseRateLimitHeaders(headers);

      expect(result.remaining).toBe(0);
      expect(result.resetAt).toBe(0);
    });
  });
});
