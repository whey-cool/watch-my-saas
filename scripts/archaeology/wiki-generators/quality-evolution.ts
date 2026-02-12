/**
 * Generates the Archaeology-Quality-Evolution wiki page from analysis data.
 */
import type { QualityEvolutionAnalysis } from '../types.js';

export function generateQualityEvolutionPage(analysis: QualityEvolutionAnalysis): string {
  const lines: string[] = [
    '# Archaeology: Quality Evolution',
    '',
    '_How code quality practices evolved — test adoption, TypeScript strictness, churn, and frustration signals._',
    '',
  ];

  // Inflection points (most important)
  lines.push('## Key Inflection Points', '');
  if (analysis.inflectionPoints.length > 0) {
    for (const point of analysis.inflectionPoints) {
      lines.push(`### ${point.date} — ${point.type}`);
      lines.push('', point.description, '');
    }
  } else {
    lines.push('_No inflection points detected._', '');
  }

  // Quality periods
  lines.push('## Quality by Period', '');
  if (analysis.periods.length > 0) {
    lines.push('| Period | Trend | Test Files Added | Frustration Score |');
    lines.push('|--------|-------|-----------------|-------------------|');
    for (const period of analysis.periods) {
      const trendEmoji = period.qualityTrend === 'improving' ? '📈' :
        period.qualityTrend === 'declining' ? '📉' : '➡️';
      lines.push(
        `| ${period.startDate.slice(0, 7)} | ${trendEmoji} ${period.qualityTrend} | ${period.testFileCount} | ${period.frustrationScore} |`,
      );
    }
    lines.push('');
  }

  // Signal breakdown
  lines.push('## Signal Breakdown', '');
  const signalCounts = new Map<string, number>();
  for (const signal of analysis.signals) {
    signalCounts.set(signal.type, (signalCounts.get(signal.type) ?? 0) + 1);
  }

  if (signalCounts.size > 0) {
    lines.push('| Signal Type | Count |');
    lines.push('|-------------|-------|');
    for (const [type, count] of [...signalCounts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');
  }

  // Notable frustration periods
  const frustrationPeriods = analysis.periods.filter(p => p.frustrationScore > 0.3);
  if (frustrationPeriods.length > 0) {
    lines.push('## Frustration Periods', '');
    for (const period of frustrationPeriods) {
      const churnSignals = period.signals.filter(s => s.type === 'churn');
      const revertSignals = period.signals.filter(s => s.type === 'revert');
      lines.push(`### ${period.startDate.slice(0, 7)} (score: ${period.frustrationScore})`);
      lines.push('');
      if (churnSignals.length > 0) {
        lines.push(`- **Churn:** ${churnSignals.length} high-churn file(s)`);
      }
      if (revertSignals.length > 0) {
        lines.push(`- **Reverts:** ${revertSignals.length} revert(s)`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
