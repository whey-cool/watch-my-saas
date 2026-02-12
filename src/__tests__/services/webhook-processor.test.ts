import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processWebhook } from '../../services/webhook-processor.js';
import { humanCommit, claudeCommit, copilotCommit } from '../fixtures/webhook-payloads.js';
import type { GitHubPushPayload } from '../../types.js';

// Mock Prisma
vi.mock('../../db/client.js', () => ({
  prisma: {
    commit: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from '../../db/client.js';

describe('processWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process push payload into classified commits', async () => {
    const payload: GitHubPushPayload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'whey-cool/herdmate' },
      commits: [humanCommit, claudeCommit],
      head_commit: claudeCommit as any,
    };

    const result = await processWebhook(payload, 'project-123');

    expect(result.processed).toBe(2);
    expect(prisma.commit.upsert).toHaveBeenCalledTimes(2);
  });

  it('should count author types correctly', async () => {
    const payload: GitHubPushPayload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'whey-cool/herdmate' },
      commits: [humanCommit, claudeCommit, copilotCommit],
      head_commit: copilotCommit as any,
    };

    const result = await processWebhook(payload, 'project-123');

    expect(result.processed).toBe(3);
    expect(result.authorTypes.human).toBe(1);
    expect(result.authorTypes.ai).toBe(2);
    expect(result.authorTypes.bot).toBe(0);
  });

  it('should handle empty commits array', async () => {
    const payload: GitHubPushPayload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'whey-cool/herdmate' },
      commits: [],
      head_commit: null,
    };

    const result = await processWebhook(payload, 'project-123');

    expect(result.processed).toBe(0);
    expect(prisma.commit.upsert).not.toHaveBeenCalled();
  });

  it('should upsert commits for idempotent webhook re-delivery', async () => {
    const payload: GitHubPushPayload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'whey-cool/herdmate' },
      commits: [humanCommit],
      head_commit: humanCommit as any,
    };

    await processWebhook(payload, 'project-123');

    const upsertCall = vi.mocked(prisma.commit.upsert).mock.calls[0][0];
    expect(upsertCall).toHaveProperty('where');
    expect(upsertCall).toHaveProperty('create');
    expect(upsertCall).toHaveProperty('update');
  });
});
