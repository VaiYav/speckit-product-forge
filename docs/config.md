# Product Forge — Configuration Reference

Product Forge is configured via `.product-forge/config.yml` in your project root.
All settings are optional — missing values will be asked at runtime.

---

## Quick Setup

```bash
# Create the config directory
mkdir -p .product-forge

# Copy the template
cp $(specify extension path product-forge)/config-template.yml .product-forge/config.yml

# Edit with your project details
nano .product-forge/config.yml
```

---

## Full Configuration Reference

### Project Identity

```yaml
project_name: "Acme Workflow"
```
Human-readable project name. Used in all research prompts, report headers, and competitor search queries. The more specific, the better the research quality.

---

```yaml
project_tech_stack: "Node.js + Express + Postgres"
```
Brief tech stack description. Helps research agents:
- Find stack-specific libraries and packages
- Understand mobile vs web constraints
- Identify relevant codebase integration patterns

Examples:
- `"Next.js + TypeScript + Postgres + Vercel"`
- `"Django REST + React + Redux + AWS"`
- `"Flutter + Firebase"`

---

```yaml
project_domain: "consumer productivity app"
```
Domain and industry context. Used for:
- Targeting competitor search to relevant apps
- UX pattern research in the right vertical
- Metrics/ROI benchmarks from the same industry

Examples:
- `"B2B SaaS fintech platform"`
- `"consumer fitness mobile app"`
- `"e-commerce marketplace"`

---

### Paths

Two layouts are supported: single-root (legacy, still works) and
monorepo (v1.5+, first-class).

#### Single-root

```yaml
codebase_path: "."
```

Relative path from the config file to the project codebase. Used by:
- Codebase analysis agent (Phase 1)
- Project-styled mockup generator (Phase 2)
- Every other phase that scans code

If the codebase is in a subdirectory:

```yaml
codebase_path: "./src"
```

#### Monorepo (v1.5+)

Set the `codebase` block to declare multiple workspaces. When present,
`codebase` takes precedence over `codebase_path` and every command
becomes workspace-aware.

```yaml
codebase:
  root: "."
  workspace_type: "pnpm"        # pnpm | yarn | npm | turbo | nx | rush | lerna | none
  paths:
    backend:  "apps/api"
    frontend: "apps/web"
    shared:   "packages/shared"
```

Workspace names (`backend`, `frontend`, `shared`) are used in:
- `tasks.md` `Paths:` line prefix (e.g. `Paths: backend:src/users.ts`)
- `.forge-status.yml` `scope.paths` list
- `task_log[].paths` (workspace-prefixed)
- `portfolio.md` conflict matrix (per-workspace column)

`workspace_type` lets the orchestrator pick the right test runner:

| workspace_type | Test command template |
|----------------|----------------------|
| `pnpm` | `pnpm --filter=<workspace> test` |
| `yarn` | `yarn workspace <workspace> test` |
| `npm` | `npm test -w <workspace>` |
| `turbo` | `turbo run test --filter=<workspace>` |
| `nx` | `nx test <workspace>` |
| `rush` | `rush test --to <workspace>` |
| `lerna` | `lerna run test --scope=<workspace>` |
| `none` | Plain `cd <path> && <detected command>` |

#### Migration from single-root to monorepo

Existing features continue to work. When you add a `codebase` block:
- Existing `.forge-status.yml` files without `scope` are treated as
  feature-scope-unknown — portfolio downgrades their accuracy to
  `module-level`. No data loss.
- New features get `scope.paths` populated automatically at feature
  creation based on the first `Paths:` annotation in tasks.md.
- You can retroactively set scope on an old feature by adding a
  `scope.paths` block to its `.forge-status.yml`.

---

```yaml
features_dir: "features"
```
Directory where Product Forge creates feature artifact folders.
**Avoid changing this after features have been created** — it will break `.forge-status.yml` lookups.

---

### SpecKit Integration

```yaml
default_speckit_mode: "ask"
```

Controls Phase 4 behavior:

| Value | Behavior |
|-------|----------|
| `"ask"` | Always ask the user which mode to use (recommended) |
| `"classic"` | Always use `plan → tasks → implement` (fastest path) |
| `"v-model"` | Always use full V-Model with test specs (most thorough) |

---

### Research Defaults

```yaml
default_competitors: []
```
List of competitors to always include in Phase 1 competitor analysis.
The agent will add more from web search even if this is set.

```yaml
default_competitors:
  - "CoStar Group"
  - "Redfin"
  - "Zillow"
```

---

```yaml
default_tech_research: false
default_metrics_research: false
```
Whether to run optional research dimensions by default (without asking).
Setting to `true` means these run automatically on every feature.
The user can still override per-feature during Phase 1.

---

### Product Spec Defaults

```yaml
default_wireframe_detail: "basic-html"
```

| Value | What it creates |
|-------|----------------|
| `"text"` | Markdown with ASCII box diagrams — fast, version-friendly |
| `"basic-html"` | Clean HTML wireframe per screen, gray-box style |
| `"detailed-html"` | Full HTML/CSS wireframe matching project design tokens |

---

```yaml
default_mockup_style: "project-styled"
```

| Value | What it creates |
|-------|----------------|
| `"none"` | No mockups — wireframes only |
| `"generic"` | Clean HTML mockup with generic design system |
| `"project-styled"` | Agent scans codebase for CSS tokens and applies them |

The user can always override this per-feature during Phase 2.

---

### Lifecycle Behavior

```yaml
progressive_verify_interval: 3
```
Number of completed tasks between progressive verification checkpoints during Phase 6 (Implementation).
After every N completed tasks, a mini-verify runs checking task-code correspondence, spec AC alignment,
unplanned changes, and plan alignment. Results are logged in `implementation-log.md`.
Set to `0` to disable progressive verification.

---

```yaml
auto_sync_between_phases: true
```
When `true` (default), the forge orchestrator automatically runs `sync-verify --quick` between
every phase transition, checking only the artifact layers relevant to that transition.
If CRITICAL drift is found, the transition is paused for user review.
Set to `false` to skip automatic sync checks (you can still run `/speckit.product-forge.sync-verify` manually).

---

```yaml
release_readiness: "optional"
```

Controls Phase 9 (Release Readiness) behavior:

| Value | Behavior |
|-------|----------|
| `"optional"` | Ask the user after Phase 7/8 whether to run readiness check (default) |
| `"required"` | Always run readiness check before marking feature complete |
| `"skip"` | Never offer readiness check |

---

### Advanced

```yaml
max_tokens_per_doc: 4000
```
Maximum approximate token budget per generated document.
When a document would exceed this, Product Forge will:
1. Suggest decomposing into multiple files
2. Ask the user how many files/sections to create
3. Create individual files with cross-links

Recommended range: `3000` (concise) to `6000` (exhaustive).
Do not set above `8000` — this risks hitting context limits in downstream agents.

---

```yaml
output_language: "en"
```
Language for all generated documents.
Supported values: any BCP-47 language code (`"en"`, `"ru"`, `"de"`, `"fr"`, etc.)
Note: Research agents use web search, so results may mix languages regardless of this setting.

---

## Per-Feature Config Override

You can override any setting for a specific feature by adding a config block
to `{features_dir}/{feature-slug}/.forge-status.yml`:

```yaml
# .forge-status.yml
feature: "push-notifications"
config_override:
  default_wireframe_detail: "detailed-html"
  default_mockup_style: "project-styled"
  output_language: "ru"
```

---

## Environment Variable Overrides

Any config value can be overridden via environment variable using the prefix `PRODUCT_FORGE_`:

```bash
PRODUCT_FORGE_PROJECT_NAME="My App" \
PRODUCT_FORGE_CODEBASE_PATH="./src" \
/speckit.product-forge.forge
```

---

## Appendix — Config keys added in v1.5.0

### Feature mode

```yaml
default_feature_mode: "standard"
```

Selects the phase map for new features. Valid values:
- `"lite"` — 5-phase lifecycle for small features, bug fixes, refactors.
  Phases: problem-discovery (opt) → product-spec → plan → implement → verify.
- `"standard"` — full 14-phase lifecycle. Default.
- `"v-model"` — Product Forge keeps the bookends (problem-discovery,
  research, tasks, implement, verify, test, release-readiness) and
  delegates the middle (V1–V13: requirements, acceptance, system /
  architecture / module design paired with system / integration / unit
  test plans, trace, peer review, test results, audit report) to the
  external [V-Model Extension Pack](https://github.com/leocamello/spec-kit-v-model)
  (`leocamello/spec-kit-v-model` ≥ 0.5.0).
  **Required install:** `specify extension add v-model --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip`.
  Without it, selecting v-model mode aborts — there is no silent
  fallback. See [`docs/v-model-integration.md`](./v-model-integration.md).

Escalation: lite features can be promoted to standard mid-run when scope
grows — see [`docs/policy.md §4`](./policy.md#4-feature-modes-e1).

---

### Skip-reason policy

```yaml
require_skip_reason: true
```

When `true`, skipping an optional phase prompts for a free-text reason
that is persisted on the gate entry and on the phase. When `false`,
skips are accepted silently. See
[`docs/policy.md §3`](./policy.md#3-skip-reason-policy-e2).

Note: phases set to `status: "not_applicable"` (lite-mode exclusions,
backfilled features) are exempt from this policy — they were never in
scope for the feature.

---

### Sync-verify drift budget

```yaml
sync_verify:
  drift_budget:
    cosmetic: 20
    structural: 0
  auto_resolve:
    cosmetic: false
```

- `drift_budget.cosmetic` — tolerable count of cosmetic drift items per
  feature. Exceeding produces WARNING only.
- `drift_budget.structural` — MUST stay 0 in almost every project.
  Structural drift always fails the gate.
- `auto_resolve.cosmetic` — when `true` AND `sync-verify --fix` is
  invoked, cosmetic drift is automatically resolved. Structural drift is
  **never** auto-resolved.

See [`commands/sync-verify.md §3A`](../commands/sync-verify.md) for the
category catalog.

---

## Appendix — Runtime artifacts referenced by config

These are not config keys but paths the config indirectly controls:

| Path | Purpose | Created by |
|------|---------|-----------|
| `.product-forge/lessons.md` | append-only learning log | `retrospective` |
| `scripts/migrate-status-v2-to-v3.js` | lazy schema migration helper | ships with plugin |
| `scripts/acquire-lock.sh` / `release-lock.sh` | state-lock helpers | ships with plugin |
