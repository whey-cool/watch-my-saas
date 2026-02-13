// Health
export const healthOk = {
  status: 'ok' as const,
  version: '0.1.0',
  database: 'connected' as const,
  timestamp: '2026-02-12T10:00:00Z',
};

export const healthDegraded = {
  status: 'degraded' as const,
  version: '0.1.0',
  database: 'disconnected' as const,
  timestamp: '2026-02-12T10:00:00Z',
};

// Projects
export const projectsList = {
  data: [
    {
      id: 'proj-1',
      name: 'herdmate',
      repoFullName: 'whey-cool/herdmate',
      commitCount: 1223,
      lastCommitAt: '2026-02-10T15:30:00Z',
    },
    {
      id: 'proj-2',
      name: 'watch-my-saas',
      repoFullName: 'whey-cool/watch-my-saas',
      commitCount: 87,
      lastCommitAt: '2026-02-12T09:00:00Z',
    },
  ],
};

export const emptyProjectsList = { data: [] };

// Project Overview
export const projectOverview = {
  data: {
    id: 'proj-1',
    name: 'herdmate',
    repoFullName: 'whey-cool/herdmate',
    phase: {
      phase: 'Building',
      confidence: 0.85,
      signals: ['High AI ratio', 'Steady velocity'],
      guidance: 'Focus on shipping features. AI augmentation is effective.',
    },
    aiRatio: { current: 0.64, previous: 0.58, direction: 'up' as const, changePercent: 10.3 },
    velocity: { current: 42, previous: 38, direction: 'up' as const, changePercent: 10.5 },
    qualitySignal: { current: 0.82, previous: 0.79, direction: 'up' as const, changePercent: 3.8 },
    stabilityIndex: { current: 0.15, previous: 0.18, direction: 'down' as const, changePercent: -16.7 },
    activeRecommendations: 3,
    commitCount: 1223,
    lastCommitAt: '2026-02-10T15:30:00Z',
    lastAnalyzedAt: '2026-02-10T16:00:00Z',
  },
};

// Recommendations
export const activeRecommendations = {
  data: [
    {
      id: 'rec-1',
      pattern: 'sprint-drift' as const,
      severity: 'high' as const,
      title: 'Sprint-drift cycle detected in recent commits',
      description: 'AI-generated code followed by cleanup commits suggests a drift pattern.',
      evidence: {
        commits: ['abc1234', 'def5678', 'ghi9012'],
        files: ['src/services/webhook-processor.ts', 'src/routes/webhooks.ts'],
        metrics: { aiRatio: 0.72, churnRate: 0.35 },
      },
      nextSteps: [
        'Review AI-generated code before committing',
        'Break large AI tasks into smaller chunks',
      ],
      status: 'active' as const,
      accuracy: null,
      detectedAt: '2026-02-09T12:00:00Z',
      acknowledgedAt: null,
      dismissedAt: null,
      resolvedAt: null,
    },
  ],
};

export const emptyRecommendations = { data: [] };

// Backfill
export const backfillIdle = {
  projectId: 'proj-1',
  status: 'completed' as const,
  progress: { phase: 'completed', processed: 500, total: 500, message: 'Done' },
  startedAt: '2026-02-08T10:00:00Z',
  completedAt: '2026-02-08T10:05:00Z',
  error: null,
};

export const backfillInProgress = {
  projectId: 'proj-1',
  status: 'listing' as const,
  progress: { phase: 'listing', processed: 250, total: 500, message: 'Fetching page 3...' },
  startedAt: '2026-02-12T10:00:00Z',
  completedAt: null,
  error: null,
};
