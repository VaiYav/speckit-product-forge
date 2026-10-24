# Product Forge — Configuration Reference

Product Forge is configured via `.product-forge/config.yml` in your project root.
All settings are optional: missing project identity is asked at runtime; every
other key falls back to the shipped default in
[`config-template.yml`](../config-template.yml), the source of truth for keys and
defaults. This page documents every key once, in the template's order.

## Contents

- [Quick Setup](#quick-setup)
- Keys: [Project Identity](#project-identity) · [Paths](#paths) ·
  [SpecKit Integration](#speckit-integration) · [Research Defaults](#research-defaults) ·
  [Product Spec Defaults](#product-spec-defaults) · [Lifecycle Behavior](#lifecycle-behavior) ·
  [Feature Mode](#feature-mode) · [E2E Testing](#e2e-testing) ·
  [Telemetry Providers](#telemetry-providers) · [Design System](#design-system) ·
  [Skip-Reason Policy](#skip-reason-policy) ·
  [Optional-Phase Governance](#optional-phase-governance) ·
  [Learning Loop](#learning-loop) · [Cross-Model Review](#cross-model-review) · [Verification](#verification) ·
  [Sync-Verify](#sync-verify) · [Supply Chain](#supply-chain) ·
  [Localization](#localization) · [Advanced](#advanced)
- [Config Layers](#config-layers) ([which keys belong in which layer](#which-keys-belong-in-which-layer)) ·
  [Per-Feature Config Override](#per-feature-config-override) ·
  [Environment Variable Overrides](#environment-variable-overrides) · [Related Files](#related-files)

---

## Quick Setup

```bash
mkdir -p .product-forge
# SpecKit extension form
cp "$(specify extension path product-forge)/config-template.yml" .product-forge/config.yml
# Claude Code plugin form (the plugin root is ${CLAUDE_PLUGIN_ROOT})
cp "${CLAUDE_PLUGIN_ROOT}/config-template.yml" .product-forge/config.yml
# Or fetch it from GitHub at the pinned tag
curl -fsSL https://raw.githubusercontent.com/VaiYav/speckit-product-forge/v1.8.0/config-template.yml \
  -o .product-forge/config.yml
```

Then edit it. Unset keys inherit from the global layer and the shipped defaults
([Config Layers](#config-layers)), so delete the ones you don't change.

---

## Project Identity

```yaml
project_name: "My Project"
project_tech_stack: ""        # e.g. "Next.js + TypeScript + Postgres + Vercel"
project_domain: ""            # e.g. "B2B SaaS fintech platform"
```

- `project_name` — used in research prompts, report headers and competitor search
  queries; the more specific, the better the research.
- `project_tech_stack` — helps research find stack-specific libraries, mobile vs
  web constraints, and codebase integration patterns.
- `project_domain` — targets competitor search, UX pattern research and
  metrics/ROI benchmarks to the right vertical.

If any identity key (or the codebase path) is still unset after merging, the
runtime prompts for it and saves the answer to the **project** config, never to
the global file.

## Paths

Two layouts are supported: single-root (`codebase_path`) and monorepo
(`codebase` block).

```yaml
codebase_path: "."
```
Single-root layout: relative path from the project root to the codebase (e.g.
`"./src"`), used by every phase that scans code (codebase analysis in Phase 1, the
project-styled mockup generator in Phase 2, …). Ignored when a `codebase` block is
set.

```yaml
codebase:                       # unset by default (commented out in the template)
  root: "."
  workspace_type: "pnpm"        # pnpm | yarn | npm | turbo | nx | rush | lerna | none
  paths:
    backend:  "apps/api"
    frontend: "apps/web"
    shared:   "packages/shared"
    mobile:   "apps/mobile"
```
Monorepo layout. When set, `codebase` takes precedence over `codebase_path` and
every command becomes workspace-aware.

- `root` — monorepo root, relative to the project root.
- `paths` — short workspace names → directories under `root`. The names are used
  in the `tasks.md` `Paths:` prefix (`Paths: backend:src/users.ts`),
  `.forge-status.yml` `scope.paths`, `task_log[].paths`, and the `portfolio.md`
  per-workspace conflict matrix.
- `workspace_type` — selects the test-runner template used by test-plan /
  test-run / implement ([runtime.md §9.3](./runtime.md#93-test-runner-resolution)).
  `none` = plain multi-path layout without a workspace manager.

**Migrating from single-root.** A `.forge-status.yml` without `scope` is treated
as scope-unknown (portfolio downgrades its accuracy to `module-level`, no data
loss). New features get `scope.paths` from the first `Paths:` annotation in
tasks.md; add `scope.paths` to an old feature by hand.

```yaml
features_dir: "features"
```
Directory where feature artifact folders are created. Keep it fixed once features
exist — changing it breaks `.forge-status.yml` lookups.

```yaml
storage_strategy: "flat"        # flat | domain-nested | ddd | workspace
```
Controls **only where each feature directory is placed** under `features_dir`;
the artifact tree inside every feature root is invariant. An absent key resolves
to `flat`. `workspace` **requires monorepo mode** (a `codebase.paths` block).
Layouts per value: [file-structure.md](./file-structure.md#storage-strategies-feature-root-placement);
resolution rules: [runtime.md §12](./runtime.md#12-path-resolution-contract).
Keep it fixed once features exist: pin the effective value at the project layer
and relocate existing features with `git mv` (the internal tree is self-path-free
and moves intact).

## SpecKit Integration

```yaml
default_speckit_mode: "ask"
```
Controls the SpecKit sub-flow inside Phase 4 (`bridge`):

| Value | Behavior |
|-------|----------|
| `"ask"` | Ask the user which mode to use (default, recommended) |
| `"classic"` | Always use `plan → tasks → implement` (fastest path) |
| `"v-model"` | Always use the V-Model SpecKit commands with test specs (most thorough) |

Forced to `v-model` when `feature_mode` is `v-model` (bridge does not ask); see
[policy.md §4.1](./policy.md#41-phase-maps) "speckit_mode vs feature_mode".

```yaml
constitution_path: ".specify/memory/constitution.md"   # unset by default
```
Path to the project's architecture constitution (mandatory patterns: resilience,
EDA rules, code quality, …), repo-relative. Read by Phase 5 (`plan`) for its
compliance check, and by sync-verify Layer 10 and verify-full Layer 11
(constitution ↔ code). **Default:** `.specify/memory/constitution.md` when unset.
If the file does not exist, the consumers proceed without a constitution.

## Research Defaults

These pre-fill the Phase 1 (`research`) interview; the user can still override
them per feature.

```yaml
default_competitors: []
default_tech_research: false
default_metrics_research: false
```

- `default_competitors` — competitors to include in the competitor analysis. When
  non-empty, the list is used and the competitors question is skipped (the list is
  shown in the plan); empty → ask / auto-discover. A **list**, so a project value
  replaces (does not append to) a global one.
- `default_tech_research` / `default_metrics_research` — when `true`, pre-select
  **Tech-stack comparison** / **Metrics / ROI** in the research-scope prompt.

## Product Spec Defaults

These pre-fill the Phase 2 (`product-spec`) prompts; the user can still override
them per feature.

```yaml
default_wireframe_detail: "basic-html"
```

| Value | What it creates |
|-------|----------------|
| `"text"` | Markdown with ASCII box diagrams — fast, version-friendly |
| `"basic-html"` | Clean HTML wireframe per screen, gray-box style (default) |
| `"detailed-html"` | Full HTML/CSS wireframe matching project design tokens |

```yaml
default_mockup_style: "project-styled"
```

| Value | What it creates |
|-------|----------------|
| `"none"` | No mockups — wireframes only |
| `"generic"` | Clean HTML mockup with a generic design system |
| `"project-styled"` | Agent scans the codebase for CSS tokens and applies them (default) |

## Lifecycle Behavior

```yaml
progressive_verify_interval: 3
```
Completed tasks between progressive verification checkpoints during Phase 6
(`implement`). Each checkpoint runs a mini-verify (task ↔ code correspondence,
spec AC alignment, unplanned changes, plan alignment) logged in
`implementation-log.md`. `0` disables it.

```yaml
auto_sync_between_phases: true
```
Toggles the automatic quick sync-verify at every phase transition
([runtime.md §5.1](./runtime.md#51-automatic-quick-sync)). `false` skips it;
`/speckit.product-forge.sync-verify` still runs on demand.

```yaml
release_readiness: "optional"
```
Controls Phase 9 (`release-readiness`):

| Value | Behavior |
|-------|----------|
| `"optional"` | Offered after Phase 7/8; may be skipped (default) |
| `"required"` | Always runs before the feature is marked complete — never skippable |
| `"skip"` | Never offered |

`required` is enforced by the computed Gate prompt, which then omits the Skip
option ([runtime.md §6.3](./runtime.md#63-gate-prompt)).

## Feature Mode

```yaml
default_feature_mode: "standard"   # express | lite | standard | v-model
```
Phase map selected when a new feature is created (persisted as `feature_mode`).
Mode definitions, triage and escalation: [policy.md §4](./policy.md#4-feature-modes-e1);
phases per mode: [schema/phase-map.yml](./schema/phase-map.yml).

- `"express"` — 4-phase combined pass for trivial changes.
- `"lite"` — 5 phases, for bug fixes, refactors, small features.
- `"standard"` — full lifecycle, 20 phase slots. Default.
- `"v-model"` — full standard lifecycle plus V1–V13 from the external
  [V-Model Extension Pack](https://github.com/leocamello/spec-kit-v-model)
  (`leocamello/spec-kit-v-model` ≥ 0.5.0), a **required install** — without it,
  selecting v-model aborts. Install command and contract:
  [v-model-integration.md](./v-model-integration.md#2-installation).

```yaml
flow_mode: "gated"
```
Sequencing model: `gated` (default — phases in order, one gate after each) or
`fluid` (any phase in the runnable set may run next; prerequisites are enablers and
sync-verify still guards drift) — see
[policy.md §4.0.1](./policy.md#401-flow-mode-gated-vs-fluid) and
[runtime.md §11](./runtime.md#11-phase-prerequisites--fluid-mode-runnable-set).

```yaml
default_track_hint: "standard"   # express | lite | standard
```
Advisory only: the intake/triage step ([policy.md §4](./policy.md#4-feature-modes-e1))
pre-selects this track in the Track prompt. The user can override, and a
classified change may recommend a different track. The persisted value is
`feature_mode`.

## E2E Testing

```yaml
e2e_runner: "playwright-cli"     # playwright-cli | none
```
End-to-end runner. E2E specs are generated from the structured journey schema
(`product-spec/journeys/journeys.yml`, see [journeys.md](./journeys.md)) and
executed with this runner. `playwright-cli` is the first-class default.

```yaml
a11y_gate: "axe"                 # axe | none
```
Automated **WCAG-AA accessibility floor**. With `axe`, the Phase 8A generator
emits one `@axe-core/playwright` assertion per journey (`JRN`), scanned at the
journey's end state with the `['wcag2a','wcag2aa','wcag21a','wcag21aa']` tag set,
and Phase 8B runs it in the normal browser run — see
[test-plan.md](../commands/test-plan.md) (generation) and
[test-run.md §4.7](../commands/test-run.md) (execution). Safe for non-UI features
(non-browser journeys are skipped); `none` suppresses the floor. A minimum bar,
**not** a substitute for manual review ([testing-strategy.md §2](./testing-strategy.md#2-which-layer-for-what)).

## Telemetry Providers

```yaml
telemetry:
  product_analytics: "none"    # posthog | amplitude | none
  error_tracking: "none"       # sentry | none
  dashboards: "none"           # posthog | sentry | newrelic | none
```
Real telemetry backends, used via MCP when available. `none` skips a provider.

| Key | Used by |
|-----|---------|
| `telemetry.product_analytics` | `retrospective` (funnels/retention), `experiment-design` |
| `telemetry.error_tracking` | `retrospective`, `monitoring-setup` |
| `telemetry.dashboards` | `monitoring-setup`. `posthog` and `sentry` are wired via their MCP servers; `newrelic` is not MCP-wired and needs the external `newrelic-dashboard-builder` skill. `none` builds no dashboards. |

## Design System

```yaml
design_system:                           # unset by default → auto-detect
  components_path: "packages/ui/src"     # component library root
  tokens_path: "packages/ui/tokens"      # design tokens (json/css/ts)
  storybook: true                        # harvest from Storybook if present
```
The design system lives **in code** (component library + tokens) as the single
source of truth; `design-system-harvest` derives a read-only
`design-system/manifest.yml` from it without duplicating it. Unset → auto-detect
(Storybook, Tailwind config, component dir, token files).

## Skip-Reason Policy

```yaml
require_skip_reason: true
```
When `true`, skipping an optional phase asks for a free-text reason (an empty
reason re-asks); when `false`, skips are accepted without one. Phases with
`status: "not_applicable"` are exempt. Rules:
[policy.md §3](./policy.md#3-skip-reason-policy-e2); enforced by the computed
Gate prompt ([runtime.md §6.3](./runtime.md#63-gate-prompt)).

## Optional-Phase Governance

```yaml
require_problem_discovery: false
require_pre_impl_review: false
require_code_review: false
require_testing: false
```
Each `true` forces an optional phase to run (the computed Gate prompt omits
Skip for it, [runtime.md §6.3](./runtime.md#63-gate-prompt)). All default
`false`: the phase stays optional and skippable per the
[skip-reason policy](#skip-reason-policy). Phase → key mapping:
[policy.md §6](./policy.md#6-optional-phase-governance).

## Learning Loop

```yaml
learning:
  promote_to_skills: false
  min_recurrence: 2
  require_confirmation: true
  skill_category: "product-forge-lessons"
```
The retrospective always appends lessons to `.product-forge/lessons.md`. These
keys control whether it additionally **promotes** a recurring lesson into a
reusable Hermes skill via `skill_manage` (retrospective Step 5B):

| Key | Default | Meaning |
|-----|---------|---------|
| `promote_to_skills` | `false` | Promote recurring lessons into skills at all. |
| `min_recurrence` | `2` | Distinct features a lesson must recur in before it is promoted. |
| `require_confirmation` | `true` | Ask before creating or patching each skill. |
| `skill_category` | `"product-forge-lessons"` | Category the promoted skills are filed under. |

Full rules: [lessons-format.md §9](./lessons-format.md#9-promotion-to-hermes-skills). Only
meaningful inside Hermes (or any host exposing `skill_manage`); elsewhere the step
is a no-op and `lessons.md` is unaffected.

## Cross-Model Review

```yaml
review:
  cross_model: ""   # codex | gemini | claude | hermes | <local-model>
```
Default reviewer id for `code-review --cross-model` when no id is passed; empty →
the id must be given on the command line. The loop exports the consolidated
`gate-review.md` + git diff as a portable package, has a **different** model
review it out-of-band, and ingests its findings back into the `F-NNN` namespace.
Product Forge never silently invokes another paid model. The reviewer is stamped
on the gate entry as `reviewed_by_model`. See
[code-review.md](../commands/code-review.md) Step 2.5.

## Verification

```yaml
verify:
  ac_judge: false
```
Opt-in LLM judge for subjective ("judgeable") acceptance criteria in
[verify-full](../commands/verify-full.md) Layer 3. Executable criteria are always
covered by tests and never judged. Keep it off in CI unless a reviewer wants it.

## Sync-Verify

```yaml
sync_verify:
  drift_budget:
    cosmetic: 20
    structural: 0
  auto_resolve:
    cosmetic: false
  contract_differ: none
  contract_regen:
    cmd: ""
    out: ".forge-tmp/openapi.from-code.yaml"
```

**Drift budget & auto-resolve** — how sync-verify categorizes and reports
differences (category catalog: [sync-verify.md §3A](../commands/sync-verify.md)).

| Key | Default | Meaning |
|-----|---------|---------|
| `sync_verify.drift_budget.cosmetic` | `20` | Tolerable cosmetic drift items per feature (whitespace, ordering, date churn). Exceeding produces a WARNING only. |
| `sync_verify.drift_budget.structural` | `0` | Structural drift (field meaning, contract shape). Keep at `0`; structural drift always fails the gate. |
| `sync_verify.auto_resolve.cosmetic` | `false` | When `true` and `sync-verify --fix` is invoked, cosmetic drift is resolved automatically. Structural drift is **never** auto-resolved. |

**Contract differ** — turns the FE↔BE OpenAPI contract check
([sync-verify.md](../commands/sync-verify.md) Layer 8,
[verify-full.md](../commands/verify-full.md) Layer 9) from an LLM prose read into
a deterministic tool exit code.

| Key | Default | Meaning |
|-----|---------|---------|
| `sync_verify.contract_differ` | `none` | `none` \| `oasdiff`. [`oasdiff`](https://github.com/Tufin/oasdiff) runs **only when** a regen source exists (`contract_regen.cmd` set, or `contract_regen.out` already produced by the build) **and** `oasdiff` is on `PATH`; otherwise the prose check runs and notes the fallback reason. OpenAPI only — `asyncapi.yaml` / events stay on the prose path. |
| `sync_verify.contract_regen.cmd` | `""` | Project command that emits the code-derived OpenAPI spec. |
| `sync_verify.contract_regen.out` | `.forge-tmp/openapi.from-code.yaml` | Temp path the command writes to, always outside `contracts/`. The differ compares it against the committed `contracts/openapi.yaml` (the base/truth). |

## Supply Chain

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
SPDX license ids permitted for third-party dependencies. Phase 9
(`release-readiness`) flags any dependency whose license is outside the list as a
release blocker. Overridable per run via
`PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST`
([Environment Variable Overrides](#environment-variable-overrides)).

## Localization

```yaml
supported_locales: []            # e.g. ["en", "es", "de", "fr"]
```
The locale set `i18n-harvest` checks translation coverage across. **Default**
`[]`: infer the set from the existing i18n folder structure (or skip i18n for
English-only projects).

## Advanced

```yaml
max_tokens_per_doc: 4000
```
Size budget (approximate tokens, ≈ English words × 1.33) for every generated
Markdown document; the split-or-tighten procedure is
[runtime.md §10.1](./runtime.md#101-document-size-budget-max_tokens_per_doc).
Recommended range: `3000` (concise) to `6000` (exhaustive). Keep it at or below
`8000` — higher risks hitting context limits in downstream agents.

Generated artifacts are always written in **English**; there is no output-language
setting (an `output_language` key from older configs is ignored).

---

## Config Layers

The effective config is a deep-merge, lowest → highest precedence: shipped
defaults (`config-template.yml` at `${PLUGIN_ROOT}`) → global
(`~/.product-forge/config.yml`, or `$XDG_CONFIG_HOME/product-forge/config.yml`) →
project (`.product-forge/config.yml`) → per-feature `config_override` →
`PRODUCT_FORGE_*` env. Maps merge key by key; scalars and lists replace
wholesale. The global file is hand-authored — read, never written. Normative:
[runtime.md §1](./runtime.md#1-step-0--load-config).

### Which keys belong in which layer

`global` = set once across all projects. `project` = intrinsically per-repo.
`either` = personal default OR team-pinned per repo.

| Config key | Layer | Note |
|------------|-------|------|
| `project_name`, `project_tech_stack`, `project_domain` | project | |
| `codebase_path` | project | |
| `codebase` (root/workspace_type/paths) | project | Deep-merged, but set only at the project layer. |
| `features_dir` | project | A global value would silently relocate every project's features. |
| `storage_strategy` | either | Once a repo has features, the effective value MUST be pinned at the project layer. |
| `default_speckit_mode` | global | |
| `constitution_path` | project | Repo-relative. |
| `default_competitors` | project | A LIST: a project value REPLACES any global value. |
| `default_tech_research`, `default_metrics_research` | either | |
| `default_wireframe_detail` | global | |
| `default_mockup_style` | global | `project-styled` still adapts per repo. |
| `progressive_verify_interval` | either | |
| `auto_sync_between_phases` | either | |
| `release_readiness` | either | |
| `default_feature_mode` | global | |
| `flow_mode` | global | |
| `default_track_hint` | global | |
| `e2e_runner` | either | |
| `a11y_gate` | either | |
| `telemetry` (product_analytics/error_tracking/dashboards) | either | Deep-merged; sub-keys may come from different layers. |
| `design_system` (components_path/tokens_path/storybook) | project | |
| `require_skip_reason` | either | |
| `require_problem_discovery`, `require_pre_impl_review`, `require_code_review`, `require_testing` | either | |
| `learning.promote_to_skills`, `learning.min_recurrence`, `learning.require_confirmation`, `learning.skill_category` | either | |
| `review.cross_model` | either | |
| `verify.ac_judge` | project | |
| `sync_verify.drift_budget` (cosmetic/structural) | either | |
| `sync_verify.auto_resolve` (cosmetic) | either | |
| `sync_verify.contract_differ` | global | Depends on `oasdiff` on PATH (a machine trait); falls back to prose. |
| `sync_verify.contract_regen` (cmd/out) | project | Repo-specific command; repo-relative temp path. |
| `supply_chain.license_allowlist` | either | A LIST: replaced, not appended. |
| `supported_locales` | project | |
| `max_tokens_per_doc` | global | |

## Per-Feature Config Override

Override any setting for one feature with a `config_override` block in
`{FEATURE_DIR}/.forge-status.yml` (applied once the feature is selected):

```yaml
# .forge-status.yml
feature: "push-notifications"
config_override:
  default_wireframe_detail: "detailed-html"
  default_mockup_style: "project-styled"
  max_tokens_per_doc: 6000
```

## Environment Variable Overrides

`PRODUCT_FORGE_*` env vars are applied **last**, over the fully merged config.
They address **top-level scalar keys** only, by upper-casing the key:

```bash
PRODUCT_FORGE_PROJECT_NAME="My App" \
PRODUCT_FORGE_CODEBASE_PATH="./src" \
/speckit.product-forge.forge
```

Nested keys have no generic addressing. The only other `PRODUCT_FORGE_*`
variables Product Forge reads:

| Env var | Addresses | Read by |
|---------|-----------|---------|
| `PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST` | `supply_chain.license_allowlist` (comma-separated SPDX ids) | `release-readiness` |
| `PRODUCT_FORGE_COST_RATE_IN` | USD per 1M prompt tokens — env/flag only, no `config.yml` key | `status --cost` |
| `PRODUCT_FORGE_COST_RATE_OUT` | USD per 1M completion tokens — env/flag only, no `config.yml` key | `status --cost` |

A price is a per-invocation input, not project config, so the cost rates have no
config key. Without them `status --cost` (`${PLUGIN_ROOT}/scripts/cost-report.js`)
reports token and tool-call counts only; the flags `--rate-in` / `--rate-out` are
equivalent.

## Related Files

- **`.product-forge/gate-policy.yml`** — not a `config.yml` key. The
  `{phase × risk}` routing policy for headless `forge --ci`; copy
  [templates/gate-policy.yml](./templates/gate-policy.yml) (`forge --ci` aborts
  without it). Contract: [forge.md](../commands/forge.md) and
  [policy.md §9.3](./policy.md#93-risk-routing-a4--auto-recommend-never-auto-approve).
- Other project-level files (`lessons.md`, `_portfolio/`, `domains.yml`, …):
  [file-structure.md](./file-structure.md#project-level-files).
