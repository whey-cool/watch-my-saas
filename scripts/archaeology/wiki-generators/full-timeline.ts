/**
 * Generates the Archaeology-Full-Timeline wiki page from the unified timeline.
 */
import type { UnifiedTimelineAnalysis } from '../types.js';

export function generateFullTimelinePage(analysis: UnifiedTimelineAnalysis): string {
  const lines: string[] = [
    '# Archaeology: Full Timeline',
    '',
    '_Unified chronological narrative of development across the whey-cool ecosystem._',
    '',
  ];

  // Narrative summary
  lines.push('## Narrative', '');
  lines.push(analysis.narrative, '');

  // Stats
  lines.push('## Overview', '');
  lines.push(`- **Total events:** ${analysis.events.length}`);
  lines.push(`- **Weekly epochs:** ${analysis.epochs.length}`);

  const highEvents = analysis.events.filter(e => e.significance === 'high');
  lines.push(`- **High-significance events:** ${highEvents.length}`);
  lines.push('');

  // Event type breakdown
  const typeCounts = new Map<string, number>();
  for (const event of analysis.events) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  }
  lines.push('### Events by Type', '');
  lines.push('| Type | Count |');
  lines.push('|------|-------|');
  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${type} | ${count} |`);
  }
  lines.push('');

  // Weekly epochs (reverse chronological for readability)
  lines.push('## Weekly Timeline', '');
  const reversedEpochs = [...analysis.epochs].reverse();

  for (const epoch of reversedEpochs) {
    const highCount = epoch.events.filter(e => e.significance === 'high').length;
    const marker = highCount > 0 ? ' 🔥' : '';

    lines.push(`### Week of ${epoch.weekStart}${marker}`);
    lines.push('');
    lines.push(`_${epoch.summary}_`);
    lines.push('');

    for (const event of epoch.events) {
      const sigMarker = event.significance === 'high' ? '**' : '';
      const repoTag = event.repo ? ` (${event.repo})` : '';
      lines.push(
        `- ${sigMarker}[${event.type}]${sigMarker} ${event.title}${repoTag}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
