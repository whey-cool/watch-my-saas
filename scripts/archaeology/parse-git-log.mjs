#!/usr/bin/env node

/**
 * parse-git-log.mjs
 *
 * Parses custom `git log` output (COMMIT_START/COMMIT_END delimited)
 * into the standard RepoCommitData JSON format.
 *
 * Usage:
 *   git log --format="..." --numstat | node parse-git-log.mjs --repo myrepo
 *   node parse-git-log.mjs --repo myrepo < git-log-output.txt
 *   node parse-git-log.mjs --repo myrepo path/to/git-log-output.txt
 */

import { readFileSync } from 'node:fs';
import { argv, stdin } from 'node:process';

// --- Argument parsing ---

function parseArgs(args) {
  const parsed = { repo: '', filePath: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && i + 1 < args.length) {
      parsed.repo = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      parsed.filePath = args[i];
    }
  }

  if (!parsed.repo) {
    console.error('Error: --repo <name> is required');
    process.exit(1);
  }

  return parsed;
}

// --- Co-author extraction ---

const CO_AUTHOR_PATTERN = /Co-Authored-By:\s*(.+)/gi;

function extractCoAuthors(text) {
  const authors = [];
  let match;

  while ((match = CO_AUTHOR_PATTERN.exec(text)) !== null) {
    authors.push(match[1].trim());
  }

  // Reset lastIndex for reuse
  CO_AUTHOR_PATTERN.lastIndex = 0;

  return authors;
}

// --- File change parsing ---

function parseFileStatus(statusChar) {
  const statusMap = {
    'A': 'added',
    'M': 'modified',
    'D': 'deleted',
    'R': 'renamed',
  };

  // Handle rename variants like R100, R095
  if (statusChar.startsWith('R')) {
    return 'renamed';
  }

  return statusMap[statusChar] || 'modified';
}

function parseFilesChangedBlock(lines) {
  const files = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: STATUS\tpath (from --diff-filter / --name-status)
    // e.g., A\tsrc/login.ts or R100\told.ts\tnew.ts
    const parts = trimmed.split('\t');
    if (parts.length >= 2) {
      const status = parseFileStatus(parts[0]);
      // For renames, the path is the destination (last part)
      const path = parts.length >= 3 ? parts[parts.length - 1] : parts[1];

      files.push({
        path,
        additions: 0,
        deletions: 0,
        status,
      });
    }
  }

  return files;
}

function parseNumstatLines(lines) {
  const stats = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // numstat format: additions\tdeletions\tpath
    // Binary files show as: -\t-\tpath
    const parts = trimmed.split('\t');
    if (parts.length >= 3) {
      const additions = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const deletions = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      // Handle renames: old => new format or {old => new} format
      const pathPart = parts.slice(2).join('\t');
      const path = pathPart.includes(' => ')
        ? pathPart.replace(/.*\{?.*=> (.+?)\}?$/, '$1').replace(/\{.*=> /, '')
        : pathPart;

      stats.push({ path: path.trim(), additions, deletions });
    }
  }

  return stats;
}

// --- Commit block parsing ---

function parseCommitBlock(block, repoName) {
  const lines = block.split('\n');

  let sha = '';
  let author = '';
  let email = '';
  let date = '';
  let messageParts = [];
  let filesChangedLines = [];
  let numstatLines = [];

  let section = 'header'; // 'header' | 'message' | 'fileschanged' | 'numstat'
  let foundMessage = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'FILESCHANGED') {
      section = 'fileschanged';
      continue;
    }

    if (trimmed === 'NUMSTAT') {
      section = 'numstat';
      continue;
    }

    if (section === 'header') {
      if (trimmed.startsWith('sha: ')) {
        sha = trimmed.slice(5).trim();
      } else if (trimmed.startsWith('author: ')) {
        author = trimmed.slice(8).trim();
      } else if (trimmed.startsWith('email: ')) {
        email = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('date: ')) {
        date = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('message: ')) {
        foundMessage = true;
        messageParts.push(trimmed.slice(9));
        section = 'message';
      } else if (trimmed.startsWith('co-authors: ')) {
        // Dedicated co-authors field — handled separately below
      }
    } else if (section === 'message') {
      // Everything until FILESCHANGED or NUMSTAT is part of the message body
      messageParts.push(line);
    } else if (section === 'fileschanged') {
      filesChangedLines.push(line);
    } else if (section === 'numstat') {
      numstatLines.push(line);
    }
  }

  const fullMessage = messageParts.join('\n').trim();

  // Extract co-authors from both the message body and the dedicated field
  const coAuthorsFromMessage = extractCoAuthors(fullMessage);

  // Also check for dedicated co-authors field
  const coAuthorsFieldLine = lines.find((l) => l.trim().startsWith('co-authors: '));
  const coAuthorsFromField = coAuthorsFieldLine
    ? extractCoAuthors(coAuthorsFieldLine)
    : [];

  // Deduplicate co-authors
  const allCoAuthors = [...new Set([...coAuthorsFromMessage, ...coAuthorsFromField])];

  // Build file changes from FILESCHANGED block
  let filesChanged = parseFilesChangedBlock(filesChangedLines);

  // Merge numstat data if available
  const numstats = parseNumstatLines(numstatLines);

  if (numstats.length > 0) {
    if (filesChanged.length > 0) {
      // Merge additions/deletions from numstat into existing file entries
      filesChanged = filesChanged.map((file) => {
        const stat = numstats.find((s) => s.path === file.path);
        if (stat) {
          return { ...file, additions: stat.additions, deletions: stat.deletions };
        }
        return file;
      });
    } else {
      // No FILESCHANGED block — build from numstat alone (status defaults to modified)
      filesChanged = numstats.map((stat) => ({
        path: stat.path,
        additions: stat.additions,
        deletions: stat.deletions,
        status: 'modified',
      }));
    }
  }

  // Clean the message: strip co-author lines from the display message
  const cleanedMessage = fullMessage
    .split('\n')
    .filter((line) => !CO_AUTHOR_PATTERN.test(line))
    .join('\n')
    .trim();

  // Reset regex lastIndex
  CO_AUTHOR_PATTERN.lastIndex = 0;

  return {
    sha,
    author,
    authorEmail: email,
    date,
    message: cleanedMessage || fullMessage,
    coAuthors: allCoAuthors,
    filesChanged,
    repo: repoName,
  };
}

// --- Main pipeline ---

function parseGitLog(input, repoName) {
  // With `git log --format="...COMMIT_START...COMMIT_END" --numstat`,
  // the numstat lines appear AFTER COMMIT_END and BEFORE the next COMMIT_START.
  // So we collect: commit block (between START/END), then numstat lines (between END and next START).
  const entries = []; // { block: string, numstatLines: string[] }
  let currentBlock = [];
  let currentNumstat = [];
  let insideCommit = false;
  let afterCommit = false;

  const lines = input.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'COMMIT_START') {
      // Save previous numstat lines to the last entry
      if (afterCommit && entries.length > 0) {
        entries[entries.length - 1].numstatLines = currentNumstat;
      }
      insideCommit = true;
      afterCommit = false;
      currentBlock = [];
      currentNumstat = [];
      continue;
    }

    if (trimmed === 'COMMIT_END') {
      if (insideCommit && currentBlock.length > 0) {
        entries.push({ block: currentBlock.join('\n'), numstatLines: [] });
      }
      insideCommit = false;
      afterCommit = true;
      currentBlock = [];
      continue;
    }

    if (insideCommit) {
      currentBlock.push(line);
    } else if (afterCommit) {
      // Lines between COMMIT_END and next COMMIT_START are numstat
      if (trimmed) {
        currentNumstat.push(line);
      }
    }
  }

  // Don't forget the last entry's numstat
  if (afterCommit && entries.length > 0) {
    entries[entries.length - 1].numstatLines = currentNumstat;
  }

  const commits = entries
    .map(({ block, numstatLines }) => {
      const commit = parseCommitBlock(block, repoName);
      // Merge numstat data into file changes
      const numstats = parseNumstatLines(numstatLines);
      if (numstats.length > 0) {
        if (commit.filesChanged.length > 0) {
          commit.filesChanged = commit.filesChanged.map((file) => {
            const stat = numstats.find((s) => s.path === file.path);
            return stat ? { ...file, additions: stat.additions, deletions: stat.deletions } : file;
          });
        } else {
          commit.filesChanged = numstats.map((stat) => ({
            path: stat.path,
            additions: stat.additions,
            deletions: stat.deletions,
            status: 'modified',
          }));
        }
      }
      return commit;
    })
    .filter((commit) => commit.sha);

  return {
    repo: repoName,
    fetchedAt: new Date().toISOString(),
    source: 'local-git',
    commits,
  };
}

// --- Input reading ---

async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => chunks.push(chunk));
    stdin.on('end', () => resolve(chunks.join('')));
    stdin.on('error', reject);

    // Handle the case where stdin is a TTY (no piped input)
    if (stdin.isTTY) {
      resolve('');
    }
  });
}

async function readInput(filePath) {
  if (filePath) {
    try {
      return readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`Error: Cannot read file '${filePath}': ${err.message}`);
      process.exit(1);
    }
  }

  const stdinData = await readStdin();
  if (!stdinData.trim()) {
    console.error('Error: No input provided. Pipe git log output or provide a file path.');
    process.exit(1);
  }

  return stdinData;
}

// --- Entry point ---

async function main() {
  const args = parseArgs(argv.slice(2));
  const input = await readInput(args.filePath);
  const result = parseGitLog(input, args.repo);

  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
