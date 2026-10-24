> Template for `verify-report.md` — written by `verify-full` Step 4.

Status markers follow the [interaction legend](../interaction.md#4-rules).
`CRITICAL-NNN` / `WARNING-NNN` are in-document labels; the same findings go to
`gate-review.md` as `F-NNN` (see the command's Step 4).

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
| ⏭ SKIPPED  | {N} |

**Overall verdict:** {PASS / PASS WITH WARNINGS / FAIL}

---

## Layer 1: Code ↔ Tasks

| Check | Status | Finding |
|-------|--------|---------|
| All tasks have verifiable code | ✅/⚠️/❌ | {detail} |
| No unchecked tasks | ✅/⚠️/❌ | {detail} |
| Task count matches implementation scope | ✅/⚠️/❌ | {detail} |

CODE_TASKS_COVERAGE: {ratio of rows whose tasks all have code}

---

## Layer 2: Code ↔ Plan

| Planned Component | Implemented | Notes |
|------------------|-------------|-------|
| {component} | ✅/❌ | {path or note} |

---

## Layer 3: User Stories ↔ Implementation

| Story | Priority | Task Coverage | Test Coverage | AC Measurability | Judge (if on) | Status |
|-------|----------|---------------|---------------|------------------|---------------|--------|
| US-001: {title} | Must | ✅ | ✅/⚠️ | executable | — | ✅ PASS |
| US-002: {title} | Must | ✅ | ❌ | judgeable | pass/weak/fail | ⚠️ WARN |
| US-003: {title} | Must | ✅ | ✅ | unmeasurable | — | ❌ CRIT |

> **AC Measurability:** `executable` (a test/assertion decides it),
> `judgeable` (subjective — judged only when `verify.ac_judge: true`), or
> `unmeasurable` (neither → CRITICAL, routed to a spec-tightening delta).

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

| Contract (API-) | BE impl | FE call | Shape match | oasdiff (if on) | Status |
|-----------------|---------|---------|-------------|-----------------|--------|
| API-savePrefs | ✅ | ✅ | ✅ | no breaking | ✅ |

> **oasdiff** column populated only when `contract_differ: oasdiff`:
> `no breaking` / `BREAKING: {change}` / `non-breaking: {change}` / `SKIPPED (oasdiff not installed)`.

## Layer 10: Doc ↔ Code Reconciliation

| Item | Documented | In code | Provenance (%h,%an) | Task match | Status |
|------|-----------|---------|---------------------|------------|--------|
| FR-003 | ✅ | ✅ | — | — | ✅ |
| {orphan code path} | ❌ | ✅ | `a1b2c3d,Jane Dev` | T014 | ⚠️ doc-orphan |
| {orphan code path} | ❌ | ✅ | `e4f5g6h,Sam Eng` | none | ⚠️ out-of-band → delta |

> **Provenance** from `git log -1 --format=%h,%an`; **Task match**
> reverse-indexes the SHA against `task_log[].commit_sha`. Rows with `none` are
> routed to the carrier below as `ADD FR-NNN` candidates.

## Layer 11: Constitution ↔ Code

| Mandated pattern (constitution §) | Probe | Status |
|-----------------------------------|-------|--------|
| {e.g. circuit-breaker on external calls (§3.2)} | grep wrapper symbol in new code | ✅ / ❌ CRITICAL |
| {e.g. event naming convention (§4.1)} | grep emitted event names | ⚠️ WARNING |

> N/A when no `constitution_path` file exists. Reconcile with Layer 10 / security
> so one violation isn't double-counted; cite the constitution section.

### Suggested canonical-spec updates

> Drift between the canonical spec and observed code that `spec-merge` should
> reconcile. One row per proposed delta; `spec-merge` consumes this section.

| FR / domain | Current canonical text | Observed-from-code behavior | Proposed delta |
|-------------|------------------------|-----------------------------|----------------|
| FR-003 | {what the spec says} | {what the code actually does} | MODIFY FR-003: {proposed change} |
| {domain} | {none — undocumented} | {observed behavior} | ADD FR-NNN: {proposed addition} |

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

Rendered directly from `traceability.yml` rows (live-schema columns):

| req | story | journeys | frs | tasks | code | tests | events | status |
|-----|-------|----------|-----|-------|------|-------|--------|--------|
| REQ-001 | US-001 | JRN-001 | FR-001, FR-002 | T012, T013 | ✅ | TC-E2E-003 | EVT-prefs_saved | verified |
| — | US-002 | JRN-002 | FR-003 | T014 | ✅ | ⚠️ none | — | implemented |

> `req` is populated only for V-Model/backfill rows; the standard forward flow
> keys on `frs` and leaves `req` null (`—`).

---

## Conclusion

{PASS}: All critical checks passed. Feature is fully traced from research through to code.
{OR}
{PASS WITH WARNINGS}: {N} warnings found. Review recommended but no blockers.
{OR}
{FAIL}: {N} critical issues must be resolved. Run `/speckit.product-forge.verify-full` again after fixes.
```
