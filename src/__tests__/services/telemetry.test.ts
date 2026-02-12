import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateHeartbeat,
  TELEMETRY_SCHEMA_VERSION,
} from '../../services/telemetry.js';

// Mock Prisma
vi.mock('../../db/client.js', () => ({
  prisma: {
    project: { count: vi.fn() },
    commit: { count: vi.fn() },
  },
}));

import { prisma } from '../../db/client.js';

describe('telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate correct payload schema', async () => {
    vi.mocked(prisma.project.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.commit.count).mockResolvedValueOnce(150);

    const heartbeat = await generateHeartbeat('instance-123', '0.1.0');

    expect(heartbeat.schemaVersion).toBe(TELEMETRY_SCHEMA_VERSION);
    expect(heartbeat.instanceId).toBe('instance-123');
    expect(heartbeat.version).toBe('0.1.0');
    expect(heartbeat.reposConnected).toBe(2);
    expect(heartbeat.totalCommits).toBe(150);
    expect(heartbeat.timestamp).toBeDefined();
  });

  it('should not contain PII in payload', async () => {
    vi.mocked(prisma.project.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.commit.count).mockResolvedValueOnce(50);

    const heartbeat = await generateHeartbeat('instance-456', '0.1.0');
    const serialized = JSON.stringify(heartbeat);

    // No email-like patterns
    expect(serialized).not.toMatch(/@[a-z]+\./i);
    // No URL-like patterns (repo URLs, commit URLs)
    expect(serialized).not.toMatch(/https?:\/\//i);
    // No common name fields
    expect(heartbeat).not.toHaveProperty('email');
    expect(heartbeat).not.toHaveProperty('authorName');
    expect(heartbeat).not.toHaveProperty('repoUrl');
    expect(heartbeat).not.toHaveProperty('commitMessage');
  });

  it('should handle zero repos and commits', async () => {
    vi.mocked(prisma.project.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.commit.count).mockResolvedValueOnce(0);

    const heartbeat = await generateHeartbeat('instance-789', '0.1.0');

    expect(heartbeat.reposConnected).toBe(0);
    expect(heartbeat.totalCommits).toBe(0);
  });
});
