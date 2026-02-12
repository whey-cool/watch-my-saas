/**
 * Generates the Archaeology-Tool-Transitions wiki page from analysis data.
 */
import type { ToolTransitionAnalysis } from '../types.js';

export function generateToolTransitionsPage(analysis: ToolTransitionAnalysis): string {
  const lines: string[] = [
    '# Archaeology: Tool Transitions',
    '',
    '_AI tool evolution across the whey-cool ecosystem, extracted from Co-Authored-By signatures._',
    '',
  ];

  // Signatures table
  lines.push('## Detected Signatures', '');
  lines.push('| Signature | Category |');
  lines.push('|-----------|----------|');
  for (const sig of analysis.signatures) {
    lines.push(`| ${sig.normalized} | ${sig.category} |`);
  }
  lines.push('');

  // Timeline
  lines.push('## Signature Timeline', '');
  if (analysis.signatureTimeline.length > 0) {
    // Group by week for readability
    const weekMap = new Map<string, Map<string, number>>();
    for (const entry of analysis.signatureTimeline) {
      const weekKey = entry.date.slice(0, 10);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }
      const dayMap = weekMap.get(weekKey)!;
      dayMap.set(
        entry.signature.normalized,
        (dayMap.get(entry.signature.normalized) ?? 0) + entry.count,
      );
    }

    // Show daily breakdown (summarized)
    const dates = [...weekMap.keys()].sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    lines.push(`Active period: **${firstDate}** to **${lastDate}**`, '');

    // Aggregate by signature across all time
    const totalBySignature = new Map<string, number>();
    for (const dayMap of weekMap.values()) {
      for (const [sig, count] of dayMap) {
        totalBySignature.set(sig, (totalBySignature.get(sig) ?? 0) + count);
      }
    }

    lines.push('### Usage by Signature', '');
    lines.push('| Signature | Total Commits |');
    lines.push('|-----------|--------------|');
    const sorted = [...totalBySignature.entries()].sort((a, b) => b[1] - a[1]);
    for (const [sig, count] of sorted) {
      lines.push(`| ${sig} | ${count} |`);
    }
    lines.push('');
  }

  // Transitions
  lines.push('## Transitions', '');
  if (analysis.transitions.length > 0) {
    for (const t of analysis.transitions) {
      lines.push(
        `### ${t.from.normalized} → ${t.to.normalized}`,
        '',
        `- **Date:** ${t.date}`,
        `- **Repo:** ${t.repo}`,
        `- **Confidence:** ${Math.round(t.confidence * 100)}%`,
        '',
      );
    }
  } else {
    lines.push('_No tool transitions detected._', '');
  }

  // Summary
  lines.push('## Summary', '', analysis.summary, '');

  return lines.join('\n');
}
