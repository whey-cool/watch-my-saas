import { Hono } from 'hono';
import { prisma } from '../db/client.js';
import { buildMetricWindows, calculateTrend } from '../services/recommendations/metrics.js';
import { detectPhase } from '../services/recommendations/phase-detector.js';
import type { CommitRecord } from '../types.js';

export const projectsRoute = new Hono();

projectsRoute.get('/projects/:id', async (c) => {
  const projectId = c.req.param('id');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { commits: true } } },
  });

  if (!project) {
    return c.json(
      { type: 'about:blank', status: 404, title: 'Not Found', detail: 'Project not found' },
      404,
    );
  }

  const activeRecs = await prisma.recommendation.count({
    where: { projectId, status: 'active' },
  });

  // Fetch recent commits for metrics
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - 12 * 7);

  const dbCommits = await prisma.commit.findMany({
    where: { projectId, timestamp: { gte: lookbackStart } },
    orderBy: { timestamp: 'asc' },
  });

  const commits: readonly CommitRecord[] = dbCommits.map((c) => ({
    sha: c.sha,
    message: c.message,
    authorName: c.authorName,
    authorEmail: c.authorEmail,
    authorType: c.authorType as CommitRecord['authorType'],
    aiTool: c.aiTool,
    category: c.category as CommitRecord['category'],
    filesChanged: c.filesChanged,
    insertions: c.insertions,
    deletions: c.deletions,
    testFilesTouched: c.testFilesTouched,
    typeFilesTouched: c.typeFilesTouched,
    timestamp: c.timestamp,
    projectId: c.projectId,
  }));

  const windows = buildMetricWindows(commits, 7);
  const current = windows.length > 0 ? windows[windows.length - 1] : null;
  const previous = windows.length > 1 ? windows[windows.length - 2] : null;
  const history = windows.length > 1 ? windows.slice(0, -1) : [];

  const phase = current ? detectPhase(current, history) : {
    phase: 'building' as const,
    confidence: 0,
    signals: [],
    guidance: 'No commit data yet.',
  };

  const lastCommit = dbCommits.length > 0 ? dbCommits[dbCommits.length - 1] : null;

  return c.json({
    data: {
      id: project.id,
      name: project.name,
      repoFullName: project.repoFullName,
      phase,
      aiRatio: calculateTrend(
        current?.aiRatio ?? 0,
        previous?.aiRatio ?? 0,
      ),
      velocity: calculateTrend(
        current?.totalCommits ?? 0,
        previous?.totalCommits ?? 0,
      ),
      qualitySignal: calculateTrend(
        current?.testRatio ?? 0,
        previous?.testRatio ?? 0,
      ),
      stabilityIndex: calculateTrend(
        current ? (current.fixCommits + current.refactorCommits) / Math.max(current.totalCommits, 1) : 0,
        previous ? (previous.fixCommits + previous.refactorCommits) / Math.max(previous.totalCommits, 1) : 0,
      ),
      activeRecommendations: activeRecs,
      commitCount: project._count.commits,
      lastCommitAt: lastCommit?.timestamp.toISOString() ?? null,
      lastAnalyzedAt: project.lastAnalyzedAt?.toISOString() ?? null,
    },
  });
});

projectsRoute.get('/projects', async (c) => {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { commits: true } },
      commits: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { timestamp: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = projects.map((p) => ({
    id: p.id,
    name: p.name,
    repoFullName: p.repoFullName,
    commitCount: p._count.commits,
    lastCommitAt: p.commits[0]?.timestamp.toISOString() ?? null,
  }));

  return c.json({ data });
});

projectsRoute.get('/projects/:id/commits', async (c) => {
  const projectId = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const cursor = c.req.query('cursor');

  const commits = await prisma.commit.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = commits.length > limit;
  const results = hasMore ? commits.slice(0, limit) : commits;
  const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

  return c.json({
    data: results.map((commit) => ({
      id: commit.id,
      sha: commit.sha,
      message: commit.message,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      authorType: commit.authorType,
      aiTool: commit.aiTool,
      category: commit.category,
      filesChanged: commit.filesChanged,
      insertions: commit.insertions,
      deletions: commit.deletions,
      testFilesTouched: commit.testFilesTouched,
      typeFilesTouched: commit.typeFilesTouched,
      timestamp: commit.timestamp.toISOString(),
    })),
    meta: {
      limit,
      hasMore,
      nextCursor,
    },
  });
});
