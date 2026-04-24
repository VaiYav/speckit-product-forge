# Product Forge — File Structure Reference

Every Product Forge feature lives in a self-contained directory under `features/`.
All documents within a feature are cross-linked via README.md index files.

---

## Feature Directory Layout

```
features/
└── {feature-slug}/                          ← One folder per feature
    │
    ├── README.md                            ← 🗂️ Feature root index (all phases + links)
    ├── .forge-status.yml                    ← 📊 Phase tracker (read by all commands)
    │
    ├── research/                            ← Phase 1 artifacts
    │   ├── README.md                        ← Research index + executive summary
    │   ├── competitors.md                   ← [MANDATORY] Competitor analysis
    │   ├── ux-patterns.md                   ← [MANDATORY] UX/UI best practices
    │   ├── codebase-analysis.md             ← [MANDATORY] Integration points
    │   ├── tech-stack.md                    ← [OPTIONAL] Library recommendations
    │   └── metrics-roi.md                   ← [OPTIONAL] Business impact
    │
    ├── product-spec/                        ← Phase 2 artifacts
    │   ├── README.md                        ← Spec index + document map
    │   ├── product-spec.md                  ← Main PRD document
    │   │
    │   ├── user-journey.md                  ← User flows (single file)
    │   │   OR                               ← OR decomposed (large features):
    │   ├── user-journey-{flow-name}.md      ← One file per major flow
    │   ├── user-journey-{flow-name}.md
    │   │
    │   ├── wireframes.md                    ← Wireframes (single .md file)
    │   │   OR                               ← OR:
    │   ├── wireframe-{screen}.html          ← One HTML file per screen (basic)
    │   │   OR                               ← OR:
    │   └── wireframes/                      ← Folder for multi-screen HTML wireframes
    │       ├── index.html                   ← Navigation hub
    │       ├── wireframe-{screen-1}.html
    │       └── wireframe-{screen-2}.html
    │
    │   ├── metrics.md                       ← [OPTIONAL] KPIs and success criteria
    │   │
    │   └── mockups/                         ← [OPTIONAL] High-fidelity HTML mockups
    │       ├── index.html                   ← Navigation hub (links all screens)
    │       ├── mockup-{screen-1}.html
    │       └── mockup-{screen-2}.html
    │
    ├── spec.md                              ← Phase 4: SpecKit specification
    ├── plan.md                              ← Phase 5: Technical plan (SpecKit)
    ├── tasks.md                             ← Phase 5B: Task breakdown (SpecKit)
    ├── review.md                            ← Phase 3: Revalidation log
    ├── pre-impl-review.md                   ← Phase 5C: Design + architecture + risk review [NEW v1.3]
    ├── implementation-log.md                ← Phase 6: Progressive verification log [NEW v1.3]
    ├── code-review.md                       ← Phase 6B: Multi-agent code review [NEW v1.3]
    ├── verify-report.md                     ← Phase 7: Verification report
    │
    ├── testing/                             ← Phase 8A artifacts [OPTIONAL]
    │   ├── test-plan.md                     ← Master test plan (entry/exit criteria, run commands)
    │   ├── test-cases.md                    ← All test cases (TC-SMK/E2E/API/REG-NNN)
    │   ├── env.md                           ← Test credentials (added to .gitignore)
    │   ├── playwright-results/              ← Screenshot + trace files (gitignored)
    │   └── playwright-tests/
    │       ├── playwright.config.ts
    │       ├── {slug}-smoke.spec.ts         ← TC-SMK-NNN cases
    │       ├── {slug}-e2e.spec.ts           ← TC-E2E-NNN cases
    │       ├── {slug}-api.spec.ts           ← TC-API-NNN cases (if API tested)
    │       └── {slug}-regression.spec.ts    ← TC-REG-NNN cases
    │
    ├── bugs/                                ← Phase 8B artifacts [OPTIONAL]
    │   ├── README.md                        ← Bug dashboard (P0–P4 counts, open/fixed/deferred)
    │   └── BUG-NNN.md × N                  ← One file per bug found during test run
    │
    ├── test-report.md                       ← Phase 8B: Final test report
    ├── release-readiness.md                 ← Phase 9: Pre-ship readiness checklist [NEW v1.3]
    ├── retrospective.md                     ← Post-launch retrospective
    │
    ├── sync-report.md                       ← Cross-cutting: Latest sync-verify report [NEW v1.3]
    ├── sync-report.json                     ← Cross-cutting: Machine-readable sync data [NEW v1.3]
    ├── change-log.md                        ← Cross-cutting: Change request history [NEW v1.3]
    └── backlog.md                           ← Deferred changes for v2 [NEW v1.3, if any CRs deferred]
```

---

## Decomposition Rules

Product Forge automatically suggests decomposition when documents would be too large.
The decomposition threshold is `max_tokens_per_doc` in config (default: 4000 tokens ≈ 3000 words).

| Document | When to Decompose | How |
|----------|------------------|-----|
| `user-journey.md` | > 2 distinct user flows, or large feature | One `.md` file per flow |
| `wireframes.md` | > 3 screens, or HTML detail requested | One `.html` file per screen in `wireframes/` |
| `mockups/` | Always decomposed when > 1 screen | One `.html` per screen + `index.html` |
| `product-spec.md` | Almost never — keep as single source of truth | Use sections/headers instead |

---

## Cross-linking Convention

All documents use **relative links**. Every generated document includes a navigation header:

```markdown
> Related: [Product Spec](./product-spec.md) | [User Journey](./user-journey.md) | [Research →](../research/README.md)
```

HTML files include an in-page navigation bar linking sibling screens.

---

## .forge-status.yml Schema (v2)

```yaml
schema_version: 2                      # schema version for migration detection
feature: "feature-slug"               # kebab-case feature identifier
created_at: "2026-03-28"              # ISO date
phases:
  problem_discovery: pending          # Phase 0 — optional
  research: pending                   # pending | in_progress | completed | skipped | completed_with_known_issues
  product_spec: pending
  revalidation: pending               # uses "approved" instead of "completed"
  bridge: pending
  plan: pending                       # Phase 5 — technical plan
  tasks: pending                      # Phase 5B — task breakdown
  pre_impl_review: pending            # Phase 5C — design + arch + risk [NEW v1.3]
  implement: pending                  # Phase 6 — implementation
  code_review: pending                # Phase 6B — multi-agent review [NEW v1.3]
  verify: pending                     # Phase 7 — full traceability verification
  test_plan: pending                  # Phase 8A — optional
  test_run: pending                   # Phase 8B — optional
  release_readiness: pending          # Phase 9 — optional [NEW v1.3]
  retrospective: pending              # Post-launch [NEW v1.3]
speckit_mode: ""                      # "classic" | "v-model" — set in Phase 4
testing:                              # populated after Phase 8B
  final_pass_rate: ""                 # e.g. "94%"
  bugs_found: 0
  bugs_fixed: 0
  bugs_deferred: 0
  test_runs_total: 0
gates: []                             # audit trail — see Gate Entry schema below [NEW v1.3]
sync_runs:                            # sync-verify history [NEW v1.3]
  last_run: ""                        # ISO timestamp of last sync-verify
  total_runs: 0
  last_drift_count: 0
  last_critical_count: 0
  last_verdict: ""                    # CONSISTENT | DRIFT DETECTED | CRITICAL DRIFT
change_requests: []                   # CR-NNN references [NEW v1.3]
# --- Phase-specific extension blocks (populated by supporting commands) ---
problem:                              # populated by problem-discovery (Phase 0)
  statement: ""
  severity: ""
  validation: ""
  go_decision: ""
research_dimensions:                  # populated by research (Phase 1)
  competitors: ""
  ux_patterns: ""
  codebase: ""
  tech_stack: ""
  metrics_roi: ""
input_richness_score: 0
implement:                            # populated by implement (Phase 6)
  tasks_completed: 0
  tasks_total: 0
  progressive_checkpoints: 0
  progressive_warnings: 0
  progressive_critical: 0
api_docs:                             # populated by api-docs command
  generated: false
  openapi_path: ""
  consistency_drift: 0
security:                             # populated by security-check command
  run: false
  critical: 0
  high: 0
  verdict: ""
tracking:                             # populated by tracking-plan command
  generated: false
  events_count: 0
  funnels_count: 0
retrospective:                        # populated by retrospective command
  date: ""
  days_post_launch: 0
  research_accuracy: ""
last_updated: "2026-03-28T10:00:00"   # ISO timestamp
```

### Phase State Values

| Value | Meaning |
|-------|---------|
| `pending` | Phase not yet started |
| `in_progress` | Phase currently executing |
| `completed` | Phase finished successfully |
| `skipped` | Phase intentionally skipped by user |
| `approved` | Phase approved (used specifically by `revalidation`) |
| `completed_with_known_issues` | Phase completed but with documented issues (used by `test_run`, `verify`) |

> **Note:** Supporting commands (`api-docs`, `security-check`, `tracking-plan`) also write
> completion status to `phases:` using their own keys (`api_docs`, `security_check`, `tracking_plan`).
> These are not part of the main lifecycle flow but are tracked for status reporting.

### Gate Entry Schema (within `gates:` array)

```yaml
- phase: "research"                   # phase name
  decision: "approved"                # approved | approved_with_conditions | revised | skipped | aborted
  timestamp: "2026-03-28T14:00:00"    # ISO timestamp
  notes: ""                           # user's reasoning (optional)
  conditions: []                      # conditions attached to approval
  sync_result: "clean"                # quick sync result: clean | N_critical | N_warning
```

### Change Request Entry Schema (within `change_requests:` array)

```yaml
- id: "CR-001"
  title: "Add notification sound selection"
  status: "accepted"                  # accepted | deferred | rejected
  timestamp: "2026-03-29T10:00:00"
  artifacts_affected: 3
  tasks_added: 2
  phase_rollback: null                # phase name or null
```

---

## review.md Schema

```markdown
# Review Log: {Feature Name}

> Feature: {slug} | Status: OPEN | APPROVED
> Started: {date}

## Current Status: UNDER REVIEW | APPROVED

## Revision History

## Revision #1 — {date}
**User feedback:** > {verbatim}
**Changes applied:** | File | Type | Description |
**Agent notes:** {notes}

---

## ✅ APPROVED — {date}
**Approved after {N} revision(s)**
**Final document inventory:** | Document | Lines | Last Modified |
**Status: LOCKED**
```

---

## verify-report.md Schema

```markdown
# Verification Report: {Feature}

## Summary
| Status | Count |
| ❌ CRITICAL | N |
| ⚠️ WARNING  | N |
| ✅ PASSED   | N |

**Overall verdict:** PASS | PASS WITH WARNINGS | FAIL

## Layer 1: Code ↔ Tasks
## Layer 2: Code ↔ Plan
## Layer 3: User Stories ↔ Implementation
## Layer 4: spec.md ↔ product-spec.md Drift
## Layer 5: Research Alignment
## Layer 6: Document Integrity

## Critical Issues (if any)
## Warnings (if any)
## Traceability Matrix
## Conclusion
```

---

## BUG-NNN.md Schema

```markdown
# BUG-{NNN}: {short title}

> Severity: P{0-4} | Status: 🔴 Open | ✅ Verified | ⚠️ Deferred
> Test Run: #{N} | Date: {date}
> Test Case: {TC-ID}

## Description
{Clear one-sentence description of what's wrong}

## Steps to Reproduce
1. {step}
2. {step}

## Expected Behavior
{What should happen per acceptance criteria}
> AC Reference: {US-NNN} — {AC text from spec.md}

## Actual Behavior
{What actually happened}

## Evidence
- Screenshot: `testing/playwright-results/{name}.png`
- Trace: `testing/playwright-results/{name}.zip`
- Error: `{error message / stack trace excerpt}`

## Gap Analysis
- [ ] Implementation bug (code doesn't match spec — fix code)
- [ ] Spec gap (spec is ambiguous — needs clarification)
- [ ] Test issue (test is wrong — fix test)
- [ ] Environment issue (test env problem — not a product bug)

## Fix Applied
{Filled after fix — what was changed, which files}

## Retest Result
{PASS / FAIL / BLOCKED}
```

---

## test-report.md Schema

```markdown
# Test Report: {Feature Name}

> Test Run: #{N} | Date: {date}
> Result: ✅ PASS | ⚠️ PASS WITH KNOWN ISSUES | ❌ FAIL

## Executive Summary
{2-3 sentences: what was tested, overall outcome, key stats}

## Results Summary
| Type | Pass | Fail | Skip | Total | Pass Rate |
|------|------|------|------|-------|-----------|
| Smoke | {N} | {N} | {N} | {N} | {%%} |
| E2E | {N} | {N} | {N} | {N} | {%%} |
| API | {N} | {N} | {N} | {N} | {%%} |
| Regression | {N} | {N} | {N} | {N} | {%%} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{%%}** |

## Story Coverage
| Story | Priority | Test Cases | Result |
|-------|----------|-----------|--------|

## Bugs Summary
| ID | Title | Severity | Status |
|----|-------|----------|--------|

## Spec Changes Applied During Testing
## Known Issues / Deferred Bugs
## Conclusion
## Traceability
Research → Product Spec → spec.md → Plan → Tasks → Code → Tests → Bugs → Fixes → Verified
```

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Feature directory | `kebab-case` | `push-notification-preferences` |
| User journey files | `user-journey-{flow}.md` | `user-journey-settings.md` |
| Wireframe files | `wireframe-{screen}.html` | `wireframe-home-screen.html` |
| Mockup files | `mockup-{screen}.html` | `mockup-settings-panel.html` |
| Feature slug in YAML | `kebab-case` | `push-notification-preferences` |
| User story IDs | `US-NNN` (3 digits) | `US-001`, `US-012` |
| Functional req IDs | `FR-NNN` | `FR-001`, `FR-012` |
| Smoke test case IDs | `TC-SMK-NNN` | `TC-SMK-001` |
| E2E test case IDs | `TC-E2E-NNN` | `TC-E2E-005` |
| API test case IDs | `TC-API-NNN` | `TC-API-003` |
| Regression test IDs | `TC-REG-NNN` | `TC-REG-002` |
| Bug IDs | `BUG-NNN` (3 digits) | `BUG-001`, `BUG-012` |
| Change request IDs | `CR-NNN` (3 digits) | `CR-001`, `CR-003` |
| Drift finding IDs | `DRIFT-NNN` (3 digits) | `DRIFT-001`, `DRIFT-015` |
| Code review finding IDs | `REV-NNN` (3 digits) | `REV-001`, `REV-042` |
| Design finding IDs | `D-NNN` | `D-001`, `D-005` |
| Architecture finding IDs | `A-NNN` | `A-001`, `A-003` |
| Risk IDs | `R-NNN` | `R-001`, `R-008` |
| Task IDs | `T-NNN` (3 digits) | `T-001`, `T-042` |
| Architecture Decision Record IDs | `ADR-NNN` | `ADR-001`, `ADR-005` |

---

## Appendix — File layout added in v1.5.0

New directories and files that appear under `features/<slug>/` depending
on which optional phases ran:

```
features/
├── _portfolio/                           ← cross-feature outputs
│   ├── portfolio.md                      ← `/portfolio` report
│   └── flag-cleanup-YYYY-MM-DD.md        ← `/feature-flag-cleanup` reports
├── _archived/                            ← archived features (future wave)
└── <slug>/
    ├── .forge-status.yml                 ← v3 schema (see docs/schema/)
    ├── .forge-status.yml.lock            ← transient state lock (runtime.md §2)
    ├── research/digest.md                ← [v1.5] phase digest (A4)
    ├── product-spec/digest.md            ← [v1.5] phase digest (A4)
    ├── plan/digest.md                    ← [v1.5] phase digest (A4)
    ├── tasks/digest.md                   ← [v1.5] phase digest (A4)
    ├── implement/digest.md               ← [v1.5] phase digest (A4)
    ├── verify/digest.md                  ← [v1.5] phase digest (A4)
    ├── failures/T-NNN.md                 ← [v1.5] per-failed-task logs
    ├── i18n/                             ← [v1.5] Phase 4.5 harvest
    │   ├── keys.yml
    │   └── report.md
    ├── migrations/                       ← [v1.5] Phase 5.5 migration-plan
    │   ├── migration-plan.md
    │   ├── forward.sql
    │   ├── rollback.sql
    │   ├── validation.sql
    │   ├── backfill.md                   ← only if expand–migrate–contract
    │   └── risk-matrix.md
    ├── flags/registry.yml                ← [v1.5] Phase 9 output
    ├── monitoring/                       ← [v1.5] Phase 9 + 9.5
    │   ├── dashboard.json
    │   ├── alerts.yml
    │   └── slo.md
    ├── experiment/                       ← [v1.5] Phase 9B
    │   ├── experiment-design.md
    │   └── experiment.yml
    └── gaps-report.md                    ← [v1.5] only for backfilled features
```

Project-level new files:

```
.product-forge/
├── config.yml                            ← project config (existing)
└── lessons.md                            ← [v1.5] append-only learning log
scripts/                                  ← [v1.5]
├── migrate-status-v2-to-v3.js            ← stamps schema_version: 3 lazily
├── acquire-lock.sh                       ← state-lock helpers (runtime.md §2.7)
└── release-lock.sh
```

Banner rule: every artifact written by `/backfill` carries a
`BACKFILLED ARTIFACT` banner at the top of the file.
