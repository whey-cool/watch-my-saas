import { prisma } from '../db/client.js';
import { classifyCommit } from './classification.js';
import type { GitHubPushPayload, WebhookResponse, AuthorType } from '../types.js';

export async function processWebhook(
  payload: GitHubPushPayload,
  projectId: string,
): Promise<WebhookResponse> {
  const authorTypes: Record<AuthorType, number> = { human: 0, ai: 0, bot: 0 };

  for (const ghCommit of payload.commits) {
    const classified = classifyCommit(ghCommit);
    authorTypes[classified.authorType]++;

    await prisma.commit.upsert({
      where: {
        projectId_sha: {
          projectId,
          sha: classified.sha,
        },
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
        testFilesTouched: classified.qualitySignals.testFilesTouched,
        typeFilesTouched: classified.qualitySignals.typeFilesTouched,
      },
    });
  }

  return {
    processed: payload.commits.length,
    authorTypes,
  };
}
