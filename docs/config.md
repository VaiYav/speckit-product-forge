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

#### Storage strategy

```yaml
storage_strategy: "flat"
```

Controls **only where each feature directory is placed** under
`features_dir`. The internal artifact tree below every feature root
(`research/`, `product-spec/journeys/`, `contracts/`, `.forge-status.yml`,
`testing/`, …) is **invariant** across all strategies — a strategy never
changes a single internal path.

Selectable values:

| Value | Feature root | Summary |
|-------|--------------|---------|
| `"flat"` *(default)* | `{features_dir}/<slug>/` | Every feature is an immediate child of `features_dir`. The filesystem enforces global slug uniqueness; resolve is a deterministic one-level join with no search. This is byte-for-byte today's behavior — an absent key resolves to `flat`. |
| `"domain-nested"` | `{features_dir}/<domain>/<slug>/` | One extra grouping folder by area/team/surface. A single depth-tolerant discovery rule subsumes flat (depth 1) and the existing `_archived/<date>-<slug>/` (depth 2), so flat and nested layouts coexist. |
| `"ddd"` | `{features_dir}/<context>/<slug>/` | Groups by DDD bounded context, mirroring the canonical living spec at `specs/<domain>/`. Backed by a `features/domains.yml` registry (`slug: context`) for O(1) resolution; the registry is healed on resolve/create. |
| `"workspace"` | `{features_dir}/<workspace>/<slug>/` | Each feature under its primary monorepo workspace (`scope.primary`), mirroring `codebase.paths`. **Requires monorepo mode** (a `codebase.paths` block). |

`flat` is the recommended default and the only value an absent key resolves
to (zero-config, zero-disk-change). Grouping is something you opt **into**.
All four values are active and selectable; the internal artifact tree is
invariant across every strategy, so only the feature-root placement changes.

**Avoid changing `storage_strategy` after features exist.** Like
`features_dir`, the effective value should be pinned at the project layer once
a repo has features; relocate existing features with `git mv` (the internal
tree is self-path-free and moves intact).

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

```yaml
constitution_path: ".specify/memory/constitution.md"
```
Path to the project's architecture constitution, read by Phase 4 (`plan`)
to ground architecture decisions in your project's governing principles.
Repo-relative. **Default:** `.specify/memory/constitution.md` when the key
is unset. If the file does not exist, the plan phase proceeds without a
constitution rather than failing.

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

```yaml
supported_locales: []
```
List of locale codes the `i18n-harvest` phase treats as the project's
target locale set. When set, the i18n phase scans the codebase for missing
translations across exactly these locales. **Default:** `[]` — when empty,
`i18n-harvest` falls back to inferring the locale set from the existing i18n
folder structure (auto-detected). Only relevant for projects that run the
i18n extension phase.

```yaml
supported_locales:
  - "en"
  - "ru"
  - "de"
```

---

```yaml
supply_chain:
  license_allowlist:
    - "MIT"
    - "Apache-2.0"
    - "BSD-2-Clause"
    - "BSD-3-Clause"
    - "ISC"
    - "0BSD"
    - "Unlicense"
```
SPDX license identifiers permitted for third-party dependencies. Read by
Phase 9 (`release-readiness`) during its supply-chain check: any dependency
whose license is **not** in this allowlist is flagged. **Default** (when the
key is unset): `MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD,
Unlicense`.

> **Env override:** the license allowlist can be overridden for a single run
> via the environment variable `PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST`
> (comma-separated SPDX ids), following the standard `PRODUCT_FORGE_` prefix
> convention. This is the one explicit nested-key env override Product Forge
> reads (see [Environment Variable Overrides](#environment-variable-overrides)).

---

## Global Configuration

Product Forge builds the **effective config** by deep-merging several layers,
then applying environment overrides last. The layers, from **lowest to highest
precedence** (rightmost wins):

| # | Layer | Source |
|---|-------|--------|
| 1 | **Shipped defaults** | `config-template.yml` from the installed extension (always-loaded base supplying every key's default; locate via `specify extension path product-forge`). |
| 2 | **Global** | `~/.product-forge/config.yml` (user-level, cross-project). No-op when absent. |
| 3 | **Project** | `<project-root>/.product-forge/config.yml`. |
| 4 | **Per-feature** | `config_override` on `{FEATURE_DIR}/.forge-status.yml` (applied once a feature is selected). |
| 5 | **Env** | `PRODUCT_FORGE_*` (applied last, over the fully merged result). |

So the precedence is:
**shipped defaults < global (`~/.product-forge` or XDG) < project
`.product-forge/config.yml` < per-feature `config_override` < `PRODUCT_FORGE_*`
env.** This mirrors git's `system → global → local` model.

### Global file location

- **Canonical:** `~/.product-forge/config.yml` — symmetric with the project
  `<project>/.product-forge/config.yml` (same dirname + filename, one level up
  in `$HOME`).
- **Fallback:** `$XDG_CONFIG_HOME/product-forge/config.yml`, honored only when
  `$XDG_CONFIG_HOME` is set.

The global file is **hand-authored** (like a personal global git config). The
runtime **reads** it but never prompt-and-saves to it — missing project
identity is always saved to the **project** config.

### Deep-merge rule

Applied between every adjacent pair of layers:

- **Maps merge recursively, key by key.** A higher layer that sets only
  `telemetry.dashboards` leaves the lower layer's `telemetry.product_analytics`
  intact.
- **Scalars and lists REPLACE wholesale.** A higher layer's list value fully
  replaces the lower one — e.g. a project `default_competitors` **replaces**
  (does not append to) a global list. By design.
- **Nested maps that MUST be deep-merged** (not clobbered): `codebase`,
  `telemetry`, `design_system`, and `sync_verify` (including `drift_budget`,
  `auto_resolve`, `contract_regen`).

> **Why deep-merge is mandatory.** A global config may set
> `sync_verify.contract_differ: oasdiff` (a machine/personal trait) while the
> project config sets `sync_verify.contract_regen.cmd: "..."` (repo-specific).
> Both must survive in the merged `sync_verify` — a naive clobber would drop one.

### Which keys belong in which layer

`global` = sensible to set once across all projects. `project` = intrinsically
per-repo. `either` = both valid (personal default OR team-pinned per repo).

| Config key | Layer | Rationale |
|------------|-------|-----------|
| `storage_strategy` | either | Greenfield personal default is meaningful globally, but once a repo has features the EFFECTIVE strategy MUST be pinned at the project layer (lock-after-creation). |
| `project_name` | project | Repo-specific identity; meaningless to share. |
| `project_tech_stack` | project | Per-repo stack description driving research prompts. |
| `project_domain` | project | Per-repo industry/domain for competitor/UX research. |
| `codebase_path` | project | On-disk path to THIS repo's code. |
| `codebase` (root/workspace_type/paths) | project | Monorepo workspace map intrinsic to one repo; nested, deep-merged but only ever set at project layer. |
| `features_dir` | project | On-disk artifact root for THIS repo; must not change after features exist — a global override would silently relocate every project's features. |
| `default_speckit_mode` | global | Personal workflow preference (ask/classic/v-model) for the Phase 4 bridge. |
| `constitution_path` | project | Path to THIS repo's constitution; repo-relative. |
| `default_competitors` | project | Domain/project-specific. NOTE: a LIST, so a project value REPLACES (does not append to) any global value. |
| `default_tech_research` | either | Personal default cadence, but teams may pin per repo. |
| `default_metrics_research` | either | Same as tech research — personal default a team may standardize. |
| `default_wireframe_detail` | global | Stylistic output preference (text/basic-html/detailed-html); travels well. |
| `default_mockup_style` | global | Stylistic output preference; project-styled still auto-adapts per repo, so global is safe. |
| `progressive_verify_interval` | either | Verification cadence: personal default, often pinned per repo's risk tolerance. |
| `auto_sync_between_phases` | either | Workflow cadence toggle; personal default AND a team policy a repo may pin. |
| `release_readiness` | either | Governance toggle (required/optional/skip): personal default OR team-pinned. |
| `default_feature_mode` | global | Personal lifecycle preference (express/lite/standard/v-model) for new features. |
| `flow_mode` | global | Personal sequencing preference (gated/fluid); travels across projects. |
| `default_track_hint` | global | Personal default track (express/lite/standard) offered at intake. |
| `e2e_runner` | either | Personal default (playwright-cli/none) but also a per-repo tooling decision. |
| `a11y_gate` | either | Personal default for the WCAG-AA floor, commonly a team/project policy. |
| `telemetry` (product_analytics/error_tracking/dashboards) | either | Nested map, DEEP-MERGED key-by-key; personal defaults AND team-pinned backends both valid; sub-keys may come from different layers. |
| `design_system` (components_path/tokens_path/storybook) | project | Paths/flags pointing at THIS repo's component library and tokens; nested map but project-only. |
| `require_skip_reason` | either | Governance: personal default for solo work, team-pinned in shared repos. |
| `require_pre_impl_review` | either | Optional-phase governance: personal default OR team policy per repo. |
| `require_code_review` | either | Optional-phase governance: personal default OR team policy per repo. |
| `require_testing` | either | Optional-phase governance: personal default OR team policy per repo. |
| `sync_verify.drift_budget` (cosmetic/structural) | either | Drift tolerance: personal default, teams often pin per repo. Nested, deep-merged. |
| `sync_verify.auto_resolve` (cosmetic) | either | Auto-resolve opt-in: personal default OR team policy; nested, deep-merged. |
| `sync_verify.contract_differ` | global | Depends on `oasdiff` being on PATH — a machine/personal trait; safe global default (falls back to prose if absent). |
| `sync_verify.contract_regen` (cmd/out) | project | `cmd` is HOW THIS REPO emits its code-derived OpenAPI — intrinsically project-specific; `out` is a repo-relative temp path. |
| `supply_chain.license_allowlist` | either | Personal default allowlist OR a team policy pinned per repo. |
| `supported_locales` | project | The locale set THIS repo ships; per-repo. |
| `max_tokens_per_doc` | global | Personal sizing preference for generated docs; travels across projects. |
| `output_language` | global | Personal language preference (en/ru/de); canonical global-eligible setting. |

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

Top-level config values can be overridden via environment variable using the
prefix `PRODUCT_FORGE_`. Env vars are applied **last** — over the fully merged
[layered config](#global-configuration):

```bash
PRODUCT_FORGE_PROJECT_NAME="My App" \
PRODUCT_FORGE_CODEBASE_PATH="./src" \
/speckit.product-forge.forge
```

The `PRODUCT_FORGE_*` scheme addresses **top-level scalar keys**; there is no
generic auto-derived addressing for arbitrary nested keys. The one nested key a
command reads explicitly is `supply_chain.license_allowlist`, overridable via
`PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST` (comma-separated SPDX ids) —
see [supply_chain](#advanced).

---

## Appendix — Config keys added in v1.5.0

### Feature mode

```yaml
default_feature_mode: "standard"
```

Selects the phase map for new features. Valid values:
- `"express"` — 4-phase combined pass (product-spec minimal → plan inline →
  implement → verify) for trivial changes; first-class `feature_mode`,
  escalatable to lite/standard when scope grows.
- `"lite"` — 5-phase lifecycle for small features, bug fixes, refactors.
  Phases: problem-discovery (opt) → product-spec → plan → implement → verify.
- `"standard"` — full lifecycle: 8 always-on core phases + 12
  optional/conditional = 20 phase slots. Default.
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

### Optional-phase governance

```yaml
require_pre_impl_review: false
require_code_review: false
require_testing: false
```

These force individual optional phases to run instead of leaving them
skippable. Each defaults to `false` — the phase stays optional and may be
skipped per the [skip-reason policy](#skip-reason-policy). Set to `true`
to make the phase mandatory for every feature:

| Key | Forces |
|-----|--------|
| `require_pre_impl_review` | the pre-implementation review phase (`pre_impl_review`) |
| `require_code_review` | the code-review phase (`code_review`) |
| `require_testing` | the test-plan and test-run phases (`test_plan` / `test_run`) |

See [`docs/policy.md §6`](./policy.md#6-optional-phase-governance) for the
phase→key mapping.

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

---

## v1.6.0 Config Keys

New keys introduced with the flow improvements (also defined inline in
[`config-template.yml`](../config-template.yml)):

| Key | Type / Values | Default | Purpose |
|-----|---------------|---------|---------|
| `flow_mode` | `gated` \| `fluid` | `gated` | Sequencing model. `gated` = one phase at a time, in order. `fluid` = "actions, not phases": any runnable phase on demand, dependencies as enablers (see [policy §4.0.1](./policy.md) and [runtime](./runtime.md)). |
| `default_track_hint` | `express` \| `lite` \| `standard` | `standard` | Advisory only: the intake/triage step uses this as the **pre-selected default** in the Track prompt (the user can still override, and a classified change may recommend a different track). The persisted value is `feature_mode` (express is a first-class mode). |
| `e2e_runner` | `playwright-cli` \| `none` | `playwright-cli` | E2E runner. Specs are generated from `product-spec/journeys/journeys.yml` (see [docs/journeys.md](./journeys.md)). `playwright-cli` is the first-class default. |
| `a11y_gate` *(v1.6, W5-B2)* | `axe` \| `none` | `axe` | Automated WCAG-AA accessibility floor. When `axe`, the Phase 8A generator emits one `@axe-core/playwright` check per `JRN` and Phase 8B runs it (test-run §4.7). Default `axe` for any feature with browser journeys; a no-op for non-browser journeys (test-run §4.7 skips them). Deterministic minimum bar — manual a11y review still required. |
| `sync_verify.contract_differ` *(v1.6, W5-B4)* | `oasdiff` \| `none` | `none` | Deterministic FE↔BE OpenAPI contract differ consumed by `sync-verify` Layer 8 / `verify-full` Layer 9. When `oasdiff` (and a regen source is configured + `oasdiff` on `PATH`), contract drift is a tool exit code; otherwise the LLM prose check is used. OpenAPI only — `asyncapi.yaml`/events stay on the prose path. |
| `sync_verify.contract_regen.cmd` / `.out` *(v1.6, W5-B4)* | command / path | `""` / `.forge-tmp/openapi.from-code.yaml` | The project command that regenerates an OpenAPI spec from running code (to a temp path, **never** inside `contracts/`). Required for `contract_differ: oasdiff` to run; the committed `contracts/openapi.yaml` is the base/truth. |
| `telemetry.product_analytics` | `posthog` \| `amplitude` \| `none` | `none` | Product-analytics backend used by `retrospective` (funnels/retention) and `experiment-design` via MCP. |
| `telemetry.error_tracking` | `sentry` \| `none` | `none` | Error-tracking backend used by `retrospective` and `monitoring-setup` via MCP. |
| `telemetry.dashboards` | `posthog` \| `sentry` \| `newrelic` \| `none` | `none` | Dashboard/alert backend used by `monitoring-setup`. `posthog` and `sentry` are wired via their MCP servers; `newrelic` is not MCP-wired and needs the external `newrelic-dashboard-builder` skill. Default `none` builds no dashboards. |
| `design_system.components_path` | path | auto-detect | Component-library root harvested by `design-system-harvest`. |
| `design_system.tokens_path` | path | auto-detect | Design-token location (json/css/ts). |
| `design_system.storybook` | bool | auto-detect | Harvest components from Storybook when present. |

> The design system is kept **in code** as the single source of truth; Product
> Forge harvests a read-only `design-system/manifest.yml` and never duplicates it.

---

## v1.6 Wave-5 Config Keys

### Accessibility gate — `a11y_gate` (v1.6, W5-B2)

```yaml
a11y_gate: "axe"          # axe (default) | none
```

The automated **WCAG-AA accessibility floor**. When `axe`, the Phase 8A
test generator emits one `@axe-core/playwright` assertion per journey
(`JRN`), scanned at the journey's end state with the
`['wcag2a','wcag2aa','wcag21a','wcag21aa']` tag set, and Phase 8B runs it
inside the normal browser run — see
[`commands/test-plan.md §4`](../commands/test-plan.md) (generation) and
[`commands/test-run.md §4.7`](../commands/test-run.md) (execution).

- Default `axe` for any feature with **browser journeys**. It is a no-op
  for non-browser journeys (API-only flows), which test-run §4.7 already
  skips — so `axe` is safe to leave on for non-UI features.
- `none` suppresses generation of the automated floor.

This is a **deterministic minimum bar**, not a substitute for manual
accessibility review (the manual leg remains a separate track — see
[`docs/testing-strategy.md §2`](./testing-strategy.md)). It fulfils the
bridge global AC "Accessibility requirements pass automated + manual
testing".

---

### Contract differ — `sync_verify.contract_differ` (v1.6, W5-B4)

```yaml
sync_verify:
  contract_differ: none          # none (default) | oasdiff
  contract_regen:                # only used when contract_differ != none
    cmd: ""                      # command that emits the code-derived OpenAPI spec to stdout
    out: ".forge-tmp/openapi.from-code.yaml"   # temp path the cmd writes to (NEVER inside contracts/)
```

Turns the FE↔BE OpenAPI contract check from an LLM prose read into a
**deterministic tool exit code**. Consumed by
[`commands/sync-verify.md` Layer 8](../commands/sync-verify.md) and
[`commands/verify-full.md` Layer 9](../commands/verify-full.md).

- `contract_differ: oasdiff` runs [`oasdiff`](https://github.com/Tufin/oasdiff)
  **only when** a regen source is configured (`contract_regen.cmd` is set,
  or `contract_regen.out` already exists from the build) **and** `oasdiff`
  is on `PATH`. The committed `contracts/openapi.yaml` is the base/truth;
  the differ compares it against the code-derived spec written to
  `contract_regen.out`.
- Otherwise (default `none`, no regen source, or `oasdiff` missing) the
  consumers fall back to the LLM prose check and note the fallback reason.
- **OpenAPI only.** `asyncapi.yaml` / event contracts stay on the prose
  path.

> The canonical config path is **`sync_verify.contract_differ`** (nested
> under the existing `sync_verify:` block alongside `drift_budget`), not a
> top-level key.

---

### Headless CI mode — `forge --ci` + `.product-forge/gate-policy.yml` (v1.6, W5-B1)

`forge --ci` runs the lifecycle unattended for automation. It is **opt-in**
(invoked explicitly) and is governed by a **separate policy file**,
`.product-forge/gate-policy.yml` — this is *not* a key in `config.yml`.
Copy the template at
[`docs/templates/gate-policy.yml`](./templates/gate-policy.yml); `forge --ci`
aborts if the file is absent. See
[`commands/forge.md`](../commands/forge.md) for the headless step contract.

The policy maps each **{phase × risk-class}** to one of three actions
(risk is computed by `node scripts/gate-risk.js --feature-dir <dir> --json`):

| Action | Behavior |
|--------|----------|
| `auto-recommend` | Record an `approved` `gates[]` decision without a human present — **only** when the deterministic pre-gate (`require_clean`: `validate-traceability --strict` exits 0 + zero open CRITICAL `F-NNN`) passes. Reserved for low-risk changes. |
| `require-human` | Stop and emit a reviewable request (PR comment / issue); do not proceed until a human approves out-of-band. |
| `block` | Stop and fail the run; never auto-proceed. |

`auto-recommend` is **not** "auto-approve a human gate" (policy §9.3): it is
a CI affordance for low-risk changes with a clean deterministic gate, and it
still writes a recorded `gates[]` decision stamped with the policy version +
risk signals. `release_readiness` and `spec_merge` are hard-pinned to
`require-human` at **every** risk — ship and canonical-spec mutation are
always human. Headless writes follow the gh-aw **safe-outputs** discipline
(`never_auto_merge`, reviewable PR/comment/issue only, read-only default
token scope).
