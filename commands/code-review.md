---
name: speckit.product-forge.code-review
description: >
  Reviews implemented code (Phase 6B) after machine gates pass: quality, security,
  pattern consistency, test coverage and doc↔code drift, judged against the
  feature's spec, plan and codebase analysis. `--cross-model` adds an independent
  review by another model.
---

# Product Forge — Phase 6B: Code Review

You are the **Code Review Conductor**. You run a two-layer review of the
implementation — deterministic machine gates, then context-rich review dimensions
grounded in the feature's research, spec and plan — and write `code-review.md` plus
`F-NNN` findings in `gate-review.md`.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `code_review` (Phase 6B)
- **Config keys:** `review.cross_model`
- **Writes:** `code-review.md`, `gate-review.md` (`F-NNN` rows),
  `cross-review/<UTC-timestamp>-<slug>/` (with `--cross-model`), `phases.code_review.status`
- **Contract deltas:**
  - `--cross-model [<reviewer-id>]` runs Step 2.5; `--base <ref>` sets its diff base.
    Without the flag the review is single-model.
  - `--dry-run` also mirrors the cross-review package under
    `{FEATURE_DIR}/.forge-dry-run/code_review/`.
  - Gate extras: `findings`, `reviewed_by_model`, `cross_model_findings` (Step 6).

## Step 0: Load context

Require `phases.implement.status: completed`; otherwise stop with
*"Phase 6 (Implementation) must be completed first."*

Read:

- `tasks.md` — completed tasks and their file paths
- `spec.md` — requirements and acceptance criteria
- `plan.md` — architecture decisions, patterns, threat model
- `research/codebase-analysis.md` — existing patterns and conventions
- `research/ux-patterns.md` — UX recommendations (frontend code)
- `pre-impl-review.md` — conditions and risks (if present)
- `implementation-log.md` — progressive-verify notes (if present)

## Step 1: Build the review scope

1. Build `REVIEW_FILES` — every file created or modified by the `[x]` tasks in
   `tasks.md`. When no paths are extractable, ask the user for the changed files or
   detect them with `git diff`.
2. **Review the delta.** When the feature has a prior review (a recorded
   `code_review` gate, or a `phase-digest.md` with a Diff section), review only what
   changed since then: reuse that Diff section or run
   `git diff <last-reviewed-ref>..HEAD` over `REVIEW_FILES`. Read whole files only on
   the first review, or when changed lines cannot be understood in isolation.
3. Show:

```
Review Scope: {N} files from {N} completed tasks
  New files:      {list}
  Modified files: {list}
  Total LOC:      {approximate}
```

## Step 1.5: Machine gates

Run the project's mechanical checks over `REVIEW_FILES` and the affected workspaces
before any judgment dimension:

| Gate | Command (resolve from the stack) | Blocks the review when |
|------|----------------------------------|------------------------|
| Lint | project linter | errors |
| Types | type checker (tsc / mypy / …) | errors |
| Security scan (SCA) | `osv-scanner --recursive .` (the SCA tool of [release-readiness](release-readiness.md) §5C-bis) + project SAST | high / critical |
| Coverage | test-runner coverage vs [testing-strategy.md](../docs/testing-strategy.md) | below minimum |

When a gate fails, surface it and stop before Step 2. Record the results in the
**Machine gates** section of `code-review.md`. The human gate (Step 5) is the final
layer.

## Step 2: Review dimensions (in parallel)

Run all five dimensions at once; each yields findings with a file, line range,
violated rule and a concrete suggested fix in code.

**1. Code quality** — for each file:

| Check | Look for |
|-------|----------|
| Single responsibility | functions > 50 LOC, classes > 5 public methods, files > 400 LOC |
| DRY | > 10 similar lines across files, copy-pasted patterns |
| Error handling | unhandled promise rejections, empty catch blocks, missing error responses |
| Naming | unclear or inconsistent names |
| Immutability | direct mutation where immutable patterns are expected |
| Complexity | nesting > 4, cyclomatic complexity > 10, long parameter lists |
| Dead code | unused imports, commented-out code, unreachable branches |
| Hardcoded values | magic numbers, strings that belong in constants / config |

**2. Security** — check only the attack surfaces this feature introduces (from the
`plan.md` threat model): input validation, SQL/NoSQL injection, XSS, authentication,
authorization (ownership checks), mass assignment, secrets in code, rate limiting on
new public endpoints, CSRF, path traversal. Dependency CVEs belong to the Step 1.5
SCA gate; this dimension covers application code.

**3. Pattern consistency** — compare against the conventions in
`research/codebase-analysis.md`:

| Existing Pattern | Followed in New Code? | Notes |
|-----------------|:--------------------:|-------|
| {pattern from codebase-analysis} | {✅/❌} | {specifics} |

Also check import ordering, file structure within modules, error-response format,
logging, and test file placement and naming.

**4. Tests and coverage** — per `spec.md` requirement:

| Requirement | Has Unit Test? | Has Integration Test? | Coverage Adequate? |
|------------|:--------------:|:--------------------:|:-----------------:|
| {FR-NNN / US-NNN} | {✅/❌} | {✅/❌/N-A} | {✅/⚠️/❌} |

Every public function in new services has ≥ 1 test; every API endpoint has ≥ 1
request/response test; acceptance-criteria edge cases are covered; test files follow
project conventions.

**5. Doc ↔ code** — using `traceability.yml`, the OpenAPI/AsyncAPI contracts,
`component-map.yml` and canonical `specs/` (if present): every documented
requirement / endpoint / component in scope maps to code, and every significant new
code path maps to a documented requirement or task. Unimplemented docs are **HIGH**,
undocumented code **MEDIUM** (`verify-full` Layer 10 escalates the same conditions at
the final gate). Write genuine behaviour drift into the **Suggested canonical-spec
updates** section of `code-review.md` — the carrier `verify-full` also uses and
`spec-merge` reads.

## Step 2.5: Cross-model review (`--cross-model`)

Run only with `--cross-model`; otherwise go to Step 3. Step 2 runs on one model
family; a different model brings different priors. The existing `F-NNN` set plus the
git diff are the package — no new format.

1. **Export the package.** Write
   `{FEATURE_DIR}/cross-review/<UTC-timestamp>-<slug>/review-package.md` containing,
   in order:
   - `spec.md` acceptance criteria and `plan.md` architecture / threat notes;
   - the implementation diff `git diff <base>..HEAD` (base = the feature branch
     point, or `--base <ref>`);
   - the open `F-NNN` findings of `gate-review.md`;
   - this instruction block: *"You are an independent reviewer. Emit findings as
     `F-NNN` rows (severity, file:line, rule, suggested fix). Do not assume the
     author's intent was correct."*

   Write a sibling `metadata.json` (`base_sha`, `head_sha`, `reviewer_id`,
   `created_at`). The reviewer needs no access to this session.
2. **Reviewer runs out-of-band.** Resolve the reviewer id from `--cross-model <id>`
   or `review.cross_model` (e.g. `codex`, `gemini`, another `claude` session, a local
   model, a separate Hermes session). Give the user the exact command and let them
   run or confirm it — Product Forge never invokes another paid model on its own:

   ```bash
   PKG={FEATURE_DIR}/cross-review/<ts>-<slug>
   codex exec --file $PKG/review-package.md > $PKG/review-report.md
   # or: gemini / a second claude / hermes — any CLI-capable model
   ```

   Inside Hermes this may be delegated to a subagent pinned to a different model,
   still writing `review-report.md`.
3. **Ingest.** Read `review-report.md` and dedupe against the existing `F-NNN` set
   (same file:line + rule = same finding; keep the higher severity). Append genuinely
   new findings to `gate-review.md` with `source: cross-model`, `reviewer: <id>`,
   `raised@{head-sha}`. They go through the same gate as native findings.
4. **Stamp.** Carry `reviewed_by_model: <id>` and `cross_model_findings: {N}` to the
   gate entry (Step 6).

With no reviewer configured or available: write the package, tell the user where it
is, and continue single-model.

## Step 3: Compile findings

Write each finding as a `REV-NNN` block (format in
[docs/templates/code-review-report.md](../docs/templates/code-review-report.md)) and
append it to `{FEATURE_DIR}/gate-review.md` in the single `F-NNN` namespace with
`source: code-review`, `dimension: quality|security|patterns|tests|doc-code` and
`raised@{git-sha}`. Read the current max `F-NNN` first and continue from it;
existing ids stay as they are. `REV-NNN` stays the in-document label; the gate reads
`gate-review.md` ([template](../docs/templates/gate-review.md),
[policy.md §9](../docs/policy.md#9-gate-review-surface--risk-routing-w5-a)).

Severity:

- **CRITICAL** — security vulnerability, data-loss risk, broken functionality
- **HIGH** — logic error, missing error handling on a critical path, spec divergence
- **MEDIUM** — convention violation, missing test, code smell (non-blocking)
- **LOW** — style inconsistency, minor naming, documentation gap (non-blocking)

Style issues are never CRITICAL.

## Step 4: Write `code-review.md`

Write `{FEATURE_DIR}/code-review.md` from
[docs/templates/code-review-report.md](../docs/templates/code-review-report.md),
including 2–3 positive highlights.

## Step 5: Present and gate

Show the file count, findings by severity (CRITICAL / HIGH / MEDIUM / LOW) and the
recommendation. Then present each CRITICAL and HIGH finding with its file:line, rule,
current code and suggested fix, and ask:

```
[REV-{NNN}] {severity} {dimension}: {title}. How do you want to handle it?

  1. Fix now (recommended)
  2. Acknowledge — fix later
  3. Not applicable — explain why
  (or type your own answer)
```

Standalone, show the gate (no Skip — Verify Full is required in every mode):

```
[Gate] Code review complete — {one-line outcome}. How do you want to proceed?

  1. Approve (recommended) — all CRITICAL/HIGH addressed; proceed to Phase 7
  2. Revise — re-run the review (or re-review affected files after fixes)
  3. Rollback — return to an earlier, completed phase by name (e.g. Phase 6 Implement)
  4. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

Proceeding with open findings is an **Approve** with those findings acknowledged.
The per-finding answers tune the finding set; the gate decision stays one literal:

| Option | Decision | `phases.code_review.status` |
|--------|----------|-----------------------------|
| Approve, nothing open | `approved` | `completed` |
| Approve with acknowledged findings | `approved_with_conditions` — acknowledged `REV-*` ids in `conditions` | `completed` |
| Revise | `revised` | `in_progress` (the review re-runs) |
| Rollback | `rolled_back` + `rolled_back_to` | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort | `aborted` | unchanged |

## Step 6: Status and gate entry

Standalone, set `phases.code_review.status` from the table and append:

```yaml
gates:
  - phase: code_review
    decision: "{approved / approved_with_conditions / revised / skipped / rolled_back / aborted}"
    rolled_back_to: "{phase}"   # only when decision is rolled_back
    timestamp: "{ISO timestamp}"
    notes: "{summary}"
    conditions: ["REV-NNN"]     # only for approved_with_conditions
    reviewed_by_model: "{reviewer-id or null}"   # set when --cross-model ran; null otherwise
    cross_model_findings: {N}                     # new findings the cross-model reviewer added (0 if not run)
    findings:                   # counts by severity
      critical: {N}
      high: {N}
      medium: {N}
      low: {N}
      fixed: {N}
      acknowledged: {N}
```

With `--from-forge`, return the findings summary plus `findings`,
`reviewed_by_model` and `cross_model_findings` to forge.

Hand-off: `Next step: /speckit.product-forge.verify-full` (Phase 7).

## Done when

- Machine gates ran over `REVIEW_FILES` and their results are in `code-review.md`;
  if one failed, the review stopped there with the failure surfaced.
- Otherwise all five dimensions ran; every finding has a file:line, rule, severity
  and a concrete fix, and is in `gate-review.md` as a new `F-NNN` (`source:
  code-review`, `dimension`, `raised@`) continuing the existing numbering.
- `code-review.md` is written from the template; doc↔code drift, if any, is in its
  **Suggested canonical-spec updates** section.
- With `--cross-model`: the package and `metadata.json` exist; the report, once
  returned, is deduped and ingested; or the user was told where the package is and
  the review continued single-model.
- Every CRITICAL / HIGH finding has a per-finding answer (fix / acknowledge / not
  applicable).
- Standalone: the gate was shown, its decision appended to `gates[]` with
  `findings`, `reviewed_by_model`, `cross_model_findings`, and
  `phases.code_review.status` set from it.
- `--from-forge`: the findings summary and those three extras were returned to forge
  with no gate prompt and no status or `gates[]` write.
