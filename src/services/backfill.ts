/**
 * Backfill service for fetching historical commits from GitHub API.
 * Two-pass approach: fast list pass, optional enrichment pass for file data.
 */

import { prisma } from '../db/client.js';
import { classifyCommit } from './classification.js';
import { listCommits, getCommitDetail, toGitHubCommit } from './github-client.js';
import type { BackfillStatus, BackfillPhase } from '../types.js';

export interface BackfillOptions {
  readonly since?: string;
  readonly until?: string;
  readonly enrich?: boolean;
}

interface BackfillJob {
  projectId: string;
  status: BackfillPhase;
  processed: number;
  total: number;
  message: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

// In-memory job tracking (single instance, not distributed)
const jobs = new Map<string, BackfillJob>();

function updateJob(projectId: string, updates: Partial<BackfillJob>): void {
  const job = jobs.get(projectId);
  if (job) {
    jobs.set(projectId, { ...job, ...updates });
  }
}

export function clearBackfillStatus(projectId: string): void {
  jobs.delete(projectId);
}

export function getBackfillStatus(projectId: string): BackfillStatus | null {
  const job = jobs.get(projectId);
  if (!job) return null;

  return {
    projectId: job.projectId,
    status: job.status,
    progress: {
      phase: job.status,
      processed: job.processed,
      total: job.total,
      message: job.message,
    },
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  };
}

export async function backfillProject(
  projectId: string,
  token: string,
  options: BackfillOptions,
): Promise<void> {
  // Reject concurrent backfills
  const existing = jobs.get(projectId);
  if (existing && (existing.status === 'listing' || existing.status === 'enriching')) {
    throw new Error(`Backfill already in progress for project ${projectId}`);
  }

  // Initialize job
  const job: BackfillJob = {
    projectId,
    status: 'listing',
    processed: 0,
    total: 0,
    message: 'Starting backfill...',
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };
  jobs.set(projectId, job);

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const parts = project.repoFullName.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid repoFullName format: "${project.repoFullName}". Expected "owner/repo".`);
    }
    const [owner, repo] = parts;

    // Pass 1: List all commits
    const allApiCommits: Array<{ sha: string; commit: { message: string; author: { name: string; email: string; date: string } }; author: { login: string } | null }> = [];
    let page = 1;
    const perPage = 100;

    updateJob(projectId, { message: 'Listing commits...' });

    while (true) {
      const result = await listCommits(owner, repo, {
        token,
        page,
        perPage,
        since: options.since,
        until: options.until,
      });

      if (result.commits.length === 0) break;

      allApiCommits.push(...result.commits);
      updateJob(projectId, {
        total: allApiCommits.length,
        message: `Listed ${allApiCommits.length} commits (page ${page})`,
      });

      page++;
    }

    updateJob(projectId, {
      total: allApiCommits.length,
      message: `Classifying ${allApiCommits.length} commits...`,
    });

    // Pass 1: Classify and upsert
    for (const apiCommit of allApiCommits) {
      let commitToClassify = apiCommit;

      // Pass 2 (optional): Enrich with file data
      if (options.enrich) {
        updateJob(projectId, {
          status: 'enriching',
          message: `Enriching commit ${job.processed + 1}/${allApiCommits.length}`,
        });
        const detail = await getCommitDetail(owner, repo, apiCommit.sha, { token });
        commitToClassify = detail.commit;
      }

      const ghCommit = toGitHubCommit(commitToClassify);
      const classified = classifyCommit(ghCommit);

      await prisma.commit.upsert({
        where: {
          projectId_sha: { projectId, sha: classified.sha },
        },
        create: {
          sha: classified.sha,
          message: classified.message,
          authorName: classified.authorName,
          authorEmail: classified.authorEmail,
          authorType: classified.authorType,
          aiTool: classified.aiTool,
          category: classified.category,
          filesChanged: classified.filesChanged,
          insertions: classified.insertions,
          deletions: classified.deletions,
          testFilesTouched: classified.qualitySignals.testFilesTouched,
          typeFilesTouched: classified.qualitySignals.typeFilesTouched,
          timestamp: new Date(classified.timestamp),
          projectId,
        },
        update: {
          message: classified.message,
          authorType: classified.authorType,
          aiTool: classified.aiTool,
          category: classified.category,
          filesChanged: classified.filesChanged,
          insertions: classified.insertions,
          deletions: classified.deletions,
          testFilesTouched: classified.qualitySignals.testFilesTouched,
          typeFilesTouched: classified.qualitySignals.typeFilesTouched,
        },
      });

      job.processed++;
      updateJob(projectId, {
        processed: job.processed,
        message: `Processed ${job.processed}/${allApiCommits.length} commits`,
      });
    }

    updateJob(projectId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      message: `Backfill complete: ${job.processed} commits processed`,
    });
  } catch (error) {
    updateJob(projectId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Backfill failed',
    });
    throw error;
  }
}
