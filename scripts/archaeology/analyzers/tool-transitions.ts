/**
 * Analyzes Co-Authored-By signatures to detect AI tool transitions over time.
 */
import type {
  RawCommit,
  ToolSignature,
  ToolTransition,
  ToolTransitionAnalysis,
  SignatureTimelineEntry,
} from '../types.js';

const SIGNATURE_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly normalized: string;
  readonly category: ToolSignature['category'];
}[] = [
  { pattern: /claude[- ]?flow/i, normalized: 'claude-flow', category: 'claude-flow' },
  { pattern: /parallel\s+development/i, normalized: 'Parallel Development', category: 'parallel-dev' },
  { pattern: /claude\s+opus\s+4\.6/i, normalized: 'Claude Opus 4.6', category: 'claude-opus' },
  { pattern: /claude\s+opus\s+4\.5/i, normalized: 'Claude Opus 4.5', category: 'claude-opus' },
  { pattern: /claude\s+sonnet\s+4\.5/i, normalized: 'Claude Sonnet 4.5', category: 'claude-sonnet' },
  { pattern: /claude\s+code/i, normalized: 'Claude Code', category: 'claude-code' },
  { pattern: /^claude$/i, normalized: 'Claude', category: 'claude-generic' },
  { pattern: /copilot/i, normalized: 'GitHub Copilot', category: 'copilot' },
];

export function normalizeSignature(raw: string): ToolSignature {
  // Strip "Co-Authored-By: " prefix if present
  const withoutPrefix = raw.replace(/^Co-Authored-By:\s*/i, '');
  // Extract just the name part from "Name <email>" format
  const nameMatch = withoutPrefix.match(/^([^<]+?)(?:\s*<.*>)?$/);
  const name = nameMatch ? nameMatch[1].trim() : withoutPrefix.trim();

  for (const { pattern, normalized, category } of SIGNATURE_PATTERNS) {
    if (pattern.test(name)) {
      return { raw, normalized, category };
    }
  }

  return { raw, normalized: name, category: 'other' };
}

function extractCoAuthorSignatures(commit: RawCommit): readonly ToolSignature[] {
  return commit.coAuthors.map(normalizeSignature);
}

function buildSignatureTimeline(commits: readonly RawCommit[]): readonly SignatureTimelineEntry[] {
  const dateSignatureMap = new Map<string, Map<string, { signature: ToolSignature; repo: string; count: number }>>();

  for (const commit of commits) {
    const signatures = extractCoAuthorSignatures(commit);
    const dateKey = commit.date.slice(0, 10); // YYYY-MM-DD

    for (const sig of signatures) {
      if (!dateSignatureMap.has(dateKey)) {
        dateSignatureMap.set(dateKey, new Map());
      }
      const dayMap = dateSignatureMap.get(dateKey)!;
      const key = sig.normalized;
      const existing = dayMap.get(key);
      if (existing) {
        dayMap.set(key, { ...existing, count: existing.count + 1 });
      } else {
        dayMap.set(key, { signature: sig, repo: commit.repo, count: 1 });
      }
    }
  }

  const entries: SignatureTimelineEntry[] = [];
  const sortedDates = [...dateSignatureMap.keys()].sort();

  for (const date of sortedDates) {
    const dayMap = dateSignatureMap.get(date)!;
    for (const { signature, repo, count } of dayMap.values()) {
      entries.push({ date, signature, repo, count });
    }
  }

  return entries;
}

function detectTransitions(
  timeline: readonly SignatureTimelineEntry[],
  commits: readonly RawCommit[],
): readonly ToolTransition[] {
  if (timeline.length === 0) return [];

  // Group by week to smooth out noise
  const weeklyDominant = new Map<string, { signature: ToolSignature; repo: string; totalCount: number }>();

  for (const entry of timeline) {
    const weekStart = getWeekStart(entry.date);
    const key = `${weekStart}::${entry.signature.normalized}`;
    const existing = weeklyDominant.get(key);
    if (existing) {
      weeklyDominant.set(key, { ...existing, totalCount: existing.totalCount + entry.count });
    } else {
      weeklyDominant.set(key, { signature: entry.signature, repo: entry.repo, totalCount: entry.count });
    }
  }

  // Find dominant signature per week
  const weekSignatures = new Map<string, { signature: ToolSignature; repo: string; count: number }>();
  for (const [key, value] of weeklyDominant) {
    const weekStart = key.split('::')[0];
    const existing = weekSignatures.get(weekStart);
    if (!existing || value.totalCount > existing.count) {
      weekSignatures.set(weekStart, { signature: value.signature, repo: value.repo, count: value.totalCount });
    }
  }

  const sortedWeeks = [...weekSignatures.keys()].sort();
  const transitions: ToolTransition[] = [];

  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = weekSignatures.get(sortedWeeks[i - 1])!;
    const curr = weekSignatures.get(sortedWeeks[i])!;

    if (prev.signature.normalized !== curr.signature.normalized) {
      // Confidence based on sample size and category distance
      const sampleConfidence = Math.min(1, (prev.count + curr.count) / 10);
      const categoryDiff = prev.signature.category !== curr.signature.category ? 1.0 : 0.7;
      const confidence = Math.round(sampleConfidence * categoryDiff * 100) / 100;

      transitions.push({
        from: prev.signature,
        to: curr.signature,
        date: sortedWeeks[i],
        repo: curr.repo,
        confidence,
      });
    }
  }

  return transitions;
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function buildSummary(
  signatures: readonly ToolSignature[],
  transitions: readonly ToolTransition[],
): string {
  const uniqueTools = [...new Set(signatures.map(s => s.normalized))];
  const lines = [
    `Detected ${uniqueTools.length} distinct AI tool signatures across the codebase.`,
  ];

  if (transitions.length > 0) {
    lines.push(`Found ${transitions.length} tool transition(s):`);
    for (const t of transitions) {
      lines.push(`  - ${t.from.normalized} → ${t.to.normalized} (${t.date}, confidence: ${t.confidence})`);
    }
  } else {
    lines.push('No tool transitions detected.');
  }

  return lines.join('\n');
}

export function analyzeToolTransitions(commits: readonly RawCommit[]): ToolTransitionAnalysis {
  const allSignatures: ToolSignature[] = [];
  for (const commit of commits) {
    const sigs = extractCoAuthorSignatures(commit);
    allSignatures.push(...sigs);
  }

  const uniqueSignatures = deduplicateSignatures(allSignatures);
  const timeline = buildSignatureTimeline(commits);
  const transitions = detectTransitions(timeline, commits);
  const summary = buildSummary(uniqueSignatures, transitions);

  return {
    signatures: uniqueSignatures,
    signatureTimeline: timeline,
    transitions,
    summary,
  };
}

function deduplicateSignatures(signatures: readonly ToolSignature[]): readonly ToolSignature[] {
  const seen = new Set<string>();
  const result: ToolSignature[] = [];
  for (const sig of signatures) {
    if (!seen.has(sig.normalized)) {
      seen.add(sig.normalized);
      result.push(sig);
    }
  }
  return result;
}
