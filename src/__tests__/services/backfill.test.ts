import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  backfillProject,
  getBackfillStatus,
  clearBackfillStatus,
  type BackfillOptions,
} from '../../services/backfill.js';
import type { BackfillPhase } from '../../types.js';

// Mock Prisma
vi.mock('../../db/client.js', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    commit: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock GitHub client
vi.mock('../../services/github-client.js', () => ({
  listCommits: vi.fn(),
  getCommitDetail: vi.fn(),
  toGitHubCommit: vi.fn(),
}));

import { prisma } from '../../db/client.js';
import { listCommits, getCommitDetail, toGitHubCommit } from '../../services/github-client.js';

const mockProject = {
  id: 'project-1',
  name: 'HerdMate',
  repoFullName: 'whey-cool/herdmate',
  webhookSecret: 'secret',
  apiKey: 'key',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAnalyzedAt: null,
};

const mockApiCommit = {
  sha: 'abc123',
  commit: {
    message: 'feat: add login',
    author: { name: 'Megan', email: 'megan@test.com', date: '2025-01-15T10:00:00Z' },
  },
  author: { login: 'megan' },
};

const mockGitHubCommit = {
  id: 'abc123',
  message: 'feat: add login',
  timestamp: '2025-01-15T10:00:00Z',
  author: { name: 'Megan', email: 'megan@test.com' },
  added: ['src/login.ts'],
  removed: [],
  modified: [],
};

describe('backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBackfillStatus('project-1');
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);
    vi.mocked(toGitHubCommit).mockReturnValue(mockGitHubCommit);
  });

  describe('backfillProject', () => {
    it('should fetch project and parse owner/repo from repoFullName', async () => {
      vi.mocked(listCommits).mockResolvedValue({
        commits: [],
        rateLimit: { remaining: 4999, resetAt: 0 },
      });

      await backfillProject('project-1', 'token-123', {});

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
      expect(listCommits).toHaveBeenCalledWith(
        'whey-cool',
        'herdmate',
        expect.objectContaining({ token: 'token-123' }),
      );
    });

    it('should throw if project not found', async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(backfillProject('nonexistent', 'token', {}))
        .rejects.toThrow('Project not found: nonexistent');
    });

    it('should paginate through all commits until empty page', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        ...mockApiCommit,
        sha: `sha-${i}`,
      }));
      const page2 = [{ ...mockApiCommit, sha: 'sha-100' }];

      vi.mocked(listCommits)
        .mockResolvedValueOnce({ commits: page1, rateLimit: { remaining: 4998, resetAt: 0 } })
        .mockResolvedValueOnce({ commits: page2, rateLimit: { remaining: 4997, resetAt: 0 } })
        .mockResolvedValueOnce({ commits: [], rateLimit: { remaining: 4996, resetAt: 0 } });

      await backfillProject('project-1', 'token', {});

      expect(listCommits).toHaveBeenCalledTimes(3);
      expect(prisma.commit.upsert).toHaveBeenCalledTimes(101);
    });

    it('should classify and upsert each commit', async () => {
      vi.mocked(listCommits).mockResolvedValueOnce({
        commits: [mockApiCommit],
        rateLimit: { remaining: 4999, resetAt: 0 },
      }).mockResolvedValueOnce({
        commits: [],
        rateLimit: { remaining: 4998, resetAt: 0 },
      });

      await backfillProject('project-1', 'token', {});

      expect(toGitHubCommit).toHaveBeenCalledWith(mockApiCommit);
      expect(prisma.commit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_sha: { projectId: 'project-1', sha: 'abc123' },
          },
          create: expect.objectContaining({
            sha: 'abc123',
            projectId: 'project-1',
          }),
        }),
      );
    });

    it('should pass since/until options to listCommits', async () => {
      vi.mocked(listCommits).mockResolvedValue({
        commits: [],
        rateLimit: { remaining: 4999, resetAt: 0 },
      });

      const options: BackfillOptions = {
        since: '2025-01-01T00:00:00Z',
        until: '2025-02-01T00:00:00Z',
      };

      await backfillProject('project-1', 'token', options);

      expect(listCommits).toHaveBeenCalledWith(
        'whey-cool',
        'herdmate',
        expect.objectContaining({
          since: '2025-01-01T00:00:00Z',
          until: '2025-02-01T00:00:00Z',
        }),
      );
    });

    it('should enrich commits with detail API when enrich=true', async () => {
      vi.mocked(listCommits)
        .mockResolvedValueOnce({
          commits: [mockApiCommit],
          rateLimit: { remaining: 4999, resetAt: 0 },
        })
        .mockResolvedValueOnce({
          commits: [],
          rateLimit: { remaining: 4998, resetAt: 0 },
        });

      const enrichedCommit = {
        ...mockApiCommit,
        stats: { additions: 50, deletions: 10 },
        files: [{ filename: 'src/login.ts', status: 'added' as const }],
      };
      vi.mocked(getCommitDetail).mockResolvedValue({
        commit: enrichedCommit,
        rateLimit: { remaining: 4997, resetAt: 0 },
      });
      vi.mocked(toGitHubCommit).mockReturnValue({
        ...mockGitHubCommit,
        added: ['src/login.ts'],
      });

      await backfillProject('project-1', 'token', { enrich: true });

      expect(getCommitDetail).toHaveBeenCalledWith(
        'whey-cool',
        'herdmate',
        'abc123',
        expect.objectContaining({ token: 'token' }),
      );
    });

    it('should track progress during backfill', async () => {
      vi.mocked(listCommits)
        .mockResolvedValueOnce({
          commits: [mockApiCommit, { ...mockApiCommit, sha: 'def456' }],
          rateLimit: { remaining: 4999, resetAt: 0 },
        })
        .mockResolvedValueOnce({
          commits: [],
          rateLimit: { remaining: 4998, resetAt: 0 },
        });

      const jobId = backfillProject('project-1', 'token', {});

      // Wait for completion
      await jobId;

      const status = getBackfillStatus('project-1');
      expect(status).not.toBeNull();
      expect(status!.status).toBe('completed');
      expect(status!.progress?.processed).toBe(2);
    });

    it('should handle errors gracefully and set error status', async () => {
      vi.mocked(listCommits).mockRejectedValue(new Error('GitHub API error 403: rate limit'));

      await expect(backfillProject('project-1', 'token', {}))
        .rejects.toThrow('GitHub API error 403');

      const status = getBackfillStatus('project-1');
      expect(status!.status).toBe('error');
      expect(status!.error).toContain('GitHub API error 403');
    });

    it('should reject concurrent backfills for the same project', async () => {
      // First backfill hangs
      vi.mocked(listCommits).mockImplementation(
        () => new Promise(() => {}), // never resolves
      );

      // Start first backfill (don't await)
      const first = backfillProject('project-1', 'token', {});

      // Give it a tick to start
      await new Promise(resolve => setTimeout(resolve, 0));

      // Second backfill should be rejected
      await expect(backfillProject('project-1', 'token', {}))
        .rejects.toThrow('already in progress');

      // Clean up — we need to make listCommits resolve so the promise settles
      vi.mocked(listCommits).mockResolvedValue({
        commits: [],
        rateLimit: { remaining: 4999, resetAt: 0 },
      });
    });
  });

  describe('getBackfillStatus', () => {
    it('should return null for unknown projects', () => {
      expect(getBackfillStatus('unknown-project')).toBeNull();
    });

    it('should return current status for active backfill', async () => {
      vi.mocked(listCommits)
        .mockResolvedValueOnce({
          commits: [mockApiCommit],
          rateLimit: { remaining: 4999, resetAt: 0 },
        })
        .mockResolvedValueOnce({
          commits: [],
          rateLimit: { remaining: 4998, resetAt: 0 },
        });

      await backfillProject('project-1', 'token', {});

      const status = getBackfillStatus('project-1');
      expect(status).not.toBeNull();
      expect(status!.projectId).toBe('project-1');
      expect(status!.startedAt).not.toBeNull();
    });
  });
});
