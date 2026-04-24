# Product Forge — Phase Reference (v1.3.0)

Full documentation for all Product Forge lifecycle phases: 1 optional pre-phase (Phase 0),
7 required phases (1–7), 5 optional phases (5C, 6B, 8A, 8B, 9), plus cross-cutting commands.

---

## Phase 0: Problem Discovery *(Optional)*

**Command:** `/speckit.product-forge.problem-discovery`
**Output:** `features/{slug}/problem-discovery/`
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
**Output:** `features/{slug}/research/`
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
**Output:** `features/{slug}/product-spec/`
**Gate:** User approves document plan before writing, then approves output

### What happens

An interactive spec creation session. The agent asks about desired detail levels,
conducts a brief interview, then generates all documents.

### Output files

| File | Always? |
|------|---------|
| `product-spec/README.md` | Yes |
| `product-spec/product-spec.md` | Yes |
| `product-spec/user-journey.md` (or multiple) | Yes |
| `product-spec/wireframes.md` (or folder) | Yes |
| `product-spec/metrics.md` | Optional |
| `product-spec/mockups/index.html` + screens | Optional |

---

## Phase 3: Revalidation

**Command:** `/speckit.product-forge.revalidate`
**Output:** `features/{slug}/review.md`
**Gate:** Explicit "APPROVED" / "LGTM" from user

### What happens

The agent presents a structured summary of all product-spec documents.
The user reviews and provides corrections in chat.
The agent applies changes and loops until approval.

### Consistency check before lock

Before locking, the agent automatically verifies:
- All cross-links in README files are valid
- All referenced files exist
- User stories in product-spec align with user-journey flows

---

## Phase 4: Bridge → SpecKit

**Command:** `/speckit.product-forge.bridge`
**Output:** `features/{slug}/spec.md`
**Gate:** User approves spec.md; then SpecKit mode is selected

### What happens

All research and product-spec artifacts are synthesized into a single `spec.md`.
This spec is richer than a manually written spec: it includes research context,
competitive intelligence, UX recommendations, and technical integration notes.

### SpecKit Mode Selection

| Mode | When to use | Phases triggered |
|------|-------------|-----------------|
| Classic | Well-scoped features, clear requirements | plan → tasks → implement → verify |
| V-Model | Complex features, safety-critical, need full traceability | v-model-requirements → architecture → design → implement |

---

## Phase 5: Plan

**Command:** `/speckit.product-forge.plan`
**Output:** `features/{slug}/plan.md`
**Gate:** User approves plan

### What happens

Delegates to SpecKit `plan` with product-spec context, then cross-validates:

| Check | Severity if fails |
|-------|------------------|
| All Must Have stories addressed? | Warning |
| Integration matches codebase analysis? | Warning |
| NFR approach defined? | Warning |

---

## Phase 5B: Tasks

**Command:** `/speckit.product-forge.tasks`
**Output:** `features/{slug}/tasks.md`
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

## Phase 5C: Pre-Implementation Review *(Optional)*

**Command:** `/speckit.product-forge.pre-impl-review`
**Output:** `features/{slug}/pre-impl-review.md`
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
**Output:** Code files (per tasks.md) + `implementation-log.md`
**Gate:** All tasks `[x]`

### What happens

Delegates to SpecKit `implement` with product-spec context (wireframes, user journeys, AC).

**Progressive verification** (new in v1.3.0): after every N completed tasks (configurable),
a mini-verify checkpoint runs:
- Task-code correspondence
- Spec AC alignment
- Unplanned changes detection
- Plan alignment check

Results logged in `implementation-log.md`. CRITICAL drift pauses implementation.

---

## Phase 6B: Code Review *(Optional)*

**Command:** `/speckit.product-forge.code-review`
**Output:** `features/{slug}/code-review.md`
**Gate:** User approves review (or skips)

### What happens

Multi-agent code review with 4 parallel dimensions:

| Dimension | What it checks |
|-----------|---------------|
| Quality | SOLID, DRY, error handling, naming, complexity, dead code |
| Security | OWASP surfaces from plan.md — input validation, injection, auth, secrets |
| Patterns | Consistency with codebase-analysis.md conventions |
| Tests | Coverage against spec.md requirements and acceptance criteria |

Findings use `REV-NNN` IDs with CRITICAL/HIGH/MEDIUM/LOW severity.

---

## Phase 7: Full Verification

**Command:** `/speckit.product-forge.verify-full`
**Output:** `features/{slug}/verify-report.md`
**Gate:** No CRITICAL findings (or user acknowledges)

### 6 Verification Layers

| Layer | What it checks |
|-------|---------------|
| 1: Code ↔ Tasks | Every task has verifiable code |
| 2: Code ↔ Plan | All planned components implemented |
| 3: Stories ↔ Code | Every Must Have story implemented + tested |
| 4: spec.md ↔ product-spec | No spec drift from approved product spec |
| 5: Research alignment | Key research recommendations followed |
| 6: Document integrity | All cross-links valid, no broken references |

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
**Output:** `features/{slug}/testing/`
**Gate:** User approves test plan before execution

### What happens

Auto-detects test setup, generates test cases for every user story,
creates runnable Playwright `.spec.ts` files.

### Test types generated

| Type | ID Format | Source |
|------|-----------|--------|
| Smoke | `TC-SMK-NNN` | Key Must Have stories |
| E2E | `TC-E2E-NNN` | All user stories |
| API | `TC-API-NNN` | Functional requirements |
| Regression | `TC-REG-NNN` | Adjacent existing features |

---

## Phase 8B: Test Run *(Optional)*

**Command:** `/speckit.product-forge.test-run`
**Output:** `features/{slug}/bugs/`, `features/{slug}/test-report.md`
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
**Output:** `features/{slug}/release-readiness.md`
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

## Post-Launch: Retrospective

**Command:** `/speckit.product-forge.retrospective`
**Output:** `features/{slug}/retrospective.md`
**Recommended:** Run ≥14 days after shipping

### What happens

Compares predicted KPIs (from research/metrics-roi.md) against real data.
Queries NewRelic via MCP, collects analytics data, audits research accuracy.
Produces lessons learned and next-step recommendations.

---

## Cross-Cutting Commands

### Sync & Verify

**Command:** `/speckit.product-forge.sync-verify`
**Output:** `features/{slug}/sync-report.md` + `sync-report.json`

Runnable between ANY phases. Checks 7 artifact layers for forward and backward drift.
`--quick` mode runs automatically between forge phase transitions.
Human-in-the-loop for each CRITICAL/WARNING resolution.

### Change Request

**Command:** `/speckit.product-forge.change-request`
**Output:** `features/{slug}/change-log.md`

Formal scope change management: capture → impact analysis → effort delta → propagate.
Traces changes with `CR-NNN` markers across all affected artifacts.
Runs sync-verify after application.

---

## Supporting Commands

| Command | Description |
|---------|-------------|
| `/speckit.product-forge.status` | Show lifecycle status, gate audit trail, sync history |
| `/speckit.product-forge.api-docs` | Generate OpenAPI 3.1 + Postman collection from plan.md |
| `/speckit.product-forge.security-check` | OWASP audit scoped to detected surfaces |
| `/speckit.product-forge.tracking-plan` | Analytics events, funnels, SDK snippets |

---

## Appendix A — Phases added in v1.5.0

### Phase 4.5: i18n Harvest (optional, conditional)

**Command:** `/speckit.product-forge.i18n-harvest`
**Trigger:** multi-locale project detected.
**Output:** `features/{slug}/i18n/keys.yml` + per-locale stubs.
**Gate:** user approves harvested keys.

### Phase 5.5: Migration Plan (optional, conditional)

**Command:** `/speckit.product-forge.migration-plan`
**Trigger:** `plan.md` Data Model section introduces schema changes.
**Output:** `features/{slug}/migrations/migration-plan.md`, `forward.sql`, `rollback.sql`, `validation.sql`, optionally `backfill.md`.
**Gate:** user approves strategy and scripts.

### Phase 9.5: Monitoring Setup (optional)

**Command:** `/speckit.product-forge.monitoring-setup`
**Trigger:** after Phase 9.
**Output:** `features/{slug}/monitoring/dashboard.json`, `alerts.yml`, `slo.md`.
**Gate:** user confirms artifacts before ship.

### Phase 9B: Experiment Design (optional, conditional)

**Command:** `/speckit.product-forge.experiment-design`
**Trigger:** `flags/registry.yml` has a flag with `experiment: true`.
**Output:** `features/{slug}/experiment/experiment-design.md` + `experiment.yml`.
**Gate:** user pre-registers hypothesis and decision rule before ship.

## Appendix B — Cross-cutting commands added in v1.5.0

### Portfolio

**Command:** `/speckit.product-forge.portfolio`
**Output:** `features/_portfolio/portfolio.md` (feature table, file-conflict matrix, dependency graph, suggested merge order).
**Read-only.** Runnable any time.

### Backfill

**Command:** `/speckit.product-forge.backfill`
**Brown-field entry.** Creates `features/<slug>/` from existing code with `backfilled: true` on status file and a gaps-report.

### Feature Flag Cleanup

**Command:** `/speckit.product-forge.feature-flag-cleanup`
**Output:** `features/_portfolio/flag-cleanup-{date}.md` with removal recipes for stale flags.
**Read-only in v1.5.0** (`--apply` reserved for a later wave).

## Appendix C — Feature modes (v1.5.0)

| Mode | Active phases | Excluded phases |
|------|---------------|-----------------|
| `lite` | problem-discovery (opt), product-spec, plan, implement, verify | everything else → `status: "not_applicable"` |
| `standard` | all phases per the matrix above | — |
| `v-model` | standard + V-Model artifact phases via `speckit:v-model-*` | — |

See [`docs/policy.md §4`](./policy.md#4-feature-modes-e1) for mode
selection, escalation triggers, and deselection rules.
