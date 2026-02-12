/**
 * Merges all analysis signals into a chronological narrative timeline.
 */
import type {
  ToolTransitionAnalysis,
  VelocityAnalysis,
  QualityEvolutionAnalysis,
  StructuralGrowthAnalysis,
  TimelineEvent,
  TimelineEventType,
  WeeklyEpoch,
  UnifiedTimelineAnalysis,
} from '../types.js';

interface AnalysisInputs {
  readonly toolTransitions: ToolTransitionAnalysis;
  readonly velocity: VelocityAnalysis;
  readonly quality: QualityEvolutionAnalysis;
  readonly structure: StructuralGrowthAnalysis;
}

function extractToolTransitionEvents(analysis: ToolTransitionAnalysis): readonly TimelineEvent[] {
  return analysis.transitions.map(t => ({
    date: t.date,
    type: 'tool-transition' as TimelineEventType,
    title: `Tool switch: ${t.from.normalized} → ${t.to.normalized}`,
    description: `AI tooling transitioned from ${t.from.normalized} to ${t.to.normalized} (confidence: ${t.confidence})`,
    repo: t.repo,
    significance: t.confidence > 0.7 ? 'high' as const : 'medium' as const,
  }));
}

function extractVelocityEvents(analysis: VelocityAnalysis): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const phase of analysis.phases) {
    if (phase.type === 'gap') {
      events.push({
        date: phase.startWeek,
        type: 'velocity-change',
        title: `Development gap (${phase.weekCount} week${phase.weekCount > 1 ? 's' : ''})`,
        description: phase.description,
        repo: '',
        significance: phase.weekCount >= 2 ? 'high' : 'medium',
      });
    } else if (phase.type === 'acceleration') {
      events.push({
        date: phase.startWeek,
        type: 'velocity-change',
        title: `Velocity acceleration to ${phase.avgCommitsPerWeek}/week`,
        description: `${phase.description} — ${phase.weekCount} weeks at avg ${phase.avgCommitsPerWeek} commits/week`,
        repo: '',
        significance: phase.avgCommitsPerWeek > 20 ? 'high' : 'medium',
      });
    } else if (phase.type === 'decline') {
      events.push({
        date: phase.startWeek,
        type: 'velocity-change',
        title: `Velocity decline to ${phase.avgCommitsPerWeek}/week`,
        description: phase.description,
        repo: '',
        significance: 'medium',
      });
    }
  }

  return events;
}

function extractQualityEvents(analysis: QualityEvolutionAnalysis): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Inflection points are the most interesting
  for (const point of analysis.inflectionPoints) {
    events.push({
      date: point.date,
      type: 'quality-signal',
      title: `Quality: ${point.type}`,
      description: point.description,
      repo: '',
      significance: point.type.includes('frustration') ? 'high' : 'medium',
    });
  }

  // Add individual high-signal quality events
  for (const signal of analysis.signals) {
    if (signal.type === 'revert') {
      events.push({
        date: signal.date,
        type: 'quality-signal',
        title: 'Code reverted',
        description: signal.description,
        repo: signal.repo,
        significance: 'medium',
      });
    }
  }

  return events;
}

function extractStructuralEvents(analysis: StructuralGrowthAnalysis): readonly TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Refactoring events are significant
  for (const event of analysis.refactoringEvents) {
    events.push({
      date: event.date,
      type: 'structural-change',
      title: `Structural: ${event.type.replace(/-/g, ' ')}`,
      description: event.description,
      repo: event.repo,
      significance: event.filesAffected >= 10 ? 'high' : 'medium',
    });
  }

  // Major directory milestones (top-level dirs only)
  const topLevelDirs = analysis.directoryTimeline.filter(
    d => !d.path.includes('/'),
  );
  for (const dir of topLevelDirs) {
    events.push({
      date: dir.firstSeenDate,
      type: 'structural-change',
      title: `New top-level directory: ${dir.path}/`,
      description: `Directory ${dir.path}/ first appeared in ${dir.firstSeenRepo}`,
      repo: dir.firstSeenRepo,
      significance: 'low',
    });
  }

  return events;
}

function groupIntoEpochs(events: readonly TimelineEvent[]): readonly WeeklyEpoch[] {
  if (events.length === 0) return [];

  const weekMap = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const weekStart = getWeekStart(event.date);
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, []);
    }
    weekMap.get(weekStart)!.push(event);
  }

  const epochs: WeeklyEpoch[] = [];
  const sortedWeeks = [...weekMap.keys()].sort();

  for (const weekStart of sortedWeeks) {
    const weekEvents = weekMap.get(weekStart)!;
    const weekEnd = getWeekEnd(weekStart);

    const highEvents = weekEvents.filter(e => e.significance === 'high');
    const summary = highEvents.length > 0
      ? highEvents.map(e => e.title).join('; ')
      : weekEvents.length > 0
        ? `${weekEvents.length} event(s): ${weekEvents[0].title}`
        : 'Quiet week';

    epochs.push({
      weekStart,
      weekEnd,
      events: weekEvents.sort((a, b) => a.date.localeCompare(b.date)),
      summary,
    });
  }

  return epochs;
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function buildNarrative(epochs: readonly WeeklyEpoch[]): string {
  if (epochs.length === 0) return 'No development activity detected.';

  const lines: string[] = [
    `Development narrative spanning ${epochs.length} weeks:`,
    '',
  ];

  for (const epoch of epochs) {
    const highEvents = epoch.events.filter(e => e.significance === 'high');
    if (highEvents.length > 0) {
      lines.push(`**Week of ${epoch.weekStart}:** ${epoch.summary}`);
    }
  }

  if (lines.length === 2) {
    lines.push('Steady development with no major inflection points detected.');
  }

  return lines.join('\n');
}

export function buildUnifiedTimeline(inputs: AnalysisInputs): UnifiedTimelineAnalysis {
  const allEvents: TimelineEvent[] = [
    ...extractToolTransitionEvents(inputs.toolTransitions),
    ...extractVelocityEvents(inputs.velocity),
    ...extractQualityEvents(inputs.quality),
    ...extractStructuralEvents(inputs.structure),
  ];

  const sorted = [...allEvents].sort((a, b) => a.date.localeCompare(b.date));
  const epochs = groupIntoEpochs(sorted);
  const narrative = buildNarrative(epochs);

  return {
    events: sorted,
    epochs,
    narrative,
  };
}
