/**
 * Shared types for the Watch My SaaS API.
 * All types use readonly to enforce immutability.
 */

// --- RFC 9457 Problem Details ---

export interface ProblemDetails {
  readonly type: string;
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly FieldError[];
}

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

// --- Author Classification ---

export type AuthorType = 'human' | 'ai' | 'bot';

export type CommitCategory =
  | 'feat'
  | 'fix'
  | 'refactor'
  | 'docs'
  | 'test'
  | 'chore'
  | 'ci'
  | 'perf'
  | 'other';

export interface QualitySignals {
  readonly testFilesTouched: number;
  readonly typeFilesTouched: number;
  readonly docsFilesTouched: number;
  readonly configFilesTouched: number;
}

export interface ClassifiedCommit {
  readonly sha: string;
  readonly message: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly authorType: AuthorType;
  readonly aiTool: string | null;
  readonly category: CommitCategory;
  readonly filesChanged: number;
  readonly insertions: number;
  readonly deletions: number;
  readonly qualitySignals: QualitySignals;
  readonly timestamp: string;
}

// --- GitHub Webhook Payloads ---

export interface GitHubPushPayload {
  readonly ref: string;
  readonly repository: {
    readonly full_name: string;
  };
  readonly commits: readonly GitHubCommit[];
  readonly head_commit: GitHubCommit | null;
}

export interface GitHubCommit {
  readonly id: string;
  readonly message: string;
  readonly timestamp: string;
  readonly author: {
    readonly name: string;
    readonly email: string;
    readonly username?: string;
  };
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly modified: readonly string[];
}

// --- API Response Types ---

export interface HealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly version: string;
  readonly database: 'connected' | 'disconnected';
  readonly timestamp: string;
}

export interface WebhookResponse {
  readonly processed: number;
  readonly authorTypes: Record<AuthorType, number>;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly repoFullName: string;
  readonly commitCount: number;
  readonly lastCommitAt: string | null;
}
