/**
 * Comprehensive tests for the 5 archaeology analyzers.
 *
 * RED phase: These tests are written before the analyzer implementations exist.
 * They define the expected behavior and contract for each analyzer.
 *
 * Run with: npx vitest run scripts/archaeology/__tests__/analyzers.test.ts
 */

import { describe, it, expect } from 'vitest';
import { analyzeToolTransitions } from '../analyzers/tool-transitions.js';
import { analyzeVelocityPhases } from '../analyzers/velocity-phases.js';
import { analyzeQualityEvolution } from '../analyzers/quality-evolution.js';
import { analyzeStructuralGrowth } from '../analyzers/structural-growth.js';
import { buildUnifiedTimeline } from '../analyzers/unified-timeline.js';
import type {
  RawCommit,
  FileChange,
  ToolTransitionAnalysis,
  VelocityAnalysis,
  QualityEvolutionAnalysis,
  StructuralGrowthAnalysis,
} from '../types.js';

// ---------------------------------------------------------------------------
// Synthetic data helpers
// ---------------------------------------------------------------------------

function makeCommit(overrides: Partial<RawCommit> & { sha: string }): RawCommit {
  return {
    author: 'Megan',
    authorEmail: 'megan@example.com',
    date: '2025-01-15T10:00:00Z',
    message: 'chore: placeholder commit',
    coAuthors: [],
    filesChanged: [],
    repo: 'watch-my-saas',
    ...overrides,
  };
}

function makeFileChange(overrides: Partial<FileChange> = {}): FileChange {
  return {
    path: 'src/index.ts',
    additions: 10,
    deletions: 2,
    status: 'modified',
    ...overrides,
  };
}

/**
 * Generates a sequence of commits spread across the given date range.
 * Each commit is placed at noon UTC on its respective day.
 */
function generateCommitSequence(opts: {
  startDate: string;
  count: number;
  daysBetween: number;
  coAuthors?: readonly string[];
  repo?: string;
  filesChanged?: readonly FileChange[];
  messagePrefix?: string;
}): readonly RawCommit[] {
  const commits: RawCommit[] = [];
  const start = new Date(opts.startDate);

  for (let i = 0; i < opts.count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i * opts.daysBetween);
    date.setUTCHours(12, 0, 0, 0);

    commits.push(
      makeCommit({
        sha: `abc${String(i).padStart(4, '0')}`,
        date: date.toISOString(),
        message: `${opts.messagePrefix ?? 'feat'}: commit ${i}`,
        coAuthors: opts.coAuthors ?? [],
        filesChanged: opts.filesChanged ?? [makeFileChange()],
        repo: opts.repo ?? 'watch-my-saas',
      }),
    );
  }

  return commits;
}

// ---------------------------------------------------------------------------
// 1. Tool Transitions Analyzer
// ---------------------------------------------------------------------------

describe('analyzeToolTransitions', () => {
  it('detects transitions between different co-author signatures over time', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'aaa001',
        date: '2025-01-01T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'aaa002',
        date: '2025-01-08T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'aaa003',
        date: '2025-02-01T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'aaa004',
        date: '2025-02-15T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    expect(result.transitions.length).toBeGreaterThanOrEqual(1);
    const firstTransition = result.transitions[0];
    expect(firstTransition.from.category).toBe('claude-generic');
    expect(firstTransition.to.category).toBe('claude-code');
  });

  it('normalizes known co-author signatures to correct categories', () => {
    const signatureToCategory: ReadonlyArray<[string, string]> = [
      ['Co-Authored-By: Claude <noreply@anthropic.com>', 'claude-generic'],
      ['Co-Authored-By: Claude Code <noreply@anthropic.com>', 'claude-code'],
      ['Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>', 'claude-opus'],
      ['Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>', 'claude-sonnet'],
      ['Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>', 'claude-opus'],
      ['Co-Authored-By: claude-flow <noreply@anthropic.com>', 'claude-flow'],
      ['Co-Authored-By: Parallel Development <noreply@anthropic.com>', 'parallel-dev'],
    ];

    const commits: readonly RawCommit[] = signatureToCategory.map(
      ([sig, _category], idx) =>
        makeCommit({
          sha: `sig${String(idx).padStart(3, '0')}`,
          date: new Date(2025, 0, 1 + idx).toISOString(),
          coAuthors: [sig],
        }),
    );

    const result = analyzeToolTransitions(commits);

    // There should be a unique signature for each distinct category
    const categories = result.signatures.map((s) => s.category);
    for (const [_sig, expectedCategory] of signatureToCategory) {
      expect(categories).toContain(expectedCategory);
    }
  });

  it('handles commits with no co-authors gracefully', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({ sha: 'no-co-1', coAuthors: [] }),
      makeCommit({ sha: 'no-co-2', coAuthors: [] }),
    ];

    const result = analyzeToolTransitions(commits);

    expect(result.signatures).toHaveLength(0);
    expect(result.transitions).toHaveLength(0);
    expect(result.signatureTimeline).toHaveLength(0);
    expect(typeof result.summary).toBe('string');
  });

  it('calculates confidence scores between 0 and 1 for transitions', () => {
    const commits: readonly RawCommit[] = [
      // Several commits with Claude generic, then switch to Claude Code
      ...generateCommitSequence({
        startDate: '2025-01-01',
        count: 5,
        daysBetween: 1,
        coAuthors: ['Co-Authored-By: Claude <noreply@anthropic.com>'],
      }),
      ...generateCommitSequence({
        startDate: '2025-02-01',
        count: 5,
        daysBetween: 1,
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    for (const transition of result.transitions) {
      expect(transition.confidence).toBeGreaterThanOrEqual(0);
      expect(transition.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('populates signatureTimeline with chronological entries', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'tl001',
        date: '2025-01-10T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'tl002',
        date: '2025-01-17T12:00:00Z',
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    expect(result.signatureTimeline.length).toBeGreaterThanOrEqual(2);
    // Should be chronologically ordered
    for (let i = 1; i < result.signatureTimeline.length; i++) {
      expect(
        new Date(result.signatureTimeline[i].date).getTime(),
      ).toBeGreaterThanOrEqual(
        new Date(result.signatureTimeline[i - 1].date).getTime(),
      );
    }
  });

  it('detects Cursor Agent from author email', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'cursor001',
        date: '2025-01-10T12:00:00Z',
        author: 'Cursor Agent',
        authorEmail: 'cursoragent@cursor.com',
        coAuthors: [],
      }),
      makeCommit({
        sha: 'cursor002',
        date: '2025-01-11T12:00:00Z',
        author: 'Cursor Agent',
        authorEmail: 'cursoragent@cursor.com',
        coAuthors: [],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    const cursorSigs = result.signatures.filter((s) => s.category === 'cursor');
    expect(cursorSigs.length).toBeGreaterThanOrEqual(1);
    expect(cursorSigs[0].normalized).toBe('Cursor Agent');
    expect(cursorSigs[0].source).toBe('author-identity');
    // Should appear in timeline
    expect(result.signatureTimeline.length).toBeGreaterThanOrEqual(1);
  });

  it('detects Claude Code as commit author (not just co-author)', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'cc-auth001',
        date: '2025-01-10T12:00:00Z',
        author: 'Claude Code',
        authorEmail: 'claude@herdmate.dev',
        coAuthors: [],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    const ccSigs = result.signatures.filter((s) => s.category === 'claude-code');
    expect(ccSigs.length).toBeGreaterThanOrEqual(1);
    expect(ccSigs[0].source).toBe('author-identity');
  });

  it('does not duplicate when author and co-author point to same tool', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'dedup001',
        date: '2025-01-10T12:00:00Z',
        author: 'Claude Code',
        authorEmail: 'claude@herdmate.dev',
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    // Should only have one timeline entry for this date, not two
    const ccEntries = result.signatureTimeline.filter(
      (e) => e.signature.normalized === 'Claude Code',
    );
    expect(ccEntries).toHaveLength(1);
    expect(ccEntries[0].count).toBe(1);
  });

  it('detects bot authors (dependabot, github-actions)', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'bot001',
        date: '2025-01-10T12:00:00Z',
        author: 'dependabot[bot]',
        authorEmail: '49699333+dependabot[bot]@users.noreply.github.com',
        coAuthors: [],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    const botSigs = result.signatures.filter((s) => s.category === 'bot');
    expect(botSigs.length).toBeGreaterThanOrEqual(1);
  });

  it('ignores human authors (no false positives)', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'human001',
        date: '2025-01-10T12:00:00Z',
        author: 'Megan Clark',
        authorEmail: 'meg@wheycoolranch.com',
        coAuthors: [],
      }),
    ];

    const result = analyzeToolTransitions(commits);

    expect(result.signatures).toHaveLength(0);
    expect(result.signatureTimeline).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Velocity Phases Analyzer
// ---------------------------------------------------------------------------

describe('analyzeVelocityPhases', () => {
  it('groups commits into weekly buckets (Monday-Sunday)', () => {
    // 2025-01-06 is a Monday
    const commits: readonly RawCommit[] = [
      makeCommit({ sha: 'v001', date: '2025-01-06T10:00:00Z' }), // Monday wk1
      makeCommit({ sha: 'v002', date: '2025-01-08T10:00:00Z' }), // Wednesday wk1
      makeCommit({ sha: 'v003', date: '2025-01-13T10:00:00Z' }), // Monday wk2
    ];

    const result = analyzeVelocityPhases(commits);

    expect(result.weeklyBuckets.length).toBe(2);
    expect(result.weeklyBuckets[0].commitCount).toBe(2);
    expect(result.weeklyBuckets[1].commitCount).toBe(1);

    // Verify weekStart is a Monday
    const firstBucketDay = new Date(result.weeklyBuckets[0].weekStart).getUTCDay();
    expect(firstBucketDay).toBe(1); // Monday = 1
  });

  it('calculates 3-week moving average', () => {
    // 6 weeks of commits with varying counts
    const weeks = [
      { start: '2025-01-06', count: 3 },
      { start: '2025-01-13', count: 6 },
      { start: '2025-01-20', count: 9 },
      { start: '2025-01-27', count: 3 },
      { start: '2025-02-03', count: 6 },
      { start: '2025-02-10', count: 12 },
    ];

    const commits: RawCommit[] = [];
    let shaCounter = 0;
    for (const week of weeks) {
      for (let i = 0; i < week.count; i++) {
        const date = new Date(week.start);
        date.setUTCHours(10 + i, 0, 0, 0);
        commits.push(
          makeCommit({
            sha: `ma${String(shaCounter++).padStart(4, '0')}`,
            date: date.toISOString(),
          }),
        );
      }
    }

    const result = analyzeVelocityPhases(commits);

    // Moving average has an entry per week (growing window for first entries)
    expect(result.movingAverage.length).toBeGreaterThanOrEqual(6);

    // Third entry (index 2) should be the first full 3-week average: (3 + 6 + 9) / 3 = 6
    expect(result.movingAverage[2].avg).toBeCloseTo(6, 0);
  });

  it('detects gap phase when 0 commits for 2+ weeks', () => {
    const commits: readonly RawCommit[] = [
      // Week of Jan 6
      makeCommit({ sha: 'gap001', date: '2025-01-06T10:00:00Z' }),
      makeCommit({ sha: 'gap002', date: '2025-01-07T10:00:00Z' }),
      makeCommit({ sha: 'gap003', date: '2025-01-08T10:00:00Z' }),
      // No commits for Jan 13, Jan 20 (2 empty weeks)
      // Week of Jan 27
      makeCommit({ sha: 'gap004', date: '2025-01-27T10:00:00Z' }),
    ];

    const result = analyzeVelocityPhases(commits);

    const gapPhases = result.phases.filter((p) => p.type === 'gap');
    expect(gapPhases.length).toBeGreaterThanOrEqual(1);
    expect(gapPhases[0].weekCount).toBeGreaterThanOrEqual(2);
  });

  it('detects acceleration phase when commit count is increasing', () => {
    const commits: RawCommit[] = [];
    let sha = 0;
    // Increasing weekly commits: 2, 4, 8, 12
    const weeklyAmounts = [2, 4, 8, 12];
    for (let w = 0; w < weeklyAmounts.length; w++) {
      const weekStart = new Date('2025-01-06');
      weekStart.setDate(weekStart.getDate() + w * 7);
      for (let c = 0; c < weeklyAmounts[w]; c++) {
        const date = new Date(weekStart);
        date.setUTCHours(10 + c, 0, 0, 0);
        commits.push(
          makeCommit({
            sha: `acc${String(sha++).padStart(4, '0')}`,
            date: date.toISOString(),
          }),
        );
      }
    }

    const result = analyzeVelocityPhases(commits);

    const accelPhases = result.phases.filter((p) => p.type === 'acceleration');
    expect(accelPhases.length).toBeGreaterThanOrEqual(1);
  });

  it('detects plateau and decline phases', () => {
    const commits: RawCommit[] = [];
    let sha = 0;
    // Plateau (stable ~10/week for 4 weeks), then sharp decline (3, 1, 0)
    const weeklyAmounts = [10, 10, 10, 10, 3, 1];
    for (let w = 0; w < weeklyAmounts.length; w++) {
      const weekStart = new Date('2025-01-06');
      weekStart.setDate(weekStart.getDate() + w * 7);
      for (let c = 0; c < weeklyAmounts[w]; c++) {
        const date = new Date(weekStart);
        date.setUTCHours(10 + c, 0, 0, 0);
        commits.push(
          makeCommit({
            sha: `pd${String(sha++).padStart(4, '0')}`,
            date: date.toISOString(),
          }),
        );
      }
    }

    const result = analyzeVelocityPhases(commits);

    const phaseTypes = result.phases.map((p) => p.type);
    // Should detect a stable period and either decline or a gap at the end
    const hasStableOrPlateau = phaseTypes.includes('plateau') || phaseTypes.includes('sustained');
    expect(hasStableOrPlateau).toBe(true);
    // Verify velocity decreases — the last weeks should have lower avg than peak
    const peakAvg = Math.max(...result.phases.map(p => p.avgCommitsPerWeek));
    const lastPhase = result.phases[result.phases.length - 1];
    expect(lastPhase.avgCommitsPerWeek).toBeLessThan(peakAvg);
  });

  it('calculates AI-assisted percentage per week', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'ai001',
        date: '2025-01-06T10:00:00Z',
        coAuthors: ['Co-Authored-By: Claude <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'ai002',
        date: '2025-01-07T10:00:00Z',
        coAuthors: ['Co-Authored-By: Claude Code <noreply@anthropic.com>'],
      }),
      makeCommit({
        sha: 'ai003',
        date: '2025-01-08T10:00:00Z',
        coAuthors: [], // No AI
      }),
      makeCommit({
        sha: 'ai004',
        date: '2025-01-09T10:00:00Z',
        coAuthors: [], // No AI
      }),
    ];

    const result = analyzeVelocityPhases(commits);

    expect(result.weeklyBuckets).toHaveLength(1);
    expect(result.weeklyBuckets[0].aiAssistedCount).toBe(2);
    expect(result.weeklyBuckets[0].aiPercentage).toBeCloseTo(50, 0);
  });

  it('handles empty input', () => {
    const result = analyzeVelocityPhases([]);

    expect(result.weeklyBuckets).toHaveLength(0);
    expect(result.movingAverage).toHaveLength(0);
    expect(result.phases).toHaveLength(0);
    expect(result.totalCommits).toBe(0);
    expect(result.totalWeeks).toBe(0);
    expect(result.overallAvgPerWeek).toBe(0);
  });

  it('reports totalCommits and overallAvgPerWeek correctly', () => {
    const commits = generateCommitSequence({
      startDate: '2025-01-06',
      count: 14,
      daysBetween: 1,
    });

    const result = analyzeVelocityPhases(commits);

    expect(result.totalCommits).toBe(14);
    expect(result.totalWeeks).toBe(2);
    expect(result.overallAvgPerWeek).toBeCloseTo(7, 0);
  });
});

// ---------------------------------------------------------------------------
// 3. Quality Evolution Analyzer
// ---------------------------------------------------------------------------

describe('analyzeQualityEvolution', () => {
  it('detects test file additions', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'q001',
        date: '2025-01-10T12:00:00Z',
        message: 'test: add unit tests',
        filesChanged: [
          makeFileChange({ path: 'src/utils.test.ts', status: 'added', additions: 80 }),
          makeFileChange({ path: 'src/__tests__/auth.test.ts', status: 'added', additions: 120 }),
        ],
      }),
      makeCommit({
        sha: 'q002',
        date: '2025-01-11T12:00:00Z',
        message: 'test: add spec files',
        filesChanged: [
          makeFileChange({ path: 'src/api.spec.ts', status: 'added', additions: 50 }),
        ],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    const testSignals = result.signals.filter((s) => s.type === 'test-adoption');
    expect(testSignals.length).toBeGreaterThanOrEqual(2);
    // Verify the evidence references actual test file paths
    const evidencePaths = testSignals.map((s) => s.evidence);
    expect(evidencePaths.some((p) => p.includes('.test.ts'))).toBe(true);
    expect(evidencePaths.some((p) => p.includes('.spec.ts') || p.includes('__tests__'))).toBe(true);
  });

  it('detects tsconfig changes as TypeScript strictness signals', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'ts001',
        date: '2025-01-15T12:00:00Z',
        message: 'chore: enable strict mode in tsconfig',
        filesChanged: [
          makeFileChange({ path: 'tsconfig.json', status: 'modified', additions: 3, deletions: 1 }),
        ],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    const tsSignals = result.signals.filter((s) => s.type === 'ts-strictness');
    expect(tsSignals.length).toBeGreaterThanOrEqual(1);
    expect(tsSignals[0].evidence).toContain('tsconfig');
  });

  it('detects reverts from commit message', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'rv001',
        date: '2025-01-20T12:00:00Z',
        message: 'Revert "feat: add broken feature"',
        filesChanged: [makeFileChange({ path: 'src/feature.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'rv002',
        date: '2025-01-21T12:00:00Z',
        message: 'revert: undo accidental config change',
        filesChanged: [makeFileChange({ path: 'config.ts', status: 'modified' })],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    const revertSignals = result.signals.filter((s) => s.type === 'revert');
    expect(revertSignals).toHaveLength(2);
  });

  it('detects churn when same file is modified 3+ times in a week', () => {
    // All in same week (Mon Jan 6 - Sun Jan 12)
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'ch001',
        date: '2025-01-06T10:00:00Z',
        message: 'fix: tweak auth logic',
        filesChanged: [makeFileChange({ path: 'src/auth.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'ch002',
        date: '2025-01-07T10:00:00Z',
        message: 'fix: auth edge case',
        filesChanged: [makeFileChange({ path: 'src/auth.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'ch003',
        date: '2025-01-08T10:00:00Z',
        message: 'fix: auth again',
        filesChanged: [makeFileChange({ path: 'src/auth.ts', status: 'modified' })],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    const churnSignals = result.signals.filter((s) => s.type === 'churn');
    expect(churnSignals.length).toBeGreaterThanOrEqual(1);
    expect(churnSignals[0].evidence).toContain('src/auth.ts');
  });

  it('identifies frustration periods (high churn + reverts)', () => {
    // All in same week, high churn + reverts
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'fr001',
        date: '2025-01-06T09:00:00Z',
        message: 'fix: attempt 1',
        filesChanged: [makeFileChange({ path: 'src/payment.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'fr002',
        date: '2025-01-06T11:00:00Z',
        message: 'fix: attempt 2',
        filesChanged: [makeFileChange({ path: 'src/payment.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'fr003',
        date: '2025-01-06T13:00:00Z',
        message: 'fix: attempt 3',
        filesChanged: [makeFileChange({ path: 'src/payment.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'fr004',
        date: '2025-01-07T09:00:00Z',
        message: 'Revert "fix: attempt 3"',
        filesChanged: [makeFileChange({ path: 'src/payment.ts', status: 'modified' })],
      }),
      makeCommit({
        sha: 'fr005',
        date: '2025-01-07T10:00:00Z',
        message: 'Revert "fix: attempt 2"',
        filesChanged: [makeFileChange({ path: 'src/payment.ts', status: 'modified' })],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    // Should have at least one period with a non-trivial frustration score
    const frustratedPeriods = result.periods.filter((p) => p.frustrationScore > 0.3);
    expect(frustratedPeriods.length).toBeGreaterThanOrEqual(1);
  });

  it('finds quality inflection points', () => {
    // Phase 1: no tests, then Phase 2: tests introduced
    const commits: readonly RawCommit[] = [
      // Week 1: no tests, some churn
      makeCommit({
        sha: 'ip001',
        date: '2025-01-06T10:00:00Z',
        message: 'feat: add feature',
        filesChanged: [makeFileChange({ path: 'src/feature.ts', status: 'added' })],
      }),
      makeCommit({
        sha: 'ip002',
        date: '2025-01-07T10:00:00Z',
        message: 'fix: feature bug',
        filesChanged: [makeFileChange({ path: 'src/feature.ts', status: 'modified' })],
      }),
      // Week 2: tests appear -- inflection point
      makeCommit({
        sha: 'ip003',
        date: '2025-01-13T10:00:00Z',
        message: 'test: add feature tests',
        filesChanged: [
          makeFileChange({ path: 'src/feature.test.ts', status: 'added', additions: 100 }),
        ],
      }),
      makeCommit({
        sha: 'ip004',
        date: '2025-01-14T10:00:00Z',
        message: 'chore: enable strict TS',
        filesChanged: [
          makeFileChange({ path: 'tsconfig.json', status: 'modified', additions: 2, deletions: 1 }),
        ],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    expect(result.inflectionPoints.length).toBeGreaterThanOrEqual(1);
    // Inflection point should be around the time tests were introduced
    const inflectionDate = new Date(result.inflectionPoints[0].date);
    expect(inflectionDate.getTime()).toBeGreaterThanOrEqual(
      new Date('2025-01-13').getTime(),
    );
  });

  it('tracks qualityTrend in periods', () => {
    const commits: readonly RawCommit[] = [
      // Week 1: just code, no tests
      makeCommit({
        sha: 'qt001',
        date: '2025-01-06T10:00:00Z',
        message: 'feat: initial code',
        filesChanged: [makeFileChange({ path: 'src/app.ts', status: 'added' })],
      }),
      // Week 2: tests added, quality improving
      makeCommit({
        sha: 'qt002',
        date: '2025-01-13T10:00:00Z',
        message: 'test: comprehensive tests',
        filesChanged: [
          makeFileChange({ path: 'src/app.test.ts', status: 'added', additions: 200 }),
          makeFileChange({ path: 'src/util.test.ts', status: 'added', additions: 150 }),
        ],
      }),
    ];

    const result = analyzeQualityEvolution(commits);

    expect(result.periods.length).toBeGreaterThanOrEqual(1);
    const lastPeriod = result.periods[result.periods.length - 1];
    expect(['improving', 'stable', 'declining']).toContain(lastPeriod.qualityTrend);
  });
});

// ---------------------------------------------------------------------------
// 4. Structural Growth Analyzer
// ---------------------------------------------------------------------------

describe('analyzeStructuralGrowth', () => {
  it('tracks when directories first appear', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'sg001',
        date: '2025-01-05T12:00:00Z',
        message: 'feat: initial structure',
        filesChanged: [
          makeFileChange({ path: 'src/index.ts', status: 'added', additions: 20 }),
        ],
      }),
      makeCommit({
        sha: 'sg002',
        date: '2025-01-10T12:00:00Z',
        message: 'feat: add api layer',
        filesChanged: [
          makeFileChange({ path: 'src/api/routes.ts', status: 'added', additions: 50 }),
          makeFileChange({ path: 'src/api/middleware.ts', status: 'added', additions: 30 }),
        ],
      }),
      makeCommit({
        sha: 'sg003',
        date: '2025-01-15T12:00:00Z',
        message: 'feat: add database layer',
        filesChanged: [
          makeFileChange({ path: 'src/db/schema.ts', status: 'added', additions: 80 }),
        ],
      }),
    ];

    const result = analyzeStructuralGrowth(commits);

    const dirPaths = result.directoryTimeline.map((d) => d.path);
    expect(dirPaths).toContain('src');
    expect(dirPaths).toContain('src/api');
    expect(dirPaths).toContain('src/db');

    // src should appear first
    const srcEntry = result.directoryTimeline.find((d) => d.path === 'src');
    const apiEntry = result.directoryTimeline.find((d) => d.path === 'src/api');
    expect(srcEntry).toBeDefined();
    expect(apiEntry).toBeDefined();
    expect(new Date(srcEntry!.firstSeenDate).getTime()).toBeLessThan(
      new Date(apiEntry!.firstSeenDate).getTime(),
    );
  });

  it('builds codebase size trajectory from additions and deletions', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'sz001',
        date: '2025-01-05T12:00:00Z',
        filesChanged: [
          makeFileChange({ path: 'src/a.ts', status: 'added', additions: 100, deletions: 0 }),
        ],
      }),
      makeCommit({
        sha: 'sz002',
        date: '2025-01-06T12:00:00Z',
        filesChanged: [
          makeFileChange({ path: 'src/a.ts', status: 'modified', additions: 20, deletions: 10 }),
          makeFileChange({ path: 'src/b.ts', status: 'added', additions: 50, deletions: 0 }),
        ],
      }),
      makeCommit({
        sha: 'sz003',
        date: '2025-01-07T12:00:00Z',
        filesChanged: [
          makeFileChange({ path: 'src/old.ts', status: 'deleted', additions: 0, deletions: 80 }),
        ],
      }),
    ];

    const result = analyzeStructuralGrowth(commits);

    expect(result.sizeTrajectory.length).toBe(3);
    // First point: +100 lines
    expect(result.sizeTrajectory[0].additions).toBe(100);
    expect(result.sizeTrajectory[0].deletions).toBe(0);
    expect(result.sizeTrajectory[0].netChange).toBe(100);
    // Third point: -80 lines net
    expect(result.sizeTrajectory[2].netChange).toBe(-80);
  });

  it('detects refactoring events with many file renames', () => {
    const renamedFiles: FileChange[] = [];
    for (let i = 0; i < 8; i++) {
      renamedFiles.push(
        makeFileChange({
          path: `src/new-name-${i}.ts`,
          status: 'renamed',
          additions: 0,
          deletions: 0,
        }),
      );
    }

    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'rf001',
        date: '2025-01-20T12:00:00Z',
        message: 'refactor: rename modules to new convention',
        filesChanged: renamedFiles,
      }),
    ];

    const result = analyzeStructuralGrowth(commits);

    expect(result.refactoringEvents.length).toBeGreaterThanOrEqual(1);
    const event = result.refactoringEvents[0];
    expect(['major-rename', 'directory-restructure']).toContain(event.type);
    expect(event.filesAffected).toBeGreaterThanOrEqual(8);
    expect(event.sha).toBe('rf001');
  });

  it('detects refactoring events with large deletions', () => {
    const deletedFiles: FileChange[] = [];
    for (let i = 0; i < 10; i++) {
      deletedFiles.push(
        makeFileChange({
          path: `src/legacy/old-${i}.ts`,
          status: 'deleted',
          additions: 0,
          deletions: 50,
        }),
      );
    }

    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'del001',
        date: '2025-02-01T12:00:00Z',
        message: 'chore: remove legacy modules',
        filesChanged: deletedFiles,
      }),
    ];

    const result = analyzeStructuralGrowth(commits);

    expect(result.refactoringEvents.length).toBeGreaterThanOrEqual(1);
    const event = result.refactoringEvents[0];
    expect(event.type).toBe('large-deletion');
    expect(event.filesAffected).toBe(10);
  });

  it('handles multiple repos', () => {
    const commits: readonly RawCommit[] = [
      makeCommit({
        sha: 'mr001',
        date: '2025-01-05T12:00:00Z',
        repo: 'repo-a',
        filesChanged: [makeFileChange({ path: 'src/index.ts', status: 'added' })],
      }),
      makeCommit({
        sha: 'mr002',
        date: '2025-01-06T12:00:00Z',
        repo: 'repo-b',
        filesChanged: [makeFileChange({ path: 'lib/main.ts', status: 'added' })],
      }),
    ];

    const result = analyzeStructuralGrowth(commits);

    // Should track directories from both repos
    const repos = result.directoryTimeline.map((d) => d.firstSeenRepo);
    expect(repos).toContain('repo-a');
    expect(repos).toContain('repo-b');
  });
});

// ---------------------------------------------------------------------------
// 5. Unified Timeline Builder
// ---------------------------------------------------------------------------

describe('buildUnifiedTimeline', () => {
  // Reusable minimal analysis results for composing test bundles

  const minimalToolTransitions: ToolTransitionAnalysis = {
    signatures: [],
    signatureTimeline: [],
    transitions: [
      {
        from: { raw: 'Claude', normalized: 'claude', category: 'claude-generic', source: 'co-author' },
        to: { raw: 'Claude Code', normalized: 'claude-code', category: 'claude-code', source: 'co-author' },
        date: '2025-01-15T12:00:00Z',
        repo: 'watch-my-saas',
        confidence: 0.9,
      },
    ],
    summary: 'Transitioned from Claude generic to Claude Code',
  };

  const minimalVelocity: VelocityAnalysis = {
    weeklyBuckets: [],
    movingAverage: [],
    phases: [
      {
        type: 'acceleration',
        startWeek: '2025-01-06',
        endWeek: '2025-01-27',
        weekCount: 3,
        avgCommitsPerWeek: 8,
        description: 'Commit rate increased steadily',
      },
    ],
    totalCommits: 24,
    totalWeeks: 3,
    overallAvgPerWeek: 8,
  };

  const minimalQuality: QualityEvolutionAnalysis = {
    signals: [
      {
        type: 'test-adoption',
        date: '2025-01-20T12:00:00Z',
        repo: 'watch-my-saas',
        description: 'First test files added',
        evidence: 'src/utils.test.ts',
      },
    ],
    periods: [],
    inflectionPoints: [
      {
        date: '2025-01-20T12:00:00Z',
        type: 'test-adoption',
        description: 'Testing adopted',
      },
    ],
  };

  const minimalStructure: StructuralGrowthAnalysis = {
    directoryTimeline: [
      {
        path: 'src/api',
        firstSeenDate: '2025-01-10T12:00:00Z',
        firstSeenRepo: 'watch-my-saas',
        firstSeenSha: 'abc001',
      },
    ],
    sizeTrajectory: [],
    refactoringEvents: [
      {
        date: '2025-02-01T12:00:00Z',
        repo: 'watch-my-saas',
        sha: 'ref001',
        type: 'major-rename',
        filesAffected: 12,
        description: 'Renamed modules',
      },
    ],
  };

  it('merges events from all analyses into chronological order', () => {
    const result = buildUnifiedTimeline({
      toolTransitions: minimalToolTransitions,
      velocity: minimalVelocity,
      quality: minimalQuality,
      structure: minimalStructure,
    });

    // Should contain events from all four sources
    const eventTypes = new Set(result.events.map((e) => e.type));
    expect(eventTypes.has('tool-transition')).toBe(true);
    expect(eventTypes.has('velocity-change')).toBe(true);
    expect(eventTypes.has('quality-signal')).toBe(true);
    expect(eventTypes.has('structural-change')).toBe(true);

    // Should be chronologically ordered
    for (let i = 1; i < result.events.length; i++) {
      expect(new Date(result.events[i].date).getTime()).toBeGreaterThanOrEqual(
        new Date(result.events[i - 1].date).getTime(),
      );
    }
  });

  it('groups events into weekly epochs', () => {
    const result = buildUnifiedTimeline({
      toolTransitions: minimalToolTransitions,
      velocity: minimalVelocity,
      quality: minimalQuality,
      structure: minimalStructure,
    });

    expect(result.epochs.length).toBeGreaterThanOrEqual(1);

    for (const epoch of result.epochs) {
      // Each epoch should have a weekStart and weekEnd
      expect(epoch.weekStart).toBeTruthy();
      expect(epoch.weekEnd).toBeTruthy();
      expect(new Date(epoch.weekEnd).getTime()).toBeGreaterThan(
        new Date(epoch.weekStart).getTime(),
      );
      // Each epoch should have at least one event
      expect(epoch.events.length).toBeGreaterThanOrEqual(1);
      // Each epoch should have a summary
      expect(typeof epoch.summary).toBe('string');
      expect(epoch.summary.length).toBeGreaterThan(0);
    }
  });

  it('assigns significance levels to events', () => {
    const result = buildUnifiedTimeline({
      toolTransitions: minimalToolTransitions,
      velocity: minimalVelocity,
      quality: minimalQuality,
      structure: minimalStructure,
    });

    for (const event of result.events) {
      expect(['high', 'medium', 'low']).toContain(event.significance);
    }

    // Tool transitions and quality inflection points should be high significance
    const toolEvents = result.events.filter((e) => e.type === 'tool-transition');
    expect(toolEvents.length).toBeGreaterThanOrEqual(1);
    expect(toolEvents.some((e) => e.significance === 'high')).toBe(true);
  });

  it('generates a narrative string', () => {
    const result = buildUnifiedTimeline({
      toolTransitions: minimalToolTransitions,
      velocity: minimalVelocity,
      quality: minimalQuality,
      structure: minimalStructure,
    });

    expect(typeof result.narrative).toBe('string');
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it('handles empty analyses gracefully', () => {
    const emptyBundle = {
      toolTransitions: {
        signatures: [],
        signatureTimeline: [],
        transitions: [],
        summary: '',
      } as ToolTransitionAnalysis,
      velocity: {
        weeklyBuckets: [],
        movingAverage: [],
        phases: [],
        totalCommits: 0,
        totalWeeks: 0,
        overallAvgPerWeek: 0,
      } as VelocityAnalysis,
      quality: {
        signals: [],
        periods: [],
        inflectionPoints: [],
      } as QualityEvolutionAnalysis,
      structure: {
        directoryTimeline: [],
        sizeTrajectory: [],
        refactoringEvents: [],
      } as StructuralGrowthAnalysis,
    };

    const result = buildUnifiedTimeline(emptyBundle);

    expect(result.events).toHaveLength(0);
    expect(result.epochs).toHaveLength(0);
    expect(typeof result.narrative).toBe('string');
  });
});
