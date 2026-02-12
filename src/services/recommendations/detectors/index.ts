/**
 * Pattern detector registry.
 * Each detector is a pure function: (current, history, commits) → Recommendation | null
 */

import type { Detector } from '../../../types.js';
import { detectSprintDrift } from './sprint-drift.js';
import { detectGhostChurn } from './ghost-churn.js';
import { detectAiHandoffCliff } from './ai-handoff-cliff.js';
import { detectToolTransition } from './tool-transition.js';
import { detectTestDrift } from './test-drift.js';
import { detectChangelogSilence } from './changelog-silence.js';
import { detectWorkflowBreakthrough } from './workflow-breakthrough.js';

export const DETECTORS: readonly Detector[] = [
  detectSprintDrift,
  detectGhostChurn,
  detectAiHandoffCliff,
  detectToolTransition,
  detectTestDrift,
  detectChangelogSilence,
  detectWorkflowBreakthrough,
];

export {
  detectSprintDrift,
  detectGhostChurn,
  detectAiHandoffCliff,
  detectToolTransition,
  detectTestDrift,
  detectChangelogSilence,
  detectWorkflowBreakthrough,
};
