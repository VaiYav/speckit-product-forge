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
    ├── design-system/                       ← [IF UI] harvested, read-only (v1.6)
    │   ├── manifest.yml                     ← components (CMP-*) + tokens + selectors
    │   └── manifest.md                      ← human-readable companion
    │
    ├── traceability.yml                     ← [v1.6] live matrix (REQ→US→JRN→…→TEST→EVT)
    │
    ├── product-spec/                        ← Phase 2 artifacts
    │   ├── README.md                        ← Spec index + document map
    │   ├── product-spec.md                  ← Main PRD document
    │   │
    │   ├── journeys/                        ← [v1.6] structured journeys (E2E source of truth)
    │   │   ├── journeys.yml                 ← authoritative machine-readable index
    │   │   ├── JRN-001-{slug}.md            ← one file per journey (JRN/STEP/EDGE)
    │   │   └── JRN-002-{slug}.md
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
    │   └── mockups/                         ← [IF UI] clickable design-system prototype
    │       ├── index.html                   ← clickable hub (links all screens)
    │       ├── mockup-{screen-1}.html       ← uses real CMP-* components + tokens
    │       ├── mockup-{screen-2}.html
    │       └── component-map.yml            ← [v1.6] region → CMP-* → code path
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
    │   ├── test-cases.md                    ← All test cases (TC-SMK/E2E/API/REG/UNIT/INT-NNN)
    │   ├── env.md                           ← Test credentials (added to .gitignore)
    │   ├── playwright-results/              ← Screenshot + trace files (gitignored)
    │   └── playwright-tests/
    │       ├── playwright.config.ts
    │       ├── {slug}-smoke.spec.ts         ← TC-SMK-NNN cases
    │       ├── {slug}-{journey}.spec.ts × N ← one per JRN (TC-E2E-NNN cases)
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

## Storage strategies (feature-root placement)

The tree above shows the **internal artifact tree** of a feature. That tree is
**invariant** — `research/`, `product-spec/journeys/`, `contracts/`,
`.forge-status.yml`, `testing/`, and every other path inside a feature are
byte-for-byte identical no matter where the feature root sits. The only thing a
storage strategy changes is **how a single `FEATURE_DIR` is placed under
`features_dir`**; everything below `FEATURE_DIR` is untouched.

The strategy is selected by the `storage_strategy` config key. It is additive:
the absent key resolves to `flat`, which is today's behavior exactly, and no
existing feature ever has to move.

| Strategy | Status | Feature root | Notes |
|----------|--------|--------------|-------|
| `flat` | **default** | `features/<slug>/` | Status quo. Every feature is an immediate child of `features_dir`; the filesystem enforces global slug uniqueness. Resolve is a direct join with no scan. |
| `domain-nested` | first-class (opt-in) | `features/<domain>/<slug>/` | One extra grouping level by area/team/surface. A single depth-tolerant discovery rule subsumes flat (depth 1) and the existing `_archived/<date-slug>` (depth 2); mixed flat + nested layouts coexist. Same slug in two domains is referenced as `<domain>/<slug>`. |
| `ddd` | active (opt-in) | `features/<context>/<slug>/` | Groups by bounded context mirroring `specs/<domain>/`, backed by a `features/domains.yml` registry (`slug: context`) for O(1) resolution. |
| `workspace` | active (opt-in, monorepo) | `features/<workspace>/<slug>/` | Each feature lives under its primary monorepo workspace (`scope.primary`); requires a `codebase.paths` block. Same on-disk depth as `domain-nested`. |

**`flat` layout** (default — the tree shown above):

```
features/
├── _portfolio/                 ← reserved namespace (cross-feature output)
├── _archived/                  ← reserved namespace (spec-merge archives, depth 2)
├── push-notification-prefs/    ← FEATURE_DIR (immediate child)
│   ├── .forge-status.yml       ← marks the feature root
│   └── …                       ← invariant internal tree
└── dark-mode-toggle/
    ├── .forge-status.yml
    └── …
```

**`domain-nested` layout** (first-class, opt-in via `storage_strategy: domain-nested`):

```
features/
├── _portfolio/                 ← reserved namespace (stays top-level)
├── _archived/                  ← reserved namespace (stays top-level)
├── notifications/              ← <domain> grouping folder
│   ├── push-notification-prefs/   ← FEATURE_DIR (depth 2)
│   │   ├── .forge-status.yml      ← marks the feature root
│   │   └── …                      ← invariant internal tree (unchanged)
│   └── digest-emails/
│       ├── .forge-status.yml
│       └── …
├── appearance/
│   └── dark-mode-toggle/
│       ├── .forge-status.yml
│       └── …
└── legacy-feature/             ← a pre-existing flat feature still resolves
    ├── .forge-status.yml          (legacy depth-1 fallback)
    └── …
```

**`ddd` layout** (opt-in via `storage_strategy: ddd`) — like `domain-nested`, but
the grouping folder is a DDD **bounded context** (mirroring `specs/<domain>/`)
and a `features/domains.yml` registry maps each slug → context for O(1)
resolution:

```
features/
├── _portfolio/                 ← reserved namespace
├── _archived/                  ← reserved (may be context-keyed: _archived/<context>/<date>-<slug>/)
├── domains.yml                 ← registry: `slug: context` (a FILE, skipped by enumerate)
├── ordering/                   ← <context>
│   ├── checkout-redesign/         ← FEATURE_DIR (depth 2)
│   │   ├── .forge-status.yml
│   │   └── …                      ← invariant internal tree
│   └── apply-coupon/
│       └── .forge-status.yml
└── billing/
    └── invoice-pdf/
        └── .forge-status.yml
```

**`workspace` layout** (opt-in via `storage_strategy: workspace`, monorepo only)
is identical in shape, with the grouping folder being a monorepo workspace
(`scope.primary`, from `codebase.paths`): `features/<workspace>/<slug>/`.

The reserved `_`-prefixed namespaces (`_portfolio/`, `_archived/`) stay
top-level under every strategy and are excluded from feature enumeration; the
`domains.yml` registry file (ddd) is likewise skipped. See
[runtime.md §12](./runtime.md#12-path-resolution-contract) for the normative
Path-Resolution Contract. A starter registry template lives at
[`docs/templates/domains.yml`](./templates/domains.yml).

---

## Decomposition Rules

Product Forge automatically suggests decomposition when documents would be too large.
The decomposition threshold is `max_tokens_per_doc` in config (default: 4000 tokens ≈ 3000 words).

| Document | When to Decompose | How |
|----------|------------------|-----|
| `journeys/` | always structured | `journeys.yml` (authoritative) + one `JRN-NNN-{slug}.md` per journey |
| `wireframes.md` | > 3 screens, or HTML detail requested | One `.html` file per screen in `wireframes/` |
| `mockups/` | Always decomposed when > 1 screen | One `.html` per screen + `index.html` |
| `product-spec.md` | Almost never — keep as single source of truth | Use sections/headers instead |

---

## Cross-linking Convention

All documents use **relative links**. Every generated document includes a navigation header:

```markdown
> Related: [Product Spec](./product-spec.md) | [Journeys](./journeys/) | [Research →](../research/README.md)
```

HTML files include an in-page navigation bar linking sibling screens.

---

## .forge-status.yml Schema (v3)

> This inline block is a readable overview. The canonical, authoritative schema
> is [docs/schema/forge-status-v3.schema.yml](./schema/forge-status-v3.schema.yml)
> (and the field catalog in [schema.md](./schema.md)); when the two differ, the
> canonical schema wins.

```yaml
schema_version: 3                      # schema version for migration detection
feature: "feature-slug"               # kebab-case feature identifier
created_at: "2026-03-28"              # ISO date
phases:
  problem_discovery: pending          # Phase 0 — optional
  research: pending                   # pending | in_progress | completed | skipped | not_applicable | completed_with_known_issues
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
api_docs_report:                      # populated by api-docs command (renamed from
  generated: false                    #   api_docs to avoid colliding with phases.api_docs)
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
| `skipped` | Optional phase intentionally skipped by user (skip-reason policy applies — policy.md §3) |
| `not_applicable` | Phase was never in scope for this feature (e.g. phases outside a lite/express map, or phases not run for a backfilled feature) — exempt from the skip-reason policy |
| `completed_with_known_issues` | Phase completed but with documented issues (written by `test_run`; see forge.md Phase 8B) |
| `approved` | Back-compat alias for `completed`, accepted specifically by `revalidation` |

> **Note:** Supporting and extension commands also write completion status to
> `phases:` using their own keys, alongside the core lifecycle phases. These are
> recognized in the canonical schema as supporting-command phase keys:
> `api_docs`, `security_check`, `tracking_plan` (supporting commands),
> `i18n_harvest`, `migration_plan`, `monitoring_setup`, `experiment_design`
> (extension phases), plus `design_system_harvest` and `spec_merge` (the v1.6
> Phase-2 helper and post-release living-spec merge). They are tracked for status
> reporting but are not part of the main gated flow. Their top-level
> instrumentation blocks use distinct names where a collision would otherwise
> arise — e.g. the `api-docs` command writes `phases.api_docs` (status) and the
> top-level `api_docs_report:` block (metrics), mirroring the `phases.tasks` ↔
> `task_log[]` split. See [docs/schema/forge-status-v3.schema.yml](./schema/forge-status-v3.schema.yml)
> for the authoritative phase-key set.

### Gate Entry Schema (within `gates:` array)

```yaml
- phase: "research"                   # phase name
  decision: "approved"                # approved | approved_with_conditions | revised | skipped | rolled_back | aborted
  timestamp: "2026-03-28T14:00:00"    # ISO timestamp
  notes: ""                           # user's reasoning (optional)
  conditions: []                      # conditions attached to approval
  sync_result: "clean"                # quick sync result: clean | N_critical | N_warning
  rolled_back_to: null                # required when decision == "rolled_back" (phase name to rewind to)
  reviewed_sha: ""                    # git SHA / artifact stamp the gate was reviewed against (W5-A2)
  risk: ""                            # gate risk class from scripts/gate-risk.js: low | medium | high (W5-A4)
```

> The canonical gate entry carries additional optional fields (`approvals`,
> `skip_reason`); see [docs/schema/forge-status-v3.schema.yml](./schema/forge-status-v3.schema.yml).

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
| Journey files | `JRN-NNN-{slug}.md` | `JRN-001-save-prefs.md` |
| Journey IDs | `JRN-NNN` / `STEP-NNN` / `EDGE-NNN` | `JRN-001`, `STEP-002`, `EDGE-001` |
| Component IDs | `CMP-{Name}` | `CMP-Button`, `CMP-Modal` |
| Contract IDs | `API-{name}` | `API-getPrefs`, `API-savePrefs` |
| Telemetry event IDs | `EVT-{name}` | `EVT-prefs_saved` |
| Wireframe files | `wireframe-{screen}.html` | `wireframe-home-screen.html` |
| Mockup files | `mockup-{screen}.html` | `mockup-settings-panel.html` |
| Feature slug in YAML | `kebab-case` | `push-notification-preferences` |
| Canonical requirement IDs | `REQ-NNN` (stable living-spec requirement in `specs/<domain>/spec.md`; root of the traceability chain — distinct from per-feature `FR-NNN`) | `REQ-001`, `REQ-012` |
| User story IDs | `US-NNN` (3 digits) | `US-001`, `US-012` |
| Functional req IDs | `FR-NNN` (per-feature functional requirement; derived from `REQ-NNN`) | `FR-001`, `FR-012` |
| Smoke test case IDs | `TC-SMK-NNN` | `TC-SMK-001` |
| E2E test case IDs | `TC-E2E-NNN` | `TC-E2E-005` |
| API test case IDs | `TC-API-NNN` | `TC-API-003` |
| Regression test IDs | `TC-REG-NNN` | `TC-REG-002` |
| Unit test case IDs | `TC-UNIT-NNN` | `TC-UNIT-001` |
| Integration test case IDs | `TC-INT-NNN` | `TC-INT-004` |
| Bug IDs | `BUG-NNN` (3 digits) | `BUG-001`, `BUG-012` |
| Change request IDs | `CR-NNN` (3 digits) | `CR-001`, `CR-003` |
| Drift finding IDs | `DRIFT-NNN` (3 digits) | `DRIFT-001`, `DRIFT-015` |
| Code review finding IDs | `REV-NNN` (3 digits) | `REV-001`, `REV-042` |
| Security finding IDs | `SEC-NNN` | `SEC-001`, `SEC-004` |
| Unified gate-finding IDs | `F-NNN` (the `- **F-NNN**` bold-bullet form is grepped verbatim by forge.md's auto-recommend pre-gate — preserve the format) | `F-001`, `F-042` |
| Design finding IDs | `D-NNN` | `D-001`, `D-005` |
| Architecture finding IDs | `A-NNN` | `A-001`, `A-003` |
| Risk IDs | `R-NNN` | `R-001`, `R-008` |
| Task IDs | `T0NN` (zero-padded, no hyphen; `TASK-NNN` accepted as alias) | `T001`, `T042` |
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
├── migrate-status-v2-to-v3.js            ← stamps schema_version: 3 lazily (depth-tolerant enumerate)
├── acquire-lock.sh                       ← state-lock helpers (runtime.md §2.7)
├── release-lock.sh
├── gate-risk.js                          ← [v1.6] {phase × risk} classifier for headless gates
├── validate-traceability.js             ← [v1.6] deterministic traceability validator
├── lib-paths.js                          ← [v1.6] Path-Resolution Contract resolve()/enumerate() (runtime.md §12)
└── lib-yaml.js                           ← [v1.6] shared zero-dep YAML subset parser
```

Banner rule: every artifact written by `/backfill` carries a
`BACKFILLED ARTIFACT` banner at the top of the file.

## Appendix — File layout added in v1.6.0

```
specs/                                    ← canonical source of truth (living spec)
└── <domain>/spec.md                      ← stable REQ-* requirements; merged by spec-merge

features/
├── _archived/<date>-<slug>/              ← completed changes archived by spec-merge
└── <slug>/
    ├── traceability.yml                  ← live matrix (REQ→US→JRN→FR→CMP→API→TASK→code→TEST→EVT)
    ├── design-system/                    ← harvested, read-only (UI features)
    │   ├── manifest.yml                  ← CMP-* components + tokens + selectors
    │   └── manifest.md
    ├── contracts/                        ← contract-first (bridge/plan), validated by api-docs
    │   ├── openapi.yaml                   ← HTTP endpoints (API-* ids)
    │   └── asyncapi.yaml                  ← events (API-* ids)
    ├── specs/<domain>/spec.md            ← delta spec for this change (ADDED/MODIFIED/REMOVED)
    └── product-spec/
        ├── journeys/journeys.yml + JRN-*.md   ← structured journeys (E2E source of truth)
        └── mockups/component-map.yml          ← region → CMP-* → code path
```

New `phases.<name>` keys on `.forge-status.yml`: `design_system_harvest` (Phase 2
helper, UI features), `spec_merge` (post-release living-spec merge). New
`feature_mode` value: `express`. See [schema.md](./schema.md).
