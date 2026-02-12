/**
 * Recommendation engine orchestrator.
 * Fetches commits → aggregates into metric windows → runs pattern detectors →
 * deduplicates → stores recommendations → updates project phase.
 */

import { prisma } from '../../db/client.js';
import { buildMetricWindows } from './metrics.js';
import { detectPhase } from './phase-detector.js';
import { DETECTORS } from './detectors/index.js';
import type { Prisma } from '@prisma/client';
import type {
  CommitRecord,
  MetricWindow,
  PhaseIndicator,
  RecommendationInput,
} from '../../types.js';

const WINDOW_DAYS = 7;
const LOOKBACK_WEEKS = 12;

export interface AnalysisResult {
  readonly recommendations: readonly RecommendationInput[];
  readonly phase: PhaseIndicator;
  readonly windows: readonly MetricWindow[];
}

export async function analyzeProject(projectId: string): Promise<AnalysisResult> {
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_WEEKS * 7);

  const dbCommits = await prisma.commit.findMany({
    where: {
      projectId,
      timestamp: { gte: lookbackStart },
    },
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

  const windows = buildMetricWindows(commits, WINDOW_DAYS);

  const current = windows.length > 0 ? windows[windows.length - 1] : emptyWindow();
  const history = windows.length > 1 ? windows.slice(0, -1) : [];

  // Run all detectors
  const detected: RecommendationInput[] = [];
  for (const detector of DETECTORS) {
    const result = detector(current, history, commits);
    if (result !== null) {
      detected.push(result);
    }
  }

  // Detect project phase
  const phase = detectPhase(current, history);

  // Fetch existing active recommendations for deduplication
  const existingActive = await prisma.recommendation.findMany({
    where: { projectId, status: 'active' },
    select: { id: true, pattern: true, status: true },
  });

  const existingPatterns = new Set<string>(existingActive.map((r) => r.pattern));
  const detectedPatterns = new Set<string>(detected.map((r) => r.pattern));

  // New recommendations: detected but not already active
  const newRecommendations = detected.filter((r) => !existingPatterns.has(r.pattern));

  // Resolved: previously active but no longer detected
  const resolvedIds = existingActive
    .filter((r) => !detectedPatterns.has(r.pattern))
    .map((r) => r.id);

  // Store new recommendations
  if (newRecommendations.length > 0) {
    await prisma.recommendation.createMany({
      data: newRecommendations.map((r) => ({
        pattern: r.pattern,
        severity: r.severity,
        title: r.title,
        description: r.description,
        evidence: r.evidence as unknown as Prisma.InputJsonValue,
        nextSteps: r.nextSteps as unknown as Prisma.InputJsonValue,
        projectId,
      })),
    });
  }

  // Resolve stale recommendations
  if (resolvedIds.length > 0) {
    await prisma.recommendation.updateMany({
      where: { id: { in: resolvedIds } },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }

  // Update lastAnalyzedAt
  await prisma.project.update({
    where: { id: projectId },
    data: { lastAnalyzedAt: new Date() },
  });

  return { recommendations: detected, phase, windows };
}

function emptyWindow(): MetricWindow {
  return {
    windowStart: new Date(),
    windowEnd: new Date(),
    totalCommits: 0,
    aiCommits: 0,
    humanCommits: 0,
    botCommits: 0,
    aiRatio: 0,
    featCommits: 0,
    fixCommits: 0,
    refactorCommits: 0,
    testCommits: 0,
    choreCommits: 0,
    otherCommits: 0,
    totalFilesChanged: 0,
    totalTestFilesTouched: 0,
    testRatio: 0,
    avgFilesPerCommit: 0,
    uniqueAiTools: [],
    categoryDistribution: {
      feat: 0, fix: 0, refactor: 0, docs: 0, test: 0,
      chore: 0, ci: 0, perf: 0, other: 0,
    },
  };
}
