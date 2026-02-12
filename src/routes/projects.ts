import { Hono } from 'hono';
import { prisma } from '../db/client.js';

export const projectsRoute = new Hono();

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
