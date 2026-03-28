# Product Forge — SpecKit Extension

> **Full product lifecycle:** Research → Product Spec → Revalidation → SpecKit → Implement → Verify → **Test**

Product Forge is a [SpecKit](https://github.com/github/spec-kit) extension that adds a
complete **product discovery, specification, and testing pipeline** before and after any SpecKit
implementation work. Instead of jumping straight to spec.md, you first research competitors, UX
patterns, and your codebase — craft an approved product spec — let SpecKit implement it — then
automatically generate and run Playwright tests with a bug-fix loop until the feature is ready to ship.

---

## Why Product Forge?

Standard SpecKit starts from a feature description. Product Forge starts from a feature idea and:

1. **Researches** competitors, UX best practices, and your codebase in parallel
2. **Creates** structured product documents: user journeys, wireframes, mockups, metrics
3. **Revalidates** everything with you through an approval loop until the spec is perfect
4. **Bridges** the product spec into SpecKit's spec.md — enriched with all research context
5. **Plans, implements, and verifies** using SpecKit with full traceability back to the original research
6. **Auto-generates Playwright tests** from user stories, runs them, fixes P0/P1 bugs, and produces a test report

The result: a **complete traceability chain** — research → product spec → spec.md → plan → tasks → code → tests.

---

## Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/speckit.product-forge.forge` | All (1–8B) | **Main command.** Full lifecycle orchestrator with human gates |
| `/speckit.product-forge.research` | 1 | Parallel multi-dimensional feature research (adaptive depth) |
| `/speckit.product-forge.product-spec` | 2 | Interactive product spec creation with configurable detail |
| `/speckit.product-forge.revalidate` | 3 | Iterative review and correction loop until approval |
| `/speckit.product-forge.bridge` | 4 | Convert product-spec to SpecKit spec.md, choose Classic or V-Model |
| `/speckit.product-forge.implement` | 5–6 | Plan + tasks + implementation with product-spec cross-validation |
| `/speckit.product-forge.verify-full` | 7 | Full traceability verification: code ↔ research |
| `/speckit.product-forge.test-plan` | 8A | Auto-generate test cases and Playwright specs from user stories |
| `/speckit.product-forge.test-run` | 8B | Execute tests, auto-fix bugs, loop until exit criteria met |
| `/speckit.product-forge.status` | — | Show lifecycle status for any feature |

---

## Lifecycle

```
  Idea
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Research                                                           │
│  /speckit.product-forge.research                                                     │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐        │
│  │ Competitor       │  │ UX/UI Patterns  │  │ Codebase Analysis    │        │
│  │ Analysis         │  │ Research        │  │ Integration Points   │        │
│  │ [MANDATORY]      │  │ [MANDATORY]     │  │ [MANDATORY]          │        │
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
│  All revisions logged in review.md                                           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: "APPROVED"]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SpecKit Bridge                                                     │
│  /speckit.product-forge.bridge                                                       │
│                                                                              │
│  Synthesizes all artifacts → spec.md (enriched)                             │
│  User chooses: Classic (plan → tasks → impl) or V-Model (full traceability) │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve spec.md]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Plan + Tasks          PHASE 6: Implementation                     │
│  /speckit.product-forge.implement                                                    │
│                                                                              │
│  SpecKit plan → cross-validate vs product-spec                              │
│  SpecKit tasks → cross-validate vs product-spec                             │
│  SpecKit implement                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve plan, tasks, implementation]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: Full Verification                                                  │
│  /speckit.product-forge.verify-full                                                  │
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
   ▼
  Done ✅  (Research → Spec → Approved → Code → Verified → Tested)
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
    ├── tasks.md                           ← SpecKit tasks (Phase 5)
    ├── review.md                          ← Revalidation log (Phase 3)
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
    └── test-report.md                     ← Final test report (Phase 8B)
```

---

## Installation

### 1. Configure your project

Copy the config template to your project root:

```bash
mkdir -p .product-forge
cp path/to/speckit-product-forge/config-template.yml .product-forge/config.yml
```

Edit `.product-forge/config.yml` with your project details.

### 2. Add to `.specify/extensions.yml`

```yaml
extensions:
  - id: product-forge
    source: https://github.com/VaiYav/speckit-product-forge
    version: "1.1.0"
    enabled: true
```

### 3. Run

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

- SpecKit >= 0.1.0
- Agent with web search capabilities (for research phase)
- Agent with file system access (for codebase analysis)

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Author

Valentin Yakovlev — [github.com/VaiYav](https://github.com/VaiYav)

Contributions welcome. See [CHANGELOG.md](./CHANGELOG.md) for version history.
