/**
 * Project phase detection.
 * Synthesizes individual metrics into a "you are here" indicator.
 *
 * Phases: Building → Drifting → Stabilizing → Ship-Ready
 * Any phase can transition to any other based on current data.
 */

import type { MetricWindow, PhaseIndicator, ProjectPhase } from '../../types.js';

interface PhaseScore {
  readonly phase: ProjectPhase;
  readonly score: number;
  readonly signals: readonly string[];
  readonly guidance: string;
}

export function detectPhase(
  current: MetricWindow,
  history: readonly MetricWindow[],
): PhaseIndicator {
  const scores: readonly PhaseScore[] = [
    scoreBuilding(current),
    scoreDrifting(current),
    scoreStabilizing(current, history),
    scoreShipReady(current, history),
  ];

  const best = scores.reduce((a, b) => (b.score > a.score ? b : a));

  return {
    phase: best.phase,
    confidence: Math.min(best.score, 1),
    signals: best.signals,
    guidance: best.guidance,
  };
}

function featRatio(w: MetricWindow): number {
  return w.totalCommits > 0 ? w.featCommits / w.totalCommits : 0;
}

function cleanupRatio(w: MetricWindow): number {
  return w.totalCommits > 0
    ? (w.fixCommits + w.refactorCommits + w.choreCommits) / w.totalCommits
    : 0;
}

function scoreBuilding(current: MetricWindow): PhaseScore {
  const signals: string[] = [];
  let score = 0.2; // base score — default phase

  const fr = featRatio(current);
  if (fr > 0.3) {
    score += 0.4;
    signals.push(`Feature ratio ${(fr * 100).toFixed(0)}% — features are landing`);
  } else if (fr > 0.15) {
    score += 0.2;
    signals.push(`Feature ratio ${(fr * 100).toFixed(0)}% — some features landing`);
  }

  if (current.testRatio > 0.1) {
    score += 0.2;
    signals.push('Tests present alongside features');
  }

  if (current.totalCommits > 5) {
    score += 0.1;
    signals.push('Active development velocity');
  }

  return {
    phase: 'building',
    score,
    signals,
    guidance: 'Keep shipping. Watch for churn creeping in.',
  };
}

function scoreDrifting(current: MetricWindow): PhaseScore {
  const signals: string[] = [];
  let score = 0;

  if (current.aiRatio > 0.7) {
    score += 0.3;
    signals.push(`AI ratio ${(current.aiRatio * 100).toFixed(0)}% — heavy AI generation`);
  } else if (current.aiRatio > 0.5) {
    score += 0.1;
  }

  const cr = cleanupRatio(current);
  if (cr > 0.5) {
    score += 0.4;
    signals.push(`Cleanup ratio ${(cr * 100).toFixed(0)}% — fixes/refactors dominating`);
  } else if (cr > 0.3) {
    score += 0.2;
    signals.push(`Cleanup ratio ${(cr * 100).toFixed(0)}% — significant cleanup activity`);
  }

  if (current.testRatio < 0.1) {
    score += 0.2;
    signals.push('Test coverage thin');
  }

  return {
    phase: 'drifting',
    score,
    signals,
    guidance: 'Slow down. Focus on refactoring and adding tests before generating more code.',
  };
}

function scoreStabilizing(
  current: MetricWindow,
  history: readonly MetricWindow[],
): PhaseScore {
  const signals: string[] = [];
  let score = 0;

  if (history.length === 0) return { phase: 'stabilizing', score: 0, signals: [], guidance: '' };

  const prevCR = cleanupRatio(history[history.length - 1]);
  const curCR = cleanupRatio(current);

  if (prevCR > curCR && curCR < 0.5) {
    score += 0.3;
    signals.push(`Cleanup declining: ${(prevCR * 100).toFixed(0)}% → ${(curCR * 100).toFixed(0)}%`);
  }

  const prevTR = history[history.length - 1].testRatio;
  if (current.testRatio > prevTR) {
    score += 0.3;
    signals.push(`Test ratio improving: ${(prevTR * 100).toFixed(0)}% → ${(current.testRatio * 100).toFixed(0)}%`);
  }

  if (current.refactorCommits > 0) {
    score += 0.1;
    signals.push('Active refactoring');
  }

  if (current.testRatio > 0.2) {
    score += 0.2;
    signals.push('Good test coverage');
  }

  return {
    phase: 'stabilizing',
    score,
    signals,
    guidance: 'Polish. Write docs. Prepare to ship.',
  };
}

function scoreShipReady(
  current: MetricWindow,
  history: readonly MetricWindow[],
): PhaseScore {
  const signals: string[] = [];
  let score = 0;

  if (history.length < 2) return { phase: 'ship-ready', score: 0, signals: [], guidance: '' };

  // Stable velocity: recent windows have similar commit counts
  const recentCounts = [...history.slice(-2), current].map((w) => w.totalCommits);
  const avgCount = recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length;
  const variance = recentCounts.reduce((sum, c) => sum + Math.abs(c - avgCount), 0) / recentCounts.length;
  if (avgCount > 0 && variance / avgCount < 0.3) {
    score += 0.3;
    signals.push('Stable development velocity');
  }

  if (current.testRatio > 0.2) {
    score += 0.3;
    signals.push(`Test ratio ${(current.testRatio * 100).toFixed(0)}% — good coverage`);
  }

  const cr = cleanupRatio(current);
  if (cr < 0.3) {
    score += 0.2;
    signals.push('Low churn — code is settling');
  }

  if (featRatio(current) > 0.15) {
    score += 0.1;
    signals.push('Features still landing');
  }

  return {
    phase: 'ship-ready',
    score,
    signals,
    guidance: 'Ready to ship. Focus on polish and documentation.',
  };
}
