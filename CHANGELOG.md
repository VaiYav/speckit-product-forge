# Changelog

All notable changes to Product Forge are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.5.1] — 2026-04-24

> Docs-only patch. No behavioural change — closes a documentation gap
> on how users install the optional V-Model dependency.

### Changed

- **README.md** — new "V-Model mode (optional)" subsection under
  Requirements that names the external [`leocamello/spec-kit-v-model`](https://github.com/leocamello/spec-kit-v-model)
  plugin (≥0.5.0), includes the install command, and spells out
  the "hard dependency only for v-model mode" rule with an explicit
  "no silent fallback" note for regulated/safety-critical work.
- **config-template.yml** — `feature_mode` comment expanded: the
  `v-model` value now includes the install command for the external
  plugin and the abort-on-missing rule.
- **docs/config.md** — rewrite the v-model bullet in `feature_mode`
  documentation to describe what Product Forge owns vs what the
  V-Model plugin owns, include the install command, and link to
  `docs/v-model-integration.md`.

No functional code change. The plugin already aborted with the install
command when v-model mode was selected without the dependency; this
release just makes the dependency visible to users before they try.

---

## [1.5.0] — 2026-04-19

> Minor release (additive). Expansion of the lifecycle with portfolio view,
> brown-field entry, lite mode, full monorepo support, optional V-Model
> integration, unit + integration test phases, and operational readiness
> artifacts. Schema v3 for `.forge-status.yml` is **additive over v2** — no
> breaking change to existing features; a lazy migration stamps
> `schema_version: 3` on first write.

### Added — 7 new commands

- **`speckit.product-forge.portfolio`** — Cross-cutting portfolio view. Scans
  every `features/*/.forge-status.yml`, produces feature table, file-conflict
  matrix, dependency graph (Mermaid), and suggested merge order. Read-only.
- **`speckit.product-forge.backfill`** — Brown-field entry. Reverse-engineers
  a feature folder from existing code: retro product-spec, plan, simplified
  tasks, `.forge-status.yml` with `backfilled: true`, and a gaps-report of
  missing artifacts.
- **`speckit.product-forge.monitoring-setup`** (Phase 9.5, opt) — Produces
  real NewRelic-compatible dashboard JSON, alert rules, and SLI/SLO doc
  from plan NFRs and tracking-plan events. Wraps `newrelic-dashboard-builder`.
- **`speckit.product-forge.migration-plan`** (Phase 5.5, opt, conditional) —
  Generates zero-downtime migration plan with `forward.sql`, `rollback.sql`,
  `validation.sql`, backfill plan, and risk matrix when plan.md introduces
  schema changes. Wraps `db-migration-manager` / `mongodb-ops`.
- **`speckit.product-forge.i18n-harvest`** (post-bridge, opt) — Extracts
  user-facing strings from wireframes/spec, generates feature-namespaced
  locale keys, stubs TODO entries in every configured locale. Wraps
  `i18n-workflow`.
- **`speckit.product-forge.experiment-design`** (Phase 9B, opt) — Forces a
  pre-registered A/B plan — hypothesis, MDE, sample size, exposure rules,
  guardrails, decision rule — before shipping a flag-gated feature. Wraps
  `feature-flag-ab-testing`.
- **`speckit.product-forge.feature-flag-cleanup`** — Cross-cutting stale-flag
  audit. Scans every `flags/registry.yml`, cross-checks codebase, produces
  removal recipes for flags past `cleanup_after`. Read-only; wraps
  `feature-flag-manager`.

### Added — Monorepo support (first-class)

- **`codebase.paths` block** in project config, with `workspace_type`
  (`pnpm | yarn | npm | turbo | nx | rush | lerna | none`) driving test-
  runner resolution. Legacy `codebase_path` still supported.
- **`scope.paths`**, **`scope.cross_workspace`**, **`scope.primary`** on
  `.forge-status.yml` — names which workspaces a feature touches.
- **Workspace-prefixed paths** in `tasks.md` and `task_log[].paths` (e.g.
  `backend:src/users.ts`).
- **Per-workspace conflict matrix** in `/portfolio` with grouped "By
  workspace" section.
- **Affected-only test execution** in implement + test-run when running
  under nx / turbo / pnpm workspaces.
- **Cross-workspace change propagation** — scope widens automatically
  when a change request touches code outside the original scope;
  recorded as gate condition.
- Documented in [runtime.md §9](docs/runtime.md#9-monorepo-aware-operations-b15),
  [config.md Paths](docs/config.md).

### Added — V-Model integration (optional extension)

- **`optional_extensions`** block in `extension.yml` declaring
  [leocamello/spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model)
  (≥0.5.0) as an opt-in dependency.
- **`feature_mode: v-model`** is now a real mode, not a stub. When
  selected, `forge.md` detects the V-Model extension and delegates the
  middle of the lifecycle (V1–V13) to its 14 commands: requirements,
  acceptance, system / architecture / module design paired with system /
  integration / unit test plans, trace, peer-review, test-results
  ingestion, audit report.
- **No silent fallback**: if V-Model plugin is absent, v-model mode
  aborts with the install command. Regulated work must not degrade.
- **Domain selection** via `v-model-config.yml`
  (`iec_62304 | iso_26262 | do_178c | generic`).
- New [docs/v-model-integration.md](docs/v-model-integration.md) covers
  the full phase map, detection, fallback rules, status-file additions.

### Added — Testing strategy (universal)

- New [docs/testing-strategy.md](docs/testing-strategy.md) — universal
  (framework-agnostic) pyramid, when unit vs integration vs contract vs
  E2E, per-layer coverage criteria, anti-patterns, flaky-test handling,
  test-data management, monorepo-aware execution.
- **`test-plan.md` §5E Unit Tests (TC-UNIT-NNN)** — derived from module
  boundaries + behavioural acceptance criteria. Framework-agnostic.
- **`test-plan.md` §5F Integration Tests (TC-INT-NNN)** — beyond endpoint
  contracts: service↔DB, service↔cache, event emitter↔listener,
  middleware stacks, cross-workspace integration.
- **`test-run.md` §4E Unit** and **§4F Integration** — non-browser
  execution with the same auto-fix loop; §4F handles testcontainers /
  docker-compose / in-memory / shared-DB isolation strategies.

### Added — Structural capabilities

- **`.forge-status.yml` schema v3** — Additive over v2. New fields:
  `feature_mode`, `backfilled`, `v2_native`, phase `started_at`/`completed_at`/`tokens_in`
  /`tokens_out`/`tool_calls`/`digest_path`/`skipped`/`skip_reason`, `task_log[]`
  (renamed from early-draft `tasks[]` to avoid collision with `phases.tasks`)
  with `size` (XS/S/M/L/XL), `paths`, and `commit_sha`, `gates[].approvals`,
  `gates[].skip_reason`, `dependencies.depends_on` /
  `depended_on_by`, `role_approvals.solo_mode` /
  `required_roles_per_phase`. New `status` enum value `not_applicable` for
  out-of-mode and backfilled phases. Full spec in
  [`docs/schema/forge-status-v3.schema.yml`](docs/schema/forge-status-v3.schema.yml).
  Migration rules in [`docs/schema/migration-v2-to-v3.md`](docs/schema/migration-v2-to-v3.md).
  Optional helper script `scripts/migrate-status-v2-to-v3.ts`.
- **State-lock protocol** — `.forge-status.yml.lock` file-based lock with
  TTL-based takeover. Prevents concurrent-writer corruption between the
  orchestrator and sub-skills. Documented in
  [`docs/runtime.md §2`](docs/runtime.md#2-state-lock-protocol).
- **Per-phase digests** — Every major phase (`research`, `product_spec`,
  `plan`, `tasks`, `implement`, `verify`) now writes `<phase>/digest.md`.
  Runtime refuses to mark a phase completed without a digest. Downstream
  phases (verify-full, portfolio, retrospective) read digests first to keep
  context budgets small. Template:
  [`docs/templates/phase-digest.md`](docs/templates/phase-digest.md).
- **Lite mode** — New `feature_mode` field selects a 5-phase map
  (`problem-discovery` opt → `product-spec` → `plan` → `implement` → `verify`)
  for small features. Escalation to standard is append-only. Details in
  [`docs/policy.md §4`](docs/policy.md#4-feature-modes-e1).
- **Skip-reason policy** — Skipping an optional phase now requires a
  free-text reason when `require_skip_reason: true` (default). Reason is
  persisted on both the phase and the gate entry. Enforced by all skippable
  commands. Details in [`docs/policy.md §3`](docs/policy.md#3-skip-reason-policy-e2).
- **Learning loop** — `.product-forge/lessons.md` append-only log. Written
  by `retrospective` at launch close, read by `research` as a new dimension
  ("Prior lessons that apply") scored by tag overlap. Format in
  [`docs/lessons-format.md`](docs/lessons-format.md).
- **Drift budget** — `sync-verify` now categorizes drift as `structural`
  (always human-in-the-loop) or `cosmetic` (whitespace, ordering, stale
  dates). Opt-in `sync_verify.auto_resolve.cosmetic` auto-fixes whitelisted
  drift only; structural drift never auto-resolves. Budget warns when
  cosmetic count exceeds threshold.
- **Release-readiness becomes an artifact producer** — Step 1D now invokes
  `feature-flag-manager` to produce `flags/registry.yml`; Step 3D invokes
  `newrelic-dashboard-builder` to produce `monitoring/dashboard.json`,
  `alerts.yml`, `slo.md`. Graceful fallback when provider skills are missing.

### Changed

- **`commands/forge.md` refactored.** Operating rules moved to
  [`docs/policy.md`](docs/policy.md); runtime flow (config, state lock,
  detection, resume, pre-flight, sync, gate audit, digest enforcement,
  context budget) moved to [`docs/runtime.md`](docs/runtime.md); status
  schema narrative moved to [`docs/schema.md`](docs/schema.md). The
  orchestrator file now focuses on phase delegation and the mode-
  resolution entry. No behavioral change; cross-references only.
- **`config-template.yml`** — New keys: `default_feature_mode`,
  `require_skip_reason`, `sync_verify.drift_budget.{cosmetic, structural}`,
  `sync_verify.auto_resolve.cosmetic`.
- **`research.md` Step 2.5** — Consults `.product-forge/lessons.md` for
  matching prior lessons and surfaces them in `research/README.md`.
- **`retrospective.md` Step 5** — Drafts lesson blocks, confirms with user,
  appends to `lessons.md`, records count in `phases.retrospective.lessons_added`.

### Release-prep hardening

Surfaced by the plugin test plan dry-run and closed before release:

- **Broken historical refs removed** from `CHANGELOG.md`, `README.md`,
  and `docs/how-it-works-v2.md` — pointed to archive directories that
  are not in this tree.
- **Policy.md §3 tightened** — empty skip reasons under
  `require_skip_reason: true` now explicitly reject the gate and
  re-prompt; no `skipped` gate entry is written until a non-empty
  reason is supplied.
- **Enum validation** added to `commands/forge.md` Mode Resolution and
  `docs/runtime.md §4` pre-flight — invalid `feature_mode`,
  `phases.<name>.status`, or `gates[].decision` values abort with a
  clear message instead of falling through silently.
- **`tasks.md` Step 4.1** — hard structural checks for task-ID
  uniqueness and monorepo workspace-prefix validation. Duplicates and
  unknown workspace names now abort the phase with a pointer to the
  offending line instead of propagating into `task_log[]`.
- **Test-plan self-references** — smoke and Layer B criteria updated
  to exclude `docs/qa/plugin-test-plan.md` (which legitimately names
  the patterns being searched for).

### Migration notes

- **No action required.** Existing features continue to work. First time a
  v1.5.0-aware skill writes to a feature's `.forge-status.yml`, it stamps
  `schema_version: 3` and may populate new optional fields as it runs.
- **Optional:** run `scripts/migrate-status-v2-to-v3.ts` once to stamp
  every feature at once.
- **Monorepo support (GitHub issue #1)** remains unchanged in this release.
  Schema v3 fields reserve room for it (`dependencies`, `backfilled`) but
  the codebase-path configuration remains single-path. Tracked for a
  follow-up release.

---

## [1.4.0] — 2026-04-04

> Minor release. Spec quality and lifecycle hardening across research,
> bridge, plan, and revalidation phases. No new commands — every
> improvement extends an existing phase with stricter validation,
> richer artifacts, or new self-checks.

### Added

- **Codebase Constraint Analysis** in `research` — the codebase-analysis
  dimension now captures concrete constraints (exact identifiers,
  payload interfaces, source paths) and Event / Message Patterns, so
  downstream phases see real integration shape instead of abstractions.
- **Dependency Discovery** in `bridge` (Step 2.5) — bridge now walks
  sibling features' status files and surfaces upstream dependencies
  before writing `spec.md`, preventing silent coupling.
- **EDA Event Verification** in `bridge` (Step 4.5) — when the plan
  touches an event bus, bridge verifies every produced event has a
  declared consumer contract and vice-versa; missing pairs are raised
  as CRITICAL before spec.md is approved.
- **Constitution Compliance auto-check** in `plan` (Step 3.5) — reads
  the project's constitution (configurable path: `config.yml` →
  `.specify/memory/constitution.md` → skip) and auto-flags plan
  sections that violate declared principles. Results surfaced in the
  Approval Gate.
- **Feature-type detection** in `bridge` (`shared_infrastructure` vs
  `end_user`) driving a conditional section table — infrastructure
  features don't need UX sections, end-user features don't need
  internal-API contracts. Removes boilerplate without removing
  information.
- **Unified `review.md` format** in `revalidate` — every revision now
  writes four sub-sections: Open Questions Resolution (OQR), Decision
  Log, Change History, and the agent-notes block. Step 4B-post runs a
  drift-check between product-spec and spec.md after each approval
  round.

### Changed

- `commands/bridge.md` — `spec.md` template extended with Prerequisites,
  NFR Measurement Contract, Codebase Constraints, Consumer Contract,
  Testing Specification. Step 5 self-checks expanded from 6 to 10
  with conditional guards based on feature type.
- `commands/plan.md` — Approval Gate now shows constitution-compliance
  results alongside cross-validation status.
- `commands/revalidate.md` — `review.md` init extended with OQR table
  and Decision Log; Step 3D writes all four sub-sections per revision;
  drift-check runs automatically after every approval.
- `config-template.yml` — `constitution_path` key added (commented
  out by default) under the SpecKit Integration block.

### Migration notes

- **No action required.** All changes are additive. Existing features
  keep working; new features (or re-runs of a phase) pick up the
  richer templates automatically.

---

## [1.3.0] — 2026-04-01

### Added — 5 new commands expanding the product lifecycle

- **`speckit.product-forge.sync-verify`** — Cross-cutting 7-layer artifact consistency checker:
  - Detects forward drift (earlier artifacts not reflected in later) and backward drift (later decisions that should update earlier)
  - Checks 7 layers: research↔product-spec, product-spec↔spec.md, spec↔plan, plan↔tasks, tasks↔code, spec↔code, cross-links
  - Each drift item: severity (CRITICAL/WARNING/INFO), direction, proposed resolution, human approval
  - `--quick` mode runs automatically between forge phase transitions (configurable via `auto_sync_between_phases`)
  - `--fix` mode applies approved resolutions after user confirmation
  - Outputs: `sync-report.md`, `sync-report.json`

- **`speckit.product-forge.pre-impl-review`** (Phase 5C) — Combined design, architecture, and risk gate:
  - Design Review: state completeness (empty/loading/error/partial/offline), UX pattern compliance, accessibility pre-check, component reuse
  - Architecture Review: structural checks, integration point validation, NFR coverage
  - Risk Assessment: technical/scope/integration/rollback risks with likelihood×impact matrix
  - Rollout strategy recommendation based on risk profile
  - Optional for features with ≤5 tasks and no UI
  - Outputs: `pre-impl-review.md`

- **`speckit.product-forge.code-review`** (Phase 6B) — Multi-agent code review:
  - 4 parallel review dimensions: Quality (SOLID, DRY), Security (OWASP surface scan), Patterns (vs codebase-analysis.md), Tests (coverage vs spec.md)
  - Enriched with Product Forge context — not a generic linter
  - Findings with CRITICAL/HIGH/MEDIUM/LOW severity and suggested code fixes
  - Outputs: `code-review.md`

- **`speckit.product-forge.release-readiness`** (Phase 9) — Pre-ship checklist:
  - Feature flags & rollout: flag detection, rollout strategy, rollback plan
  - Documentation: user docs, API docs status, changelog, migration guide
  - Monitoring: metrics, alerts, dashboard panels, runbook
  - Analytics: tracking plan status, event instrumentation
  - Dependencies: environment readiness, infrastructure, security status
  - Consolidates api-docs, security-check, and tracking-plan status
  - Outputs: `release-readiness.md` with READY/CONDITIONAL/NOT READY verdict

- **`speckit.product-forge.change-request`** — Formal scope change management:
  - Captures change description, rationale, priority
  - Impact analysis: which artifacts affected, effort delta, risk assessment
  - Decision gate: Accept/Defer/Reject/Modify
  - Propagates approved changes with `<!-- CR-NNN -->` markers across all artifacts
  - Runs sync-verify after application
  - Deferred changes logged in `backlog.md`
  - Outputs: `change-log.md` (append-only)

### Changed — Lifecycle expansion and quality improvements

- **`forge.md`** (major rewrite) — Now orchestrates 13 phases + 2 cross-cutting commands (was 9 phases):
  - Phase Map expanded with Phase 5C (Pre-Impl Review), Phase 6B (Code Review), Phase 9 (Release Readiness)
  - Automatic quick sync-verify between every phase transition
  - Gate audit trail: every gate decision recorded in `.forge-status.yml` `gates:` array
  - Schema migration: auto-detects v1 `.forge-status.yml` and migrates to v2
  - Cross-cutting commands (sync-verify, change-request) surfaced in operating rules

- **`implement.md`** (enhanced) — Progressive verification during implementation:
  - Mini-verify checkpoint every N tasks (configurable via `progressive_verify_interval`)
  - Checks: task-code correspondence, spec AC alignment, unplanned changes, plan alignment
  - Results logged in `implementation-log.md`
  - CRITICAL drift pauses implementation with user options
  - Handoff now suggests code-review as next step

- **`status.md`** (enhanced) — Displays new phases, gate audit trail, sync history, change requests

- **`.forge-status.yml` schema v2:**
  - Added `schema_version: 2` for migration detection
  - Split `plan_tasks` into separate `plan` and `tasks` fields
  - Added phase fields: `pre_impl_review`, `code_review`, `release_readiness`, `retrospective`
  - Added `gates:` array for audit trail
  - Added `sync_runs:` section for sync-verify history
  - Added `change_requests:` array for CR tracking

- **`extension.yml`** — Version 1.3.0, 5 new command entries, 4 new tags

- **`config-template.yml`** — 3 new config keys:
  - `progressive_verify_interval` (default: 3) — tasks between progressive verify checkpoints
  - `auto_sync_between_phases` (default: true) — automatic quick sync at phase transitions
  - `release_readiness` (default: "optional") — required/optional/skip

- **`docs/file-structure.md`** — Updated directory layout, schema v2 documentation, new naming conventions (CR-NNN, DRIFT-NNN, D-NNN, A-NNN, R-NNN)

- **`README.md`** — Updated lifecycle diagram, 20-command table, file structure, installation version

---

## [1.2.1] — 2026-03-30

### Changed — Breaking: `implement` split into 3 independent commands

`speckit.product-forge.implement` previously covered Phase 5 (plan), Phase 5B (tasks), and Phase 6 (implementation) as a single monolithic command. It is now split into three **standalone, independently runnable commands**:

- **`speckit.product-forge.plan`** (new, Phase 5) — generates `plan.md` from `spec.md`, cross-validates against product-spec, exits after approval. Extension point before tasks.
- **`speckit.product-forge.tasks`** (new, Phase 5B) — generates `tasks.md` from `plan.md`, cross-validates all US-NNN and FR-NNN coverage, exits after approval. Extension point before implementation.
- **`speckit.product-forge.implement`** (narrowed, Phase 6) — executes implementation from `tasks.md` only, exits when all tasks are `[x]`. Extension point before verification.

**Why:** Community members can now insert custom steps between any of the three phases — architecture review, cost estimation, sprint planning, PR approval gates, external review workflows — without forking or patching the core commands.

**Forge orchestrator updated:** `forge.md` now delegates to `plan` → `tasks` → `implement` as three separate calls, with explicit extension point prompts between each.

**`.forge-status.yml` schema updated:** `plan_tasks` field replaced by separate `plan` and `tasks` fields.

**Migration:** If you call `speckit.product-forge.implement` directly and expect it to also run plan/tasks — update your workflow to call `plan` → `tasks` → `implement` in sequence.

---

## [1.2.0] — 2026-03-30

### Added

- **`speckit.product-forge.problem-discovery`** (Phase 0) — validate the problem before any research begins:
  - JTBD analysis (functional / emotional / social job layers)
  - Competing Forces model (Push + Pull vs Inertia + Anxiety)
  - Problem Statement Canvas saved to `problem-discovery/problem-statement.md`
  - User interview script with scoring rubric saved to `problem-discovery/interview-script.md`
  - Go / Investigate further / No-go decision with confidence score
  - Hypotheses H1–HN passed forward to Phase 1 research agents

- **`speckit.product-forge.api-docs`** — generate production-ready API documentation from `plan.md` contracts:
  - Auto-detects API framework (NestJS, Express, FastAPI, etc.) and existing OpenAPI setup
  - Generates OpenAPI 3.1 `openapi.yml` with full request/response schemas and examples
  - Generates `postman-collection.json` with auto-token-save login request
  - Consistency check: plan.md contracts vs actual implementation (reports drift)
  - Outputs: `api-docs/openapi.yml`, `api-docs/postman-collection.json`, `api-docs/consistency-report.md`

- **`speckit.product-forge.security-check`** — feature-scoped OWASP security audit:
  - Builds a threat model from `plan.md` — only checks surfaces present in this feature
  - Covers: A01 Broken Access Control, A02 Crypto Failures, A03 Injection, A04 Insecure Design, A05 Misconfiguration, A07 Auth Failures, A08 Integrity Failures
  - Scans for hardcoded secrets, missing ownership checks, mass assignment, missing rate limiting
  - Outputs prioritized findings (Critical / High / Medium / Low) with code evidence and fix patterns
  - Ship-readiness decision: ✅ Ready / ⚠️ Fix critical first / 🔴 Not ready

- **`speckit.product-forge.tracking-plan`** — analytics tracking plan from user journeys:
  - Auto-detects analytics SDK (Mixpanel, Amplitude, PostHog, Firebase, Segment)
  - Generates event taxonomy with property schemas, required/optional flags, and examples
  - Defines conversion funnels and abandonment funnels mapped to product-spec success metrics
  - Coverage matrix: each user story → key event → success metric
  - Generates ready-to-paste typed SDK snippets for the detected framework
  - Outputs: `tracking/tracking-plan.md`, `tracking/snippets.md`

- **`speckit.product-forge.retrospective`** — post-launch retrospective (run ≥14 days after ship):
  - Loads predicted KPIs from `research/metrics-roi.md` as the baseline
  - Queries NewRelic (via MCP) for real performance data since launch date
  - Compares predicted vs actual: adoption, completion rate, latency, error rate, business metrics
  - Research accuracy audit: were Phase 1 predictions correct?
  - Lessons learned, open issues table, and next-step recommendations
  - Closes the full lifecycle loop: Idea → Ship → Measure → Learn

### Changed

- `extension.yml`: description updated to reflect full 15-command lifecycle
- `extension.yml`: added tags `analytics`, `security`, `api-docs`, `jtbd`
- `README.md`: commands table expanded to 15 commands
- `README.md`: lifecycle diagram now includes Phase 0 (Problem Discovery) and post-implementation block (api-docs, security-check, tracking-plan, retrospective)
- `README.md`: file structure updated with `problem-discovery/`, `api-docs/`, `tracking/`, `security-check.md`, `retrospective.md`
- `README.md`: Why section updated to reflect the full 9-step value proposition

---

## [1.1.3] — 2026-03-28

### Changed

- `README.md` Installation section rewritten with proper `specify extension add/update` commands:
  - Install latest: `specify extension add product-forge --from .../archive/refs/heads/main.zip`
  - Install pinned version: `specify extension add product-forge --from .../archive/refs/tags/v1.1.3.zip`
  - Update: `specify extension update product-forge --from ...`
  - Added post-install config setup instructions with `specify extension path product-forge`

---

## [1.1.2] — 2026-03-28

### Added

- **`playwright-cli` as execution engine for Phase 8B** (`speckit.product-forge.test-run`): agent now drives the browser interactively using `playwright-cli open`, `playwright-cli click/fill/snapshot/screenshot`, `playwright-cli tracing-start/stop`, and `playwright-cli -s=pf-auth state-save/load` for auth session reuse
- **Dual execution model** documented in `commands/test-plan.md`: `test-cases.md` (primary, agent-driven via `playwright-cli`) vs `.spec.ts` files (CI/CD companion, run with `npx playwright test`)
- **`test-cases.md` format specification**: each test case now uses a playwright-cli action table (`# | Action | playwright-cli equivalent`) so Phase 8B can translate steps mechanically without ambiguity
- **`playwright-cli` dependency section** in `README.md` Requirements with install instructions and link to [github.com/microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)
- **"How to Run Tests"** section in generated `test-plan.md` now documents both execution paths: agent-driven (`/speckit.product-forge.test-run`) and CI/CD (`npx playwright test`)

---

## [1.1.1] — 2026-03-28

### Fixed

- Command names updated to required `speckit.{extension}.{command}` pattern (was `product-forge.*`)
- All 10 commands renamed: `speckit.product-forge.forge`, `speckit.product-forge.research`, etc.
- All internal cross-references in command files updated accordingly

---

## [1.1.0] — 2026-03-28

### Added

- **`speckit.product-forge.test-plan`** — Phase 8A: Auto-detects test framework, ports, and env vars; generates smoke/E2E/API/regression test cases with `TC-*-NNN` IDs; writes runnable Playwright `.spec.ts` files with story traceability comments; initializes `bugs/README.md` dashboard
- **`speckit.product-forge.test-run`** — Phase 8B: Executes tests in priority order (smoke → E2E → API → regression); creates `bugs/BUG-NNN.md` per failed test with evidence, gap analysis, and fix log; auto-fix loop for P0/P1 bugs with single-test retest and smoke regression check; generates `test-report.md` with full coverage matrix and traceability chain
- **Adaptive research depth** in `speckit.product-forge.research`: input richness scoring (0–8 across 4 dimensions) selects FULL_INTERVIEW / PARTIAL_INTERVIEW / CONFIRM mode; avoids redundant questions when context is already rich

### Changed

- `speckit.product-forge.forge` orchestrator updated to 9-phase pipeline (8A and 8B added as optional after Phase 7)
- `forge.md` Phase Map table updated; Phase 8A/8B offer shown after every successful Phase 7 completion
- `extension.yml` version bumped to `1.1.0`; tags updated to include `testing`
- `docs/phases.md` updated with full Phase 8A and 8B documentation
- `docs/file-structure.md` updated with `testing/`, `bugs/`, and `test-report.md` in directory layout; `.forge-status.yml` schema updated with `test_plan`, `test_run`, and `testing:` block; `BUG-NNN.md` and `test-report.md` schemas added; naming conventions updated with TC-* and BUG-NNN IDs
- `README.md` updated with 9-phase lifecycle diagram, 10-command table, and expanded file structure

### Bug Fixes

- `forge.md` Phase 5 and 6 previously referenced SpecKit directly; corrected to delegate via `speckit.product-forge.implement` as intended

---

## [1.0.0] — 2026-03-28

### Added

- **`speckit.product-forge.forge`** — Full lifecycle orchestrator with 7-phase pipeline and human-in-the-loop gates
- **`speckit.product-forge.research`** — Phase 1: Parallel research across competitors, UX/UI patterns, codebase analysis (mandatory), tech stack and metrics/ROI (optional)
- **`speckit.product-forge.product-spec`** — Phase 2: Interactive product spec creation with configurable detail levels (concise/standard/exhaustive) and auto-decomposition for large features
- **`speckit.product-forge.revalidate`** — Phase 3: Iterative review loop with structured change tracking in review.md; exits only on explicit user approval
- **`speckit.product-forge.bridge`** — Phase 4: Converts approved product-spec into SpecKit spec.md; supports Classic and V-Model SpecKit modes
- **`speckit.product-forge.implement`** — Phase 5-6: Wraps SpecKit plan + tasks + implement with product-spec cross-validation at each sub-phase
- **`speckit.product-forge.verify-full`** — Phase 7: Full traceability verification across 6 layers (code ↔ tasks ↔ plan ↔ spec ↔ product-spec ↔ research)
- **`speckit.product-forge.status`** — Status reporter showing all phases, artifact inventory, and next recommended action

### Feature File Structure

Introduced the `features/<name>/` directory convention with:
- `research/` — all research artifacts + README index
- `product-spec/` — all product spec artifacts + README index
- `.forge-status.yml` — phase tracker
- `review.md` — revalidation changelog
- `verify-report.md` — verification report

### Decomposition & Cross-linking

- Auto-detects large features and suggests file decomposition for user journeys and wireframes
- All documents cross-linked via feature root README.md and product-spec/README.md
- Token budget awareness with `max_tokens_per_doc` config setting

### Configuration

- `config-template.yml` with full project configuration options
- `.product-forge/config.yml` project-level config support
- Per-feature config override support

---

[1.5.1]: https://github.com/VaiYav/speckit-product-forge/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/VaiYav/speckit-product-forge/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.3...v1.2.0
[1.1.3]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/VaiYav/speckit-product-forge/releases/tag/v1.0.0
