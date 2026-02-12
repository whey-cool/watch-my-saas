/**
 * Orchestrator: reads analysis JSON and generates wiki markdown pages.
 * Usage: tsx scripts/archaeology/generate-wiki-pages.ts --input-dir data/archaeology/analysis --output-dir .wiki
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ToolTransitionAnalysis,
  VelocityAnalysis,
  QualityEvolutionAnalysis,
  StructuralGrowthAnalysis,
  UnifiedTimelineAnalysis,
} from './types.js';
import { generateToolTransitionsPage } from './wiki-generators/tool-transitions.js';
import { generateVelocityPhasesPage } from './wiki-generators/velocity-phases.js';
import { generateQualityEvolutionPage } from './wiki-generators/quality-evolution.js';
import { generateStructuralGrowthPage } from './wiki-generators/structural-growth.js';
import { generateFullTimelinePage } from './wiki-generators/full-timeline.js';

function parseArgs(argv: readonly string[]): { inputDir: string; outputDir: string } {
  let inputDir = 'data/archaeology/analysis';
  let outputDir = '.wiki';

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

function loadJson<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Analysis file not found: ${filePath}. Run archaeology:analyze first.`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function main(): void {
  const { inputDir, outputDir } = parseArgs(process.argv);

  console.log(`Loading analysis from ${inputDir}...`);

  const toolTransitions = loadJson<ToolTransitionAnalysis>(join(inputDir, 'tool-transitions.json'));
  const velocity = loadJson<VelocityAnalysis>(join(inputDir, 'velocity-phases.json'));
  const quality = loadJson<QualityEvolutionAnalysis>(join(inputDir, 'quality-evolution.json'));
  const structure = loadJson<StructuralGrowthAnalysis>(join(inputDir, 'structural-growth.json'));
  const timeline = loadJson<UnifiedTimelineAnalysis>(join(inputDir, 'unified-timeline.json'));

  console.log('Generating wiki pages...');

  const pages: readonly { readonly filename: string; readonly content: string }[] = [
    {
      filename: 'Archaeology-Tool-Transitions.md',
      content: generateToolTransitionsPage(toolTransitions),
    },
    {
      filename: 'Archaeology-Velocity-Phases.md',
      content: generateVelocityPhasesPage(velocity),
    },
    {
      filename: 'Archaeology-Quality-Evolution.md',
      content: generateQualityEvolutionPage(quality),
    },
    {
      filename: 'Archaeology-Structural-Growth.md',
      content: generateStructuralGrowthPage(structure),
    },
    {
      filename: 'Archaeology-Full-Timeline.md',
      content: generateFullTimelinePage(timeline),
    },
  ];

  for (const page of pages) {
    const filePath = join(outputDir, page.filename);
    writeFileSync(filePath, page.content);
    console.log(`  Written: ${page.filename} (${page.content.length} bytes)`);
  }

  console.log(`\nDone. ${pages.length} wiki pages written to ${outputDir}/`);
}

main();
