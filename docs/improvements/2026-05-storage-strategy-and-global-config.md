# Storage Strategy & Global Config

> **Status:** accepted — shipped in v1.6.0 (normative)
> **Consumers:** `docs/runtime.md` (owns the Path-Resolution Contract), every
> `commands/*.md`, the deterministic scripts under `scripts/`, and
> `config-template.yml` / `docs/config.md`.
> **Companions:** [runtime.md](../runtime.md), [config.md](../config.md),
> [file-structure.md](../file-structure.md), [schema.md](../schema.md).

This document specifies two additive capabilities:

1. **Selectable documentation-structure strategies** — a named, opt-in
   `storage_strategy` config key that controls **feature-ROOT placement only**.
2. **A global (cross-project) config layer** — `~/.product-forge/config.yml`,
   layered between shipped defaults and project config.

## Hard design constraint (read this first)

Configurability is scoped to **feature-root PLACEMENT only**. The INTERNAL
artifact tree under each feature (`research/`, `product-spec/journeys/`,
`contracts/`, `.forge-status.yml`, `testing/`, …) is **INVARIANT** across every
strategy. Every command keeps its feature-relative internal paths verbatim. The
*only* thing a strategy changes is how a single `FEATURE_DIR` is composed from
`features_dir` and the feature slug.

Additive philosophy, enforced throughout:

- **`flat` is the zero-config default.** An absent `storage_strategy` key
  resolves to `flat`, which is byte-for-byte today's behavior.
- **Existing features keep working.** No file moves are required; nothing on disk
  changes for any current install.
- **New strategies are opt-in.** They are selected explicitly in config and never
  activate implicitly.

---

## 1. Selectable storage strategies

`storage_strategy` selects how the **feature root** (`FEATURE_DIR`) is placed
under `features_dir`. The internal tree below `FEATURE_DIR` never varies.

| Strategy | `config_value` | Feature root | One-line summary |
| --- | --- | --- | --- |
| **Flat** (default) | `flat` | `{features_dir}/<slug>/` | Status quo, formalized. Every feature is an immediate child of `features_dir`. Filesystem enforces global slug uniqueness; resolve is a deterministic one-level join with no search. |
| **Domain-nested** | `domain-nested` | `{features_dir}/<domain>/<slug>/` | One extra grouping folder by area/team/surface. A single depth-tolerant discovery rule subsumes flat (depth 1) and the existing `_archived/<date-slug>` (depth 2). Mixed flat+nested layouts coexist. |
| **DDD bounded-context** | `ddd` | `{features_dir}/<context>/<slug>/` | Groups by bounded context that mirrors the canonical living spec at `specs/<domain>/`, backed by a `features/domains.yml` registry + per-context `_context.md` ubiquitous-language notes. O(1) slug→context resolution. Heaviest strategy. |
| **Workspace-aligned** | `workspace` | `{features_dir}/<workspace>/<slug>/` | Each feature lives under its primary monorepo workspace, mirroring `codebase.paths`. Reuses the existing `scope.primary` schema field as the placement anchor. Monorepo-only. |

### Recommended default: `flat`

`flat` is the correct default and the only value an absent key resolves to,
because:

- **Zero-config, zero-disk-change.** Every existing repository already conforms —
  features are already immediate children of `features_dir`. Adopting `flat` is a
  no-op; omitting the key is equivalent to setting it.
- **Structural slug uniqueness.** With features as immediate children of one
  directory, the filesystem itself prevents two features from sharing a slug.
  There is **no disambiguation problem** under flat. The nested strategies trade
  this property away to gain grouping — which is exactly why "same slug in two
  groups" is a real design cost for them and a non-issue here.
- **Deterministic resolve, no scan.** `resolve(slug) = join(features_dir, slug)`
  is a direct join — no candidate set, no tiebreak.
- **Honors the hard constraint perfectly** and has the **lowest blast radius**:
  the only code delta is extracting today's scattered join logic into one named
  resolver and defaulting the new key.

Grouping is the thing you opt **into**, not the default. Ship the menu, recommend
`flat`.

### Menu tiering (recommendation)

- **Core (document as first-class):** `flat`, `domain-nested`. Domain-nested is
  the highest value-per-additive-cost step up — one extra segment, a single
  depth-tolerant discovery rule, mixed layouts coexist, invariant internal tree.
  Its only new cost (same slug in two domains) is cleanly handled by qualified
  `<domain>/<slug>` references.
- **Advanced (opt-in for specific audiences):** `ddd`, `workspace`. Both honor
  the invariant-tree constraint and reuse existing assets (`ddd` mirrors
  `specs/<domain>/`; `workspace` reuses `scope.primary`), but each carries a real
  cost the core pair avoids — `ddd` introduces a registry-vs-filesystem drift
  mode; `workspace` makes the `_`-prefix skip load-bearing (archived features sit
  at the same depth as real ones) and is monorepo-only with scan-based
  resolution. Ship them, but document as advanced.

---

## 2. Path-Resolution Contract (THE single normative rule)

> **Home:** this contract lives in **`docs/runtime.md` §3.1** (Feature Root
> Detection), replacing the current ad-hoc `slugify → {features_dir}/<slug>/`
> wording. Every one of the 33 commands and both deterministic scripts MUST
> consult it rather than inlining their own path logic. **The path logic lives in
> ONE place.**

The contract exposes exactly **two operations**, parameterized by the merged
`storage_strategy`. No command computes a feature path any other way.

### 2.1 `resolve(slug) → FEATURE_DIR`

Given a feature slug (or a qualified reference), return the single `FEATURE_DIR`
the invariant internal tree hangs off.

| `storage_strategy` | resolve(slug) |
| --- | --- |
| `flat` | `join(features_dir, slug)` — direct join, **no scan**, no disambiguation possible. |
| `domain-nested` | Match `{features_dir}/*/<slug>/.forge-status.yml` ∪ `{features_dir}/<slug>/.forge-status.yml` (legacy flat fallback), skipping `_`-prefixed top-level dirs. 0 → not found (CREATE). 1 → use it. >1 → require qualified `<domain>/<slug>` or prompt; **never silently pick the first**. |
| `ddd` | PRIMARY: read `features/domains.yml`, map slug→context, build `join(features_dir, context, slug)` (O(1)). Miss → glob `{features_dir}/*/<slug>/` (heal registry on single hit) → flat fallback. >1 → require qualified `<context>/<slug>`. |
| `workspace` | Scan `{features_dir}/*/<slug>/` (two levels, skip `_`-prefixed first-level dirs), with depth-1 `{features_dir}/<slug>/` fallback for unmigrated/single-root features. (Cannot read `scope.primary` first — it lives *inside* the dir being located.) >1 → require `--workspace <ws>` or path-style `workspace/slug`. |

**CREATE (new feature) — placement:**

| `storage_strategy` | FEATURE_DIR on create |
| --- | --- |
| `flat` | `join(features_dir, slugify(description))`. |
| `domain-nested` | `join(features_dir, <domain>, slug)`; `<domain>` from explicit `<domain>/<slug>` / `--domain`, else interactive pick of existing domains + "new", else `project_domain` as last-resort fallback. Reject `_`-prefixed and multi-segment domains. |
| `ddd` | `join(features_dir, <context>, slug)`; `<context>` derived from the targeted `specs/<domain>` (or `scope` / prompt), confirmed with the user, then written as a `slug→context` row in `domains.yml`. |
| `workspace` | `join(features_dir, scope.primary, slug)`. A cross-workspace feature gets exactly ONE home under its primary — never split or duplicated. |

### 2.2 `enumerate() → [FEATURE_DIR, …]`

Return every feature root for cross-feature operations (portfolio, status,
bridge, sync-verify, flag-cleanup).

**Universal rule (depth-tolerant, strategy-agnostic):**

> Descend from `features_dir`. The **first** directory containing a
> `.forge-status.yml` IS a feature root — record it and **stop descending** into
> that subtree. Skip any directory whose name starts with `_` at the top level
> (reserved namespaces). Skip the `domains.yml` file (`ddd`).

This single rule cleanly subsumes:

- `flat` features at depth 1,
- `domain-nested` / `ddd` / `workspace` features at depth 2,
- the existing `_archived/<date-slug>/` convention (already depth 2, excluded via
  the top-level `_`-skip),
- mixed flat + nested layouts during migration.

`.forge-status.yml` lives **only** at the feature root and never deeper (verified
against the survey's internal-artifact-path list), so "stop on first hit" is
unambiguous.

### 2.3 Reserved namespaces (shared by all strategies)

`_`-prefixed top-level children of `features_dir` are excluded from
`enumerate()` and `resolve()` never returns one:

- `_portfolio/` — cross-feature report output (`portfolio.md`,
  `flag-cleanup-{date}.md`). Stays top-level under every strategy.
- `_archived/` — `spec-merge` archives (`_archived/<date>-<slug>/`, depth 2).
  Stays top-level. Under `ddd`, new archives MAY be context-keyed
  (`_archived/<context>/<date>-<slug>/`) to mirror the live taxonomy.

> **`workspace` caveat (surface, do not hide):** under `workspace`, archived
> features sit at the **same depth (2)** as real features, so the top-level
> `_`-skip becomes **load-bearing** — a bug there silently pulls archived
> features into every report.

### 2.4 Sites that MUST adopt the contract

Every site below stops inlining path logic and calls `resolve()` / `enumerate()`.

**Executable directory scan (the ONE real code change):**

- `scripts/migrate-status-v2-to-v3.js` — `findStatusFiles()` one-level
  `readdirSync` → the depth-tolerant `enumerate()` walk (prune-on-match), via the
  shared `scripts/lib-paths.js`.
- `scripts/migrate-status-v2-to-v3.ts` — deprecation stub only (prints a redirect,
  exits 64); performs no scan, so nothing to change.

**Cross-feature enumeration (prose globs in command files):**

- `commands/portfolio.md` — "each immediate child of `{features_dir}/`" →
  `enumerate()`. Output still `{features_dir}/_portfolio/portfolio.md`.
- `commands/status.md` — "list all directories in `{features_dir}/`" →
  `enumerate()`.
- `commands/bridge.md` — "list all feature directories in `{features_dir}/`" →
  `enumerate()`; skip-if-empty unchanged.
- `commands/sync-verify.md` — no-slug "list features and ask which" →
  `enumerate()`. Per-layer inputs stay `{FEATURE_DIR}/...` (invariant tree, no
  change).
- `commands/feature-flag-cleanup.md` — `{features_dir}/*/flags/registry.yml` →
  `enumerate()` then `<root>/flags/registry.yml`. Report still under
  `_portfolio/`.

**Single-feature resolution (already mostly placement-agnostic):**

- `scripts/validate-traceability.js` and `scripts/gate-risk.js` — the explicit
  `--feature-dir <path>` form is placement-agnostic for ALL strategies and needs
  no change. The `--feature <slug>` shorthand mis-resolves under any nesting
  strategy; **the orchestrator MUST always pass the resolved `--feature-dir`**
  (or, optionally, add `--domain`/`--workspace` so the script can build the path
  via the contract).
- `commands/research.md` (line 44, `FEATURE_DIR = {features_dir}/{slug}/`),
  `commands/backfill.md`, `commands/monitoring-setup.md` — replace the inline
  join with "FEATURE_DIR = `resolve(slug)`".

**No glob, operates within one FEATURE_DIR (no change beyond upstream resolve):**

- `commands/forge.md` and all per-feature commands — consume `FEATURE_DIR` from
  the resolver; internal literals (`flags/registry.yml`,
  `monitoring/dashboard.json`, `contracts/openapi.yaml`, …) are untouched.

### 2.5 Qualified-reference caveat for `depends_on`

`dependencies.depends_on` in `.forge-status.yml` (schema line 189) stores **bare
sibling slugs**. Under any nesting strategy a bare slug can be ambiguous. Nesting
strategies SHOULD store qualified refs (`<domain>/<slug>`, `<context>/<slug>`,
`<workspace>/<slug>`); a bare slug that resolves to >1 candidate falls back to the
same disambiguation prompt as `resolve()`. This is an extra real cost the three
non-flat strategies carry and `flat` does not.

---

## 3. `storage_strategy` config-key spec

```yaml
# ─── Paths ─────────────────────────────────────────────────────────────────────
features_dir: "features"

# Feature-ROOT placement strategy (v1.6.0). Controls ONLY where each feature
# directory sits under features_dir; the internal artifact tree is invariant.
# Options:
#   "flat"          — (default) immediate child: features/<slug>/
#   "domain-nested" — one grouping level: features/<domain>/<slug>/
#   "ddd"           — bounded-context, registry-backed: features/<context>/<slug>/
#   "workspace"     — monorepo workspace (scope.primary): features/<workspace>/<slug>/
# Avoid changing this after features have been created; relocate with `git mv`
# (the internal tree is self-path-free and moves intact).
storage_strategy: "flat"
```

- **Values:** `flat` | `domain-nested` | `ddd` | `workspace`.
- **Default:** `flat`. An **absent key resolves to `flat`** (identical disk
  behavior to today).
- **Where it lives:** a sibling of `features_dir` under **Paths** in
  `config-template.yml`. Effective value resolved through the layered merge
  (§4). Although `storage_strategy` is *global-eligible* (a personal greenfield
  default is meaningful), once a repo has features the **effective strategy MUST
  be pinned at the PROJECT layer** for stability — same lock-after-creation
  concern as `features_dir`.
- **Validation:**
  - Must be one of the four enum values. Unknown value → hard error at Step 0
    (do not silently fall back).
  - On a repo that **already has features**, changing strategy without relocating
    those features is a misconfiguration: the resolver's legacy-flat fallback
    keeps old features discoverable, but the runtime SHOULD warn that mixed
    layouts exist and recommend `git mv` migration.
  - `ddd` requires `features/domains.yml` to exist (or be creatable);
    `workspace` requires `codebase.paths` to be populated (monorepo mode) — else
    warn and behave as flat for unplaceable features.

---

## 4. Global (cross-project) config layer

### 4.1 Layered precedence

Build the effective config by deep-merging file layers (lowest → highest;
rightmost wins), then applying environment overrides last:

| # | Layer | Source | Role |
| --- | --- | --- | --- |
| 1 | **Shipped defaults** | `config-template.yml` (installed extension) | **ALWAYS-LOADED BASE** supplying every key's default. (New semantics: no longer a "loaded only if no project config" fallback.) |
| 2 | **Global** | `~/.product-forge/config.yml` | User-level, cross-project. No-op when absent. |
| 3 | **Project** | `<project-root>/.product-forge/config.yml` | Unchanged location/role. |
| 4 | **Per-feature** | `config_override` on `<FEATURE_DIR>/.forge-status.yml` | Unchanged. Applied once a feature is selected. |
| 5 | **Env** | `PRODUCT_FORGE_*` | Unchanged. Applied last, over the fully merged result. |

This mirrors git's `system → global → local` precedence, with `config_override`
and env as two pre-existing Product-Forge-specific top layers. Layers 1, 4, and 5
already exist today; **the global layer (2) is the only structural addition.**

### 4.2 Recommended location

- **Primary (canonical, documented):** `~/.product-forge/config.yml`.
- **Secondary (optional):** `$XDG_CONFIG_HOME/product-forge/config.yml`, honored
  only when `$XDG_CONFIG_HOME` is set.

**Rationale.** Product Forge has **no existing home/XDG convention** — config is
exclusively project-rooted at `.product-forge/config.yml`, and the only
"extension path" usage (`specify extension path product-forge`) is a read-only
template *locator*, not a runtime layer. So there is no prior convention to
honor; the right move is to mirror the established project dotdir one level up in
`$HOME`. `~/.product-forge/config.yml` is symmetric with
`<project>/.product-forge/config.yml` (same dirname + filename) — zero new naming
to learn, reading exactly like `git config --global` above `git config --local`.
XDG is offered only as a secondary because Product Forge has never used it and
leading with it would introduce an unfamiliar convention.

The global file is **hand-authored** (like a personal global git config). The
runtime **reads** it but **NEVER prompt-and-saves** to it — missing project
identity is always saved to the PROJECT config.

### 4.3 Deep-merge rule

Used between every adjacent pair of layers:

- **Maps merge recursively, key by key.** A higher layer that sets only
  `telemetry.dashboards` leaves the lower layer's `telemetry.product_analytics`
  intact.
- **Scalars and lists REPLACE wholesale.** A higher layer's list value fully
  replaces the lower one — e.g. a project `default_competitors` **replaces** (does
  not append to) a global list. By design.
- **Nested maps that MUST be deep-merged** (not clobbered): `codebase`,
  `telemetry`, `design_system`, and `sync_verify` (including `drift_budget`,
  `auto_resolve`, `contract_regen`).

**Worked example (why deep-merge is mandatory).** A global config may set
`sync_verify.contract_differ: oasdiff` (a machine/personal trait) while the
project config sets `sync_verify.contract_regen.cmd: "..."` (intrinsically
repo-specific). Both must survive in the merged `sync_verify`. A naive clobber
would drop one of them.

**Env scope (unchanged).** `PRODUCT_FORGE_*` addresses **top-level scalar keys
only** (e.g. `PRODUCT_FORGE_CODEBASE_PATH`). Nested-key env addressing is
undefined and out of scope — no new delimiter scheme is invented here.

### 4.4 Replacement for `docs/runtime.md` §1 (Step 0 — Load Config)

> Build the effective config by deep-merging FOUR file/document layers
> (lowest → highest precedence; rightmost wins), then applying environment
> overrides last:
>
> 1. **Shipped defaults** — `config-template.yml` from the installed extension.
>    ALWAYS-LOADED BASE (every key's default). Locate via
>    `specify extension path product-forge`.
> 2. **Global** — `~/.product-forge/config.yml` (user-level). Skip silently if
>    absent. If `$XDG_CONFIG_HOME` is set, also check
>    `$XDG_CONFIG_HOME/product-forge/config.yml`.
> 3. **Project** — `<project-root>/.product-forge/config.yml`. Skip silently if
>    absent.
> 4. **Per-feature** — `config_override` on `<FEATURE_DIR>/.forge-status.yml`
>    (applied once a feature is selected).
>
> Apply the **deep-merge rule** (§4.3) between every adjacent pair. Then apply
> `PRODUCT_FORGE_*` env vars over the merged result.
>
> Extract (from the MERGED result): `project_name`, `project_tech_stack`,
> `project_domain`, `codebase_path`, `codebase.*`, `features_dir`,
> **`storage_strategy` (default `"flat"`)**, `default_speckit_mode`,
> `default_feature_mode`, `flow_mode`, `default_track_hint`,
> `progressive_verify_interval`, `auto_sync_between_phases`,
> `require_skip_reason`, `release_readiness`, `e2e_runner`, `a11y_gate`,
> `telemetry.*`, `sync_verify.*`, `output_language`, `max_tokens_per_doc`, …
>
> **Missing identity:** if required project identity is still unset after
> merging, prompt and SAVE to the PROJECT config — **never** to the global file.

---

## 5. Config-key layer classification

`global` = sensible to set once across all projects. `project` = intrinsically
per-repo. `either` = both valid (personal default OR team-pinned per repo).

| Config key | Layer | Rationale |
| --- | --- | --- |
| `storage_strategy` (NEW) | either | Greenfield personal default is meaningful globally, but once a repo has features the EFFECTIVE strategy MUST be pinned at the project layer (lock-after-creation). |
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
| `sync_verify.contract_regen` (cmd/out) | project | `cmd` is HOW THIS REPO emits its code-derived OpenAPI — intrinsically project-specific; `out` is a repo-relative temp path. The split-block proof that `sync_verify` must deep-merge: `contract_differ` is global while `contract_regen.cmd` is project, under one key. |
| `max_tokens_per_doc` | global | Personal sizing preference for generated docs; travels across projects. |
| `output_language` | global | Personal language preference (en/ru/de); canonical global-eligible setting. |

---

## 6. Implementation plan (ordered, additive-only)

The plan is sequenced so each step is independently shippable and the default
behavior never changes. **Steps 1–3 deliver the contract + global layer with
`flat` only** — the safest first cut. Strategy implementations (Steps 4–7) are
additive and can land later, one strategy at a time.

> **Status: all steps 1–7 below are implemented in this changeset** — the global
> config layer, the `storage_strategy` key, the Path-Resolution Contract,
> `scripts/lib-paths.js`, and all four strategies (`flat` / `domain-nested` /
> `ddd` / `workspace`) are active and covered by `lib-paths.js --selftest` +
> end-to-end fixtures.

| # | Step | Files touched | Risk | Backwards-compat |
| --- | --- | --- | --- | --- |
| 1 | **Global config layer + deep-merge.** Rewrite `docs/runtime.md` §1 to the four-layer merge; document `~/.product-forge/config.yml` + optional XDG; specify the deep-merge rule and the nested-map list. | `docs/runtime.md`, `docs/config.md`, `config-template.yml` (header note) | LOW | Absent global file = byte-identical to today (pure no-op). Reframing defaults as always-loaded base changes no effective value for well-formed configs. |
| 2 | **Add `storage_strategy` key (value `flat` only, named + validated).** Document the key in `config-template.yml` + `docs/config.md`; add enum validation at Step 0. | `config-template.yml`, `docs/config.md`, `docs/runtime.md` | LOW | Absent key → `flat` → today's layout. No disk change. |
| 3 | **Write the Path-Resolution Contract in `docs/runtime.md` §3.1.** Define `resolve()` / `enumerate()` with the `flat` reference implementation; document the depth-tolerant `enumerate()` rule and reserved namespaces. Point all path-computing command/script sites at it (prose: research.md, backfill.md, monitoring-setup.md, portfolio.md, status.md, bridge.md, sync-verify.md, feature-flag-cleanup.md). | `docs/runtime.md`, `commands/research.md`, `commands/backfill.md`, `commands/monitoring-setup.md`, `commands/portfolio.md`, `commands/status.md`, `commands/bridge.md`, `commands/sync-verify.md`, `commands/feature-flag-cleanup.md` | LOW | Under `flat` every site resolves to today's paths verbatim. Prose-only changes; no executable behavior change yet. |
| 4 | **Generalize the executable scan to the depth-tolerant walk.** Add `scripts/lib-paths.js` (`resolveFeatureDir()` + `enumerateFeatures()`); replace `findStatusFiles()` one-level readdir with the prune-on-match walk; keep the `_`-skip. The `.ts` sibling is only a redirect stub (exits 64) — no scan, no change. | `scripts/lib-paths.js`, `scripts/migrate-status-v2-to-v3.js` | MEDIUM | Depth-tolerant walk is a strict superset of "immediate child"; flat repos stamp identically. Covered by `lib-paths.js --selftest`. |
| 5 | **Ship `domain-nested` (core).** Implement `resolve()`/CREATE for the `<domain>` segment + disambiguation prompt; document migration (`git mv features/<slug> features/<domain>/<slug>`). | `docs/runtime.md`, `docs/file-structure.md`, `config-template.yml` (enum doc), command prose where domain input is collected | MEDIUM | Opt-in; legacy flat features stay discoverable via fallback; mixed layouts coexist; internal tree invariant. |
| 6 | **Orchestrator always passes resolved `--feature-dir` to scripts.** Ensure `forge.md` invokes `validate-traceability.js` / `gate-risk.js` with the explicit resolved path (never bare `--feature`). Optionally add `--domain`/`--workspace` flags to the scripts. | `commands/forge.md`, `scripts/validate-traceability.js`, `scripts/gate-risk.js` | MEDIUM | Explicit `--feature-dir` is already placement-agnostic; this removes the bare-slug footgun for nested strategies. No change under flat. |
| 7 | **Ship `ddd` + `workspace` (advanced).** `ddd`: `features/domains.yml` registry + `_context.md` notes + registry-heal/validate; context-keyed archives. `workspace`: `scope.primary`-anchored placement, scan-based resolution, load-bearing `_`-skip documented; `--dry-run` for migration `git mv`s. | `docs/runtime.md`, `docs/file-structure.md`, `docs/schema.md` (depends_on qualified-ref note), `config-template.yml`, scripts (optional `--domain`/`--workspace`) | HIGH | Opt-in; both keep flat as default and preserve reserved namespaces and the invariant internal tree. `ddd` adds a registry-vs-filesystem drift mode that needs a heal/validate step. |

**Invariant across all steps:** the internal artifact tree, every per-feature
command's internal paths, the reserved `_portfolio`/`_archived` namespaces, the
existing `--features-dir`/`--feature-dir` CLI flags, the per-feature
`config_override`, and `PRODUCT_FORGE_*` env scope all remain unchanged.

---

## 7. Open questions for the maintainer

1. **Which strategies to ship in the menu?** Recommend shipping all four but
   tiering: core (`flat`, `domain-nested`) documented first-class, advanced
   (`ddd`, `workspace`) as opt-ins. Do you want to ship only the core pair first
   and defer `ddd`/`workspace`, or land the full menu at once?
2. **Global-config file location.** Recommend `~/.product-forge/config.yml` as
   canonical with optional `$XDG_CONFIG_HOME/product-forge/config.yml` secondary.
   Approve, or prefer XDG-first?
3. **Rewrite all 33 commands now, or ship the contract + `flat` default first?**
   Recommend the latter: land Steps 1–3 (contract + global layer + `flat`), which
   are LOW-risk and prose-only, then generalize the executable scan (Step 4) and
   add strategies incrementally. Acceptable, or do you want a single big-bang
   change?
4. **Fix scope for the audit / script footgun.** The bare `--feature <slug>`
   shorthand in `validate-traceability.js` / `gate-risk.js` mis-resolves under any
   nesting strategy. Preferred fix: (a) orchestrator always passes the resolved
   `--feature-dir` (minimal, recommended), or (b) also add `--domain`/`--workspace`
   flags so the scripts can build the path via the contract (more flexible for
   ad-hoc CLI use)?
5. **`depends_on` qualified refs.** Under nesting strategies, should
   `dependencies.depends_on` migrate from bare slugs to qualified
   `<group>/<slug>` refs (cleaner, but a schema-doc change), or keep bare slugs
   with disambiguation-prompt fallback (zero schema change, slightly more runtime
   prompting)?
6. **`ddd` archive layout.** Should `ddd` keep flat `_archived/<date>-<slug>/`
   (consistent with other strategies) or context-keyed
   `_archived/<context>/<date>-<slug>/` (mirrors the live taxonomy, but a third
   place the context appears)?