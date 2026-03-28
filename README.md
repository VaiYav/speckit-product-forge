# Product Forge — SpecKit Extension

> **Full product lifecycle:** Research → Product Spec → Revalidation → SpecKit → Implement → Verify

Product Forge is a [SpecKit](https://github.com/github/spec-kit) extension that adds a
complete **product discovery and specification phase** before any SpecKit implementation work begins.
Instead of jumping straight to spec.md, you first research competitors, UX patterns, and your
codebase — then craft an exhaustive, user-approved product spec — then let SpecKit turn it into code.

---

## Why Product Forge?

Standard SpecKit starts from a feature description. Product Forge starts from a feature idea and:

1. **Researches** competitors, UX best practices, and your codebase in parallel
2. **Creates** structured product documents: user journeys, wireframes, mockups, metrics
3. **Revalidates** everything with you through an approval loop until the spec is perfect
4. **Bridges** the product spec into SpecKit's spec.md — enriched with all research context
5. **Plans, implements, and verifies** using SpecKit with full traceability back to the original research

The result: a **complete traceability chain** — research → product spec → spec.md → plan → tasks → code.

---

## Commands

| Command | Phase | Description |
|---------|-------|-------------|
| `/product-forge.forge` | All (1–7) | **Main command.** Full lifecycle orchestrator with human gates |
| `/product-forge.research` | 1 | Parallel multi-dimensional feature research |
| `/product-forge.product-spec` | 2 | Interactive product spec creation with configurable detail |
| `/product-forge.revalidate` | 3 | Iterative review and correction loop until approval |
| `/product-forge.bridge` | 4 | Convert product-spec to SpecKit spec.md, choose Classic or V-Model |
| `/product-forge.implement` | 5–6 | Plan + tasks + implementation with product-spec cross-validation |
| `/product-forge.verify-full` | 7 | Full traceability verification: code ↔ research |
| `/product-forge.status` | — | Show lifecycle status for any feature |

---

## Lifecycle

```
  Idea
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Research                                                           │
│  /product-forge.research                                                     │
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
│  /product-forge.product-spec                                                 │
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
│  /product-forge.revalidate                                                   │
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
│  /product-forge.bridge                                                       │
│                                                                              │
│  Synthesizes all artifacts → spec.md (enriched)                             │
│  User chooses: Classic (plan → tasks → impl) or V-Model (full traceability) │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ [Human gate: approve spec.md]
   │
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Plan + Tasks          PHASE 6: Implementation                     │
│  /product-forge.implement                                                    │
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
│  /product-forge.verify-full                                                  │
│                                                                              │
│  Code ↔ Tasks ↔ Plan ↔ spec.md ↔ product-spec ↔ research                  │
│  Produces: verify-report.md with CRITICAL / WARNING / PASSED                │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
  Done ✅
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
    └── verify-report.md                   ← Verification report (Phase 7)
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
    version: "1.0.0"
    enabled: true
```

### 3. Run

```
/product-forge.forge Build a push notification preferences screen
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
