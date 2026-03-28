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
    ├── tasks.md                             ← Phase 5: Task breakdown (SpecKit)
    ├── review.md                            ← Phase 3: Revalidation log
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
    └── test-report.md                       ← Phase 8B: Final test report
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

## .forge-status.yml Schema

```yaml
feature: "feature-slug"               # kebab-case feature identifier
created_at: "2026-03-28"              # ISO date
phases:
  research: pending                   # pending | in_progress | completed | skipped
  product_spec: pending
  revalidation: pending               # uses "approved" instead of "completed"
  bridge: pending
  plan_tasks: pending                 # covers both plan + tasks sub-phases
  implement: pending
  verify: pending
  test_plan: pending                  # optional — "skipped" if user declines Phase 8A
  test_run: pending                   # optional — "skipped" if user declines Phase 8B
speckit_mode: ""                      # "classic" | "v-model" — set in Phase 4
testing:                              # populated after Phase 8B
  final_pass_rate: ""                 # e.g. "94%"
  bugs_found: 0
  bugs_fixed: 0
  bugs_deferred: 0
  test_runs_total: 0
last_updated: "2026-03-28T10:00:00"   # ISO timestamp
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
