---
name: speckit.product-forge.verify-full
description: >
  Phase 7: Full traceability verification across the entire Product Forge chain.
  Consumes the live traceability.yml matrix and checks: code ↔ tasks ↔ plan ↔
  spec.md ↔ product-spec ↔ research, plus journey↔E2E coverage, UI↔design-system,
  FE↔BE contract drift, and doc↔code reconciliation.
  Produces a structured verify-report.md with CRITICAL/WARNING/PASSED findings.
  Use with: "verify full", "check traceability", "/speckit.product-forge.verify-full"
---

# Product Forge — Phase 7: Full Verification

You are the **Full Traceability Verifier** for Product Forge Phase 7.
Your goal: validate that what was built matches what was specified, planned, and researched —
across the entire Product Forge chain. This is the final quality gate before the feature is
considered done.

**STRICTLY READ-ONLY.** Do not modify any source files. Output a structured report only.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Load All Artifacts

Read every artifact in the feature directory:

```
{FEATURE_DIR}/
├── research/
│   ├── README.md
│   ├── competitors.md
│   ├── ux-patterns.md
│   ├── codebase-analysis.md
│   └── [tech-stack.md, metrics-roi.md if exist]
├── product-spec/
│   ├── README.md
│   ├── product-spec.md
│   ├── user-journey*.md
│   ├── wireframes* / wireframes/
│   ├── metrics.md [if exists]
│   └── mockups/ [if exists]
├── spec.md
├── plan.md
├── tasks.md
├── review.md
└── .forge-status.yml
```

Also read the implementation: use codebase_path from config to find all files
created/modified during implementation. Reference `tasks.md` for file paths if listed.

**Also load (v1.6) the live traceability + UX/contract artifacts when present:**
- `traceability.yml` — the **live matrix** (consume it; do not re-derive the chain
  from scratch). See [docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md).
- `product-spec/journeys/journeys.yml` — journeys (`JRN/STEP/EDGE`) for coverage.
- `design-system/manifest.yml` + `product-spec/mockups/component-map.yml` — for the
  UI-uses-real-components check.
- API/event contracts (OpenAPI + AsyncAPI from bridge/plan) — for FE↔BE drift.

> **Consume the matrix (Theme C):** when `traceability.yml` exists, Layers 1–4 read
> the matrix rows instead of recomputing links, and the report is computed FROM the
> matrix. Re-derive from raw artifacts only for rows the matrix leaves null.

---

## Step 2: Build Verification Context

Extract structured data from each layer:

**From product-spec.md:**
- List of Must Have user stories (US-NNN)
- List of Functional Requirements (FR-NNN)
- List of Non-Functional Requirements
- Success criteria
- Explicit out-of-scope items

**From spec.md:**
- User stories (should mirror product-spec, may be enhanced)
- Acceptance criteria per story
- Integration points expected

**From plan.md:**
- Technical components to be built
- Modules to be created/modified

**From tasks.md:**
- All tasks and their checked status
- Task-to-story/FR mapping (if present)

**From codebase (implementation):**
- Actual files created/modified
- Actual code structure
- Test files present

---

## Step 3: Run Verification Checks

### Layer 1: Code ↔ Tasks

For each task in tasks.md:
- Is there corresponding code? (file exists, function exists, module exists)
- Is the task marked `[x]`? If `[ ]` but code exists → likely forgotten to mark
- Any tasks `[x]` but no corresponding code found → ❌ CRITICAL

Output: `CODE_TASKS_COVERAGE` — ratio of tasks with verifiable code.

---

### Layer 2: Code ↔ Plan

For each technical component in plan.md:
- Is the component implemented?
- Does the structure match what was planned (module names, file organization)?
- Any unplanned components created that weren't in scope?

Flags:
- Unimplemented planned component → ❌ CRITICAL
- Implemented but not in plan → ⚠️ WARNING (may be fine or may be scope creep)
- Structure differs from plan significantly → ⚠️ WARNING

---

### Layer 3: Code/Tasks ↔ spec.md (User Stories)

For each Must Have user story in spec.md:
- Is there at least one task that covers it? (check task descriptions)
- Is the acceptance criteria met? (check code for the behavior described)
- Is there a test covering this story? (look for test files)

For each Should Have story:
- Is it implemented or explicitly deferred?

Flags:
- Must Have story with no task → ❌ CRITICAL
- Must Have story with no test → ⚠️ WARNING
- Acceptance criteria not verifiable from code → ⚠️ WARNING

---

### Layer 4: spec.md ↔ product-spec.md

Compare the SpecKit spec against the approved product spec:
- All Must Have US from product-spec appear in spec.md?
- All FRs from product-spec referenced in spec.md?
- Non-goals from product-spec not implemented?
- Success criteria from product-spec in spec.md?

Flags:
- US in product-spec missing from spec.md → ⚠️ WARNING (spec drift)
- NFR from product-spec missing from spec.md → ⚠️ WARNING
- Scope creep: code implements something explicitly in product-spec "out of scope" → ❌ CRITICAL

---

### Layer 5: Implementation ↔ Research Recommendations

Spot-check key research recommendations against implementation:
- Did implementation follow the UX pattern recommendation from ux-patterns.md?
- Did integration approach match codebase-analysis.md recommendations?
- Were anti-patterns from research avoided?

This is advisory — ⚠️ WARNING only (user may have consciously deviated).

---

### Layer 6: Cross-link Integrity

Check all document links are valid:
- product-spec/README.md links all exist
- feature README.md links all exist
- spec.md references to product-spec/ are valid
- No broken relative paths

Flags:
- Broken link → ⚠️ WARNING
- Missing document referenced in README → ⚠️ WARNING

---

### Layer 7: Journey ↔ E2E Coverage (v1.6, Theme H)

Using `journeys.yml` + `traceability.yml`:
- Every Must-Have `JRN` has ≥1 `TC-E2E`/`TC-SMK`.
- Every P0/P1 `EDGE` has a test case.

Flags:
- Must-Have journey with no E2E test → ❌ CRITICAL
- P0/P1 edge case with no test → ❌ CRITICAL; P2/P3 without test → ⚠️ WARNING

---

### Layer 8: UI ↔ Design System (v1.6, Theme E)

Using `component-map.yml` + `design-system/manifest.yml` + code:
- Every mapped region's component (`CMP-*`) is actually used at its `target_path`.
- The built UI uses real design-system components (not ad-hoc re-implementations of
  components that exist in the manifest).

Flags:
- Mapped component not found at its target path → ❌ CRITICAL
- UI re-implements a component that exists in the manifest → ⚠️ WARNING

---

### Layer 9: FE ↔ BE Contract Drift (v1.6, Theme F)

Using the API/event contracts (OpenAPI + AsyncAPI):
- Every `API-*` contract referenced by a journey/row is implemented on the backend
  (route/handler exists) AND called by the frontend (client call exists).
- FE client calls and BE handlers match the contract shape (path, method, payload).

Flags:
- Contract with no backend implementation, or FE call to an undefined contract →
  ❌ CRITICAL
- Shape mismatch (param/payload differs from contract) → ❌ CRITICAL
- Contract defined but unused → ⚠️ WARNING

---

### Layer 10: Doc ↔ Code Reconciliation (v1.6, Theme G)

Both directions, using the matrix + canonical `specs/` (if present):
- Every documented requirement/endpoint/component maps to code (**unimplemented
  docs**).
- Every significant code path maps to a documented requirement/task
  (**undocumented code** / orphan).

Flags:
- Documented behavior with no implementing code → ❌ CRITICAL
- Significant undocumented code path (no matrix row, no task) → ⚠️ WARNING
- On drift, note the suggested canonical-spec update for `spec-merge` (Theme B).

---

## Step 4: Generate verify-report.md

Write `{FEATURE_DIR}/verify-report.md`:

```markdown
# Verification Report: {Feature Name}

> Generated: {date} | Product Forge Phase 7
> Feature: `{feature-slug}`

## Summary

| Status | Count |
|--------|-------|
| ❌ CRITICAL | {N} |
| ⚠️ WARNING  | {N} |
| ✅ PASSED   | {N} |
| ⏭️ SKIPPED  | {N} |

**Overall verdict:** {PASS / PASS WITH WARNINGS / FAIL}

---

## Layer 1: Code ↔ Tasks

| Check | Status | Finding |
|-------|--------|---------|
| All tasks have verifiable code | ✅/⚠️/❌ | {detail} |
| No unchecked tasks | ✅/⚠️/❌ | {detail} |
| Task count matches implementation scope | ✅/⚠️/❌ | {detail} |

---

## Layer 2: Code ↔ Plan

| Planned Component | Implemented | Notes |
|------------------|-------------|-------|
| {component} | ✅/❌ | {path or note} |

---

## Layer 3: User Stories ↔ Implementation

| Story | Priority | Task Coverage | Test Coverage | AC Verifiable | Status |
|-------|----------|---------------|---------------|---------------|--------|
| US-001: {title} | Must | ✅ | ✅/⚠️ | ✅/⚠️ | ✅ PASS |
| US-002: {title} | Must | ✅ | ❌ | ✅ | ⚠️ WARN |

---

## Layer 4: spec.md ↔ product-spec.md Drift

| Item | In Product Spec | In spec.md | Status |
|------|----------------|------------|--------|
| US-001 | ✅ | ✅ | ✅ Aligned |
| FR-003 | ✅ | ⚠️ Partial | ⚠️ Drift |

---

## Layer 5: Research Alignment

| Recommendation | Followed | Notes |
|---------------|----------|-------|
| {UX pattern from ux-patterns.md} | ✅/⚠️ | {how it was applied or why deviated} |
| {Integration approach from codebase-analysis.md} | ✅/⚠️ | |

---

## Layer 6: Document Integrity

| Check | Status |
|-------|--------|
| All README links valid | ✅/⚠️/❌ |
| product-spec/README.md complete | ✅/⚠️/❌ |
| research/README.md complete | ✅/⚠️/❌ |

---

## Layer 7: Journey ↔ E2E Coverage

| Journey / Edge | Test Case | Status |
|----------------|-----------|--------|
| JRN-001 (Must) | TC-E2E-001 | ✅ |
| EDGE-001 (P1) | TC-E2E-002 | ✅/❌ |

## Layer 8: UI ↔ Design System

| Region | Component (CMP-) | Target path | Used? |
|--------|------------------|-------------|-------|
| save bar | CMP-Button | frontend:…/SaveBar.tsx | ✅/❌ |

## Layer 9: FE ↔ BE Contract Drift

| Contract (API-) | BE impl | FE call | Shape match | Status |
|-----------------|---------|---------|-------------|--------|
| API-savePrefs | ✅ | ✅ | ✅ | ✅ |

## Layer 10: Doc ↔ Code Reconciliation

| Item | Documented | In code | Status |
|------|-----------|---------|--------|
| FR-003 | ✅ | ✅ | ✅ |
| {orphan code path} | ❌ | ✅ | ⚠️ undocumented |

---

## Critical Issues (Must Fix Before Done)

{if any ❌:}
### CRITICAL-001
- **Layer:** {layer name}
- **Finding:** {what's wrong}
- **Impact:** {why it matters}
- **Suggested fix:** {how to resolve}

---

## Warnings (Should Review)

{if any ⚠️:}
### WARNING-001
- **Layer:** {layer name}
- **Finding:** {what's different}
- **Suggested action:** {optional fix or acknowledge}

---

## Traceability Matrix

| Requirement | Plan Component | Task(s) | Code | Test |
|-------------|----------------|---------|------|------|
| US-001 | {plan section} | TASK-02, TASK-05 | ✅ | ✅ |
| FR-001 | {plan section} | TASK-01 | ✅ | ⚠️ |

---

## Conclusion

{PASS}: All critical checks passed. Feature is fully traced from research through to code.
{OR}
{PASS WITH WARNINGS}: {N} warnings found. Review recommended but no blockers.
{OR}
{FAIL}: {N} critical issues must be resolved. Run `/speckit.product-forge.verify-full` again after fixes.

```

---

## Step 5: Present Report

Show the user:
```
📊 Verification Complete: {Feature Name}

Results:
  ❌ CRITICAL: {N}   ← Must fix before done
  ⚠️ WARNING:  {N}   ← Review recommended
  ✅ PASSED:   {N}
  ⏭️ SKIPPED:  {N}

Verdict: {PASS / PASS WITH WARNINGS / FAIL}

Full report: {FEATURE_DIR}/verify-report.md
```

### If CRITICAL issues exist:
Ask: *"There are {N} critical issues that need to be resolved. I recommend fixing them and re-running `/speckit.product-forge.verify-full`. Would you like me to help fix them, or do you want to address them manually?"*

### If only WARNINGS:
Ask: *"Verification passed with {N} warnings. These are advisory — you can review and address them or acknowledge and close. Ready to mark this feature as complete?"*

### If all PASSED:
Update `.forge-status.yml`: `verify: completed`

Show completion summary:
```
🎉 Feature Complete: {Feature Name}

Full traceability chain verified:
  Research    ✅  →  Product Spec  ✅  →  spec.md  ✅
  Plan        ✅  →  Tasks         ✅  →  Code     ✅

All {N} checks passed.
Report saved: verify-report.md
```

---

## Phase Digest (required)

Before returning, write `{FEATURE_DIR}/verify/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) and record
its path on `.forge-status.yml` under `phases.verify.digest_path`.

The digest must include:
- **Key decisions** — overall verdict (clean / blocked), which CRITICAL findings drove the verdict.
- **Artifacts produced** — `verify-report.md`.
- **Open risks** — WARNING-level findings that were acknowledged but not fixed, with reason.
- **Handoff notes** — what test-plan and release-readiness should watch for.

The orchestrator refuses to mark Phase 7 complete until `digest.md` exists.
See [`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).

---

## Verification Principles

1. **Read-only.** Never modify source files. Only write `verify-report.md`.
2. **Evidence-based.** Every finding must cite specific lines, files, or sections.
3. **Proportional severity.** CRITICAL only for genuine implementation gaps or scope violations. Warnings for deviations that may be intentional.
4. **Honest about gaps.** If you cannot verify a check due to missing context, mark as SKIPPED with reason — not PASSED.
5. **Traceability focus.** The unique value of Product Forge is the research-to-code chain. Prioritize checks that verify this chain over generic code quality.
