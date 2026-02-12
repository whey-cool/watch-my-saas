/**
 * Analyzes directory structure evolution and codebase growth trajectory.
 */
import type {
  RawCommit,
  DirectoryFirstSeen,
  CodebaseSizePoint,
  RefactoringEvent,
  StructuralGrowthAnalysis,
} from '../types.js';

function trackDirectoryFirstSeen(commits: readonly RawCommit[]): readonly DirectoryFirstSeen[] {
  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));
  const seen = new Map<string, DirectoryFirstSeen>();

  for (const commit of sorted) {
    for (const file of commit.filesChanged) {
      if (file.status === 'added' || file.status === 'modified') {
        const dirs = extractDirectories(file.path);
        for (const dir of dirs) {
          if (!seen.has(dir)) {
            seen.set(dir, {
              path: dir,
              firstSeenDate: commit.date,
              firstSeenRepo: commit.repo,
              firstSeenSha: commit.sha,
            });
          }
        }
      }
    }
  }

  return [...seen.values()].sort((a, b) => a.firstSeenDate.localeCompare(b.firstSeenDate));
}

function extractDirectories(filePath: string): readonly string[] {
  const parts = filePath.split('/');
  const dirs: string[] = [];

  for (let i = 1; i < parts.length; i++) {
    dirs.push(parts.slice(0, i).join('/'));
  }

  return dirs;
}

function buildSizeTrajectory(commits: readonly RawCommit[]): readonly CodebaseSizePoint[] {
  const sorted = [...commits].sort((a, b) => a.date.localeCompare(b.date));

  // Group by day
  const dayMap = new Map<string, { additions: number; deletions: number; files: Set<string> }>();
  const cumulativeFiles = new Set<string>();

  for (const commit of sorted) {
    const dateKey = commit.date.slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { additions: 0, deletions: 0, files: new Set() });
    }
    const day = dayMap.get(dateKey)!;

    for (const file of commit.filesChanged) {
      day.additions += file.additions;
      day.deletions += file.deletions;

      if (file.status === 'added') {
        cumulativeFiles.add(file.path);
      } else if (file.status === 'deleted') {
        cumulativeFiles.delete(file.path);
      }
      day.files.add(file.path);
    }
  }

  // Rebuild cumulative file count day by day
  const allFiles = new Set<string>();
  const sortedDays = [...dayMap.keys()].sort();
  const trajectory: CodebaseSizePoint[] = [];

  // Replay to get accurate file counts
  const sortedCommits = [...sorted];
  let commitIdx = 0;

  for (const dateKey of sortedDays) {
    const day = dayMap.get(dateKey)!;

    // Process all commits for this day to track files
    while (commitIdx < sortedCommits.length && sortedCommits[commitIdx].date.slice(0, 10) === dateKey) {
      for (const file of sortedCommits[commitIdx].filesChanged) {
        if (file.status === 'added') {
          allFiles.add(file.path);
        } else if (file.status === 'deleted') {
          allFiles.delete(file.path);
        }
      }
      commitIdx++;
    }

    trajectory.push({
      date: dateKey,
      totalFiles: allFiles.size,
      additions: day.additions,
      deletions: day.deletions,
      netChange: day.additions - day.deletions,
    });
  }

  return trajectory;
}

function detectRefactoringEvents(commits: readonly RawCommit[]): readonly RefactoringEvent[] {
  const events: RefactoringEvent[] = [];

  for (const commit of commits) {
    const files = commit.filesChanged;
    if (files.length === 0) continue;

    const renames = files.filter(f => f.status === 'renamed');
    const deletions = files.filter(f => f.status === 'deleted');
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    // Major rename: 3+ files renamed
    if (renames.length >= 3) {
      events.push({
        date: commit.date,
        repo: commit.repo,
        sha: commit.sha,
        type: 'major-rename',
        filesAffected: renames.length,
        description: `Renamed ${renames.length} files: ${commit.message.slice(0, 80)}`,
      });
    }

    // Large deletion: 10+ files deleted or 500+ lines deleted
    // Check this before directory-restructure so pure deletions aren't misclassified
    if (deletions.length >= 10 || totalDeletions >= 500) {
      events.push({
        date: commit.date,
        repo: commit.repo,
        sha: commit.sha,
        type: 'large-deletion',
        filesAffected: files.length,
        description: `Large deletion (${deletions.length} files, ${totalDeletions} lines): ${commit.message.slice(0, 80)}`,
      });
    }
    // Directory restructure: 5+ files moved/renamed in one commit (requires renames, not just deletions)
    else if (renames.length >= 3 || (renames.length >= 1 && renames.length + deletions.length >= 5)) {
      events.push({
        date: commit.date,
        repo: commit.repo,
        sha: commit.sha,
        type: 'directory-restructure',
        filesAffected: files.length,
        description: `Restructured ${files.length} files: ${commit.message.slice(0, 80)}`,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function analyzeStructuralGrowth(commits: readonly RawCommit[]): StructuralGrowthAnalysis {
  const directoryTimeline = trackDirectoryFirstSeen(commits);
  const sizeTrajectory = buildSizeTrajectory(commits);
  const refactoringEvents = detectRefactoringEvents(commits);

  return { directoryTimeline, sizeTrajectory, refactoringEvents };
}
