import { describe, it, expect } from 'vitest';
import { detectToolTransition } from '../../../../services/recommendations/detectors/tool-transition.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectToolTransition', () => {
  it('returns null when tools unchanged between windows', () => {
    const current = makeWindow({ uniqueAiTools: ['Claude Code'], avgFilesPerCommit: 3.0 });
    const history = [makeWindow({ uniqueAiTools: ['Claude Code'], avgFilesPerCommit: 3.2 })];

    expect(detectToolTransition(current, history, [])).toBeNull();
  });

  it('detects new tool appearing', () => {
    const current = makeWindow({ uniqueAiTools: ['Claude Code', 'Copilot'], avgFilesPerCommit: 4.5 });
    const history = [makeWindow({ uniqueAiTools: ['Claude Code'], avgFilesPerCommit: 3.0 })];
    const commits = [
      makeCommit({ sha: 'sha1', aiTool: 'Copilot' }),
      makeCommit({ sha: 'sha2', aiTool: 'Claude Code' }),
    ];

    const result = detectToolTransition(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('tool-transition');
    expect(result?.severity).toBe('low');
    expect(result?.title).toContain('Tool Transition');
    expect(result?.evidence.commits).toContain('sha1');
    expect(result?.evidence.commits).toContain('sha2');
  });

  it('detects tool disappearing (tool dropped)', () => {
    const current = makeWindow({ uniqueAiTools: ['Claude Code'], avgFilesPerCommit: 2.5 });
    const history = [makeWindow({ uniqueAiTools: ['Claude Code', 'Cursor'], avgFilesPerCommit: 3.5 })];
    const commits = [
      makeCommit({ sha: 'sha3', aiTool: 'Claude Code' }),
      makeCommit({ sha: 'sha4', aiTool: 'Claude Code' }),
    ];

    const result = detectToolTransition(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('tool-transition');
  });

  it('returns null when no history available', () => {
    const current = makeWindow({ uniqueAiTools: ['Copilot'], avgFilesPerCommit: 5.0 });

    expect(detectToolTransition(current, [], [])).toBeNull();
  });

  it('includes proper evidence with metrics', () => {
    const current = makeWindow({ uniqueAiTools: ['GitHub Copilot', 'Claude Code'], avgFilesPerCommit: 5.2 });
    const history = [makeWindow({ uniqueAiTools: ['Cursor'], avgFilesPerCommit: 4.0 })];
    const commits = [
      makeCommit({ sha: 'sha5', aiTool: 'GitHub Copilot' }),
      makeCommit({ sha: 'sha6', aiTool: 'Claude Code' }),
    ];

    const result = detectToolTransition(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.commits).toEqual(['sha5', 'sha6']);
    expect(result?.evidence.metrics).toMatchObject({
      currentAvgFiles: 5.2,
      previousAvgFiles: 4.0,
    });
  });

  it('returns null when uniqueAiTools empty in both current and history', () => {
    const current = makeWindow({ uniqueAiTools: [], avgFilesPerCommit: 2.0 });
    const history = [makeWindow({ uniqueAiTools: [], avgFilesPerCommit: 2.0 })];

    expect(detectToolTransition(current, history, [])).toBeNull();
  });

  it('detects velocity spike when tools change', () => {
    const current = makeWindow({ uniqueAiTools: ['Copilot'], avgFilesPerCommit: 6.0 });
    const history = [makeWindow({ uniqueAiTools: ['Claude Code'], avgFilesPerCommit: 4.0 })];
    const commits = [makeCommit({ sha: 'sha1', aiTool: 'Copilot' })];

    const result = detectToolTransition(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.metrics).toMatchObject({
      currentAvgFiles: 6.0,
      previousAvgFiles: 4.0,
    });
  });

  it('handles negative velocity change', () => {
    const current = makeWindow({ uniqueAiTools: ['New Tool'], avgFilesPerCommit: 2.0 });
    const history = [makeWindow({ uniqueAiTools: ['Old Tool'], avgFilesPerCommit: 5.0 })];
    const commits = [makeCommit({ sha: 'sha1' })];

    const result = detectToolTransition(current, history, commits);

    expect(result).not.toBeNull();
    expect(result?.evidence.metrics).toMatchObject({
      currentAvgFiles: 2.0,
      previousAvgFiles: 5.0,
    });
  });
});
