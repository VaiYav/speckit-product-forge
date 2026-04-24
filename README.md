# Product Forge — SpecKit Extension

> **Full product lifecycle:** Problem Discovery → Research → Product Spec → Revalidation → SpecKit → Pre-Impl Review → Implement → Code Review → Verify → Test → Release Readiness → **API Docs · Security · Analytics · Retrospective**

Product Forge is a [SpecKit](https://github.com/github/spec-kit) extension that adds a
complete **product discovery, specification, and quality pipeline** before and after any SpecKit
implementation work. Instead of jumping straight to spec.md, you first research competitors, UX
patterns, and your codebase — craft an approved product spec — review design/architecture/risks —
let SpecKit implement it with progressive verification — run multi-agent code review — then
automatically generate and run Playwright tests with a bug-fix loop until the feature is ready to ship.

**New in v1.5.0:**
- **Portfolio view** across all features — conflict matrix, dependency graph, suggested merge order (`/speckit.product-forge.portfolio`).
- **Brown-field `backfill`** — reverse-engineer a feature folder from existing code with a gaps report.
- **Lite mode** — 5-phase lifecycle for small features and bug fixes (`feature_mode: lite`).
- **Phase 9.5 monitoring-setup**, **Phase 5.5 migration-plan**, **post-bridge i18n-harvest**, **Phase 9B experiment-design**, and cross-cutting **feature-flag-cleanup** — all opt-in, artifact-producing.
- **Schema v3** for `.forge-status.yml` (additive over v2, no action required).
- **State-lock protocol** prevents concurrent-writer corruption.
- **Per-phase digests** keep context budgets small across long lifecycles.
- **Learning loop** via `.product-forge/lessons.md` — retrospectives teach research.
- **Skip-reason policy** and **sync-verify drift budget** with opt-in cosmetic auto-resolve.
- **Release-readiness actually creates** monitoring dashboard and flag registry instead of only checking them.

Full change list in [CHANGELOG.md](./CHANGELOG.md).

**New in v1.4.0:** EDA Event Verification in bridge phase, Dependency Discovery between features, Codebase Constraint Analysis in research, Constitution Compliance auto-check in plan, and unified review.md format with Decision Log and Change History.

**New in v1.3.0:** Cross-artifact sync-verify, pre-implementation review gate, code review phase,
release readiness checklist, change request management, gate audit trail, and progressive verification.

---

## Why Product Forge?

Standard SpecKit starts from a feature description. Product Forge starts from a feature idea and:

1. **Discovers** whether the problem is real: JTBD analysis, interview script, Go/No-go before any research begins
2. **Researches** competitors, UX best practices, and your codebase in parallel — guided by validated hypotheses
3. **Creates** structured product documents: user journeys, wireframes, mockups, metrics
4. **Revalidates** everything with you through an approval loop until the spec is perfect
5. **Bridges** the product spec into SpecKit's spec.md — enriched with all research context
6. **Plans, implements, and verifies** using SpecKit with full traceability back to the original research
7. **Auto-generates Playwright tests** from user stories, runs them via `playwright-cli`, fixes P0/P1 bugs, and produces a test report
8. **Generates API docs** (OpenAPI 3.1 + Postman), runs an **OWASP security audit**, and creates an **analytics tracking plan** with SDK snippets
9. **Runs a post-launch retrospective** comparing predicted KPIs against real data from NewRelic/Analytics

The result: a **complete traceability chain** — problem → research → product spec → spec.md → plan → tasks → code → tests → metrics.

---

## Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/speckit.product-forge.forge` | All | **Main command.** Full lifecycle orchestrator with human gates |
| `/speckit.product-forge.problem-discovery` | 0 | Validate the problem: JTBD analysis, interview script, Go/No-go |
| `/speckit.product-forge.research` | 1 | Parallel research: competitors, UX, codebase (+ constraints & event patterns) **[v1.4]** |
| `/speckit.product-forge.product-spec` | 2 | Interactive product spec creation with configurable detail |
| `/speckit.product-forge.revalidate` | 3 | Iterative review loop — Decision Log, Change History, OQR tracking **[v1.4]** |
| `/speckit.product-forge.bridge` | 4 | Dependency Discovery → spec.md with EDA verification, NFR contracts, test spec **[v1.4]** |
| `/speckit.product-forge.plan` | 5 | Technical plan + Constitution Compliance auto-check + cross-validation **[v1.4]** |
| `/speckit.product-forge.tasks` | 5B | Generate task breakdown from plan.md — standalone, exits after approval |
| `/speckit.product-forge.pre-impl-review` | 5C | **[NEW]** Design review + architecture review + risk assessment before coding |
| `/speckit.product-forge.implement` | 6 | Execute implementation with progressive verification checkpoints |
| `/speckit.product-forge.code-review` | 6B | **[NEW]** Multi-agent code review: quality, security, patterns, test coverage |
| `/speckit.product-forge.verify-full` | 7 | Full traceability verification: code ↔ research |
| `/speckit.product-forge.test-plan` | 8A | Auto-generate test cases and Playwright specs from user stories |
| `/speckit.product-forge.test-run` | 8B | Execute tests with playwright-cli, auto-fix bugs, loop until done |
| `/speckit.product-forge.release-readiness` | 9 | **[NEW]** Pre-ship checklist: feature flags, rollout, docs, monitoring |
| `/speckit.product-forge.sync-verify` | cross-cutting | **[NEW]** 7-layer artifact consistency check, runnable between any phases |
| `/speckit.product-forge.change-request` | cross-cutting | **[NEW]** Formal scope change with impact analysis and artifact propagation |
| `/speckit.product-forge.api-docs` | post-impl | Generate OpenAPI 3.1 spec + Postman collection from plan.md |
| `/speckit.product-forge.security-check` | post-impl | OWASP audit scoped to detected surfaces (auth, input, payments) |
| `/speckit.product-forge.tracking-plan` | post-spec | Analytics events, funnels, property schemas + SDK code snippets |
| `/speckit.product-forge.retrospective` | post-launch | Predicted vs actual metrics, research accuracy, lessons learned (appends to `.product-forge/lessons.md`) **[UPD v1.5]** |
| `/speckit.product-forge.status` | — | Show lifecycle status, gate audit trail, sync history |
| `/speckit.product-forge.portfolio` | cross-cutting | **[NEW v1.5]** Multi-feature view: table, file-conflict matrix, dependency graph, merge order |
| `/speckit.product-forge.backfill` | alt entry | **[NEW v1.5]** Reverse-engineer an existing module into a feature folder with gaps report |
| `/speckit.product-forge.monitoring-setup` | 9.5 | **[NEW v1.5]** Build real dashboard JSON, alerts, SLO doc. Wraps `newrelic-dashboard-builder` |
| `/speckit.product-forge.migration-plan` | 5.5 | **[NEW v1.5]** Zero-downtime migration plan with forward/rollback/validation/backfill when plan.md has schema changes |
| `/speckit.product-forge.i18n-harvest` | post-bridge | **[NEW v1.5]** Extract strings from wireframes/spec, stub every locale |
| `/speckit.product-forge.experiment-design` | 9B | **[NEW v1.5]** Pre-registered A/B plan — hypothesis, MDE, sample size, decision rule |
| `/speckit.product-forge.feature-flag-cleanup` | cross-cutting | **[NEW v1.5]** Scan `flags/registry.yml` for stale flags, produce removal recipes |

---

## Lifecycle

```
  Idea
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: Problem Discovery  [OPTIONAL but recommended]                      │
│  /speckit.product-forge.problem-discovery                                    │
│                                                                              │
│  JTBD Analysis · Problem Statement Canvas · Interview Script                │
│  Competing Forces · Go / Investigate further / No-go decision               │
│  Outputs hypotheses H1–HN that guide Phase 1 research agents                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: Go decision]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Research                                                           │
│  /speckit.product-forge.research                                                     │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐        │
│  │ Competitor       │  │ UX/UI Patterns  │  │ Codebase Analysis    │        │
│  │ Analysis         │  │ Research        │  │ + Constraints +      │        │
│  │ [MANDATORY]      │  │ [MANDATORY]     │  │ Event Patterns [MND] │        │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘        │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │ Tech Stack       │  │ Metrics / ROI   │                                   │
│  │ Research         │  │ Analysis        │                                   │
│  │ [OPTIONAL]       │  │ [OPTIONAL]      │                                   │
│  └─────────────────┘  └─────────────────┘                                   │
│                              ↓ research/README.md                            │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve research]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: Product Spec                                                       │
│  /speckit.product-forge.product-spec                                                 │
│                                                                              │
│  Asks: detail level · decomposition · mockup style                          │
│                                                                              │
│  Creates:                                                                    │
│  product-spec.md · user-journey*.md · wireframes* · metrics.md · mockups/   │
│  All linked via product-spec/README.md                                       │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve product spec]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Revalidation                                                       │
│  /speckit.product-forge.revalidate                                                   │
│                                                                              │
│  Loop: show summary → collect feedback → apply changes → confirm            │
│  Exits only on explicit user approval                                        │
│  Revisions logged in review.md: Decision Log + Change History + OQR [v1.4] │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "APPROVED"]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SpecKit Bridge                                                [v1.4] │
│  /speckit.product-forge.bridge                                                       │
│                                                                              │
│  Dependency Discovery → Synthesizes all artifacts → spec.md (enriched)     │
│  EDA Event Verification · NFR Measurement Contract · Testing Specification  │
│  User chooses: Classic (plan → tasks → impl) or V-Model (full traceability) │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve spec.md]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Plan                                                        [v1.4]  │
│  /speckit.product-forge.plan                                                 │
│                                                                              │
│  SpecKit plan → Constitution Compliance auto-check → cross-validate → approve │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve plan]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5B: Tasks                                                             │
│  /speckit.product-forge.tasks                                                │
│                                                                              │
│  SpecKit tasks → cross-validate vs product-spec → approve                  │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve tasks]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5C: Pre-Implementation Review  [OPTIONAL but recommended]  [NEW v1.3] │
│  /speckit.product-forge.pre-impl-review                                      │
│                                                                              │
│  Design Review · Architecture Review · Risk Assessment                       │
│  State completeness · UX compliance · NFR coverage · Risk register          │
│  Rollout strategy recommendation                                            │
│  Outputs: pre-impl-review.md                                                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve review]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: Implementation (with Progressive Verification)         [UPD v1.3]  │
│  /speckit.product-forge.implement                                            │
│                                                                              │
│  SpecKit implement — anchored to product-spec wireframes + user journeys    │
│  Mini-verify every N tasks: task-code, spec drift, unplanned changes        │
│  Outputs: implementation-log.md with checkpoint results                     │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: implementation complete]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6B: Code Review  [OPTIONAL but recommended]               [NEW v1.3]  │
│  /speckit.product-forge.code-review                                          │
│                                                                              │
│  Parallel agents: Quality · Security · Patterns · Tests                     │
│  Enriched with Product Forge context (ux-patterns, codebase-analysis)       │
│  Outputs: code-review.md with findings by severity                          │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve code review]  ← extension point: insert custom step here
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: Full Verification                                                  │
│  /speckit.product-forge.verify-full                                          │
│                                                                              │
│  Code ↔ Tasks ↔ Plan ↔ spec.md ↔ product-spec ↔ research                  │
│  Produces: verify-report.md with CRITICAL / WARNING / PASSED                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "Run test phases?" — optional but recommended]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8A: Test Plan  [OPTIONAL]                                             │
│  /speckit.product-forge.test-plan                                                    │
│                                                                              │
│  Auto-detects framework, ports, env vars                                     │
│  Generates: smoke / E2E / API / regression test cases                       │
│  Writes Playwright .spec.ts files with US-NNN traceability                  │
│  Creates: testing/test-plan.md · testing/test-cases.md · bugs/README.md     │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve test plan]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 8B: Test Execution  [OPTIONAL]                                        │
│  /speckit.product-forge.test-run                                                     │
│                                                                              │
│  Smoke → E2E → API → Regression (ordered, smoke blocks on failure)          │
│  Per bug: bugs/BUG-NNN.md with evidence + gap analysis                      │
│  Auto-fix loop: P0/P1 bugs fixed → retested → smoke regression check        │
│  Exit: ≥80% pass rate + zero P0/P1 open bugs                                │
│  Produces: test-report.md with full traceability chain                      │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "Run release readiness?" — optional but recommended]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 9: Release Readiness  [OPTIONAL]                          [NEW v1.3]  │
│  /speckit.product-forge.release-readiness                                    │
│                                                                              │
│  Feature flags · Rollout strategy · Rollback plan                           │
│  Documentation · Monitoring · Analytics · Dependencies                       │
│  Consolidates api-docs + security-check + tracking-plan status              │
│  Outputs: release-readiness.md with READY / CONDITIONAL / NOT READY         │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CROSS-CUTTING COMMANDS  [Runnable at any time]                  [NEW v1.3]  │
│                                                                              │
│  /speckit.product-forge.sync-verify                                          │
│  7-layer consistency check across all artifacts (forward + backward drift)   │
│  Auto-runs in quick mode between every phase transition                      │
│  Full run on demand or before Phase 7                                        │
│                                                                              │
│  /speckit.product-forge.change-request                                       │
│  Formal scope change: capture → impact analysis → effort delta → propagate  │
│  Traces changes with CR-NNN markers across all affected artifacts           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST-IMPLEMENTATION COMMANDS  [Run in any order after Phase 6]              │
│                                                                              │
│  /speckit.product-forge.api-docs                                             │
│  OpenAPI 3.1 spec + Postman collection from plan.md contracts               │
│  Consistency check: plan vs implementation drift                             │
│                                                                              │
│  /speckit.product-forge.security-check                                       │
│  OWASP audit scoped to detected surfaces from plan.md                       │
│  Checks only: auth / input / payments / files / webhooks (as applicable)    │
│                                                                              │
│  /speckit.product-forge.tracking-plan                                        │
│  Analytics events from user journeys · Funnel definitions                   │
│  SDK code snippets (Mixpanel / Amplitude / PostHog / Firebase)              │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ Ship ✅
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST-LAUNCH  [Run ≥14 days after shipping]                                  │
│  /speckit.product-forge.retrospective                                        │
│                                                                              │
│  Predicted vs actual metrics (from research/metrics-roi.md)                 │
│  NewRelic + Analytics MCP query · Research accuracy audit                   │
│  Lessons learned · Closes the full lifecycle loop                           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
  Done ✅  (Problem → Research → Spec → Reviewed → Code → Code Review → Verified → Tested → Ship Ready → Measured)
```

---

## Feature File Structure

Every feature gets a dedicated folder with a consistent structure:

```
features/
└── my-feature-name/
    ├── README.md                          ← Feature index (all links)
    ├── .forge-status.yml                  ← Phase tracker
    │
    ├── problem-discovery/                 ← Phase 0 outputs (optional)
    │   ├── problem-statement.md           ← JTBD + Problem Canvas + Go/No-go
    │   └── interview-script.md            ← User interview guide
    │
    ├── research/
    │   ├── README.md                      ← Research index + executive summary
    │   ├── competitors.md
    │   ├── ux-patterns.md
    │   ├── codebase-analysis.md
    │   ├── tech-stack.md                  ← optional
    │   └── metrics-roi.md                 ← optional
    │
    ├── product-spec/
    │   ├── README.md                      ← Spec index + document map
    │   ├── product-spec.md                ← Main PRD (concise/standard/exhaustive)
    │   ├── user-journey.md                ← or user-journey-{name}.md × N
    │   ├── wireframes.md                  ← or wireframes/ folder × N screens
    │   ├── metrics.md                     ← optional
    │   └── mockups/                       ← optional
    │       ├── index.html
    │       └── mockup-{screen}.html × N
    │
    ├── spec.md                            ← SpecKit spec (generated in Phase 4)
    ├── plan.md                            ← SpecKit plan (Phase 5)
    ├── tasks.md                           ← SpecKit tasks (Phase 5B)
    ├── review.md                          ← Revalidation log (Phase 3)
    ├── pre-impl-review.md                 ← Design + arch + risk review (Phase 5C) [NEW v1.3]
    ├── implementation-log.md              ← Progressive verify log (Phase 6) [NEW v1.3]
    ├── code-review.md                     ← Multi-agent code review (Phase 6B) [NEW v1.3]
    ├── verify-report.md                   ← Verification report (Phase 7)
    │
    ├── testing/                           ← Phase 8A outputs (optional)
    │   ├── test-plan.md                   ← Master test plan + entry/exit criteria
    │   ├── test-cases.md                  ← All test cases (TC-SMK/E2E/API/REG-NNN)
    │   ├── env.md                         ← Credentials (gitignored)
    │   └── playwright-tests/
    │       ├── playwright.config.ts
    │       ├── {slug}-smoke.spec.ts
    │       ├── {slug}-e2e.spec.ts
    │       └── {slug}-regression.spec.ts
    │
    ├── bugs/                              ← Phase 8B outputs (optional)
    │   ├── README.md                      ← Bug dashboard (P0–P4 counts, status)
    │   └── BUG-NNN.md × N               ← One file per bug with evidence + fix log
    │
    ├── test-report.md                     ← Final test report (Phase 8B)
    │
    ├── api-docs/                          ← api-docs command outputs (optional)
    │   ├── openapi.yml                    ← OpenAPI 3.1 spec
    │   ├── postman-collection.json        ← Postman collection
    │   └── consistency-report.md         ← Plan vs implementation drift
    │
    ├── tracking/                          ← tracking-plan command outputs (optional)
    │   ├── tracking-plan.md              ← Event taxonomy + property schemas + funnels
    │   └── snippets.md                   ← Ready-to-paste SDK code snippets
    │
    ├── security-check.md                  ← OWASP audit report (optional)
    ├── release-readiness.md               ← Pre-ship checklist (Phase 9) [NEW v1.3]
    ├── retrospective.md                   ← Post-launch retrospective (optional)
    │
    ├── sync-report.md                     ← Latest sync-verify report [NEW v1.3]
    ├── sync-report.json                   ← Machine-readable sync data [NEW v1.3]
    ├── change-log.md                      ← Change request history [NEW v1.3]
    └── backlog.md                         ← Deferred changes (if any) [NEW v1.3]
```

---

## Installation

### Install (latest version)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Install (specific version)

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Update to latest

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/heads/main.zip
```

### Update to specific version

```bash
specify extension update product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.5.1.zip
```

### Verify installation

```bash
specify extension list
# Should show: product-forge  v1.5.1  enabled
```

---

### After installing: configure your project

Copy the config template to your project root:

```bash
mkdir -p .product-forge
cp $(specify extension path product-forge)/config-template.yml .product-forge/config.yml
```

Edit `.product-forge/config.yml`:

```yaml
project_name: "My App"
project_tech_stack: "Node.js + Express + Postgres"
project_domain: "mobile fitness app"
codebase_path: "./src"
features_dir: "features"
default_speckit_mode: "ask"   # classic | v-model | ask
```

### Run

```
/speckit.product-forge.forge Build a push notification preferences screen
```

---

## Configuration

See [config-template.yml](./config-template.yml) and [docs/config.md](./docs/config.md) for all options.

Key settings:
- `project_name` — used in all research prompts
- `project_tech_stack` — helps tech research agents
- `codebase_path` — required for codebase analysis and project-styled mockups
- `default_wireframe_detail` — `text` / `basic-html` / `detailed-html`
- `default_speckit_mode` — `ask` / `classic` / `v-model`

---

## Requirements

- **SpecKit** >= 0.1.0
- **Agent with web search capabilities** — for research phase (Phases 1)
- **Agent with file system access** — for codebase analysis and artifact creation

### V-Model mode (optional, required only for `feature_mode: v-model`)

- **[`leocamello/spec-kit-v-model`](https://github.com/leocamello/spec-kit-v-model)** >= 0.5.0 — external SpecKit extension that
  implements the formal V-Model artifact progression (requirements →
  system / architecture / module design, paired with system / integration /
  unit test plans, trace checkpoints, peer review, test results ingestion,
  audit report). Product Forge delegates phases V1–V13 to this plugin when
  `feature_mode: v-model` is selected.

  Install:
  ```bash
  specify extension add v-model \
    --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip
  ```

> **Hard dependency only for v-model mode.** Without this plugin,
> `lite` and `standard` modes work exactly the same — nothing degrades.
> When you invoke `/speckit.product-forge.forge --mode=v-model` without
> it, the orchestrator aborts with the install command above and does
> **not** silently fall back to standard mode. This is intentional —
> regulated / safety-critical work (medical IEC 62304, automotive
> ISO 26262, avionics DO-178C) must not ship without the formal
> artifacts. Domain selection lives in `v-model-config.yml` at the
> project root and is read by the delegated commands. Full flow in
> [docs/v-model-integration.md](./docs/v-model-integration.md).

### Phases 8A–8B: Testing

- **[`playwright-cli`](https://github.com/microsoft/playwright-cli)** — interactive browser agent used by Phase 8B (`test-run`) to execute test cases step-by-step, capture screenshots, record traces, and manage auth sessions.

  Install:
  ```bash
  npm install -g playwright-cli
  ```

- **Playwright browsers** — required for both `playwright-cli` (agent-driven) and `.spec.ts` CI/CD runs:
  ```bash
  npx playwright install
  ```

> **Note:** Phases 8A and 8B are optional. If you skip testing phases, `playwright-cli` is not needed.

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Author

Valentin Yakovlev — [github.com/VaiYav](https://github.com/VaiYav)

Contributions welcome. See [CHANGELOG.md](./CHANGELOG.md) for version history.
