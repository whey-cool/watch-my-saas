/**
 * Generates the Archaeology-Structural-Growth wiki page from analysis data.
 */
import type { StructuralGrowthAnalysis } from '../types.js';

export function generateStructuralGrowthPage(analysis: StructuralGrowthAnalysis): string {
  const lines: string[] = [
    '# Archaeology: Structural Growth',
    '',
    '_How the codebase structure evolved — directory emergence, size trajectory, and refactoring events._',
    '',
  ];

  // Directory timeline (top-level only for readability)
  const topLevelDirs = analysis.directoryTimeline.filter(d => !d.path.includes('/'));
  lines.push('## Top-Level Directory Timeline', '');
  if (topLevelDirs.length > 0) {
    lines.push('| Directory | First Seen | Repo |');
    lines.push('|-----------|-----------|------|');
    for (const dir of topLevelDirs) {
      lines.push(`| \`${dir.path}/\` | ${dir.firstSeenDate.slice(0, 10)} | ${dir.firstSeenRepo} |`);
    }
    lines.push('');
  }

  // Full directory timeline (second-level)
  const secondLevelDirs = analysis.directoryTimeline.filter(
    d => d.path.split('/').length === 2,
  );
  if (secondLevelDirs.length > 0) {
    lines.push('## Second-Level Directory Timeline', '');
    lines.push('| Directory | First Seen | Repo |');
    lines.push('|-----------|-----------|------|');
    for (const dir of secondLevelDirs) {
      lines.push(`| \`${dir.path}/\` | ${dir.firstSeenDate.slice(0, 10)} | ${dir.firstSeenRepo} |`);
    }
    lines.push('');
  }

  // Size trajectory (monthly summary)
  lines.push('## Codebase Size Trajectory', '');
  if (analysis.sizeTrajectory.length > 0) {
    const monthMap = new Map<string, { totalFiles: number; additions: number; deletions: number }>();
    for (const point of analysis.sizeTrajectory) {
      const monthKey = point.date.slice(0, 7);
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.totalFiles = Math.max(existing.totalFiles, point.totalFiles);
        existing.additions += point.additions;
        existing.deletions += point.deletions;
      } else {
        monthMap.set(monthKey, {
          totalFiles: point.totalFiles,
          additions: point.additions,
          deletions: point.deletions,
        });
      }
    }

    lines.push('| Month | Max Files | Lines Added | Lines Deleted | Net |');
    lines.push('|-------|-----------|-------------|---------------|-----|');
    for (const [month, data] of [...monthMap.entries()].sort()) {
      const net = data.additions - data.deletions;
      const netStr = net >= 0 ? `+${net}` : `${net}`;
      lines.push(`| ${month} | ${data.totalFiles} | +${data.additions} | -${data.deletions} | ${netStr} |`);
    }
    lines.push('');
  }

  // Refactoring events
  lines.push('## Refactoring Events', '');
  if (analysis.refactoringEvents.length > 0) {
    for (const event of analysis.refactoringEvents) {
      lines.push(`### ${event.date.slice(0, 10)} — ${event.type.replace(/-/g, ' ')}`);
      lines.push('');
      lines.push(`- **Repo:** ${event.repo}`);
      lines.push(`- **Files affected:** ${event.filesAffected}`);
      lines.push(`- **SHA:** \`${event.sha.slice(0, 8)}\``);
      lines.push(`- ${event.description}`);
      lines.push('');
    }
  } else {
    lines.push('_No major refactoring events detected._', '');
  }

  return lines.join('\n');
}
