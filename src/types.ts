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

// --- Recommendation Engine Types ---

export type PatternType =
  | 'sprint-drift'
  | 'ghost-churn'
  | 'ai-handoff-cliff'
  | 'tool-transition'
  | 'test-drift'
  | 'changelog-silence'
  | 'workflow-breakthrough';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type RecommendationStatus = 'active' | 'acknowledged' | 'dismissed' | 'resolved';

export type ProjectPhase = 'building' | 'drifting' | 'stabilizing' | 'ship-ready';

export type TrendDirection = 'up' | 'stable' | 'down';

export interface EvidenceItem {
  readonly commits: readonly string[];
  readonly files: readonly string[];
  readonly metrics: Readonly<Record<string, number>>;
}

export interface RecommendationInput {
  readonly pattern: PatternType;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly evidence: EvidenceItem;
  readonly nextSteps: readonly string[];
}

export interface MetricWindow {
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly totalCommits: number;
  readonly aiCommits: number;
  readonly humanCommits: number;
  readonly botCommits: number;
  readonly aiRatio: number;
  readonly featCommits: number;
  readonly fixCommits: number;
  readonly refactorCommits: number;
  readonly testCommits: number;
  readonly choreCommits: number;
  readonly otherCommits: number;
  readonly totalFilesChanged: number;
  readonly totalTestFilesTouched: number;
  readonly testRatio: number;
  readonly avgFilesPerCommit: number;
  readonly uniqueAiTools: readonly string[];
  readonly categoryDistribution: Readonly<Record<CommitCategory, number>>;
}

export interface PhaseIndicator {
  readonly phase: ProjectPhase;
  readonly confidence: number;
  readonly signals: readonly string[];
  readonly guidance: string;
}

export interface MetricTrend {
  readonly current: number;
  readonly previous: number;
  readonly direction: TrendDirection;
  readonly changePercent: number;
}

export interface ProjectOverview {
  readonly id: string;
  readonly name: string;
  readonly repoFullName: string;
  readonly phase: PhaseIndicator;
  readonly aiRatio: MetricTrend;
  readonly velocity: MetricTrend;
  readonly qualitySignal: MetricTrend;
  readonly stabilityIndex: MetricTrend;
  readonly activeRecommendations: number;
  readonly commitCount: number;
  readonly lastCommitAt: string | null;
  readonly lastAnalyzedAt: string | null;
}

export type Detector = (
  current: MetricWindow,
  history: readonly MetricWindow[],
  commits: readonly CommitRecord[],
) => RecommendationInput | null;

export interface CommitRecord {
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
  readonly testFilesTouched: number;
  readonly typeFilesTouched: number;
  readonly timestamp: Date;
  readonly projectId: string;
}

export interface TimelineEvent {
  readonly id: string;
  readonly type: 'recommendation' | 'milestone' | 'report' | 'phase-change';
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
