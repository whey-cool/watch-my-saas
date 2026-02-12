/**
 * Analyzes Co-Authored-By signatures AND commit author identities
 * to detect AI tool transitions over time.
 *
 * Two detection dimensions:
 * 1. Co-Authored-By headers (Claude family, claude-flow, Parallel Development)
 * 2. Author identity (Cursor Agent, Claude Code as committer, bots)
 */
import type {
  RawCommit,
  ToolSignature,
  ToolTransition,
  ToolTransitionAnalysis,
  SignatureTimelineEntry,
} from '../types.js';

// --- Name-based patterns (for Co-Authored-By and author names) ---

const NAME_PATTERNS: readonly {
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
  { pattern: /cursor\s*agent/i, normalized: 'Cursor Agent', category: 'cursor' },
  { pattern: /copilot/i, normalized: 'GitHub Copilot', category: 'copilot' },
  { pattern: /dependabot/i, normalized: 'Dependabot', category: 'bot' },
  { pattern: /github[- ]actions/i, normalized: 'GitHub Actions', category: 'bot' },
];

// --- Email-based patterns (for author identity detection) ---

const EMAIL_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly normalized: string;
  readonly category: ToolSignature['category'];
}[] = [
  { pattern: /cursoragent@cursor\.com/i, normalized: 'Cursor Agent', category: 'cursor' },
  { pattern: /cursor@/i, normalized: 'Cursor', category: 'cursor' },
  { pattern: /\[bot\]@/i, normalized: 'Bot', category: 'bot' },
  { pattern: /dependabot/i, normalized: 'Dependabot', category: 'bot' },
  { pattern: /github-actions/i, normalized: 'GitHub Actions', category: 'bot' },
];

export function normalizeSignature(raw: string): ToolSignature {
  // Strip "Co-Authored-By: " prefix if present
  const withoutPrefix = raw.replace(/^Co-Authored-By:\s*/i, '');
  // Extract just the name part from "Name <email>" format
  const nameMatch = withoutPrefix.match(/^([^<]+?)(?:\s*<.*>)?$/);
  const name = nameMatch ? nameMatch[1].trim() : withoutPrefix.trim();

  for (const { pattern, normalized, category } of NAME_PATTERNS) {
    if (pattern.test(name)) {
      return { raw, normalized, category, source: 'co-author' };
    }
  }

  return { raw, normalized: name, category: 'other', source: 'co-author' };
}

/**
 * Detect AI tool from commit author name + email.
 * Returns null if the author appears to be human.
 */
function detectAuthorIdentity(author: string, authorEmail: string): ToolSignature | null {
  // Check email patterns first (most reliable)
  for (const { pattern, normalized, category } of EMAIL_PATTERNS) {
    if (pattern.test(authorEmail)) {
      return {
        raw: `${author} <${authorEmail}>`,
        normalized,
        category,
        source: 'author-identity',
      };
    }
  }

  // Check author name patterns
  for (const { pattern, normalized, category } of NAME_PATTERNS) {
    if (pattern.test(author)) {
      return {
        raw: `${author} <${authorEmail}>`,
        normalized,
        category,
        source: 'author-identity',
      };
    }
  }

  return null;
}

function extractAllSignatures(commit: RawCommit): readonly ToolSignature[] {
  const sigs: ToolSignature[] = [];

  // Co-Authored-By signatures
  for (const ca of commit.coAuthors) {
    sigs.push(normalizeSignature(ca));
  }

  // Author identity (only if it looks like an AI/bot)
  const authorSig = detectAuthorIdentity(commit.author, commit.authorEmail);
  if (authorSig !== null) {
    // Avoid duplicate if both co-author and author point to same tool
    const isDuplicate = sigs.some(s => s.normalized === authorSig.normalized);
    if (!isDuplicate) {
      sigs.push(authorSig);
    }
  }

  return sigs;
}

function buildSignatureTimeline(commits: readonly RawCommit[]): readonly SignatureTimelineEntry[] {
  const dateSignatureMap = new Map<string, Map<string, { signature: ToolSignature; repo: string; count: number }>>();

  for (const commit of commits) {
    const signatures = extractAllSignatures(commit);
    const dateKey = commit.date.slice(0, 10);

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
): readonly ToolTransition[] {
  if (timeline.length === 0) return [];

  // Group by week to smooth out noise
  const weeklyDominant = new Map<string, { signature: ToolSignature; repo: string; totalCount: number }>();

  for (const entry of timeline) {
    // Skip 'bot', 'human', 'other' from transition detection — focus on dev tools
    if (entry.signature.category === 'bot' || entry.signature.category === 'human' || entry.signature.category === 'other') {
      continue;
    }

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
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function buildSummary(
  signatures: readonly ToolSignature[],
  transitions: readonly ToolTransition[],
  commitStats: { total: number; aiAuthored: number; aiCoAuthored: number; human: number },
): string {
  const uniqueTools = [...new Set(signatures.map(s => s.normalized))];
  const lines = [
    `Detected ${uniqueTools.length} distinct AI tool signatures across the codebase.`,
    `  - ${commitStats.aiCoAuthored} commits with AI co-author headers`,
    `  - ${commitStats.aiAuthored} commits authored directly by AI tools`,
    `  - ${commitStats.human} commits by human authors (no AI signal)`,
  ];

  if (transitions.length > 0) {
    lines.push('', `Found ${transitions.length} tool transition(s):`);
    for (const t of transitions) {
      lines.push(`  - ${t.from.normalized} → ${t.to.normalized} (${t.date}, confidence: ${t.confidence})`);
    }
  } else {
    lines.push('', 'No tool transitions detected.');
  }

  return lines.join('\n');
}

export function analyzeToolTransitions(commits: readonly RawCommit[]): ToolTransitionAnalysis {
  const allSignatures: ToolSignature[] = [];
  let aiCoAuthored = 0;
  let aiAuthored = 0;

  for (const commit of commits) {
    const sigs = extractAllSignatures(commit);
    allSignatures.push(...sigs);

    const hasCoAuthorSig = sigs.some(s => s.source === 'co-author' && s.category !== 'other');
    const hasAuthorSig = sigs.some(s => s.source === 'author-identity');

    if (hasCoAuthorSig) aiCoAuthored++;
    if (hasAuthorSig) aiAuthored++;
  }

  const human = commits.length - new Set(
    commits
      .filter(c => {
        const sigs = extractAllSignatures(c);
        return sigs.some(s => s.category !== 'other' && s.category !== 'human');
      })
      .map(c => c.sha)
  ).size;

  const uniqueSignatures = deduplicateSignatures(allSignatures);
  const timeline = buildSignatureTimeline(commits);
  const transitions = detectTransitions(timeline);
  const summary = buildSummary(uniqueSignatures, transitions, {
    total: commits.length,
    aiCoAuthored,
    aiAuthored,
    human,
  });

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
