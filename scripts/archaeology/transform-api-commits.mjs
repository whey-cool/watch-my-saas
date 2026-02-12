#!/usr/bin/env node

/**
 * transform-api-commits.mjs
 *
 * Transforms GitHub API commit objects into the standard RepoCommitData
 * JSON format used by the archaeology pipeline.
 *
 * Usage:
 *   node transform-api-commits.mjs --repo myrepo < github-api-response.json
 *   node transform-api-commits.mjs --repo myrepo path/to/api-response.json
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

function extractCoAuthors(message) {
  const authors = [];
  let match;

  while ((match = CO_AUTHOR_PATTERN.exec(message)) !== null) {
    authors.push(match[1].trim());
  }

  CO_AUTHOR_PATTERN.lastIndex = 0;
  return authors;
}

// --- GitHub API status mapping ---

function mapGitHubFileStatus(status) {
  const statusMap = {
    added: 'added',
    modified: 'modified',
    removed: 'deleted',
    renamed: 'renamed',
    changed: 'modified',
    copied: 'added',
  };

  return statusMap[status] || 'modified';
}

// --- Transform a single GitHub API commit ---

function transformCommit(apiCommit, repoName) {
  const { sha, commit, files } = apiCommit;

  // Extract author info — prefer commit.author, fall back to top-level author
  const author = commit?.author?.name || apiCommit?.author?.login || 'unknown';
  const authorEmail = commit?.author?.email || '';
  const date = commit?.author?.date || '';
  const message = commit?.message || '';

  // Extract co-authors from the commit message body
  const coAuthors = extractCoAuthors(message);

  // Clean message: strip co-author lines
  const cleanedMessage = message
    .split('\n')
    .filter((line) => !CO_AUTHOR_PATTERN.test(line))
    .join('\n')
    .trim();

  CO_AUTHOR_PATTERN.lastIndex = 0;

  // Map file changes (files array may be missing for large commits)
  const filesChanged = Array.isArray(files)
    ? files.map((file) => ({
        path: file.filename,
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        status: mapGitHubFileStatus(file.status),
      }))
    : [];

  return {
    sha: sha || '',
    author,
    authorEmail,
    date,
    message: cleanedMessage || message,
    coAuthors,
    filesChanged,
    repo: repoName,
  };
}

// --- Transform the full API response ---

function transformApiResponse(apiData, repoName) {
  // Handle both array of commits and paginated responses
  const commitArray = Array.isArray(apiData) ? apiData : [apiData];

  const commits = commitArray
    .map((item) => transformCommit(item, repoName))
    .filter((commit) => commit.sha); // Skip malformed entries

  return {
    repo: repoName,
    fetchedAt: new Date().toISOString(),
    source: 'github-api',
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
    console.error('Error: No input provided. Pipe GitHub API JSON or provide a file path.');
    process.exit(1);
  }

  return stdinData;
}

function parseJson(input) {
  try {
    return JSON.parse(input);
  } catch (err) {
    console.error(`Error: Invalid JSON input: ${err.message}`);
    process.exit(1);
  }
}

// --- Entry point ---

async function main() {
  const args = parseArgs(argv.slice(2));
  const input = await readInput(args.filePath);
  const apiData = parseJson(input);
  const result = transformApiResponse(apiData, args.repo);

  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
