import { describe, it, expect } from 'vitest';
import { detectGhostChurn } from '../../../../services/recommendations/detectors/ghost-churn.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectGhostChurn', () => {
  it('returns null when there are no AI commits', () => {
    const commits = [
      makeCommit({ 
        sha: 'abc123', 
        authorType: 'human',
        timestamp: new Date('2026-02-01T10:00:00Z')
      }),
      makeCommit({ 
        sha: 'def456', 
        authorType: 'human',
        timestamp: new Date('2026-02-02T10:00:00Z')
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    expect(result).toBeNull();
  });

  it('returns null when AI commits are not followed by reverts', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-commit-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: add new feature'
      }),
      makeCommit({ 
        sha: 'ai-commit-2', 
        authorType: 'ai',
        timestamp: new Date('2026-02-02T10:00:00Z'),
        message: 'feat: add another feature'
      }),
      makeCommit({ 
        sha: 'human-commit', 
        authorType: 'human',
        timestamp: new Date('2026-02-03T10:00:00Z'),
        message: 'docs: update README'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    expect(result).toBeNull();
  });

  it('detects ghost churn when AI commits are followed by revert messages within 7 days', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-commit-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: add authentication'
      }),
      makeCommit({ 
        sha: 'ai-commit-2', 
        authorType: 'ai',
        timestamp: new Date('2026-02-02T10:00:00Z'),
        message: 'feat: add user profile'
      }),
      makeCommit({ 
        sha: 'revert-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-03T10:00:00Z'),
        message: 'revert: authentication changes'
      }),
      makeCommit({ 
        sha: 'human-commit', 
        authorType: 'human',
        timestamp: new Date('2026-02-04T10:00:00Z'),
        message: 'docs: update docs'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('ghost-churn');
    expect(result?.severity).toBe('high');
    expect(result?.title).toContain('AI-generated code is being reverted');
    expect(result?.evidence.commits).toContain('ai-commit-1');
    expect(result?.evidence.commits).toContain('ai-commit-2');
    expect(result?.evidence.commits).toContain('revert-1');
  });

  it('returns null when commits array is empty', () => {
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], []);
    
    expect(result).toBeNull();
  });

  it('includes proper evidence with ghost ratio in recommendation output', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: feature A'
      }),
      makeCommit({ 
        sha: 'ai-2', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T11:00:00Z'),
        message: 'feat: feature B'
      }),
      makeCommit({ 
        sha: 'ai-3', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T12:00:00Z'),
        message: 'feat: feature C'
      }),
      makeCommit({ 
        sha: 'ai-4', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T13:00:00Z'),
        message: 'feat: feature D'
      }),
      makeCommit({ 
        sha: 'delete-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-02T10:00:00Z'),
        message: 'delete unused feature A'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    expect(result).not.toBeNull();
    expect(result?.evidence.metrics.ghostRatioPercent).toBe(25);
    expect(result?.evidence.metrics.aiCommitCount).toBe(4);
    expect(result?.evidence.metrics.ghostCommitCount).toBe(1);
  });

  it('detects ghost churn with remove, undo, and rollback message patterns', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: add dashboard'
      }),
      makeCommit({ 
        sha: 'ai-2', 
        authorType: 'ai',
        timestamp: new Date('2026-02-02T10:00:00Z'),
        message: 'feat: add settings'
      }),
      makeCommit({ 
        sha: 'ai-3', 
        authorType: 'ai',
        timestamp: new Date('2026-02-03T10:00:00Z'),
        message: 'feat: add profile'
      }),
      makeCommit({ 
        sha: 'remove-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-04T10:00:00Z'),
        message: 'remove broken dashboard'
      }),
      makeCommit({ 
        sha: 'undo-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-05T10:00:00Z'),
        message: 'undo settings changes'
      }),
      makeCommit({ 
        sha: 'rollback-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-06T10:00:00Z'),
        message: 'rollback profile feature'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('ghost-churn');
    expect(result?.severity).toBe('high');
    expect(result?.evidence.commits).toContain('remove-1');
    expect(result?.evidence.commits).toContain('undo-1');
    expect(result?.evidence.commits).toContain('rollback-1');
    expect(result?.evidence.metrics.ghostRatioPercent).toBe(100); // 3 out of 3 AI commits
  });

  it('returns null when ghost ratio is below 20% threshold', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: feature A'
      }),
      makeCommit({ 
        sha: 'ai-2', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T11:00:00Z'),
        message: 'feat: feature B'
      }),
      makeCommit({ 
        sha: 'ai-3', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T12:00:00Z'),
        message: 'feat: feature C'
      }),
      makeCommit({ 
        sha: 'ai-4', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T13:00:00Z'),
        message: 'feat: feature D'
      }),
      makeCommit({ 
        sha: 'ai-5', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T14:00:00Z'),
        message: 'feat: feature E'
      }),
      makeCommit({ 
        sha: 'ai-6', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T15:00:00Z'),
        message: 'feat: feature F'
      }),
      makeCommit({ 
        sha: 'revert-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-02T10:00:00Z'),
        message: 'revert feature A'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-07T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    // 1 ghost commit out of 6 AI commits = 16.67% < 20% threshold
    expect(result).toBeNull();
  });

  it('only counts ghost commits within 7 days of AI commits', () => {
    const commits = [
      makeCommit({ 
        sha: 'ai-1', 
        authorType: 'ai',
        timestamp: new Date('2026-02-01T10:00:00Z'),
        message: 'feat: add feature'
      }),
      makeCommit({ 
        sha: 'revert-1', 
        authorType: 'human',
        timestamp: new Date('2026-02-10T10:00:00Z'), // 9 days later, outside 7-day window
        message: 'revert feature'
      }),
    ];
    
    const window = makeWindow({ 
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-15T23:59:59Z')
    });
    
    const result = detectGhostChurn(window, [], commits);
    
    // Revert is outside 7-day window, so no ghost churn detected
    expect(result).toBeNull();
  });
});
