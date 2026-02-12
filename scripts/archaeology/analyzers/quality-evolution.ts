/**
 * Analyzes quality signals: test adoption, TS strictness, churn, reverts.
 */
import type {
  RawCommit,
  QualitySignal,
  QualityPeriod,
  QualityEvolutionAnalysis,
} from '../types.js';

const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /\.test\./,
  /\.spec\./,
  /tests?\//,
];

const TS_CONFIG_PATTERNS = [
  /tsconfig.*\.json$/,
];

const ERROR_HANDLING_PATTERNS = [
  /error[-.]handler/i,
  /error[-.]middleware/i,
  /error[-.]boundary/i,
];

const DOC_PATTERNS = [
  /\.md$/,
  /docs?\//,
  /README/i,
  /CHANGELOG/i,
  /CONTRIBUTING/i,
];

function isTestFile(path: string): boolean {
  return TEST_FILE_PATTERNS.some(p => p.test(path));
}

function isTsConfig(path: string): boolean {
  return TS_CONFIG_PATTERNS.some(p => p.test(path));
}

function isErrorHandling(path: string): boolean {
  return ERROR_HANDLING_PATTERNS.some(p => p.test(path));
}

function isDocFile(path: string): boolean {
  return DOC_PATTERNS.some(p => p.test(path));
}

function isRevert(message: string): boolean {
  return /^revert/i.test(message.trim());
}

function extractSignals(commits: readonly RawCommit[]): readonly QualitySignal[] {
  const signals: QualitySignal[] = [];

  for (const commit of commits) {
    // Check for reverts
    if (isRevert(commit.message)) {
      signals.push({
        type: 'revert',
        date: commit.date,
        repo: commit.repo,
        description: `Revert commit: ${commit.message.slice(0, 80)}`,
        evidence: commit.sha,
      });
    }

    // Check file changes for quality signals
    for (const file of commit.filesChanged) {
      if (file.status === 'added' && isTestFile(file.path)) {
        signals.push({
          type: 'test-adoption',
          date: commit.date,
          repo: commit.repo,
          description: `Test file added: ${file.path}`,
          evidence: file.path,
        });
      }

      if (isTsConfig(file.path)) {
        signals.push({
          type: 'ts-strictness',
          date: commit.date,
          repo: commit.repo,
          description: `TypeScript config modified: ${file.path}`,
          evidence: file.path,
        });
      }

      if (file.status === 'added' && isErrorHandling(file.path)) {
        signals.push({
          type: 'error-handling',
          date: commit.date,
          repo: commit.repo,
          description: `Error handling added: ${file.path}`,
          evidence: file.path,
        });
      }

      if (file.status === 'added' && isDocFile(file.path)) {
        signals.push({
          type: 'docs',
          date: commit.date,
          repo: commit.repo,
          description: `Documentation added: ${file.path}`,
          evidence: file.path,
        });
      }
    }

    // Check for refactoring commits
    if (/^refactor/i.test(commit.message.trim())) {
      signals.push({
        type: 'refactor',
        date: commit.date,
        repo: commit.repo,
        description: `Refactoring: ${commit.message.slice(0, 80)}`,
        evidence: commit.sha,
      });
    }
  }

  // Detect churn: same file modified 3+ times in a week
  const churnSignals = detectChurn(commits);
  signals.push(...churnSignals);

  return signals.sort((a, b) => a.date.localeCompare(b.date));
}

function detectChurn(commits: readonly RawCommit[]): readonly QualitySignal[] {
  const weekFileMap = new Map<string, Map<string, { count: number; repo: string; date: string }>>();

  for (const commit of commits) {
    const weekStart = getWeekStart(commit.date);
    if (!weekFileMap.has(weekStart)) {
      weekFileMap.set(weekStart, new Map());
    }
    const fileMap = weekFileMap.get(weekStart)!;

    for (const file of commit.filesChanged) {
      if (file.status === 'modified') {
        const existing = fileMap.get(file.path);
        if (existing) {
          fileMap.set(file.path, { ...existing, count: existing.count + 1 });
        } else {
          fileMap.set(file.path, { count: 1, repo: commit.repo, date: commit.date });
        }
      }
    }
  }

  const signals: QualitySignal[] = [];
  for (const [weekStart, fileMap] of weekFileMap) {
    for (const [filePath, { count, repo, date }] of fileMap) {
      if (count >= 3) {
        signals.push({
          type: 'churn',
          date,
          repo,
          description: `High churn: ${filePath} modified ${count} times in week of ${weekStart}`,
          evidence: filePath,
        });
      }
    }
  }

  return signals;
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function buildPeriods(
  signals: readonly QualitySignal[],
  commits: readonly RawCommit[],
): readonly QualityPeriod[] {
  if (signals.length === 0 && commits.length === 0) return [];

  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  // Group into monthly periods
  const monthMap = new Map<string, { signals: QualitySignal[]; commits: RawCommit[] }>();

  for (const commit of sorted) {
    const monthKey = commit.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { signals: [], commits: [] });
    }
    monthMap.get(monthKey)!.commits.push(commit);
  }

  for (const signal of signals) {
    const monthKey = signal.date.slice(0, 7);
    if (monthMap.has(monthKey)) {
      monthMap.get(monthKey)!.signals.push(signal);
    }
  }

  const periods: QualityPeriod[] = [];
  for (const [monthKey, data] of [...monthMap.entries()].sort()) {
    const startDate = `${monthKey}-01`;
    const endDate = getMonthEnd(monthKey);
    const testSignals = data.signals.filter(s => s.type === 'test-adoption');
    const churnSignals = data.signals.filter(s => s.type === 'churn');
    const revertSignals = data.signals.filter(s => s.type === 'revert');

    const frustrationScore = Math.min(
      1,
      (churnSignals.length * 0.3 + revertSignals.length * 0.5) /
        Math.max(1, data.commits.length * 0.1),
    );

    const qualityTrend = determineQualityTrend(data.signals, frustrationScore);

    periods.push({
      startDate,
      endDate,
      signals: data.signals,
      testFileCount: testSignals.length,
      frustrationScore: Math.round(frustrationScore * 100) / 100,
      qualityTrend,
    });
  }

  return periods;
}

function getMonthEnd(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
}

function determineQualityTrend(
  signals: readonly QualitySignal[],
  frustrationScore: number,
): 'improving' | 'stable' | 'declining' {
  const positiveSignals = signals.filter(
    s => s.type === 'test-adoption' || s.type === 'error-handling' || s.type === 'refactor',
  ).length;
  const negativeSignals = signals.filter(
    s => s.type === 'churn' || s.type === 'revert',
  ).length;

  if (frustrationScore > 0.5 || negativeSignals > positiveSignals * 2) return 'declining';
  if (positiveSignals > negativeSignals) return 'improving';
  return 'stable';
}

function findInflectionPoints(
  periods: readonly QualityPeriod[],
  signals: readonly QualitySignal[],
): readonly { readonly date: string; readonly type: string; readonly description: string }[] {
  const points: { date: string; type: string; description: string }[] = [];

  // Find first test adoption
  const firstTest = signals.find(s => s.type === 'test-adoption');
  if (firstTest) {
    points.push({
      date: firstTest.date,
      type: 'test-adoption',
      description: `First test file introduced: ${firstTest.evidence}`,
    });
  }

  // Find first TS config change
  const firstTs = signals.find(s => s.type === 'ts-strictness');
  if (firstTs) {
    points.push({
      date: firstTs.date,
      type: 'ts-strictness',
      description: `TypeScript configuration changed: ${firstTs.evidence}`,
    });
  }

  // Find trend changes between adjacent periods
  for (let i = 1; i < periods.length; i++) {
    if (periods[i].qualityTrend !== periods[i - 1].qualityTrend) {
      points.push({
        date: periods[i].startDate,
        type: `trend-${periods[i].qualityTrend}`,
        description: `Quality trend shifted from ${periods[i - 1].qualityTrend} to ${periods[i].qualityTrend}`,
      });
    }
  }

  // Find frustration spikes
  for (const period of periods) {
    if (period.frustrationScore > 0.5) {
      points.push({
        date: period.startDate,
        type: 'frustration-spike',
        description: `High frustration score (${period.frustrationScore}) — churn and reverts elevated`,
      });
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function analyzeQualityEvolution(commits: readonly RawCommit[]): QualityEvolutionAnalysis {
  const signals = extractSignals(commits);
  const periods = buildPeriods(signals, commits);
  const inflectionPoints = findInflectionPoints(periods, signals);

  return { signals, periods, inflectionPoints };
}
