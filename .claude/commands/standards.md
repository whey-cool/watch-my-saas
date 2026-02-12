Review and enforce Watch My SaaS project standards. Run this at session start, before architectural decisions, or when you need to verify alignment.

## Instructions

Read the following project documents and present a standards briefing:

1. Read `CLAUDE.md` for current project state, decisions, and invariants.
2. Read `wms-prd.md` sections: "What NOT to Build", "Named Patterns", "Competitive Positioning", "Cross-Session Invariants", and the current/next session spec.
3. Read `docs/competitive-landscape-analysis.md` section 4 (Positioning Strategy) if making architectural or feature decisions.

## Standards Briefing

Present a concise briefing covering:

### Identity Check
- **Who are we building for?** Solo devs and small teams using AI coding tools. Not engineering managers, not enterprise.
- **What's the core product?** Heuristic pattern detection + actionable recommendations. Not dashboards, not metrics.
- **What's our positioning?** The GPS ("here's how to build better with AI"), not the warning label ("AI code is bad").
- **What's the priority?** HerdMate-first. The tool must be useful on HerdMate before shipping to others.

### Named Patterns Vocabulary
Verify that any new pattern detection or recommendation language uses the canonical pattern names: Sprint-Drift Cycle, Ghost Churn, AI Handoff Cliff, Tool Transition Spike, Test Coverage Drift, Changelog Silence, Workflow Breakthrough. New patterns can be added but must be named deliberately and documented.

### Competitive Guardrails
Flag if any proposed work overlaps with the "What NOT to Build" list:
- DORA metrics dashboards
- Developer comparison/ranking
- Jira integration
- Sprint velocity tracking
- SSO/SAML
- Static code analysis
- Developer satisfaction surveys
- 200+ integrations

### Cross-Session Invariants
Check compliance with all 10 invariants from CLAUDE.md. Flag any that are at risk:
1. Wiki updated this session?
2. CLAUDE.md current?
3. TDD followed? Coverage ≥ 80%?
4. No HerdMate leakage?
5. Archaeology data gitignored?
6. Wiki records development history?
7. Telemetry reviewed? (after Session 4)
8. Community signals reviewed? (after Session 4)
9. Dogfood loop active? (after Session 5)
10. Recommendations constructive, not judgmental?

### Session Alignment
- What session are we in?
- What are the entry conditions, and are they met?
- What are the exit conditions we're working toward?
- Are we staying within scope or drifting?

## When to Flag Issues

If during a session you notice:
- A feature request that's on the "What NOT to Build" list → flag it immediately
- Recommendation language that's judgmental rather than constructive → reframe it
- Work that serves enterprise buyers rather than individual builders → question it
- Code that references HerdMate internals rather than porting patterns → stop and fix
- Missing tests for new code → enforce TDD before proceeding
- Scope creep beyond the current session's deliverables → surface it for a decision

## Output

After reviewing, output:
1. Current session and its exit conditions
2. Any standards at risk (with specific concerns)
3. Any "What NOT to Build" items that are relevant to current work
4. Recommendation for how to proceed
