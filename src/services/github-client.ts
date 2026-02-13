/**
 * GitHub API client for fetching commit history.
 * Uses native fetch. Handles pagination, rate limits, and auth.
 */

import type { GitHubCommit } from '../types.js';

const GITHUB_API_BASE = 'https://api.github.com';

// --- Types for GitHub API responses ---

export interface GitHubApiCommit {
  readonly sha: string;
  readonly commit: {
    readonly message: string;
    readonly author: {
      readonly name: string;
      readonly email: string;
      readonly date: string;
    };
  };
  readonly author: { readonly login: string } | null;
  readonly files?: readonly GitHubApiFile[];
  readonly stats?: { readonly additions: number; readonly deletions: number };
}

export interface GitHubApiFile {
  readonly filename: string;
  readonly status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
}

export interface RateLimitInfo {
  readonly remaining: number;
  readonly resetAt: number;
}

export interface ListCommitsOptions {
  readonly token?: string;
  readonly since?: string;
  readonly until?: string;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListCommitsResult {
  readonly commits: readonly GitHubApiCommit[];
  readonly rateLimit: RateLimitInfo;
}

export interface CommitDetailResult {
  readonly commit: GitHubApiCommit & {
    readonly stats: { readonly additions: number; readonly deletions: number };
    readonly files: readonly GitHubApiFile[];
  };
  readonly rateLimit: RateLimitInfo;
}

// --- Public API ---

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    remaining: parseInt(headers.get('x-ratelimit-remaining') ?? '0', 10),
    resetAt: parseInt(headers.get('x-ratelimit-reset') ?? '0', 10),
  };
}

export async function listCommits(
  owner: string,
  repo: string,
  options: ListCommitsOptions,
): Promise<ListCommitsResult> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.perPage) params.set('per_page', String(options.perPage));
  if (options.since) params.set('since', options.since);
  if (options.until) params.set('until', options.until);

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?${params.toString()}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub API error ${response.status}: ${(body as Record<string, string>).message ?? response.statusText}`,
    );
  }

  const commits = (await response.json()) as GitHubApiCommit[];
  const rateLimit = parseRateLimitHeaders(response.headers);

  return { commits, rateLimit };
}

export async function getCommitDetail(
  owner: string,
  repo: string,
  sha: string,
  options: Pick<ListCommitsOptions, 'token'>,
): Promise<CommitDetailResult> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub API error ${response.status}: ${(body as Record<string, string>).message ?? response.statusText}`,
    );
  }

  const commit = (await response.json()) as CommitDetailResult['commit'];
  const rateLimit = parseRateLimitHeaders(response.headers);

  return { commit, rateLimit };
}

/**
 * Convert a GitHub API commit response to our GitHubCommit interface.
 * Works with both list responses (no files) and detail responses (with files).
 */
export function toGitHubCommit(apiCommit: GitHubApiCommit): GitHubCommit {
  const files = apiCommit.files ?? [];

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const file of files) {
    if (file.status === 'added') {
      added.push(file.filename);
    } else if (file.status === 'removed') {
      removed.push(file.filename);
    } else {
      modified.push(file.filename);
    }
  }

  return {
    id: apiCommit.sha,
    message: apiCommit.commit.message,
    timestamp: apiCommit.commit.author.date,
    author: {
      name: apiCommit.commit.author.name,
      email: apiCommit.commit.author.email,
    },
    added,
    removed,
    modified,
  };
}
