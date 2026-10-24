# Product Forge — Phase Reference

What each Product Forge phase does, what it writes, and what its gate checks — in
`forge.md` phase order, plus the cross-cutting and supporting commands.

**Which phases run** per feature mode is [schema/phase-map.yml](./schema/phase-map.yml)
(`yes` / `opt` / `no`); mode rules (triage, escalation, the express/lite inline
`## Tasks` path) are [policy.md §4](./policy.md#4-feature-modes-e1); per-mode inputs
are [runtime.md §11.2](./runtime.md#112-per-phase-required-upstream-artifacts). Each
phase below states its standard-mode role. All paths are relative to `FEATURE_DIR`;
the full file tree per phase is [file-structure.md](./file-structure.md#feature-directory-layout).

---

## Phase 0: Problem Discovery *(Optional)*

**Command:** `/speckit.product-forge.problem-discovery`
**Output:** `problem-discovery/`
**Gate:** Go / Investigate further / No-go decision

Validates the problem before any research begins:
1. **JTBD Analysis** — functional, emotional, and social job layers
2. **Competing Forces Model** — Push + Pull vs Inertia + Anxiety
3. **Problem Statement Canvas** — structured problem definition
4. **Interview Script** — user interview guide with scoring rubric
5. **Go/No-go Decision** — confidence score and recommendation

Writes `problem-discovery/problem-statement.md` (JTBD + Problem Canvas + Go/No-go
decision) and `problem-discovery/interview-script.md`. Hypotheses H1–HN pass to the Phase 1 research agents to guide investigation.

---

## Phase 1: Research

**Command:** `/speckit.product-forge.research`
**Output:** `research/`
**Gate:** User approves research before Phase 2

Three research agents run **in parallel**:
1. **Competitor Research** — finds 5-8 competitors, analyzes their feature implementation, identifies gaps and best practices
2. **UX/UI Patterns** — researches best interactions, flows, empty states, animations, accessibility requirements
3. **Codebase Analysis** — explores your codebase, finds reusable components, identifies integration points

Two more run **if opted-in**:
4. **Tech Stack** — compares libraries and APIs with download stats, license, and bundle size
5. **Metrics/ROI** — estimates business impact, KPIs, measurement plan

Writes `research/README.md` (index + executive summary + open questions),
`competitors.md`, `ux-patterns.md`, `codebase-analysis.md`, and the opted-in
`tech-stack.md` / `metrics-roi.md`.

---

## Phase 2: Product Spec

**Command:** `/speckit.product-forge.product-spec`
**Output:** `product-spec/`
**Gate:** User approves document plan before writing, then approves output

An interactive session: the agent asks about desired detail levels, conducts a
brief interview, then generates all documents. In express the product spec is
minimal (1 journey + acceptance criteria); in lite it is light.

| File | Always? |
|------|---------|
| `product-spec/README.md` | Yes |
| `product-spec/product-spec.md` | Yes |
| `product-spec/journeys/journeys.yml` + `JRN-*.md` (structured, E2E source of truth — see [docs/journeys.md](./journeys.md)) | Yes |
| `product-spec/wireframes.md` (or folder) | Yes |
| `product-spec/metrics.md` | Optional |
| `design-system/manifest.yml` + `manifest.md` (harvested, read-only) | If UI |
| `product-spec/mockups/index.html` + screens (clickable, design-system-grounded) | If UI |
| `product-spec/mockups/component-map.yml` (region → `CMP-*` → code path) | If UI |

---

## Phase 2H: Design System Harvest *(Optional, UI features)*

**Command:** `/speckit.product-forge.design-system-harvest`
**Output:** `design-system/manifest.yml` + `manifest.md` (read-only)
**Gate:** none of its own — runs as a Phase 2 helper

Discovers the project's in-code design system and emits the read-only manifest
(`CMP-*` components, props, variants, stable selectors, token references) that
grounds mockups, component decomposition, and UI verification. The design system
stays in code as the single source of truth.

---

## Phase 3: Revalidation

**Command:** `/speckit.product-forge.revalidate`
**Output:** `review.md`
**Gate:** the structured Gate prompt (Approve / Revise / Rollback / Abort); approval is recorded in `review.md`

The agent presents a structured summary of all product-spec documents; the user
gives corrections in chat; the agent applies them and loops until approval.

Before locking, the agent automatically verifies:
- All cross-links in README files are valid
- All referenced files exist
- User stories in product-spec align with structured journeys (`journeys/journeys.yml`)

---

## Phase 4: Bridge → SpecKit

**Command:** `/speckit.product-forge.bridge`
**Output:** `spec.md`
**Gate:** User approves spec.md; then SpecKit mode is selected

All research and product-spec artifacts are synthesized into a single `spec.md`
that carries research context, competitive intelligence, UX recommendations, and
technical integration notes.

| `speckit_mode` | When to use | Sub-flow |
|------|-------------|-----------------|
| `classic` | Well-scoped features, clear requirements | plan → tasks → implement → verify |
| `v-model` | Complex / safety-critical features, full traceability | V-Model SpecKit commands (requirements → architecture → design) → implement |

Chosen per `default_speckit_mode`; forced to `v-model` when `feature_mode: v-model`.
How the two switches relate: [policy.md §4.1](./policy.md#41-phase-maps).

---

## Phase 4.5: i18n Harvest *(Optional, multi-locale projects)*

**Command:** `/speckit.product-forge.i18n-harvest`
**Output:** `i18n/keys.yml` + `report.md` + per-locale stubs
**Gate:** user approves harvested keys

---

## Phase 5: Plan

**Command:** `/speckit.product-forge.plan`
**Output:** `plan.md`
**Gate:** User approves plan

Delegates to SpecKit `plan` with product-spec context, then cross-validates
(express/lite: reads the product spec directly and ends with an inline `## Tasks`
list):

| Check | Severity if fails |
|-------|------------------|
| All Must Have stories addressed? | Warning |
| Integration matches codebase analysis? | Warning |
| NFR approach defined? | Warning |

---

## Phase 5B: Tasks

**Command:** `/speckit.product-forge.tasks`
**Output:** `tasks.md`
**Gate:** User approves tasks

Delegates to SpecKit `tasks` with product-spec context, then cross-validates:

| Check | Severity if fails |
|-------|------------------|
| Every Must Have US has ≥1 task? | Critical |
| Every FR has ≥1 task? | Warning |
| Test tasks included? | Warning |
| No orphan tasks (untraceable)? | Warning |

---

## Phase 5.5: Migration Plan *(Conditional)*

**Command:** `/speckit.product-forge.migration-plan`
**Trigger:** the `plan.md` Data Model section introduces schema changes
**Output:** `migrations/migration-plan.md`, `forward.sql`, `rollback.sql`, `validation.sql`, optional `backfill.md`, `risk-matrix.md`
**Gate:** user approves strategy and scripts

---

## Phase 5C: Pre-Implementation Review *(Optional)*

**Command:** `/speckit.product-forge.pre-impl-review`
**Output:** `pre-impl-review.md`
**Gate:** User approves review (or skips)

Combined gate before coding:

1. **Design Review** (if feature has UI) — state completeness (empty/loading/error/partial/offline),
   UX pattern compliance, accessibility pre-check, component reuse
2. **Architecture Review** — structural checks, integration point validation, NFR coverage
3. **Risk Assessment** — technical/scope/integration/rollback risks with severity matrix,
   rollout strategy recommendation

Optional in every mode that runs it; recommended for features with more than 5 tasks or a UI.

---

## Phase 6: Implementation

**Command:** `/speckit.product-forge.implement`
**Output:** Code files (per tasks.md, or the plan's inline `## Tasks` in express/lite) + `implementation-log.md`
**Gate:** All tasks `[x]`

Delegates to SpecKit `implement` with product-spec context (wireframes, user
journeys, AC).

**Progressive verification:** after every N completed tasks
(`progressive_verify_interval`), a mini-verify checkpoint runs:
- Task-code correspondence
- Spec AC alignment
- Unplanned changes detection
- Plan alignment check

Results are logged in `implementation-log.md`. CRITICAL drift pauses implementation.

---

## Phase 6B: Code Review *(Optional)*

**Command:** `/speckit.product-forge.code-review`
**Output:** `code-review.md`
**Gate:** User approves review (or skips)

Multi-agent code review in 4 parallel dimensions: **Quality** (SOLID, DRY, error
handling, naming, complexity, dead code), **Security** (OWASP surfaces from
plan.md: input validation, injection, auth, secrets), **Patterns** (codebase-analysis.md conventions), **Tests** (coverage of
spec.md requirements and acceptance criteria).

Findings go to `gate-review.md` as `F-NNN` ([policy.md §9.1](./policy.md#91-unified-gate-review-artifact-a3))
with CRITICAL/HIGH/MEDIUM/LOW severity; `REV-NNN` is the legacy id.

---

## Phase 7: Full Verification

**Command:** `/speckit.product-forge.verify-full`
**Output:** `verify-report.md`
**Gate:** No CRITICAL findings (or user acknowledges)

Consumes the live `traceability.yml` (does not re-derive the chain) and checks 11
layers, defined by [verify-full](../commands/verify-full.md): Code ↔ Tasks (every
task's code exists), Code ↔ Plan (architecture followed), Stories ↔ Code (every Must
Have story implemented + tested), spec.md ↔ product-spec (no scope drift), Research
alignment (key recommendations followed), Document integrity (links and IDs
resolve), Journey ↔ E2E (every Must-Have `JRN` / P0-P1 `EDGE` has an E2E test),
UI ↔ Design System (mapped `CMP-*` components), FE ↔ BE contract drift (contracts
implemented and called on both sides), Doc ↔ Code (no unimplemented docs or
undocumented code), and Constitution ↔ Code (`constitution_path`; N/A without one).

| Severity | Meaning | Blocks completion? |
|----------|---------|-------------------|
| CRITICAL | Genuine implementation gap or scope violation | Yes |
| WARNING | Deviation that may be intentional | No |
| PASSED | Check verified successfully | — |
| SKIPPED | Cannot verify (missing context) | No |

---

## Phase 8A: Test Plan *(Optional)*

**Command:** `/speckit.product-forge.test-plan`
**Output:** `testing/`
**Gate:** User approves test plan before execution

Auto-detects test setup and generates test cases. E2E specs are generated
**directly from `product-spec/journeys/journeys.yml`** (one Playwright spec per
`JRN`; steps → actions, edges → assertions; selectors from
`mockups/component-map.yml`). `playwright-cli` is the committed default runner
(`e2e_runner: playwright-cli`). See [docs/journeys.md](./journeys.md).

| Type | ID Format | Source |
|------|-----------|--------|
| Smoke | `TC-SMK-NNN` | Key Must Have stories |
| E2E | `TC-E2E-NNN` | All user stories |
| API | `TC-API-NNN` | Functional requirements |
| Regression | `TC-REG-NNN` | Adjacent existing features |
| Unit | `TC-UNIT-NNN` | Test-first tasks and module logic |
| Integration | `TC-INT-NNN` | Cross-module / API integration points |

---

## Phase 8B: Test Run *(Optional)*

**Command:** `/speckit.product-forge.test-run`
**Output:** `bugs/`, `test-report.md`
**Gate:** ≥80% pass rate AND zero P0/P1 open bugs

Tests run via `playwright-cli` in priority order: Smoke → E2E → API → Regression.
Each bug gets `bugs/BUG-NNN.md` with evidence, gap analysis and fix log; P0/P1 bugs
go through an auto-fix loop with retest and smoke regression check.

Exit criteria:
- All P0 smoke tests PASS
- All E2E happy paths PASS
- ≥80% of all tests PASS
- Zero P0/P1 open bugs
- All P2+ bugs documented

---

## Phase 9: Release Readiness *(Optional)*

**Command:** `/speckit.product-forge.release-readiness`
**Output:** `release-readiness.md`
**Gate:** User confirms readiness verdict

Pre-ship checklist — feature flags & rollout (flag, rollout strategy, rollback
plan), documentation (changelog, migration guide), monitoring (alerts, runbook),
analytics (event instrumentation), dependencies (env vars, migrations, external
services, CI/CD), security (secrets, permissions) — consolidating the status of the api-docs,
security-check, and tracking-plan commands. Verdict: READY TO SHIP /
CONDITIONALLY READY / NOT READY.

---

## Phase 9.5: Monitoring Setup *(Optional)*

**Command:** `/speckit.product-forge.monitoring-setup`
**Output:** `monitoring/dashboard.json`, `alerts.yml`, `slo.md`
**Gate:** user confirms artifacts before ship

---

## Phase 9B: Experiment Design *(Conditional)*

**Command:** `/speckit.product-forge.experiment-design`
**Trigger:** `flags/registry.yml` has a flag with `experiment: true`
**Output:** `experiment/experiment-design.md` + `experiment.yml`
**Gate:** user pre-registers hypothesis and decision rule before ship

---

## Phase 10: Spec Merge *(Optional, living spec)*

**Command:** `/speckit.product-forge.spec-merge`
**Output:** updates canonical `specs/<domain>/spec.md`; archives the feature to `{features_dir}/_archived/<date>-<slug>/`
**Gate:** user approves the merge diff

Folds a completed feature's delta specs into the canonical `specs/` (upsert by
`FR-*`, idempotent) and archives the change with audit history, so the canonical
spec stays current across the feature's lifetime. Consumes verify-full's
"Suggested canonical-spec updates".

---

## Post-Launch: Retrospective

**Command:** `/speckit.product-forge.retrospective`
**Output:** `retrospective.md`
**Recommended:** Run ≥14 days after shipping

Compares predicted KPIs (from research/metrics-roi.md) against real data from the
connected MCPs (PostHog/Amplitude, Sentry; NewRelic optional), audits research
accuracy, and produces lessons learned and next-step recommendations.

---

## Cross-Cutting Commands

### Sync & Verify

**Command:** `/speckit.product-forge.sync-verify`
**Output:** `sync-report.md` + `sync-report.json`

Runnable between ANY phases. Checks 10 artifact layers (incl. contract-drift + doc↔code) for forward and backward drift.
`--quick` mode runs automatically between forge phase transitions. Human-in-the-loop
for each CRITICAL/WARNING resolution.

### Change Request

**Command:** `/speckit.product-forge.change-request`
**Output:** `change-log.md`

Formal scope change management: capture → impact analysis → effort delta →
propagate. Traces changes with `CR-NNN` markers across all affected artifacts,
emits **delta specs** (`## ADDED / ## MODIFIED / ## REMOVED`) against canonical
`specs/`, and runs sync-verify after application.

### Portfolio

**Command:** `/speckit.product-forge.portfolio`
**Output:** `{features_dir}/_portfolio/portfolio.md` (feature table, file-conflict matrix, dependency graph, suggested merge order). Read-only; reads `catalog.yml` as a freshness-gated fast path.

### Catalog & Retrieve

**Commands:** `/speckit.product-forge.catalog`, `/speckit.product-forge.retrieve`
**Output:** `{features_dir}/_portfolio/catalog.yml` ([shape](./schema/catalog.yml)); retrieve returns the 1–3 matching features and the files to open.

### Backfill

**Command:** `/speckit.product-forge.backfill`
**Brown-field entry.** Creates a feature folder from existing code with `backfilled: true` on the status file and a `gaps-report.md`.

### Feature Flag Cleanup

**Command:** `/speckit.product-forge.feature-flag-cleanup`
**Output:** `{features_dir}/_portfolio/flag-cleanup-{date}.md` with removal recipes for stale flags. Read-only (`--apply` is not implemented).

---

## Supporting Commands

| Command | Description |
|---------|-------------|
| `/speckit.product-forge.status` | Show lifecycle status, gate audit trail, sync history |
| `/speckit.product-forge.api-docs` | Generate OpenAPI 3.1 + Postman collection from plan.md |
| `/speckit.product-forge.security-check` | OWASP audit scoped to detected surfaces |
| `/speckit.product-forge.tracking-plan` | Analytics events, funnels, SDK snippets |
