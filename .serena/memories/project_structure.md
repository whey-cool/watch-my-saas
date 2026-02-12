# Project Structure

```
watch-my-saas/
├── src/                               # Application source (empty — Session 4 scaffolds this)
│   └── .gitkeep
├── scripts/
│   ├── wiki.sh                        # Wiki operations wrapper
│   └── archaeology/                   # Git archaeology pipeline (Sessions 1-3)
│       ├── fetch-commits.sh           # Bash: fetches from local git + GitHub API
│       ├── parse-git-log.mjs          # ESM JS: parses git log → JSON
│       ├── transform-api-commits.mjs  # ESM JS: normalizes GitHub API → JSON
│       ├── analyze.ts                 # TS: orchestrator for all analyzers
│       ├── generate-wiki-pages.ts     # TS: analysis → wiki markdown
│       ├── types.ts                   # TS: shared interfaces
│       ├── analyzers/                 # Individual analysis modules
│       │   ├── tool-transitions.ts
│       │   ├── velocity-phases.ts
│       │   ├── quality-evolution.ts
│       │   ├── structural-growth.ts
│       │   └── unified-timeline.ts
│       ├── wiki-generators/           # One generator per wiki page
│       └── __tests__/
│           └── analyzers.test.ts      # 35 tests
├── dashboard/                         # Dashboard SPA placeholder (Session 4+)
├── docs/
│   └── competitive-landscape-analysis.md
├── data/archaeology/                  # Gitignored: raw + analysis JSON
├── .wiki/                             # Gitignored: local wiki clone
├── .claude/                           # Claude Code configuration
│   ├── commands/                      # Slash commands
│   └── hooks/                         # PostToolUse hooks
├── CLAUDE.md                          # Project instructions
├── wms-prd.md                         # Product Requirements Document (gitignored)
├── tsconfig.json
├── package.json
└── README.md
```

## Key Directories
- **`src/`**: Will contain the Hono API, Prisma schema, webhook handlers, recommendation engine
- **`scripts/archaeology/`**: Existing pipeline — read-only reference for patterns; the real product will reuse these analysis concepts
- **`data/archaeology/`**: Private repo data, always gitignored
- **`.wiki/`**: GitHub wiki clone, managed by `scripts/wiki.sh`
