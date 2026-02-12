/**
 * Orchestrator: runs all analyzers on raw commit data.
 * Usage: tsx scripts/archaeology/analyze.ts --input-dir data/archaeology/raw --output-dir data/archaeology/analysis
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RawCommit, RepoCommitData, AnalysisBundle } from './types.js';
import { analyzeToolTransitions } from './analyzers/tool-transitions.js';
import { analyzeVelocityPhases } from './analyzers/velocity-phases.js';
import { analyzeQualityEvolution } from './analyzers/quality-evolution.js';
import { analyzeStructuralGrowth } from './analyzers/structural-growth.js';
import { buildUnifiedTimeline } from './analyzers/unified-timeline.js';

function parseArgs(argv: readonly string[]): { inputDir: string; outputDir: string } {
  let inputDir = 'data/archaeology/raw';
  let outputDir = 'data/archaeology/analysis';

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--input-dir' && argv[i + 1]) {
      inputDir = argv[i + 1];
      i++;
    } else if (argv[i] === '--output-dir' && argv[i + 1]) {
      outputDir = argv[i + 1];
      i++;
    }
  }

  return { inputDir, outputDir };
}

function loadAllCommits(inputDir: string): readonly RawCommit[] {
  const files = readdirSync(inputDir).filter(f => f.endsWith('.json'));
  const allCommits: RawCommit[] = [];

  for (const file of files) {
    const filePath = join(inputDir, file);
    const data: RepoCommitData = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(`  Loaded ${data.commits.length} commits from ${data.repo} (${data.source})`);
    allCommits.push(...data.commits);
  }

  // Sort chronologically
  allCommits.sort((a, b) => a.date.localeCompare(b.date));
  return allCommits;
}

function main(): void {
  const { inputDir, outputDir } = parseArgs(process.argv);

  console.log(`Loading commits from ${inputDir}...`);
  const commits = loadAllCommits(inputDir);
  console.log(`Total: ${commits.length} commits\n`);

  if (commits.length === 0) {
    console.error('No commits found. Run archaeology:fetch first.');
    process.exit(1);
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log('Running tool transitions analysis...');
  const toolTransitions = analyzeToolTransitions(commits);
  writeFileSync(join(outputDir, 'tool-transitions.json'), JSON.stringify(toolTransitions, null, 2));
  console.log(`  ${toolTransitions.signatures.length} signatures, ${toolTransitions.transitions.length} transitions\n`);

  console.log('Running velocity phases analysis...');
  const velocity = analyzeVelocityPhases(commits);
  writeFileSync(join(outputDir, 'velocity-phases.json'), JSON.stringify(velocity, null, 2));
  console.log(`  ${velocity.totalWeeks} weeks, ${velocity.phases.length} phases, avg ${velocity.overallAvgPerWeek}/week\n`);

  console.log('Running quality evolution analysis...');
  const quality = analyzeQualityEvolution(commits);
  writeFileSync(join(outputDir, 'quality-evolution.json'), JSON.stringify(quality, null, 2));
  console.log(`  ${quality.signals.length} signals, ${quality.inflectionPoints.length} inflection points\n`);

  console.log('Running structural growth analysis...');
  const structure = analyzeStructuralGrowth(commits);
  writeFileSync(join(outputDir, 'structural-growth.json'), JSON.stringify(structure, null, 2));
  console.log(`  ${structure.directoryTimeline.length} directories, ${structure.refactoringEvents.length} refactoring events\n`);

  console.log('Building unified timeline...');
  const timeline = buildUnifiedTimeline({ toolTransitions, velocity, quality, structure });
  writeFileSync(join(outputDir, 'unified-timeline.json'), JSON.stringify(timeline, null, 2));
  console.log(`  ${timeline.events.length} events across ${timeline.epochs.length} weekly epochs\n`);

  // Write full bundle
  const bundle: AnalysisBundle = { toolTransitions, velocity, quality, structure, timeline };
  writeFileSync(join(outputDir, 'bundle.json'), JSON.stringify(bundle, null, 2));

  console.log('Analysis complete. Output written to:', outputDir);
}

main();
