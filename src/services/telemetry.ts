import { prisma } from '../db/client.js';

export const TELEMETRY_SCHEMA_VERSION = 1;

export interface TelemetryHeartbeat {
  readonly schemaVersion: number;
  readonly instanceId: string;
  readonly version: string;
  readonly reposConnected: number;
  readonly totalCommits: number;
  readonly timestamp: string;
}

export async function generateHeartbeat(
  instanceId: string,
  version: string,
): Promise<TelemetryHeartbeat> {
  const [reposConnected, totalCommits] = await Promise.all([
    prisma.project.count(),
    prisma.commit.count(),
  ]);

  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    instanceId,
    version,
    reposConnected,
    totalCommits,
    timestamp: new Date().toISOString(),
  };
}
