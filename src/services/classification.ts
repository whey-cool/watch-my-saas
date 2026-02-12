/**
 * Commit classification service.
 * Patterns ported from archaeology tool-transitions analyzer (validated on 1223 commits).
 * Invariant 4: port patterns, never import from archaeology.
 */

import type {
  AuthorType,
  CommitCategory,
  QualitySignals,
  ClassifiedCommit,
  GitHubCommit,
} from '../types.js';

// --- Name-based patterns (for Co-Authored-By headers) ---
// Ported from scripts/archaeology/analyzers/tool-transitions.ts

interface ToolPattern {
  readonly pattern: RegExp;
  readonly normalized: string;
  readonly authorType: AuthorType;
}

const CO_AUTHOR_PATTERNS: readonly ToolPattern[] = [
  { pattern: /claude[- ]?flow/i, normalized: 'claude-flow', authorType: 'ai' },
  { pattern: /parallel\s+development/i, normalized: 'Parallel Development', authorType: 'ai' },
  { pattern: /claude\s+opus\s+4\.6/i, normalized: 'Claude Opus 4.6', authorType: 'ai' },
  { pattern: /claude\s+opus\s+4\.5/i, normalized: 'Claude Opus 4.5', authorType: 'ai' },
  { pattern: /claude\s+sonnet\s+4\.5/i, normalized: 'Claude Sonnet 4.5', authorType: 'ai' },
  { pattern: /claude\s+code/i, normalized: 'Claude Code', authorType: 'ai' },
  { pattern: /^claude$/i, normalized: 'Claude', authorType: 'ai' },
  { pattern: /cursor\s*agent/i, normalized: 'Cursor Agent', authorType: 'ai' },
  { pattern: /copilot/i, normalized: 'GitHub Copilot', authorType: 'ai' },
  { pattern: /devin/i, normalized: 'Devin', authorType: 'ai' },
];

// --- Email-based patterns (for author identity detection) ---

const EMAIL_PATTERNS: readonly ToolPattern[] = [
  { pattern: /cursoragent@cursor\.com/i, normalized: 'Cursor Agent', authorType: 'ai' },
  { pattern: /cursor@/i, normalized: 'Cursor', authorType: 'ai' },
];

// --- Name-based bot patterns ---

const BOT_NAME_PATTERNS: readonly RegExp[] = [
  /dependabot/i,
  /github[- ]?actions/i,
  /\[bot\]/i,
  /renovate/i,
];

const BOT_EMAIL_PATTERNS: readonly RegExp[] = [
  /\[bot\]@/i,
  /dependabot/i,
  /github-actions/i,
  /noreply@github\.com$/i,
];

// --- Co-Authored-By extraction ---

const CO_AUTHOR_PATTERN = /^Co-Authored-By:\s*(.+?)(?:\s*<.*>)?$/gim;

function extractCoAuthors(message: string): readonly string[] {
  const matches: string[] = [];
  const re = new RegExp(CO_AUTHOR_PATTERN.source, CO_AUTHOR_PATTERN.flags);
  let match = re.exec(message);

  while (match !== null) {
    matches.push(match[1].trim());
    match = re.exec(message);
  }
  return matches;
}

// --- Public API ---

export interface AuthorDetection {
  readonly authorType: AuthorType;
  readonly aiTool: string | null;
}

export function detectAuthorType(
  message: string,
  authorName: string,
  authorEmail: string,
): AuthorDetection {
  // 1. Check Co-Authored-By headers for AI tools
  const coAuthors = extractCoAuthors(message);
  for (const coAuthor of coAuthors) {
    for (const { pattern, normalized } of CO_AUTHOR_PATTERNS) {
      if (pattern.test(coAuthor)) {
        return { authorType: 'ai', aiTool: normalized };
      }
    }
  }

  // 2. Check author email for AI tools
  for (const { pattern, normalized } of EMAIL_PATTERNS) {
    if (pattern.test(authorEmail)) {
      return { authorType: 'ai', aiTool: normalized };
    }
  }

  // 3. Check author name for AI tools
  for (const { pattern, normalized } of CO_AUTHOR_PATTERNS) {
    if (pattern.test(authorName)) {
      return { authorType: 'ai', aiTool: normalized };
    }
  }

  // 4. Check for bots (by name)
  for (const pattern of BOT_NAME_PATTERNS) {
    if (pattern.test(authorName)) {
      return { authorType: 'bot', aiTool: null };
    }
  }

  // 5. Check for bots (by email)
  for (const pattern of BOT_EMAIL_PATTERNS) {
    if (pattern.test(authorEmail)) {
      return { authorType: 'bot', aiTool: null };
    }
  }

  // 6. Default: human
  return { authorType: 'human', aiTool: null };
}

const CATEGORY_RE = /^(feat|fix|refactor|docs|test|chore|ci|perf)(?:\(.+?\))?:/i;

export function classifyCategory(message: string): CommitCategory {
  const match = message.match(CATEGORY_RE);
  if (match) {
    return match[1].toLowerCase() as CommitCategory;
  }
  return 'other';
}

const TEST_FILE_RE = /(?:\.test\.|\.spec\.|__tests__|__mocks__|test\/|tests\/)/i;
const TYPE_FILE_RE = /(?:types\.ts|\.d\.ts|interfaces\.ts)$/i;
const DOCS_FILE_RE = /(?:\.md$|docs\/|CHANGELOG|README|CONTRIBUTING)/i;
const CONFIG_FILE_RE = /(?:\.json$|\.ya?ml$|\.toml$|\.env|\.config\.)/i;

export function extractQualitySignals(files: readonly string[]): QualitySignals {
  let testFilesTouched = 0;
  let typeFilesTouched = 0;
  let docsFilesTouched = 0;
  let configFilesTouched = 0;

  for (const file of files) {
    if (TEST_FILE_RE.test(file)) testFilesTouched++;
    if (TYPE_FILE_RE.test(file)) typeFilesTouched++;
    if (DOCS_FILE_RE.test(file)) docsFilesTouched++;
    if (CONFIG_FILE_RE.test(file)) configFilesTouched++;
  }

  return { testFilesTouched, typeFilesTouched, docsFilesTouched, configFilesTouched };
}

export function classifyCommit(commit: GitHubCommit): ClassifiedCommit {
  const allFiles = [...commit.added, ...commit.removed, ...commit.modified];
  const { authorType, aiTool } = detectAuthorType(
    commit.message,
    commit.author.name,
    commit.author.email,
  );
  const category = classifyCategory(commit.message);
  const qualitySignals = extractQualitySignals(allFiles);

  return {
    sha: commit.id,
    message: commit.message,
    authorName: commit.author.name,
    authorEmail: commit.author.email,
    authorType,
    aiTool,
    category,
    filesChanged: allFiles.length,
    insertions: 0, // GitHub push webhooks don't include line counts
    deletions: 0,
    qualitySignals,
    timestamp: commit.timestamp,
  };
}
