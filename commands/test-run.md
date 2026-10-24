---
name: speckit.product-forge.test-run
description: >
  Runs the feature's test cases (Phase 8B) with playwright-cli and the test
  framework, files BUG-NNN reports, auto-fixes and retests P0/P1 bugs, and loops
  until the exit criteria are met. Use after test-plan.
---

# Product Forge — Phase 8B: Test Execution & Bug Fix Loop

You are the **Test Execution Coordinator**. Execute every case in
`testing/test-cases.md`, track every bug, fix and retest P0/P1 bugs, and repeat
until the feature meets its exit criteria; the output is `test-report.md` plus
`bugs/`.

You drive the browser yourself with `playwright-cli`: read each case's steps,
execute each action, take screenshots as evidence, record PASS / FAIL. The
Phase 8A `.spec.ts` files are for CI/CD pipelines; this phase does not run them.

Every case carries its `JRN` / `STEP` / `EDGE` ids (from
`product-spec/journeys/journeys.yml`). A failure records the failing id in its
`bugs/BUG-NNN.md` and updates the matching `traceability.yml` row, so it points
straight back to the journey step it broke.

The WCAG-AA accessibility floor (axe-core) and the component / design-token
conformance check run inside the normal browser run (Step 4.7), not as a separate
phase or gate: their failures are ordinary `BUG-NNN.md` records mapped to the
same `JRN` / `STEP` / `EDGE` ids, triaged in Step 5 and resolved through the same
fix loop and exit criteria. The automated floor is a minimum bar; manual a11y
review is still required.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `test_run` (Phase 8B)
- **Config keys:** `e2e_runner`, `a11y_gate`, `codebase_path` / `codebase.paths`,
  `release_readiness`, `require_skip_reason`
- **Writes:** `test-report.md`, `bugs/BUG-NNN.md`, `bugs/README.md`,
  `testing/playwright-results/*`, `testing/results-{run_n}.json`, source fixes,
  approved `spec.md` / `product-spec.md` updates, `review.md`, `traceability.yml`
  (`tests`, `status: tested`), the feature `README.md`, `phases.test_run.status`
- **Contract deltas:**
  - Also writes the top-level `testing:` block, and on *Skip Release Readiness*
    `phases.release_readiness.status: skipped` + `skip_reason`.
  - `resume` continues the fix loop of an earlier run (Step 11 option
    *Continue*); Step 1 rebuilds its counters from the existing bugs and results.
  - `--dry-run`: tests may still execute (read-only); bugs are filed and
    `test-report.md` is written under `.forge-dry-run/test_run/`; the fix loop
    is skipped (Step 7 → Step 11), so no auto-fix touches source.
  - `--from-forge`: the `traceability.yml` rows to set `tested` are returned to
    forge instead of written (Step 13).

## Step 1: Check readiness

1. `.forge-status.yml` → `phases.test_plan.status: completed`.
2. `testing/test-plan.md` exists.
3. `testing/test-cases.md` exists with at least one `TC-*-NNN` entry.
4. `testing/env.md` exists with `FRONTEND_URL` configured.
5. `playwright-cli` is available (or `npx playwright-cli`).

When a check fails, stop with:
> ⚠️ Test plan not found. Run `/speckit.product-forge.test-plan` first.

Load `FRONTEND_URL`, `API_URL`, `TEST_TYPES`, case counts and the entry / exit
criteria from `testing/test-plan.md`; load `TEST_EMAIL`, `TEST_PASSWORD`,
`TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD` (when present) and other
environment-specific values from `testing/env.md`.

Initialize: `TEST_RUN = 1`, `BUGS_FOUND = 0`, `BUGS_FIXED = 0`, `BUGS_OPEN = 0`,
`BUG_SEQ = 1` (next `BUG-NNN` number).

With `resume`, rebuild the state instead, so a resumed run never overwrites an
existing bug or resets the retry cap:

- `BUG_SEQ` = highest existing `bugs/BUG-*.md` number + 1.
- `TEST_RUN` = highest `testing/results-{run_n}.json` number (or the highest
  `Test Run: #` in the bug files) + 1.
- `BUGS_FOUND` / `BUGS_FIXED` / `BUGS_OPEN` = counted from the bug statuses.
- Fix attempts per bug = the number of `Attempt {n}:` lines in its § Fix Applied.

Then run Step 2 and Step 3 (app reachable, auth state) and continue at Step 8.

## Step 2: Pre-flight

Check before opening any test browser:

| Check | How |
|-------|-----|
| playwright-cli available | `playwright-cli --version` |
| App reachable | `playwright-cli open {FRONTEND_URL}` → `snapshot` → `close` |
| API reachable | `playwright-cli open {API_URL}/health` → `snapshot` → `close` |
| Test credentials | `testing/env.md` is populated |
| axe-core resolvable (Step 4.7a) | command below |
| Design-system manifest present (Step 4.7b) | command below |

```bash
test -f node_modules/axe-core/axe.min.js && echo "axe-core: local" \
  || echo "axe-core: will load from CDN in §4.7 (network required)"
test -f {FEATURE_DIR}/design-system/manifest.yml && echo "manifest: ok" \
  || echo "manifest: MISSING → §4.7 conformance leg records BLOCKED"
```

- axe-core cannot be resolved (no `node_modules`, no network) → record the 4.7
  a11y leg **BLOCKED** for every browser journey.
- `design-system/manifest.yml` absent → record the 4.7 conformance leg **BLOCKED**.

A missing dependency is recorded BLOCKED, never PASS.

When the reachability snapshot shows an error page, connection refused or a blank
page, report it and wait:

```
⚠️ Cannot reach {FRONTEND_URL}.
Is the app running? Start it with:
  {start command from package.json scripts.dev / scripts.start}
Waiting for your confirmation before running tests...
```

Result: the app is reachable — proceed only then.

## Step 3: Set up the auth session

Before any authenticated case, log in once and save the state:

```bash
playwright-cli -s=pf-auth open {FRONTEND_URL}/login
playwright-cli -s=pf-auth snapshot
playwright-cli -s=pf-auth fill e{email_field_ref} "{TEST_EMAIL}"
playwright-cli -s=pf-auth fill e{pass_field_ref}  "{TEST_PASSWORD}"
playwright-cli -s=pf-auth click e{submit_ref}
playwright-cli -s=pf-auth snapshot
playwright-cli -s=pf-auth state-save testing/playwright-results/auth-state.json
playwright-cli -s=pf-auth close
```

Take element refs (`e1`, `e2`, …) from the snapshot. Login succeeds → reuse the
saved state for every authenticated case. Login fails → create `BUG-001` (P0
Blocker) and stop.

## Step 4: Execute the tests

Order (cheapest first):

1. Smoke — `TC-SMK-NNN` (failures block all others)
2. E2E — `TC-E2E-NNN`
3. API — `TC-API-NNN`
4. Regression — `TC-REG-NNN`

Unit (`TC-UNIT-NNN`, 4E) and integration (`TC-INT-NNN`, 4F) cases run through the
test framework, not the browser.

**Browser cases** (smoke, E2E, regression) follow 4.1–4.6, plus 4.7 for smoke
and E2E journeys:

#### 4.1 Read the case

From `testing/test-cases.md`: the TC-ID, preconditions (auth? data state?), the
numbered steps, the expected result.

#### 4.2 Open the browser

```bash
playwright-cli -s=pf-test open {FRONTEND_URL}{start_path}
playwright-cli -s=pf-test state-load testing/playwright-results/auth-state.json   # authenticated cases only
playwright-cli -s=pf-test tracing-start
```

#### 4.3 Execute each step

| Case action | playwright-cli command |
|-------------|------------------------|
| Navigate to URL | `playwright-cli -s=pf-test goto {URL}` |
| Click element | `snapshot` → find ref → `playwright-cli -s=pf-test click e{N}` |
| Fill input | `snapshot` → find ref → `playwright-cli -s=pf-test fill e{N} "{value}"` |
| Select dropdown | `playwright-cli -s=pf-test select e{N} "{value}"` |
| Check checkbox | `playwright-cli -s=pf-test check e{N}` |
| Press key | `playwright-cli -s=pf-test press Enter` |
| Wait for element | `snapshot` → verify the element is present |
| Scroll | `playwright-cli -s=pf-test mousewheel 0 300` |
| Verify text present | `playwright-cli -s=pf-test eval "document.body.innerText.includes('{text}')"` |
| Verify URL | `playwright-cli -s=pf-test eval "window.location.pathname"` |
| Check network error | `playwright-cli -s=pf-test console` / `playwright-cli -s=pf-test network` |

Take a snapshot after every meaningful action and confirm the state before the
next step.

#### 4.4 Take the evidence screenshot

```bash
playwright-cli -s=pf-test screenshot --filename=testing/playwright-results/{TC_ID}-final.png
```

Every case gets its final-state screenshot (PASS and FAIL); every FAIL also keeps
its trace.

#### 4.5 Stop tracing and close

```bash
playwright-cli -s=pf-test tracing-stop   # saves testing/playwright-results/{TC_ID}-trace.zip
playwright-cli -s=pf-test close
```

#### 4.6 Record the result

Compare the final snapshot with the expected result:
- **PASS** — the final state matches.
- **FAIL** — it does not match, an error shows, or behaviour is unexpected.
- **BLOCKED** — a prerequisite step failed (e.g. auth unavailable).

#### 4.7 a11y + component/token conformance

Browser journeys only (Smoke 4A, E2E 4B); not applicable to API (4C), Unit (4E)
or Integration (4F). Run once per journey at its final state, in the same
`pf-test` session, before 4.5 closes it. Scripts:
[docs/reference/test-run-a11y-conformance.md](../docs/reference/test-run-a11y-conformance.md).

**(a) WCAG-AA floor — axe-core**, gated on `a11y_gate` (default `axe`):
- `a11y_gate: none` → skip the leg (test-plan generated no axe check) and record
  `a11y: skipped (a11y_gate=none)` in the run notes.
- `a11y_gate: axe` → run the axe script (WCAG 2.0/2.1 A + AA):
  - `{ blocked: true }` → a11y leg **BLOCKED** for this journey, never PASS.
  - `violations: []` → a11y floor PASS.
  - each violation → one `BUG-NNN.md` (or one per `{id × target}`), with the
    case's `JRN` / `STEP` / `EDGE` and the `helpUrl` in Evidence.

**(b) Component + design-token conformance** (DOM presence + computed style; no
pixel diffing). Resolve the `CMP-*` selector list from the manifest, then run the
conformance script:
- `missingComponents` non-empty → one `BUG-NNN.md` per missing component (its
  component-map region names the `JRN` / `STEP` it backs).
- `offTokenStyles` non-empty → one `BUG-NNN.md` for the design-token drift.
- manifest absent (Step 2) → leg **BLOCKED**, never PASS.
- colors shipped as Tailwind classes (empty token allow-set) → keep only the
  component-presence check and record the token check BLOCKED.

### 4A: Smoke tests

Run every `TC-SMK-*` case. When one FAILs, stop and ask:

```
[Smoke blocker] Smoke test {TC-SMK-NNN} failed — {failure from snapshot/screenshot}.
Smoke failures block all further testing.

  1. FIX (recommended) — analyze and fix the issue now
  2. SKIP — mark this smoke test blocked and continue
  3. ABORT — stop the testing session
  (or type your own answer)
```

Continue only after the answer.

### 4B: E2E tests

Run every `TC-E2E-*` case, reusing the `pf-auth` state for authenticated cases.

### 4C: API tests

When `TC-API-*` cases exist, run them per
[docs/reference/test-run-test-types.md → 4C](../docs/reference/test-run-test-types.md#4c-api-tests-tc-api-nnn)
and compare the actual status and body with the expected values.

### 4D: Regression tests

Run every `TC-REG-*` case: existing features must still work.

### 4E: Unit tests (TC-UNIT-NNN)

Run through the detected test framework per
[docs/reference/test-run-test-types.md → 4E](../docs/reference/test-run-test-types.md#4e-unit-tests-tc-unit-nnn);
results go to `testing/results-{run_n}.json`.

### 4F: Integration tests (TC-INT-NNN)

Start the backing services and run per
[docs/reference/test-run-test-types.md → 4F](../docs/reference/test-run-test-types.md#4f-integration-tests-tc-int-nnn);
a missing Docker socket for testcontainers records the case BLOCKED.

Result: every case has PASS / FAIL / BLOCKED (SKIP for framework-skipped unit
cases) and its evidence.

## Step 5: Collect and triage results

Show the run summary:

```
Test Run #{RUN_N} Results
  Unit Tests:        {N_pass}/{N_total} PASS  {N_fail} FAIL
  Integration Tests: {N_pass}/{N_total} PASS  {N_fail} FAIL  {N_block} BLOCKED
  Smoke Tests:       {N_pass}/{N_total} PASS  {N_fail} FAIL
  E2E Tests:         {N_pass}/{N_total} PASS  {N_fail} FAIL
  API Tests:         {N_pass}/{N_total} PASS  {N_fail} FAIL
  Regression Tests:  {N_pass}/{N_total} PASS  {N_fail} FAIL
  Total:             {N_pass}/{N_total} PASS  {N_fail} FAIL
  Pass Rate:         {%%}
  ❌ Failed: {TC-ID | title | brief failure} per line
```

Severity for each FAILED case:
- **P0** — smoke failure, auth broken, or app unreachable
- **P1** — Must-Have story E2E failure (happy path)
- **P2** — Should-Have story or error-state failure
- **P3** — edge case, cosmetic, or minor flow failure
- **P4** — regression on a low-risk path

Severity for each 4.7 finding:

| Finding | Source field | Severity |
|---------|--------------|----------|
| axe violation, `impact: critical` | `violations[].impact` | **P1** |
| axe violation, `impact: serious` | `violations[].impact` | **P2** |
| axe violation, `impact: moderate` | `violations[].impact` | **P3** |
| axe violation, `impact: minor` | `violations[].impact` | **P4** |
| Missing `CMP-*` component | `missingComponents[]` | **P2** |
| Off-token computed style | `offTokenStyles[]` | **P3** |

## Step 6: Create bug reports

For each failure, write `{BUGS_DIR}/BUG-{NNN}.md` (numbered from `BUG_SEQ`) from
[docs/templates/test-run-bug.md](../docs/templates/test-run-bug.md), status Open,
with the case's `Journey:` / `Step/Edge:` ids; update the matching
`traceability.yml` row. Update the `{BUGS_DIR}/README.md` dashboard and bug list.

A 4.7 finding uses the same format:
- `## Evidence` → the axe `id` + `impact` + `helpUrl`, or the missing `CMP-*`
  selector / off-token `{selector, prop, value}` from the script output.
- `## Gap Analysis` → usually "Implementation bug" (a11y / token drift is fixed
  in code); a spec gap only when the AC itself lacks the requirement.

## Step 7: Gap analysis — spec impact

For each open bug, read the broken story's acceptance criteria in `spec.md` and
classify:

| Bug type | Impact on spec | Action |
|----------|---------------|--------|
| Implementation doesn't match a clear AC | None — code is wrong | Fix code only |
| AC is ambiguous | Minor — clarify spec.md | Update spec.md acceptance criteria |
| Bug reveals a missing requirement | Medium — spec gap | Add to spec.md + product-spec.md |
| Bug reveals an incorrect requirement | Medium — spec error | Update spec.md + product-spec.md |
| Valid per spec but bad UX | Medium — UX gap | Ask the user whether the spec should change |

The spec is the truth: when test and code disagree, check the spec first. For
each bug that needs a spec update, ask:

```
[Spec gap] BUG-{NNN} shows {spec.md § User Stories} needs clarification.
Current:  "{current AC text}"
Proposed: "{proposed clearer text}"

  1. Yes — apply the update
  2. No — keep the current text
  3. Modify — edit the proposal first
  (or type your own answer)
```

Log every applied spec update in `review.md` (continuing the revalidation chain).

With `--dry-run`, propose spec updates without applying them, skip Steps 8–10
(no fix is applied, so nothing to retest) and go to Step 11.

## Step 8: Auto-fix loop

Fix P0/P1 bugs one at a time, in severity order; every P0/P1 bug is fixed or
explicitly deferred with the user's approval.

### 8A: Fix

Launch a Fix Agent:
> *"You are the Bug Fix Agent for Product Forge.*
> *Bug: {bug description}*
> *Failed test: {TC-ID} — steps: {steps from test case}*
> *Expected per spec: {AC text from spec.md}*
> *Evidence: {screenshot path} — {what was visible}*
> *Gap analysis: {implementation / spec / test / env}*
> *Fix ONLY what's needed. Report: files changed + description."*

Append one line per attempt to `BUG-NNN.md` § Fix Applied:
`Attempt {n}: {files changed} — {description}`. The bug file is the fix log;
`review.md` receives only spec updates (Step 7).

### 8B: Retest the fixed bug

Re-run only the failed case:

```bash
playwright-cli open {FRONTEND_URL}{start_path}
playwright-cli state-load testing/playwright-results/auth-state.json  # if needed
# ... re-run the exact steps of the case ...
playwright-cli screenshot --filename=testing/playwright-results/{TC_ID}-retest.png
playwright-cli close
```

PASS → set the bug status to Verified. FAIL → ask:

```
[Fix failed] ⚠️ BUG-{NNN} still failing after fix attempt {n}/3.
Fix applied: {what was changed}. Still failing: {snapshot / error}.

  1. RETRY — try a different fix approach   ← only while n < 3
  2. MANUAL — mark for manual developer review
  3. SKIP — skip and continue (lowers coverage)
  (or type your own answer)
```

**Retry cap: 3 fix attempts per bug.** After the third failed retest, offer no
RETRY: set § Retest Result to `BLOCKED — 3 fix attempts exhausted`, set the bug
to Blocked in `{BUGS_DIR}/README.md`, move to the next bug, and list every
blocked bug in the Step 11 exit-criteria check and the Step 13 gate outcome.

### 8C: Smoke check after each fix

After every P0/P1 fix, re-run all `TC-SMK-*` cases. A new smoke failure means the
fix caused a regression: report "Fix for BUG-{NNN} caused smoke regression:
{TC-SMK-NNN} now failing", roll the fix back and try an alternative approach.

### 8D: Progress

After each fix + retest: `Bug Fix Progress: {N}/{N} fixed ✅ | {N} remaining | {N} skipped`.

## Step 9: Mid-session report (every 5 bugs, or on request)

Report for run `#{RUN_N}`: bugs found, open / total per severity (P0–P4),
auto-fixed count, spec clarifications applied, open P0 bugs (blocking), and
Must-Have story coverage (full PASS / partial / blocked). Then ask whether to
continue fixing or whether the user takes over any fixes manually.

## Step 10: Full retest pass

After all auto-fixes, re-run the complete suite (4A–4D) as run `#{RUN_N+1}` and
compare:

```
Retest delta:
  Before: {N_pass}/{N_total} ({%%})
  After:  {N_pass}/{N_total} ({%%})
  Improvement: +{N} tests now passing
  New failures: {N} (regression check)
```

## Step 11: Check exit criteria

Check the exit criteria from `testing/test-plan.md`:

```
Exit Criteria Check:
  [✅/❌] All P0 smoke tests PASS   — {N}/{N}
  [✅/❌] All E2E happy paths PASS   — {N}/{N}
  [✅/❌] ≥80% of all tests PASS     — {%%} (need 80%)
  [✅/❌] Zero P0/P1 open bugs       — {N} open
  [✅/❌] All P2+ bugs documented    — {N} with workarounds
```

All met → Step 12. Otherwise list what is missing and the blocked bugs (retry cap
reached, or "none"), and ask:

```
[Exit criteria] ⚠️ Exit criteria not yet met: {missing}. Blocked bugs: {BUG-NNN list or "none"}.

  1. Continue fixing P0/P1 bugs (recommended) — /speckit.product-forge.test-run resume
  2. Override exit criteria — accept the current state with documented risks
  3. Defer bugs to next sprint — mark the feature conditional-done
  (or type your own answer)
```

- **Continue** → back to Step 8; the phase stays `in_progress`.
- **Override** / **Defer** → Step 12 with `KNOWN_ISSUES = true`. The Step 13
  approval is then `approved_with_conditions`, with `conditions` listing the unmet
  criteria (Override) or the deferred / blocked `BUG-NNN` ids (Defer), and
  `phases.test_run.status: completed_with_known_issues`. Every open bug goes into
  the report's *Known Issues / Deferred Bugs* section with rationale and
  workaround.

## Step 12: Write the test report

Write `{FEATURE_DIR}/test-report.md` from
[docs/templates/test-run-test-report.md](../docs/templates/test-run-test-report.md).

## Step 13: Gate and completion

Gate: `{Phase}` = Test Run; outcome = pass rate + open / blocked bug count; next
phase = Release Readiness. Offer **Skip Release Readiness** only when it is `opt`
for the feature's mode and `release_readiness` is not `required`.

| Option | Decision | `phases.test_run.status` |
|--------|----------|--------------------------|
| Approve, exit criteria met, no open bugs | `approved` | `completed` |
| Approve with `KNOWN_ISSUES` (Step 11 Override / Defer) | `approved_with_conditions` (`conditions` = unmet criteria / open `BUG-NNN` ids) | `completed_with_known_issues` |
| Skip Release Readiness | `skipped` + `skip_reason` (asked when `require_skip_reason: true`) | `completed` or `completed_with_known_issues` as above; `phases.release_readiness.status: skipped` + `skip_reason` |
| Revise | `revised` | `in_progress` (resume the test loop) |
| Rollback | `rolled_back` + `rolled_back_to` (only `completed` phases offered) | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort | `aborted` | unchanged |

```yaml
phases:
  test_run:
    status: completed        # per the table above (completed_with_known_issues with open bugs)
testing:                     # legacy top-level block, declared in the canonical schema
  final_pass_rate: "{%%}"
  bugs_found: {N}
  bugs_fixed: {N}
  bugs_deferred: {N}         # includes blocked bugs
  test_runs_total: {N}
```

The gate entry is `phase: test_run` with `conditions` / `skip_reason` /
`rolled_back_to` as applicable. With `--from-forge`, return the outcome,
`conditions`, the `testing` counts and the traceability rows from item 1 below
(the reconciled `tests` columns and the rows to set `status: tested`) as gate
extras; forge applies them after an approving gate, so test-run leaves
`traceability.yml` row status unwritten.

On an approving decision (`approved` / `approved_with_conditions` / `skipped`):

1. Standalone: update `{FEATURE_DIR}/traceability.yml`
   ([docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md)):
   - reconcile the `tests: [TC-*]` column (seeded by `test-plan`) with the cases
     that actually ran;
   - each row whose covering cases all **passed** → `status: tested` (`test-run`
     is the canonical producer of `tested`; `verified` comes later from
     release-readiness / spec-merge); rows with open P0/P1 bugs keep their status;
   - the `journeys` block's per-edge `tests:` reflect the edge cases that ran.
2. Close browser sessions: `playwright-cli close-all`.
3. Mark Phase 8B ✅ Complete in the feature `README.md`.
4. Final message: pass rate (`{N}/{N}`), bugs found / auto-fixed / deferred
   (documented), test runs, evidence in `testing/playwright-results/`
   (`{N}` screenshots, `{N}` traces), the traceability chain (Research → Product
   Spec → spec.md → Plan → Tasks → Code → Verified → Tested), then either "Ships
   with known issues — see test-report.md § Known Issues." (`KNOWN_ISSUES`) or
   "This feature is READY TO SHIP.", and the artifact list (`testing/test-plan.md`,
   `testing/test-cases.md`, `testing/playwright-tests/` for CI/CD,
   `testing/playwright-results/`, `bugs/README.md` + `{N}` `BUG-*.md`,
   `test-report.md`).

## Done when

- Every case in `testing/test-cases.md` has a recorded result (PASS / FAIL /
  BLOCKED) and evidence; every browser journey has its 4.7 a11y and conformance
  legs recorded as PASS, BLOCKED, filed as bugs, or skipped by `a11y_gate: none`.
- Every failure has a `BUG-NNN.md` with severity, `Journey:` / `Step/Edge:` and
  gap analysis, and `bugs/README.md` reflects every bug's status.
- Loop stop rules held:
  - a smoke FAIL halted testing until FIX / SKIP / ABORT was answered;
  - every P0/P1 bug is Verified, Blocked after 3 fix attempts, marked manual /
    skipped by the user, or deferred;
  - Step 11 either met all exit criteria, or the user chose Override / Defer
    (`KNOWN_ISSUES`, `completed_with_known_issues`); Continue returned to Step 8
    with the phase `in_progress`.
- `test-report.md` is written, with every open bug under *Known Issues /
  Deferred Bugs* when `KNOWN_ISSUES`.
- Standalone: the gate was shown, the decision recorded and
  `phases.test_run.status` plus the `testing:` block set from it; on an approving
  decision `traceability.yml` rows are `tested` where all their cases passed.
  `--from-forge`: the outcome, `conditions`, `testing` counts and the
  traceability rows to set `tested` returned to forge, with no gate prompt, no
  status write and no row-status write.
- `resume` started from the rebuilt `BUG_SEQ`, `TEST_RUN` and per-bug attempt
  counts, overwriting no existing `BUG-NNN.md`. `--dry-run` filed its bugs under
  `.forge-dry-run/test_run/` and ran no fix loop.
