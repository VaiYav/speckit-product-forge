# Product Forge — Phase Reference

What each Product Forge phase does, what it writes, and what its gate checks — in
`forge.md` phase order, plus the cross-cutting and supporting commands.

**Which phases run** depends on the feature mode: the single source is
[schema/phase-map.yml](./schema/phase-map.yml) (`yes` / `opt` / `no` per mode), and
mode rules (triage, escalation) are in [policy.md §4](./policy.md#4-feature-modes-e1).
Each phase below states its standard-mode role. In `express` / `lite` only Product
Spec → Plan → Implement → Verify run (plus optional Phase 0 in lite); per-mode inputs
are in [runtime.md §11.2](./runtime.md#112-per-phase-required-upstream-artifacts).
All paths are relative to `FEATURE_DIR`.

---

## Phase 0: Problem Discovery *(Optional)*

**Command:** `/speckit.product-forge.problem-discovery`
**Output:** `problem-discovery/`
**Gate:** Go / Investigate further / No-go decision

### What happens

Validates the problem before any research begins:
1. **JTBD Analysis** — functional, emotional, and social job layers
2. **Competing Forces Model** — Push + Pull vs Inertia + Anxiety
3. **Problem Statement Canvas** — structured problem definition
4. **Interview Script** — user interview guide with scoring rubric
5. **Go/No-go Decision** — confidence score and recommendation

### Output files

| File | Description |
|------|-------------|
| `problem-discovery/problem-statement.md` | JTBD + Problem Canvas + Go/No-go decision |
| `problem-discovery/interview-script.md` | User interview guide with scoring rubric |

### What passes forward

Hypotheses H1–HN are passed to Phase 1 research agents to guide investigation.

---

## Phase 1: Research

**Command:** `/speckit.product-forge.research`
**Output:** `research/`
**Gate:** User approves research before Phase 2

### What happens

Three research agents run **in parallel**:
1. **Competitor Research** — finds 5-8 competitors, analyzes their feature implementation, identifies gaps and best practices
2. **UX/UI Patterns** — researches best interactions, flows, empty states, animations, accessibility requirements
3. **Codebase Analysis** — explores your codebase, finds reusable components, identifies integration points

Two additional agents run **if opted-in**:
4. **Tech Stack** — compares libraries and APIs with download stats, license, and bundle size
5. **Metrics/ROI** — estimates business impact, KPIs, measurement plan

### Output files

| File | Always? | Description |
|------|---------|-------------|
| `research/README.md` | Yes | Master index + executive summary + open questions |
| `research/competitors.md` | Yes | Competitor table + patterns + top implementations |
| `research/ux-patterns.md` | Yes | Flows + states + micro-interactions + anti-patterns |
| `research/codebase-analysis.md` | Yes | Integration points + reusable components + complexity |
| `research/tech-stack.md` | Optional | Library comparison table + recommendation |
| `research/metrics-roi.md` | Optional | KPI benchmarks + ROI model + measurement plan |

---

## Phase 2: Product Spec

**Command:** `/speckit.product-forge.product-spec`
**Output:** `product-spec/`
**Gate:** User approves document plan before writing, then approves output

### What happens

An interactive spec creation session. The agent asks about desired detail levels,
conducts a brief interview, then generates all documents.

### Output files

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

In express the product spec is minimal (1 journey + acceptance criteria); in lite it
is light.

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
**Gate:** Explicit "APPROVED" / "LGTM" from user

### What happens

The agent presents a structured summary of all product-spec documents.
The user reviews and provides corrections in chat.
The agent applies changes and loops until approval.

### Consistency check before lock

Before locking, the agent automatically verifies:
- All cross-links in README files are valid
- All referenced files exist
- User stories in product-spec align with structured journeys (`journeys/journeys.yml`)

---

## Phase 4: Bridge → SpecKit

**Command:** `/speckit.product-forge.bridge`
**Output:** `spec.md`
**Gate:** User approves spec.md; then SpecKit mode is selected

### What happens

All research and product-spec artifacts are synthesized into a single `spec.md`.
This spec is richer than a manually written spec: it includes research context,
competitive intelligence, UX recommendations, and technical integration notes.

### SpecKit sub-flow (`speckit_mode`)

| Value | When to use | Sub-flow |
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

### What happens

Delegates to SpecKit `plan` with product-spec context, then cross-validates:

| Check | Severity if fails |
|-------|------------------|
| All Must Have stories addressed? | Warning |
| Integration matches codebase analysis? | Warning |
| NFR approach defined? | Warning |

In express/lite there is no bridge or tasks phase: the plan reads the product spec
directly and ends with an inline `## Tasks` list that implement executes.

---

## Phase 5B: Tasks

**Command:** `/speckit.product-forge.tasks`
**Output:** `tasks.md`
**Gate:** User approves tasks

### What happens

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

### What happens

Combined gate before coding:

1. **Design Review** (if feature has UI) — state completeness (empty/loading/error/partial/offline),
   UX pattern compliance, accessibility pre-check, component reuse
2. **Architecture Review** — structural checks, integration point validation, NFR coverage
3. **Risk Assessment** — technical/scope/integration/rollback risks with severity matrix,
   rollout strategy recommendation

Optional for features with ≤5 tasks and no UI.

---

## Phase 6: Implementation

**Command:** `/speckit.product-forge.implement`
**Output:** Code files (per tasks.md, or the plan's inline `## Tasks` in express/lite) + `implementation-log.md`
**Gate:** All tasks `[x]`

### What happens

Delegates to SpecKit `implement` with product-spec context (wireframes, user journeys, AC).

**Progressive verification:** after every N completed tasks (`progressive_verify_interval`),
a mini-verify checkpoint runs:
- Task-code correspondence
- Spec AC alignment
- Unplanned changes detection
- Plan alignment check

Results logged in `implementation-log.md`. CRITICAL drift pauses implementation.

---

## Phase 6B: Code Review *(Optional)*

**Command:** `/speckit.product-forge.code-review`
**Output:** `code-review.md`
**Gate:** User approves review (or skips)

### What happens

Multi-agent code review with 4 parallel dimensions:

| Dimension | What it checks |
|-----------|---------------|
| Quality | SOLID, DRY, error handling, naming, complexity, dead code |
| Security | OWASP surfaces from plan.md — input validation, injection, auth, secrets |
| Patterns | Consistency with codebase-analysis.md conventions |
| Tests | Coverage against spec.md requirements and acceptance criteria |

Findings are written to `gate-review.md` as `F-NNN` (one namespace with pre-impl-review
and verify-full — [policy.md §9.1](./policy.md#91-unified-gate-review-artifact-a3)) with
CRITICAL/HIGH/MEDIUM/LOW severity; `REV-NNN` is the legacy id.

---

## Phase 7: Full Verification

**Command:** `/speckit.product-forge.verify-full`
**Output:** `verify-report.md`
**Gate:** No CRITICAL findings (or user acknowledges)

### Verification Layers

Consumes the live `traceability.yml` (does not re-derive the chain). Layers:

| Layer | What it checks |
|-------|---------------|
| 1: Code ↔ Tasks | Every task has verifiable code |
| 2: Code ↔ Plan | All planned components implemented |
| 3: Stories ↔ Code | Every Must Have story implemented + tested |
| 4: spec.md ↔ product-spec | No spec drift from approved product spec |
| 5: Research alignment | Key research recommendations followed |
| 6: Document integrity | All cross-links valid, no broken references |
| 7: Journey ↔ E2E *(v1.6)* | Every Must-Have `JRN` / P0-P1 `EDGE` has an E2E test (Theme H) |
| 8: UI ↔ Design System *(v1.6)* | Built UI uses the mapped `CMP-*` components (Theme E) |
| 9: FE ↔ BE contract drift *(v1.6)* | Contracts implemented + called on both sides (Theme F) |
| 10: Doc ↔ Code *(v1.6)* | No unimplemented docs / undocumented code (Theme G) |
| 11: Constitution ↔ Code *(v1.7)* | Code honours the project constitution (`constitution_path`); N/A without one |

The layer definitions are owned by [verify-full](../commands/verify-full.md).

### Severity levels

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

### What happens

Auto-detects test setup and generates test cases. E2E specs are generated
**directly from `product-spec/journeys/journeys.yml`** (one Playwright spec per
`JRN`; steps → actions, edges → assertions; selectors from
`mockups/component-map.yml`). `playwright-cli` is the committed default runner
(`e2e_runner: playwright-cli`). See [docs/journeys.md](./journeys.md).

### Test types generated

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

### What happens

Tests executed via `playwright-cli` in priority order: Smoke → E2E → API → Regression.

Per bug: `bugs/BUG-NNN.md` with evidence, gap analysis, fix log.
Auto-fix loop for P0/P1 bugs with retest and smoke regression check.

### Exit criteria

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

### What happens

Pre-ship checklist:

| Section | What it checks |
|---------|---------------|
| Feature Flags & Rollout | Flag configured, rollout strategy, rollback plan |
| Documentation | User docs, API docs, changelog, migration guide |
| Monitoring | Metrics, alerts, dashboard, runbook |
| Analytics | Tracking plan status, event instrumentation |
| Dependencies | Env vars, migrations, external services, CI/CD |
| Security | Security check status, secrets, permissions |

Consolidates status of api-docs, security-check, and tracking-plan commands.
Verdict: READY TO SHIP / CONDITIONALLY READY / NOT READY.

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

Merges a completed feature's delta specs into the canonical `specs/` source of truth
(upsert by `FR-*`, idempotent) and archives the change with audit history (OpenSpec
model), so the spec stays a living source of truth across the feature's lifetime.
Consumes verify-full's "Suggested canonical-spec updates".

---

## Post-Launch: Retrospective

**Command:** `/speckit.product-forge.retrospective`
**Output:** `retrospective.md`
**Recommended:** Run ≥14 days after shipping

### What happens

Compares predicted KPIs (from research/metrics-roi.md) against real data.
Queries the connected MCPs (PostHog/Amplitude, Sentry; NewRelic optional), collects analytics data, audits research accuracy.
Produces lessons learned and next-step recommendations.

---

## Cross-Cutting Commands

### Sync & Verify

**Command:** `/speckit.product-forge.sync-verify`
**Output:** `sync-report.md` + `sync-report.json`

Runnable between ANY phases. Checks 10 artifact layers (incl. contract-drift + doc↔code) for forward and backward drift.
`--quick` mode runs automatically between forge phase transitions.
Human-in-the-loop for each CRITICAL/WARNING resolution.

### Change Request

**Command:** `/speckit.product-forge.change-request`
**Output:** `change-log.md`

Formal scope change management: capture → impact analysis → effort delta → propagate.
Traces changes with `CR-NNN` markers across all affected artifacts. Emits **delta
specs** (`## ADDED / ## MODIFIED / ## REMOVED`) against canonical `specs/` (v1.6).
Runs sync-verify after application.

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

---
