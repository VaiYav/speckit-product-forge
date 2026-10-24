# Product Forge — Configuration Reference

Product Forge is configured via `.product-forge/config.yml` in your project root.
All settings are optional — missing project identity is asked at runtime; every
other key falls back to the shipped default in
[`config-template.yml`](../config-template.yml), which is the source of truth for
keys and defaults. This page documents every key once, in the template's order.

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

Then edit it. Keys you leave unset inherit from the global layer and the shipped
defaults ([Config Layers](#config-layers)), so delete the ones you don't change.

---

## Project Identity

```yaml
project_name: "My Project"
```
Human-readable project name. Used in research prompts, report headers, and
competitor search queries. The more specific, the better the research quality.

```yaml
project_tech_stack: ""        # e.g. "Next.js + TypeScript + Postgres + Vercel"
```
Brief tech stack description. Helps research agents find stack-specific
libraries, understand mobile vs web constraints, and identify codebase
integration patterns.

```yaml
project_domain: ""            # e.g. "B2B SaaS fintech platform"
```
Domain and industry context. Targets competitor search, UX pattern research in
the right vertical, and metrics/ROI benchmarks from the same industry.

If any identity key (or the codebase path) is still unset after merging, the
runtime prompts for it and saves the answer to the **project** config — never to
the global file.

## Paths

Two layouts are supported: single-root (`codebase_path`) and monorepo
(`codebase` block).

```yaml
codebase_path: "."
```
Single-root layout. Relative path from the project root to the codebase (e.g.
`"./src"`). Used by codebase analysis (Phase 1), the project-styled mockup
generator (Phase 2), and every other phase that scans code. Still fully
supported; ignored when a `codebase` block is set.

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
  Use `none` for plain multi-path layouts without a workspace manager.

**Migrating from single-root.** Existing features keep working: a
`.forge-status.yml` without `scope` is treated as scope-unknown (portfolio
downgrades its accuracy to `module-level`, no data loss). New features get
`scope.paths` from the first `Paths:` annotation in tasks.md; you can add
`scope.paths` to an old feature by hand.

```yaml
features_dir: "features"
```
Directory where Product Forge creates feature artifact folders. **Avoid changing
this after features have been created** — it breaks `.forge-status.yml` lookups.

```yaml
storage_strategy: "flat"
```
Controls **only where each feature directory is placed** under `features_dir`.
The internal artifact tree below every feature root (`research/`,
`product-spec/journeys/`, `contracts/`, `.forge-status.yml`, `testing/`, …) is
invariant across all strategies.

| Value | Feature root | Summary |
|-------|--------------|---------|
| `"flat"` *(default)* | `{features_dir}/<slug>/` | Every feature is an immediate child of `features_dir`; the filesystem enforces global slug uniqueness. An absent key resolves to `flat` (zero-config, zero disk change). |
| `"domain-nested"` | `{features_dir}/<domain>/<slug>/` | One grouping folder by area/team/surface. A depth-tolerant discovery rule also covers flat (depth 1) and `_archived/<date>-<slug>/` (depth 2), so layouts coexist. |
| `"ddd"` | `{features_dir}/<context>/<slug>/` | Groups by DDD bounded context, mirroring `specs/<domain>/`. Backed by a `features/domains.yml` registry (`slug: context`), healed on resolve/create. |
| `"workspace"` | `{features_dir}/<workspace>/<slug>/` | Each feature under its primary monorepo workspace (`scope.primary`). **Requires monorepo mode** (a `codebase.paths` block). |

**Avoid changing `storage_strategy` after features exist.** Once a repo has
features, pin the effective value at the project layer; relocate existing
features with `git mv` (the internal tree is self-path-free and moves intact).
Resolution rules: [runtime.md §12](./runtime.md#12-path-resolution-contract).

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
EDA rules, code quality, …). Read by Phase 5 (`plan`) for its compliance check,
and by sync-verify Layer 10 and verify-full Layer 11 (constitution ↔ code).
Repo-relative. **Default:** `.specify/memory/constitution.md` when unset. If the
file does not exist, the consumers proceed without a constitution rather than
failing.

## Research Defaults

These pre-fill the Phase 1 (`research`) interview; the user can still override
them per feature.

```yaml
default_competitors: []
```
Competitors to include in the competitor analysis. When non-empty, the list is
used and the competitors question is skipped (the list is shown in the plan);
empty → ask / auto-discover. A **list**, so a project value replaces (does not
append to) a global one.

```yaml
default_tech_research: false
default_metrics_research: false
```
When `true`, pre-select **Tech-stack comparison** / **Metrics / ROI** in the
research-scope prompt.

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
Number of completed tasks between progressive verification checkpoints during
Phase 6 (`implement`). Each checkpoint runs a mini-verify (task ↔ code
correspondence, spec AC alignment, unplanned changes, plan alignment) logged in
`implementation-log.md`. `0` disables it.

```yaml
auto_sync_between_phases: true
```
Toggles the automatic quick sync-verify at every phase transition
([runtime.md §5.1](./runtime.md#51-automatic-quick-sync)): only the layers
relevant to the transition are checked, and CRITICAL drift pauses the transition
for review. `false` skips it; `/speckit.product-forge.sync-verify` still runs on
demand.

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
default_feature_mode: "standard"
```
Phase map selected when a new feature is created (persisted as `feature_mode`):

- `"express"` — 4-phase combined pass for trivial changes (product-spec minimal →
  plan inline → implement → verify); first-class mode.
- `"lite"` — 5 phases: problem-discovery (opt) → product-spec → plan →
  implement → verify. For bug fixes, refactors, small features.
- `"standard"` — full lifecycle: 8 always-on core phases + 12
  optional/conditional = 20 phase slots. Default.
- `"v-model"` — the full standard lifecycle (every Product Forge phase, including
  product-spec, revalidation, bridge and plan) plus V1–V13 delegated to the
  external [V-Model Extension Pack](https://github.com/leocamello/spec-kit-v-model)
  (`leocamello/spec-kit-v-model` ≥ 0.5.0). **Required install:**
  `specify extension add v-model --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip`.
  Without it, selecting v-model aborts — there is no silent fallback. See
  [v-model-integration.md](./v-model-integration.md).

Express/lite features can be escalated up the ladder when scope grows — see
[policy.md §4](./policy.md#4-feature-modes-e1).

```yaml
flow_mode: "gated"
```
Sequencing model. `gated` (default): one phase at a time, human gate after each.
`fluid`: "actions, not phases" — any phase runnable on demand, dependencies shown
as enablers rather than hard gates; sync-verify still guards drift. See
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
Automated **WCAG-AA accessibility floor**. When `axe`, the Phase 8A generator
emits one `@axe-core/playwright` assertion per journey (`JRN`), scanned at the
journey's end state with the `['wcag2a','wcag2aa','wcag21a','wcag21aa']` tag set,
and Phase 8B runs it in the normal browser run — see
[test-plan.md §4](../commands/test-plan.md) (generation) and
[test-run.md §4.7](../commands/test-run.md) (execution).

`axe` is safe for non-UI features (a no-op for non-browser journeys, which
test-run §4.7 skips); `none` suppresses the floor. It is a deterministic minimum
bar, **not** a substitute for manual review ([testing-strategy.md §2](./testing-strategy.md)).

## Telemetry Providers

```yaml
telemetry:
  product_analytics: "none"    # posthog | amplitude | none
  error_tracking: "none"       # sentry | none
  dashboards: "none"           # posthog | sentry | newrelic | none
```
Real telemetry backends, used via MCP when available. Leave a provider `none` to
skip it.

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
`design-system/manifest.yml` from it and never duplicates it. Leave the block
unset to auto-detect (Storybook, Tailwind config, component dir, token files).

## Skip-Reason Policy

```yaml
require_skip_reason: true
```
When `true`, skipping an optional phase asks for a free-text reason, persisted in
`gates[].skip_reason` and `phases.<name>.skip_reason` (an empty reason re-asks).
When `false`, skips are accepted silently. Enforced by the computed Gate prompt
([runtime.md §6.3](./runtime.md#63-gate-prompt)); see
[policy.md §3](./policy.md#3-skip-reason-policy-e2).

Phases with `status: "not_applicable"` (express/lite-mode exclusions, backfilled
features) are exempt — they were never in scope for the feature.

## Optional-Phase Governance

```yaml
require_problem_discovery: false
require_pre_impl_review: false
require_code_review: false
require_testing: false
```
Each forces an optional phase to run instead of leaving it skippable. All
default `false` (the phase stays optional and may be skipped per the
[skip-reason policy](#skip-reason-policy)).

| Key | Forces |
|-----|--------|
| `require_problem_discovery` | Phase 0 problem discovery (`problem_discovery`; lite/standard) |
| `require_pre_impl_review` | the pre-implementation review phase (`pre_impl_review`) |
| `require_code_review` | the code-review phase (`code_review`) |
| `require_testing` | the test-plan and test-run phases (`test_plan` / `test_run`) |

Enforced by the computed Gate prompt, which omits Skip for a required phase
([runtime.md §6.3](./runtime.md#63-gate-prompt)). Phase→key mapping:
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
reusable Hermes skill via `skill_manage` (retrospective Step 5B; see
[lessons-format.md §9](./lessons-format.md)).

| Key | Meaning |
|-----|---------|
| `learning` (promote_to_skills/min_recurrence/require_confirmation/skill_category) | either | Personal opt-in to skill promotion and its thresholds, or a team policy pinned per repo. |

Only meaningful inside Hermes (or any host exposing `skill_manage`); elsewhere
the step is a no-op and `lessons.md` is unaffected.

## Cross-Model Review

```yaml
review:
  cross_model: ""   # codex | gemini | claude | hermes | <local-model>
```
Default reviewer id for `code-review --cross-model` when no id is passed. The
loop exports the consolidated `gate-review.md` + git diff as a portable package,
has a **different** model review it out-of-band, and ingests its findings back
into the `F-NNN` namespace (a model reviewing its own family rationalizes). See
[code-review.md](../commands/code-review.md) Step 2.5. Empty → the id must be
given on the command line. Product Forge never silently invokes another paid
model. The chosen reviewer is stamped on the gate entry as `reviewed_by_model`.

## Verification

```yaml
verify:
  ac_judge: false
```
Opt-in LLM judge for subjective ("judgeable") acceptance criteria in
[verify-full](../commands/verify-full.md) Layer 3. Executable criteria are always
covered by tests and never judged. Off by default; keep it off in CI unless a
reviewer wants it.

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
| `sync_verify.contract_regen.out` | `.forge-tmp/openapi.from-code.yaml` | Temp path the command writes to — **never** inside `contracts/`. The differ compares it against the committed `contracts/openapi.yaml` (the base/truth). |

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
SPDX license ids permitted for third-party dependencies. Read by Phase 9
(`release-readiness`) during its dependency-license audit: a dependency whose
license is outside the list is flagged as a release blocker. Tailor it to your
organization's policy. Can be overridden per run via
`PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST` (see
[Environment Variable Overrides](#environment-variable-overrides)).

## Localization

```yaml
supported_locales: []            # e.g. ["en", "es", "de", "fr"]
```
Locale codes `i18n-harvest` treats as the project's target set; it checks
translation coverage across exactly these locales. **Default** `[]`: infer the
set from the existing i18n folder structure (or skip i18n for English-only
projects).

## Advanced

```yaml
max_tokens_per_doc: 4000
```
Size budget (approximate tokens, ≈ English words × 1.33) for every generated
Markdown document. Every document-authoring command applies
[runtime.md §10.1](./runtime.md#101-document-size-budget-max_tokens_per_doc):
over budget, a splittable document becomes an index plus
`{doc-stem}/NN-{section}.md` parts (after a Split / Keep prompt); single-file
documents that downstream steps read by name (`spec.md`, `plan.md`, `tasks.md`,
`product-spec.md`, reports, `README.md` indexes, `*.yml`) are tightened instead.

Recommended range: `3000` (concise) to `6000` (exhaustive).
Do not set above `8000` — this risks hitting context limits in downstream agents.

Generated artifacts are always written in **English**; there is no output-language
setting (an `output_language` key from older configs is ignored).

---

## Config Layers

The effective config is built by deep-merging, lowest → highest precedence:
shipped defaults (`config-template.yml` at `${PLUGIN_ROOT}`) → global
(`~/.product-forge/config.yml`, or `$XDG_CONFIG_HOME/product-forge/config.yml`) →
project (`.product-forge/config.yml`) → per-feature `config_override` → then
`PRODUCT_FORGE_*` env. Maps merge key by key; scalars and lists replace
wholesale. The global file is hand-authored — the runtime reads it but never
saves to it. The layer list, deep-merge rule and env scope are normative in
[runtime.md §1](./runtime.md#1-step-0--load-config).

### Which keys belong in which layer

`global` = sensible to set once across all projects. `project` = intrinsically
per-repo. `either` = both valid (personal default OR team-pinned per repo).

| Config key | Layer | Rationale |
|------------|-------|-----------|
| `project_name` | project | Repo-specific identity; meaningless to share. |
| `project_tech_stack` | project | Per-repo stack description driving research prompts. |
| `project_domain` | project | Per-repo industry/domain for competitor/UX research. |
| `codebase_path` | project | On-disk path to THIS repo's code. |
| `codebase` (root/workspace_type/paths) | project | Monorepo workspace map intrinsic to one repo; deep-merged but only ever set at project layer. |
| `features_dir` | project | On-disk artifact root for THIS repo; a global override would silently relocate every project's features. |
| `storage_strategy` | either | A greenfield personal default is meaningful globally, but once a repo has features the effective value MUST be pinned at the project layer. |
| `default_speckit_mode` | global | Personal workflow preference for the Phase 4 bridge. |
| `constitution_path` | project | Path to THIS repo's constitution; repo-relative. |
| `default_competitors` | project | Domain-specific. A LIST: a project value REPLACES any global value. |
| `default_tech_research`, `default_metrics_research` | either | Personal default cadence; teams may pin per repo. |
| `default_wireframe_detail` | global | Stylistic output preference; travels well. |
| `default_mockup_style` | global | Stylistic preference; `project-styled` still adapts per repo. |
| `progressive_verify_interval` | either | Verification cadence; often pinned to a repo's risk tolerance. |
| `auto_sync_between_phases` | either | Workflow cadence toggle; personal default AND team policy. |
| `release_readiness` | either | Governance toggle: personal default OR team-pinned. |
| `default_feature_mode` | global | Personal lifecycle preference for new features. |
| `flow_mode` | global | Personal sequencing preference; travels across projects. |
| `default_track_hint` | global | Personal default track offered at intake. |
| `e2e_runner` | either | Personal default, but also a per-repo tooling decision. |
| `a11y_gate` | either | Personal default for the WCAG-AA floor, commonly a team policy. |
| `telemetry` (product_analytics/error_tracking/dashboards) | either | Deep-merged key by key; sub-keys may come from different layers. |
| `design_system` (components_path/tokens_path/storybook) | project | Points at THIS repo's component library and tokens. |
| `require_skip_reason` | either | Personal default for solo work, team-pinned in shared repos. |
| `require_problem_discovery`, `require_pre_impl_review`, `require_code_review`, `require_testing` | either | Optional-phase governance: personal default OR team policy per repo. |
| `learning.promote_to_skills` | either | Personal opt-in to skill promotion, or a team policy per repo. |
| `learning.min_recurrence` | either | Promotion threshold: personal default a team may tune. |
| `learning.require_confirmation` | either | Safety preference; personal default or team-pinned. |
| `learning.skill_category` | either | Grouping label; personal or per-team naming. |
| `review.cross_model` | either | Personal default reviewer id, or a team-standard reviewer pinned per repo. |
| `verify.ac_judge` | project | Whether this repo's verification runs the subjective-AC judge. |
| `sync_verify.drift_budget` (cosmetic/structural) | either | Drift tolerance; teams often pin per repo. |
| `sync_verify.auto_resolve` (cosmetic) | either | Auto-resolve opt-in: personal default OR team policy. |
| `sync_verify.contract_differ` | global | Depends on `oasdiff` being on PATH — a machine trait; falls back to prose if absent. |
| `sync_verify.contract_regen` (cmd/out) | project | `cmd` is how THIS repo emits its code-derived OpenAPI; `out` is a repo-relative temp path. |
| `supply_chain.license_allowlist` | either | Personal default allowlist OR team policy. A LIST: replaced, not appended. |
| `supported_locales` | project | The locale set THIS repo ships. |
| `max_tokens_per_doc` | global | Personal sizing preference for generated docs. |

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

There is no generic addressing for nested keys. The named exceptions — the only
other `PRODUCT_FORGE_*` variables Product Forge reads — are:

| Env var | Addresses | Read by |
|---------|-----------|---------|
| `PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST` | `supply_chain.license_allowlist` (comma-separated SPDX ids) | `release-readiness` |
| `PRODUCT_FORGE_COST_RATE_IN` | USD per 1M prompt tokens — env/flag only, no `config.yml` key | `status --cost` |
| `PRODUCT_FORGE_COST_RATE_OUT` | USD per 1M completion tokens — env/flag only, no `config.yml` key | `status --cost` |

The cost rates have no config key because a price is a per-invocation input, not
project config. Without them `status --cost` (`${PLUGIN_ROOT}/scripts/cost-report.js`)
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
