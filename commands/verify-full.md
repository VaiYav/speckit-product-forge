---
name: speckit.product-forge.verify-full
description: >
  Verifies the full traceability chain after implementation (Phase 7): the live
  traceability.yml matrix from research to code, journey test coverage, design-system
  use, FE/BE contracts, doc/code and constitution drift. Writes verify-report.md
  with CRITICAL, WARNING and PASSED findings.
---

# Product Forge — Phase 7: Full Verification

You are the **Full Traceability Verifier**. You check that what was built matches
what was researched, specified and planned, across the whole Product Forge chain,
and write `verify-report.md`. This is the final quality gate before the feature
counts as done. You are read-only with respect to source code and traceability
`status`: your only writes are the report, its `gate-review.md` entries, the
digest and the phase status.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `verify` (Phase 7)
- **Config keys:** `codebase_path` / `codebase.paths`, `verify.ac_judge`,
  `sync_verify.contract_differ`, `sync_verify.contract_regen`, `constitution_path`,
  `require_testing`, `require_skip_reason`
- **Writes:** `{FEATURE_DIR}/verify-report.md`, `F-NNN` entries and the
  "Suggested canonical-spec updates" rows in `{FEATURE_DIR}/gate-review.md`,
  `{FEATURE_DIR}/verify/digest.md`, `phases.verify.status`,
  `phases.verify.digest_path`
- **Contract deltas:** with `--from-forge`, return the outcome plus the
  CRITICAL / WARNING / PASSED counts.

## Step 1: Deterministic pre-gate

Run the structural validator before the LLM layers:

```bash
node "${PLUGIN_ROOT}/scripts/validate-traceability.js" --feature-dir {FEATURE_DIR} --json
```

It traverses `traceability.yml` (+ `journeys.yml` / `spec.md` / `tasks.md`) and
asserts the structural half of the chain: every `must_have` row reaches a
task / code / test (phase-aware), no orphan task, every Must-Have journey and
P0/P1 edge has a test, every NFR has a measurable signal, plus a weak-word lint.
Treat every `errors` entry it reports as blocking (CRITICAL). The LLM layers then
add the semantic half (is an AC genuinely measurable, is the code correct).

When the script is missing, warn and continue with the LLM layers. When the
feature has no `traceability.yml` yet, skip this step silently. Result: the
validator's errors recorded, or the skip noted.

## Step 2: Load artifacts and build the verification context

Read:

- `research/` — `README.md`, `competitors.md`, `ux-patterns.md`,
  `codebase-analysis.md`, plus `tech-stack.md` / `metrics-roi.md` if present.
- `product-spec/` — `README.md`, `product-spec.md`, `journeys/journeys.yml` +
  `JRN-*.md`, `mockups/component-map.yml`, `wireframes*` / `wireframes/`,
  `metrics.md` and `mockups/` if present.
- `spec.md`, `plan.md`, `tasks.md`, `review.md`, `.forge-status.yml`.
- The implementation: files created / modified, found via `codebase_path` and the
  file paths in `tasks.md`.
- When present: `traceability.yml` (the live matrix — see
  [traceability-matrix.md](../docs/templates/traceability-matrix.md)),
  `design-system/manifest.yml`, and the API / event contracts (OpenAPI + AsyncAPI
  from bridge / plan).

**Consume the matrix.** When `traceability.yml` exists, the report is computed
from its rows. For each row in `rows[]`, read the links by field name:

| Field | Meaning |
|-------|---------|
| `req` | canonical requirement id (V-Model / backfill rows only; null in the standard forward flow) |
| `story` | user story (`US-*`) |
| `journeys` | `JRN-*`; `STEP-*` / `EDGE-*` nested under the `journeys:` detail block |
| `frs` | functional requirements (`FR-*`) |
| `must_have` | boolean; drives the Layer 3 assertion |
| `components` / `contracts` | `CMP-*` / `API-*` |
| `tasks` / `code` / `tests` / `events` | `TASK-*` / code paths (from `implement`) / `TC-*` (from `test-plan` / `test-run`) / `EVT-*` |
| `status` | `planned \| implemented \| tested \| verified` |

Re-derive a link from raw artifacts only when its field is null: `story` / `frs`
/ `must_have` → `spec.md` / `product-spec.md`; `tasks` → `tasks.md`; `code` /
`tests` → the implementation under `codebase_path`. A null field that cannot be
back-filled is itself a gap to report. Result: one verification record per row.

## Step 3: Run verification checks

Every finding cites specific files, lines or sections. Severity is proportional:
CRITICAL for genuine implementation gaps or scope violations, WARNING for
deviations that may be intentional. A check you cannot evaluate for lack of
context is SKIPPED with the reason — never PASSED. Prioritise checks of the
research-to-code chain over generic code quality.

### Layer 1: Code ↔ Tasks

Per row: every `TASK-*` in `row.tasks` has ≥1 path in `row.code`; every `code`
path is reachable from a task; every referenced task is `[x]` in `tasks.md` (a
`[ ]` task with code was likely not marked). Null `tasks` → map via `tasks.md`.

- `TASK-*` with no implementing code → ❌ CRITICAL
- Task marked `[x]` with no code found → ❌ CRITICAL

Output `CODE_TASKS_COVERAGE`: the ratio of rows whose tasks all have code.

### Layer 2: Code ↔ Plan

Per row, `frs` + `components` + `contracts` are the planned units: every `FR-*`
is covered by ≥1 `code` path; every `CMP-*` / `API-*` has a code entry (deeper
conformance is Layers 8–9); a code path mapping to no row is a candidate
unplanned component (Layer 10). Null `frs` → the component list in `plan.md`.

- `FR-*` or planned component with no code → ❌ CRITICAL
- Code not traceable to any row / `frs` → ⚠️ WARNING (scope creep)
- Structure differs significantly from the plan → ⚠️ WARNING

### Layer 3: Code/Tasks ↔ Stories (Must-Have assertion)

Each `must_have: true` row has ≥1 `TASK-*`, ≥1 `code` path, and ≥1 `TC-*` (once
testing has run). Each other row is implemented or explicitly deferred. Null
`story` / `must_have` → priority and ACs from `spec.md`.

- Must-have row with no `tasks` → ❌ CRITICAL
- Must-have row with no `code` → ❌ CRITICAL
- Must-have row with no `tests` → ⚠️ WARNING

**AC measurability.** Classify each acceptance criterion on a row's `story` /
`frs` into exactly one bucket:

- **executable** — a deterministic test / assertion decides it (a `TC-*` in
  `row.tests`, an assertion in `row.code`, a numeric NFR signal); passes when
  that artifact exists.
- **judgeable** — subjective wording a deterministic test cannot reach ("error
  message is descriptive", "empty state is friendly").
- **unmeasurable** — neither ("fast enough" with no number, "users will like it").

- Executable AC whose test / assertion is missing → ⚠️ WARNING
- Unmeasurable AC → ❌ CRITICAL, plus a spec-tightening delta in the
  "Suggested canonical-spec updates" carrier so `spec-merge` can sharpen it.

When `verify.ac_judge: true` (default `false`), judge the **judgeable** ACs only,
per [docs/reference/verify-full-layers.md](../docs/reference/verify-full-layers.md#layer-3--llm-judge-for-subjective-acs-verifyac_judge):
`judge: fail` on a must-have AC → ⚠️ WARNING; `judge: weak` → note. Judge
verdicts are never CRITICAL.

### Layer 4: spec.md ↔ product-spec.md

From the rows' `story` / `frs` and the source specs: every must-have `US-*` and
every referenced `FR-*` appears in `spec.md`; product-spec success criteria are
reflected in `spec.md`; product-spec non-goals have no row or code. Re-read the
specs only for null `story` / `frs` or to confirm a non-goal has no row.

- `US-*` in product-spec missing from spec.md → ⚠️ WARNING (spec drift)
- NFR in product-spec missing from spec.md → ⚠️ WARNING
- Code implements something the product-spec marks out of scope → ❌ CRITICAL

### Layer 5: Implementation ↔ Research Recommendations

Spot-check: the UX pattern recommended in `ux-patterns.md` was followed, the
integration approach matches `codebase-analysis.md`, research anti-patterns were
avoided. Advisory — ⚠️ WARNING only (the user may have deviated deliberately).

### Layer 6: Cross-link Integrity

Check the links in `product-spec/README.md`, the feature `README.md`, and
`spec.md` → `product-spec/`, and every relative path; skip the transient /
archived trees `.forge-dry-run/` and `_rewound/`.

- Broken link → ⚠️ WARNING
- Document referenced in a README but missing → ⚠️ WARNING

### Layer 7: Journey ↔ E2E Coverage

From `journeys.yml` + `traceability.yml`:

- Must-Have `JRN` with no `TC-E2E` / `TC-SMK` → ❌ CRITICAL
- P0/P1 `EDGE` with no test case → ❌ CRITICAL; P2/P3 without one → ⚠️ WARNING

### Layer 8: UI ↔ Design System

From `component-map.yml` + `design-system/manifest.yml` + code:

- Mapped component (`CMP-*`) not used at its `target_path` → ❌ CRITICAL
- UI re-implements a component that exists in the manifest → ⚠️ WARNING

### Layer 9: FE ↔ BE Contract Drift

Scope is **FE → contract → BE**; the handler → DB/model leg is out of scope.
From the OpenAPI / AsyncAPI contracts and each row's `contracts`: every `API-*`
referenced by a journey/row has a backend route/handler and a frontend client
call, and both match the contract shape (path, method, payload).

When `sync_verify.contract_differ: oasdiff`, diff the working-tree
`contracts/openapi.yaml` against the last-approved baseline (the
`gates[].reviewed_sha` of the last contract-touching gate, else `HEAD`) per
[docs/reference/verify-full-layers.md](../docs/reference/verify-full-layers.md#layer-9--deterministic-contract-drift-diff-contract_differ-oasdiff);
when `oasdiff` is not installed, write a SKIPPED row with the install hint. Use
the prose checks only when `contract_differ` is unset.

- Contract with no backend implementation, or FE call to an undefined contract → ❌ CRITICAL
- Shape mismatch (param / payload differs from the contract) → ❌ CRITICAL
- `oasdiff breaking` finding → ❌ CRITICAL
- Contract defined but unused → ⚠️ WARNING
- `oasdiff diff` non-breaking change since approval → ⚠️ WARNING

### Layer 10: Doc ↔ Code Reconciliation

Both directions, from the matrix + canonical `specs/` when present: every
documented requirement / endpoint / component maps to code (unimplemented docs),
and every significant code path maps to a documented requirement or task
(undocumented code, an orphan).

For each orphan, attach provenance and reverse-index it against the task log:

1. `git -C {FEATURE_DIR} log -1 --format=%h,%an -- <orphan/path>`
2. Match the `%h` against `task_log[].commit_sha` in `.forge-status.yml`:
   - match → task-traceable but doc-orphaned: enrich the WARNING with
     `committed by {%an} in {%h}, task {T-id}`;
   - no match → out-of-band change: enrich the WARNING with
     `committed by {%an} in {%h}, no task`, and add it to the
     "Suggested canonical-spec updates" carrier as an `ADD FR-NNN` candidate with
     its `{%h},{%an}` provenance, so `spec-merge` decides to adopt or revert it.

- Documented behaviour with no implementing code → ❌ CRITICAL
- Significant undocumented code path (no matrix row, no task) → ⚠️ WARNING with
  the provenance and reverse-index verdict
- Every doc ↔ code drift gets a suggested canonical-spec update row; every
  out-of-band orphan appears there.

This layer deliberately escalates the doc ↔ code drift that `code-review`
Dimension 5 flags; at the final gate the CRITICAL / WARNING mapping is
intentional, not a duplicate.

### Layer 11: Constitution ↔ Code

The verification-time counterpart of `sync-verify` Layer 10: does
the code honour the project architecture constitution (resilience, EDA,
layering, security posture)? When no file exists at `constitution_path` (default
`.specify/memory/constitution.md`), report `Layer 11: N/A — no constitution
configured` (not a finding). Otherwise check the feature's `code` paths against
each mandated pattern — a deterministic probe where possible (grep / AST for the
wrapper symbol, the event-name convention, forbidden cross-layer imports), else
an LLM read.

- Code breaches a pattern the constitution marks MUST / mandatory → ❌ CRITICAL
- SHOULD-level deviation, or an uncertain LLM read → ⚠️ WARNING
- Cite the constitution section; reconcile with Layer 10 and `code-review`
  security so one violation counts once.

Result of Step 3: every layer has a status (PASSED / findings / SKIPPED / N/A).

## Step 4: Write the report and gate-review entries

Write `{FEATURE_DIR}/verify-report.md` from
[docs/templates/verify-full-report.md](../docs/templates/verify-full-report.md):
summary counts, per-layer tables for Layers 1–11, the
"Suggested canonical-spec updates" table, critical issues, warnings, the
traceability matrix rendered from `traceability.yml`, and the conclusion.
Verdict: **FAIL** when CRITICAL > 0, **PASS WITH WARNINGS** when only warnings
remain, else **PASS**.

Then append each CRITICAL / WARNING finding to `{FEATURE_DIR}/gate-review.md`
under the single `F-NNN` namespace (read the current max `F-NNN` first) with
`source: verify-full`, `layer: <N>` and `raised@{git-sha}`, and write the
"Suggested canonical-spec updates" rows to that section of `gate-review.md` for
`spec-merge` (see [gate-review.md](../docs/templates/gate-review.md)).
`CRITICAL-NNN` / `WARNING-NNN` stay as local labels inside `verify-report.md`.

## Step 5: Present, digest and gate

1. Show the counts (❌ CRITICAL, ⚠️ WARNING, ✅ PASSED, ⏭ SKIPPED), the verdict
   and the report path `{FEATURE_DIR}/verify-report.md`.
2. Write `{FEATURE_DIR}/verify/digest.md` from
   [phase-digest.md](../docs/templates/phase-digest.md):
   - **Key decisions** — the verdict (clean / blocked) and the CRITICAL findings
     that drove it.
   - **Artifacts produced** — `verify-report.md`.
   - **Open risks** — WARNING findings acknowledged but not fixed, with reason.
   - **Handoff notes** — what test-plan and release-readiness should watch for.
3. Gate: `{Phase}` = Verify Full, `{next phase}` = Test Plan. The approve option
   is labelled **Acknowledge** when warnings remain and is **not offered** while
   CRITICAL > 0 — then **Revise** (fix the CRITICALs, re-run verify-full) is the
   recommended first option. Offer Skip Test Plan only when CRITICAL = 0, Test
   Plan is `opt` for the mode, and `require_testing` is not `true`
   ([runtime.md §6.3](../docs/runtime.md#63-gate-prompt)); in `express` / `lite`
   the next phase is out of scope, so the option is dropped.

| Option | Decision | Status |
|--------|----------|--------|
| Approve (all passed) | `approved` | `phases.verify.status: completed` |
| Acknowledge (warnings only) | `approved_with_conditions` (`conditions` = the acknowledged `WARNING-*` ids) | `phases.verify.status: completed` |
| Skip Test Plan | `skipped` + `skip_reason` (asked when `require_skip_reason: true`) | `phases.verify.status: completed`; `phases.test_plan.status: skipped` + `skip_reason` |
| Revise | `revised` | `phases.verify.status: in_progress` |
| Rollback | `rolled_back` + `rolled_back_to` (only `completed` phases offered) | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort | `aborted` | unchanged |

```yaml
phases:
  verify:
    status: completed              # per the table above
    digest_path: "verify/digest.md"
```

The `gates[]` entry has `phase: verify`, the decision, and `conditions` /
`skip_reason` / `rolled_back_to` as applicable.

On `approved`, show the completion summary: *Feature complete: {Feature Name}*,
the verified chain Research ✅ → Product Spec ✅ → spec.md ✅ → Plan ✅ → Tasks ✅
→ Code ✅, *All {N} checks passed*, and the report path.

## Done when

- The pre-gate ran (or its skip / WARN is noted) and its `errors` count as CRITICAL.
- Every one of Layers 1–11 has a status in `verify-report.md`: PASSED, findings
  with cited evidence, SKIPPED with a reason, or N/A (Layer 11 without a
  constitution).
- Every unmeasurable AC and every out-of-band orphan has a row in
  "Suggested canonical-spec updates", in both the report and `gate-review.md`.
- Every CRITICAL / WARNING finding is in `gate-review.md` as an `F-NNN` with
  `source: verify-full` and its layer.
- No source file and no traceability `status` was changed (`test-run` sets
  `tested`; `release-readiness` / `spec-merge` set `verified`).
- `verify/digest.md` is written before the status write.
- Standalone: the gate was shown (no approve option while CRITICAL > 0), the
  decision recorded in `gates[]`, and `phases.verify` set from the table.
  `--from-forge`: the verdict and CRITICAL / WARNING / PASSED counts are returned
  to forge, with no gate prompt, no `phases.verify.status` and no `gates[]` entry
  (`verify/digest.md` and `digest_path` are still written).
