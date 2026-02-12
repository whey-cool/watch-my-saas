/**
 * Recommendation validation script.
 * Creates synthetic commit data representing archaeology ground truth,
 * runs detectors, and compares results to expected patterns.
 *
 * Usage: npx tsx scripts/recommend-validate.ts
 */

import { buildMetricWindows } from '../src/services/recommendations/metrics.js';
import { detectPhase } from '../src/services/recommendations/phase-detector.js';
import { DETECTORS } from '../src/services/recommendations/detectors/index.js';
import type { CommitRecord, RecommendationInput, PatternType } from '../src/types.js';

// --- Synthetic Ground Truth ---
// Based on archaeology analysis of 1223 commits across whey-cool repos:
// - Jan 2026: 88% AI ratio peak (Claude Code dominant)
// - Sprint-drift cycles observed: high AI → churn → cleanup → repeat
// - 7 tool transitions over the project history
// - Test coverage drifted during high-AI periods
// - Several weeks of "changelog silence" (refactoring, no features)
// - Workflow breakthrough when Claude Code was adopted

function makeCommit(
  day: number,
  month: number,
  overrides: Partial<CommitRecord> = {},
): CommitRecord {
  const sha = `synth-${month}-${day}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    sha,
    message: 'synthetic commit',
    authorName: 'Megan',
    authorEmail: 'megan@example.com',
    authorType: 'human',
    aiTool: null,
    category: 'feat',
    filesChanged: 3,
    insertions: 0,
    deletions: 0,
    testFilesTouched: 0,
    typeFilesTouched: 0,
    timestamp: new Date(2026, month - 1, day),
    projectId: 'validate-proj',
    ...overrides,
  };
}

function generateGroundTruthCommits(): CommitRecord[] {
  const commits: CommitRecord[] = [];

  // Week 1 (Dec 15-21): Low AI, feature building
  for (let d = 15; d <= 21; d++) {
    commits.push(makeCommit(d, 12, { category: 'feat', authorType: 'human' }));
    if (d % 3 === 0) commits.push(makeCommit(d, 12, { category: 'test', authorType: 'human', testFilesTouched: 2 }));
  }

  // Week 2 (Dec 22-28): AI adoption starts (Copilot), good test coverage
  for (let d = 22; d <= 28; d++) {
    commits.push(makeCommit(d, 12, { category: 'feat', authorType: 'ai', aiTool: 'GitHub Copilot', filesChanged: 4, testFilesTouched: 1 }));
    commits.push(makeCommit(d, 12, { category: 'feat', authorType: 'human', filesChanged: 3, testFilesTouched: 1 }));
    if (d % 2 === 0) commits.push(makeCommit(d, 12, { category: 'test', authorType: 'human', filesChanged: 2, testFilesTouched: 2 }));
  }

  // Week 3 (Dec 29 - Jan 4): Tool transition to Claude Code — WORKFLOW BREAKTHROUGH
  for (let d = 29; d <= 31; d++) {
    commits.push(makeCommit(d, 12, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code' }));
    commits.push(makeCommit(d, 12, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code' }));
  }
  for (let d = 1; d <= 4; d++) {
    commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code' }));
    commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code' }));
    commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'human' }));
  }

  // Week 4 (Jan 5-11): 88% AI peak — AI HANDOFF CLIFF + TEST DRIFT
  for (let d = 5; d <= 11; d++) {
    commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code', filesChanged: 8 }));
    commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'ai', aiTool: 'Claude Code', filesChanged: 6 }));
    commits.push(makeCommit(d, 1, { category: 'refactor', authorType: 'ai', aiTool: 'Claude Code', filesChanged: 5 }));
    if (d % 4 === 0) commits.push(makeCommit(d, 1, { category: 'feat', authorType: 'human', filesChanged: 2 }));
    // No test files being touched — test drift
  }

  // Week 5 (Jan 12-18): SPRINT-DRIFT + GHOST CHURN — churn spike
  for (let d = 12; d <= 18; d++) {
    commits.push(makeCommit(d, 1, { category: 'fix', authorType: 'ai', aiTool: 'Claude Code', filesChanged: 4 }));
    commits.push(makeCommit(d, 1, { category: 'fix', authorType: 'human', filesChanged: 3 }));
    commits.push(makeCommit(d, 1, { category: 'refactor', authorType: 'human', filesChanged: 5 }));
    commits.push(makeCommit(d, 1, { category: 'chore', authorType: 'human', filesChanged: 2 }));
    // Ghost churn: AI commit followed by revert
    if (d % 2 === 0) {
      commits.push(makeCommit(d, 1, {
        category: 'fix',
        authorType: 'ai',
        aiTool: 'Claude Code',
        message: 'feat: add feature X',
        filesChanged: 6,
      }));
      commits.push(makeCommit(d + 1 > 18 ? 18 : d + 1, 1, {
        category: 'fix',
        authorType: 'human',
        message: 'revert: remove feature X',
        filesChanged: 6,
      }));
    }
  }

  // Week 6 (Jan 19-25): CHANGELOG SILENCE — all cleanup, no features
  for (let d = 19; d <= 25; d++) {
    commits.push(makeCommit(d, 1, { category: 'fix', authorType: 'human', filesChanged: 3 }));
    commits.push(makeCommit(d, 1, { category: 'refactor', authorType: 'human', filesChanged: 4 }));
    commits.push(makeCommit(d, 1, { category: 'chore', authorType: 'human', filesChanged: 2 }));
    if (d % 3 === 0) commits.push(makeCommit(d, 1, { category: 'docs', authorType: 'human', filesChanged: 1 }));
  }

  return commits;
}

// --- Expected Patterns ---
const EXPECTED_PATTERNS: ReadonlyMap<PatternType, string> = new Map([
  ['sprint-drift', 'Week 5: high AI + high cleanup ratio'],
  ['ghost-churn', 'Week 5: AI commits followed by reverts'],
  ['ai-handoff-cliff', 'Week 4: 88% AI + near-zero test ratio'],
  ['tool-transition', 'Week 3: Copilot → Claude Code'],
  ['test-drift', 'Week 4-5: AI ratio up, test ratio down'],
  ['changelog-silence', 'Week 6: all cleanup, no features'],
  ['workflow-breakthrough', 'Week 3: AI ratio step function'],
]);

// --- Run Validation ---
function validate() {
  const commits = generateGroundTruthCommits();
  console.log(`Generated ${commits.length} synthetic commits\n`);

  const windows = buildMetricWindows(commits, 7);
  console.log(`Built ${windows.length} metric windows\n`);

  // Show window summaries
  for (const w of windows) {
    const start = w.windowStart.toISOString().split('T')[0];
    const end = w.windowEnd.toISOString().split('T')[0];
    console.log(
      `  ${start} — ${end}: ${w.totalCommits} commits, ` +
      `AI=${(w.aiRatio * 100).toFixed(0)}%, ` +
      `feat=${w.featCommits}, fix=${w.fixCommits}, refactor=${w.refactorCommits}, ` +
      `test ratio=${(w.testRatio * 100).toFixed(0)}%`,
    );
  }
  console.log('');

  // Run all detectors on each window (filter commits to window timeframe)
  const detected = new Map<PatternType, RecommendationInput>();

  for (let i = 0; i < windows.length; i++) {
    const current = windows[i];
    const history = windows.slice(0, i);

    // Filter commits to the current window's timeframe
    const windowCommits = commits.filter(
      (c) => c.timestamp >= current.windowStart && c.timestamp < current.windowEnd,
    );

    for (const detector of DETECTORS) {
      const result = detector(current, history, windowCommits);
      if (result !== null && !detected.has(result.pattern)) {
        detected.set(result.pattern, result);
      }
    }
  }

  // Phase detection on latest window
  const latestWindow = windows[windows.length - 1];
  const history = windows.slice(0, -1);
  const phase = detectPhase(latestWindow, history);
  console.log(`Phase: ${phase.phase} (confidence: ${phase.confidence.toFixed(2)})`);
  console.log(`Guidance: ${phase.guidance}`);
  console.log(`Signals: ${phase.signals.join('; ')}\n`);

  // Report results
  console.log('=== PATTERN DETECTION RESULTS ===\n');

  let detectedCount = 0;
  let missedCount = 0;

  for (const [pattern, reason] of EXPECTED_PATTERNS) {
    const result = detected.get(pattern);
    if (result) {
      detectedCount++;
      console.log(`  [DETECTED] ${pattern}`);
      console.log(`    Expected: ${reason}`);
      console.log(`    Title: ${result.title}`);
      console.log(`    Severity: ${result.severity}`);
      console.log('');
    } else {
      missedCount++;
      console.log(`  [MISSED]   ${pattern}`);
      console.log(`    Expected: ${reason}`);
      console.log('');
    }
  }

  // Check for false positives
  const falsePositives: RecommendationInput[] = [];
  for (const [pattern, result] of detected) {
    if (!EXPECTED_PATTERNS.has(pattern)) {
      falsePositives.push(result);
    }
  }

  if (falsePositives.length > 0) {
    console.log('=== FALSE POSITIVES ===\n');
    for (const fp of falsePositives) {
      console.log(`  [FALSE+] ${fp.pattern}: ${fp.title}`);
    }
    console.log('');
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`  Detected: ${detectedCount}/${EXPECTED_PATTERNS.size}`);
  console.log(`  Missed:   ${missedCount}/${EXPECTED_PATTERNS.size}`);
  console.log(`  False+:   ${falsePositives.length}`);
  console.log(`  Accuracy: ${((detectedCount / EXPECTED_PATTERNS.size) * 100).toFixed(0)}%`);

  const allDetected = missedCount === 0 && falsePositives.length === 0;
  process.exit(allDetected ? 0 : 1);
}

validate();
