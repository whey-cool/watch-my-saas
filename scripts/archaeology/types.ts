/**
 * Shared types for the git archaeology pipeline.
 * All types use readonly to enforce immutability.
 */

// --- Raw commit data (output of fetch stage) ---

export interface RawCommit {
  readonly sha: string;
  readonly author: string;
  readonly authorEmail: string;
  readonly date: string; // ISO 8601
  readonly message: string;
  readonly coAuthors: readonly string[];
  readonly filesChanged: readonly FileChange[];
  readonly repo: string;
}

export interface FileChange {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed';
}

export interface RepoCommitData {
  readonly repo: string;
  readonly fetchedAt: string;
  readonly source: 'local-git' | 'github-api';
  readonly commits: readonly RawCommit[];
}

// --- Tool Transitions ---

export interface ToolSignature {
  readonly raw: string;
  readonly normalized: string;
  readonly category: 'claude-generic' | 'claude-code' | 'claude-opus' | 'claude-sonnet' | 'claude-flow' | 'parallel-dev' | 'copilot' | 'cursor' | 'bot' | 'human' | 'other';
  readonly source: 'co-author' | 'author-identity';
}

export interface ToolTransition {
  readonly from: ToolSignature;
  readonly to: ToolSignature;
  readonly date: string;
  readonly repo: string;
  readonly confidence: number; // 0-1
}

export interface ToolTransitionAnalysis {
  readonly signatures: readonly ToolSignature[];
  readonly signatureTimeline: readonly SignatureTimelineEntry[];
  readonly transitions: readonly ToolTransition[];
  readonly summary: string;
}

export interface SignatureTimelineEntry {
  readonly date: string;
  readonly signature: ToolSignature;
  readonly repo: string;
  readonly count: number;
}

// --- Velocity Phases ---

export type VelocityPhaseType =
  | 'gap'
  | 'acceleration'
  | 'plateau'
  | 'decline'
  | 'recovery'
  | 'sustained';

export interface WeekBucket {
  readonly weekStart: string; // ISO date (Monday)
  readonly weekEnd: string;
  readonly commitCount: number;
  readonly repos: readonly string[];
  readonly aiAssistedCount: number;
  readonly aiPercentage: number;
}

export interface VelocityPhase {
  readonly type: VelocityPhaseType;
  readonly startWeek: string;
  readonly endWeek: string;
  readonly weekCount: number;
  readonly avgCommitsPerWeek: number;
  readonly description: string;
}

export interface VelocityAnalysis {
  readonly weeklyBuckets: readonly WeekBucket[];
  readonly movingAverage: readonly { readonly week: string; readonly avg: number }[];
  readonly phases: readonly VelocityPhase[];
  readonly totalCommits: number;
  readonly totalWeeks: number;
  readonly overallAvgPerWeek: number;
}

// --- Quality Evolution ---

export interface QualitySignal {
  readonly type: 'test-adoption' | 'ts-strictness' | 'error-handling' | 'docs' | 'churn' | 'revert' | 'refactor';
  readonly date: string;
  readonly repo: string;
  readonly description: string;
  readonly evidence: string; // file path or commit SHA
}

export interface QualityPeriod {
  readonly startDate: string;
  readonly endDate: string;
  readonly signals: readonly QualitySignal[];
  readonly testFileCount: number;
  readonly frustrationScore: number; // 0-1, derived from churn+reverts
  readonly qualityTrend: 'improving' | 'stable' | 'declining';
}

export interface QualityEvolutionAnalysis {
  readonly signals: readonly QualitySignal[];
  readonly periods: readonly QualityPeriod[];
  readonly inflectionPoints: readonly {
    readonly date: string;
    readonly type: string;
    readonly description: string;
  }[];
}

// --- Structural Growth ---

export interface DirectoryFirstSeen {
  readonly path: string;
  readonly firstSeenDate: string;
  readonly firstSeenRepo: string;
  readonly firstSeenSha: string;
}

export interface CodebaseSizePoint {
  readonly date: string;
  readonly totalFiles: number;
  readonly additions: number;
  readonly deletions: number;
  readonly netChange: number;
}

export interface RefactoringEvent {
  readonly date: string;
  readonly repo: string;
  readonly sha: string;
  readonly type: 'major-rename' | 'directory-restructure' | 'large-deletion';
  readonly filesAffected: number;
  readonly description: string;
}

export interface StructuralGrowthAnalysis {
  readonly directoryTimeline: readonly DirectoryFirstSeen[];
  readonly sizeTrajectory: readonly CodebaseSizePoint[];
  readonly refactoringEvents: readonly RefactoringEvent[];
}

// --- Unified Timeline ---

export type TimelineEventType =
  | 'tool-transition'
  | 'velocity-change'
  | 'quality-signal'
  | 'structural-change'
  | 'milestone';

export interface TimelineEvent {
  readonly date: string;
  readonly type: TimelineEventType;
  readonly title: string;
  readonly description: string;
  readonly repo: string;
  readonly significance: 'high' | 'medium' | 'low';
}

export interface WeeklyEpoch {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly events: readonly TimelineEvent[];
  readonly summary: string;
}

export interface UnifiedTimelineAnalysis {
  readonly events: readonly TimelineEvent[];
  readonly epochs: readonly WeeklyEpoch[];
  readonly narrative: string;
}

// --- Pipeline orchestration ---

export interface AnalysisBundle {
  readonly toolTransitions: ToolTransitionAnalysis;
  readonly velocity: VelocityAnalysis;
  readonly quality: QualityEvolutionAnalysis;
  readonly structure: StructuralGrowthAnalysis;
  readonly timeline: UnifiedTimelineAnalysis;
}
