/**
 * Generates the Archaeology-Velocity-Phases wiki page from analysis data.
 */
import type { VelocityAnalysis } from '../types.js';

export function generateVelocityPhasesPage(analysis: VelocityAnalysis): string {
  const lines: string[] = [
    '# Archaeology: Velocity Phases',
    '',
    '_Development velocity over time — commit frequency, AI adoption, and phase classification._',
    '',
  ];

  // Overview
  lines.push('## Overview', '');
  lines.push(`- **Total commits:** ${analysis.totalCommits}`);
  lines.push(`- **Total weeks:** ${analysis.totalWeeks}`);
  lines.push(`- **Average commits/week:** ${analysis.overallAvgPerWeek}`);
  lines.push('');

  // Phases
  lines.push('## Phases', '');
  if (analysis.phases.length > 0) {
    lines.push('| Phase | Type | Weeks | Avg/Week | Period |');
    lines.push('|-------|------|-------|----------|--------|');
    for (let i = 0; i < analysis.phases.length; i++) {
      const p = analysis.phases[i];
      const emoji = phaseEmoji(p.type);
      lines.push(
        `| ${emoji} ${p.type} | ${p.description} | ${p.weekCount} | ${p.avgCommitsPerWeek} | ${p.startWeek} — ${p.endWeek} |`,
      );
    }
    lines.push('');
  }

  // Weekly breakdown (condensed — show monthly summaries)
  lines.push('## Monthly Summary', '');
  if (analysis.weeklyBuckets.length > 0) {
    const monthMap = new Map<string, { commits: number; aiAssisted: number; weeks: number }>();
    for (const bucket of analysis.weeklyBuckets) {
      const monthKey = bucket.weekStart.slice(0, 7);
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.commits += bucket.commitCount;
        existing.aiAssisted += bucket.aiAssistedCount;
        existing.weeks += 1;
      } else {
        monthMap.set(monthKey, {
          commits: bucket.commitCount,
          aiAssisted: bucket.aiAssistedCount,
          weeks: 1,
        });
      }
    }

    lines.push('| Month | Commits | AI-Assisted | AI % | Weeks |');
    lines.push('|-------|---------|-------------|------|-------|');
    for (const [month, data] of [...monthMap.entries()].sort()) {
      const aiPct = data.commits > 0 ? Math.round((data.aiAssisted / data.commits) * 100) : 0;
      lines.push(`| ${month} | ${data.commits} | ${data.aiAssisted} | ${aiPct}% | ${data.weeks} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function phaseEmoji(type: string): string {
  const map: Record<string, string> = {
    gap: '⏸️',
    acceleration: '🚀',
    plateau: '📊',
    decline: '📉',
    recovery: '🔄',
    sustained: '✅',
  };
  return map[type] ?? '•';
}
