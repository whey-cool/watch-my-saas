import { describe, it, expect } from 'vitest';
import { detectWorkflowBreakthrough } from '../../../../services/recommendations/detectors/workflow-breakthrough.js';
import { makeCommit, makeWindow } from '../helpers.js';

describe('detectWorkflowBreakthrough', () => {
  it('returns null when AI ratio is stable (no breakthrough)', () => {
    const current = makeWindow({
      aiRatio: 0.30,
      windowStart: new Date('2026-01-15'),
      windowEnd: new Date('2026-01-22'),
    });

    const history = [
      makeWindow({ aiRatio: 0.28, windowStart: new Date('2026-01-01'), windowEnd: new Date('2026-01-08') }),
      makeWindow({ aiRatio: 0.32, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    expect(result).toBeNull();
  });

  it('returns null when history has fewer than 2 windows', () => {
    const current = makeWindow({
      aiRatio: 0.50,
      windowStart: new Date('2026-01-15'),
      windowEnd: new Date('2026-01-22'),
    });

    const history = [
      makeWindow({ aiRatio: 0.20, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    expect(result).toBeNull();
  });

  it('detects breakthrough when AI ratio jumps >15pp and is sustained for 2+ windows', () => {
    const current = makeWindow({
      aiRatio: 0.50,
      windowStart: new Date('2026-01-22'),
      windowEnd: new Date('2026-01-29'),
    });

    const history = [
      makeWindow({ aiRatio: 0.20, windowStart: new Date('2026-01-01'), windowEnd: new Date('2026-01-08') }),
      makeWindow({ aiRatio: 0.22, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
      makeWindow({ aiRatio: 0.48, windowStart: new Date('2026-01-15'), windowEnd: new Date('2026-01-22') }), // First sustained week
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    
    expect(result).not.toBeNull();
    expect(result?.pattern).toBe('workflow-breakthrough');
    expect(result?.severity).toBe('low');
    expect(result?.title).toContain('Workflow Breakthrough');
    expect(result?.description).toContain('21%');
    expect(result?.description).toContain('50%');
    expect(result?.evidence.metrics.sustainedWeeks).toBe(2);
    expect(result?.evidence.metrics.historicalAverage).toBeCloseTo(0.21, 2);
  });

  it('returns null when increase is not sustained (only 1 window high)', () => {
    const current = makeWindow({
      aiRatio: 0.50,
      windowStart: new Date('2026-01-15'),
      windowEnd: new Date('2026-01-22'),
    });

    const history = [
      makeWindow({ aiRatio: 0.20, windowStart: new Date('2026-01-01'), windowEnd: new Date('2026-01-08') }),
      makeWindow({ aiRatio: 0.22, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    expect(result).toBeNull();
  });

  it('includes proper evidence with ratios and duration', () => {
    const current = makeWindow({
      aiRatio: 0.65,
      windowStart: new Date('2026-01-29'),
      windowEnd: new Date('2026-02-05'),
    });

    const history = [
      makeWindow({ aiRatio: 0.25, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
      makeWindow({ aiRatio: 0.30, windowStart: new Date('2026-01-15'), windowEnd: new Date('2026-01-22') }),
      makeWindow({ aiRatio: 0.62, windowStart: new Date('2026-01-22'), windowEnd: new Date('2026-01-29') }), // Week 1 of sustained
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    
    expect(result).not.toBeNull();
    expect(result?.evidence.metrics).toMatchObject({
      currentAiRatio: 0.65,
      historicalAverage: expect.closeTo(0.275, 2),
      sustainedWeeks: 2,
      increasePct: expect.closeTo(38, 0), // ~38% increase
    });
  });

  it('returns null when AI ratio decreased', () => {
    const current = makeWindow({
      aiRatio: 0.15,
      windowStart: new Date('2026-01-22'),
      windowEnd: new Date('2026-01-29'),
    });

    const history = [
      makeWindow({ aiRatio: 0.40, windowStart: new Date('2026-01-01'), windowEnd: new Date('2026-01-08') }),
      makeWindow({ aiRatio: 0.38, windowStart: new Date('2026-01-08'), windowEnd: new Date('2026-01-15') }),
      makeWindow({ aiRatio: 0.20, windowStart: new Date('2026-01-15'), windowEnd: new Date('2026-01-22') }),
    ];

    const commits: any[] = [];

    const result = detectWorkflowBreakthrough(current, history, commits);
    expect(result).toBeNull();
  });
});
