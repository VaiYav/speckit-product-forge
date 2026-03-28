---
name: speckit.product-forge.test-run
description: >
  Phase 8B: Executes test plan via playwright-cli, tracks bugs in bugs/<BUG-NNN>.md,
  agent auto-fixes bugs and retests, performs gap analysis when bugs require spec changes.
  Loop continues until all P0/P1 bugs closed and exit criteria met.
  Use with: "run tests", "execute tests", "/speckit.product-forge.test-run"
---

# Product Forge — Phase 8B: Test Execution & Bug Fix Loop

You are the **Test Execution Coordinator** for Product Forge Phase 8B.
Your goal: execute the test plan, track every bug in its own file, auto-fix and retest,
and manage the loop until all critical bugs are resolved and the feature is ready to ship.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. `.forge-status.yml` → `test_plan: completed`
2. `testing/test-plan.md` exists
3. `testing/test-cases.md` exists
4. `testing/playwright-tests/` exists with at least one `.spec.*` file
5. `testing/env.md` exists with FRONTEND_URL configured

If not ready:
> ⚠️ Test plan not found. Run `/speckit.product-forge.test-plan` first.

Load from `testing/test-plan.md`:
- `FRONTEND_URL`, `API_URL`, `TEST_TYPES`, `BROWSERS`
- Test case count per type
- Entry/exit criteria

Initialize counters:
```
TEST_RUN = 1
BUGS_FOUND = 0
BUGS_FIXED = 0
BUGS_OPEN = 0
```

---

## Step 2: Pre-flight Checks

Before running any tests, verify:

```
🔍 Pre-flight check:

  App running?    → Try GET {FRONTEND_URL}
  API running?    → Try GET {API_URL}/health (or /ping)
  Playwright?     → Check if npx playwright --version works
  Test files?     → Count files in testing/playwright-tests/
  Credentials?    → Verify testing/env.md is populated
```

If app is NOT running:
```
⚠️ Cannot reach {FRONTEND_URL}.
Is the app running? Start it with:
  {suggest start command from package.json scripts.dev / scripts.start}

Waiting for your confirmation before running tests...
```

Do NOT proceed until app is reachable.

---

## Step 3: Execute Tests — Ordered by Type

Run test types in this order (fastest/cheapest first):

### 3A: Smoke Tests (always first)

```
🚬 Running Smoke Tests...
```

Execute via Bash:
```bash
cd {codebase_path}
FRONTEND_URL={FRONTEND_URL} TEST_EMAIL={test_email} TEST_PASSWORD={test_password} \
npx playwright test testing/playwright-tests/{slug}-smoke.spec.ts \
  --reporter=json \
  --output=testing/playwright-results/smoke-run-{RUN_N}.json
```

Parse results. For each FAILED test:
→ Open `testing/playwright-tests/` screenshot/trace if captured

**If any P0 smoke test fails:**
```
🚫 BLOCKER: {N} smoke test(s) failed.

{list of failed tests with error summary}

Smoke failures block all further testing.
Options:
  1. [FIX] Auto-fix — I'll analyze and fix the issue now
  2. [SKIP] Skip and continue (mark tests as blocked)
  3. [ABORT] Stop testing session
```

Wait for user choice before continuing.

### 3B: E2E Playwright Tests

```
🎭 Running E2E Tests... ({N} test cases, est. {N} min)
```

Execute all Playwright E2E files:
```bash
FRONTEND_URL={FRONTEND_URL} \
npx playwright test testing/playwright-tests/{slug}-*.spec.ts \
  --ignore=*smoke* --ignore=*regression* \
  --reporter=json \
  --output=testing/playwright-results/e2e-run-{RUN_N}.json
```

### 3C: API/Integration Tests

If API tests were generated, execute them:
```bash
# Run API test cases from test-cases.md
# Use fetch/curl to execute each TC-API-NNN
```

For each API test case in `test-cases.md`:
1. Build the request from the test case definition
2. Execute via Bash `curl` or Node `fetch`
3. Compare actual response vs expected
4. Record PASS/FAIL

### 3D: Regression Tests

```
🔄 Running Regression Tests... ({N} cases, checking existing features)
```

```bash
FRONTEND_URL={FRONTEND_URL} \
npx playwright test testing/playwright-tests/{slug}-regression.spec.ts \
  --reporter=json \
  --output=testing/playwright-results/regression-run-{RUN_N}.json
```

---

## Step 4: Collect and Triage All Results

After all test types complete, aggregate:

```
📊 Test Run #{RUN_N} Results
══════════════════════════════════════════

  Smoke Tests:      {N_pass}/{N_total} PASS  {N_fail} FAIL
  E2E Tests:        {N_pass}/{N_total} PASS  {N_fail} FAIL
  API Tests:        {N_pass}/{N_total} PASS  {N_fail} FAIL
  Regression Tests: {N_pass}/{N_total} PASS  {N_fail} FAIL
                    ─────────────────────────────────────
  Total:            {N_pass}/{N_total} PASS  {N_fail} FAIL
  Pass Rate:        {%%}

  ❌ Failed tests:
  {list each failed test: ID | title | error summary}
```

For each FAILED test → auto-assign severity:
- P0: smoke failure or auth broken
- P1: Must Have story E2E failure
- P2: Should Have story or error state failure
- P3: Edge case or cosmetic E2E failure
- P4: Regression test failure on low-risk path

---

## Step 5: Create Bug Reports

For EACH failed test, create a bug file `{BUGS_DIR}/BUG-{NNN}.md`:

```markdown
# BUG-{NNN}: {short title}

> Severity: P{0-4} | Status: 🔴 Open
> Test Run: #{RUN_N} | Date: {date}
> Test Case: {TC-ID}

## Description
{Clear one-sentence description of what's wrong}

## Steps to Reproduce
1. {step}
2. {step}
3. {step}

## Expected Behavior
{What should happen per acceptance criteria}
> AC Reference: {US-NNN} — {AC text from spec.md}

## Actual Behavior
{What actually happened}

## Evidence
- Screenshot: `testing/playwright-results/{screenshot-name}.png`
- Trace: `testing/playwright-results/{trace-name}.zip`
- Error: `{error message / stack trace excerpt}`
- Console errors: `{browser console errors if any}`

## Gap Analysis
{Does this bug indicate a spec gap, implementation gap, or test gap?}
- [ ] Implementation bug (code doesn't match spec — fix code)
- [ ] Spec gap (spec is ambiguous — needs clarification)
- [ ] Test issue (test is wrong — fix test)
- [ ] Environment issue (test env problem — not a product bug)

## Fix Approach
{Agent's analysis of what needs to change}

## Fix Applied
{Filled after fix — what was changed, which files, which lines}

## Retest Result
{Filled after retest — PASS / FAIL / BLOCKED}
```

Update `{BUGS_DIR}/README.md` dashboard with all new bugs.

---

## Step 6: Gap Analysis — Spec Impact Check

For EACH open bug, analyze if it requires spec changes:

Read `spec.md` → find the acceptance criteria for the broken user story.

**Decision matrix:**

| Bug type | Impact on spec | Action |
|----------|---------------|--------|
| Implementation doesn't match clear AC | None — code is wrong | Fix code only |
| AC is ambiguous — multiple valid interpretations | Minor — clarify spec.md | Update spec.md § acceptance criteria |
| Bug reveals missing requirement | Medium — spec gap | Add requirement to spec.md + product-spec.md |
| Bug reveals incorrect requirement | Medium — spec error | Update spec.md + product-spec.md § {section} |
| Bug is valid behavior per spec but bad UX | Medium — UX gap | Flag to user — ask if spec should change |

For bugs that need spec updates:
```
📋 Spec Gap Detected — BUG-{NNN}

The failing test reveals that {spec.md § User Stories} needs clarification:

Current spec text:
> "{current AC text}"

Proposed update:
> "{proposed clearer text}"

Related: product-spec.md § {section} should also be updated.

Apply this spec update? [Yes / No / Modify]
```

Log all spec updates in `review.md` (continue the revalidation chain).

---

## Step 7: Auto-Fix Loop

For each P0/P1 bug in order, fix and retest:

### 7A: Fix

```
🔧 Fixing BUG-{NNN}: {title}
   Severity: P{N} | Test: {TC-ID}
```

Launch a Fix Agent with context:
> *"You are the Bug Fix Agent for Product Forge.*
> *Bug: {bug description}*
> *Failed test: {TC-ID} — {test file path}*
> *Expected behavior per spec: {AC text}*
> *Evidence: {error + screenshot description}*
> *Gap analysis: {implementation / spec / test gap}*
> *Fix ONLY what's needed to make this test pass without breaking others.*
> *After fixing, report: files changed + description of change."*

After fix agent returns:
- Update `BUG-NNN.md` § Fix Applied
- Record change in `{FEATURE_DIR}/review.md` (testing phase section)

### 7B: Retest the Fixed Bug

Run ONLY the failed test case:
```bash
npx playwright test --grep "TC-{ID}"
```

If PASS → mark `BUG-NNN.md` status: ✅ Verified
If FAIL again → escalate to user:
```
⚠️ BUG-{NNN} still failing after fix attempt.

First fix: {what was changed}
Still failing: {error}

This may need deeper investigation. Options:
  1. [RETRY] Try a different fix approach
  2. [MANUAL] Mark for manual developer review
  3. [SKIP] Skip and continue (lowers coverage)
```

### 7C: Check for Regression After Fix

After fixing any P0/P1 bug, immediately run smoke tests to ensure no regression:
```bash
npx playwright test --grep @smoke
```

If new smoke failures appeared:
```
⚠️ Fix for BUG-{NNN} caused regression:
  {N} smoke test(s) now failing that were passing before.
  Rolling back and trying alternative approach...
```

### 7D: Continue to Next Bug

After each fix+retest, show progress:
```
Bug Fix Progress: {N}/{N} fixed ✅ | {N} remaining | {N} skipped
```

---

## Step 8: Mid-Session Report (every 5 bugs or by user request)

```
📊 Testing Session Report — Run #{RUN_N}
══════════════════════════════════════════

  Bugs found this session: {N}
    🔴 P0 Blocker:  {N open} / {N total}
    🔴 P1 Critical: {N open} / {N total}
    🟡 P2 High:     {N open} / {N total}
    🟢 P3 Medium:   {N open} / {N total}
    🟢 P4 Low:      {N open} / {N total}

  Auto-fixed:  {N} bugs ✅
  Spec updates: {N} clarifications applied

  Blocking issues:
    {list P0 open bugs}

  Test coverage:
    Stories with full PASS: {N}/{N_must_have} Must Have
    Stories with partial:   {N}
    Stories blocked:        {N}
```

Ask: *"Continue fixing remaining bugs, or want to take over any fixes manually?"*

---

## Step 9: Full Retest Pass

After ALL auto-fixes applied, run the complete test suite once more:

```
🔁 Full Retest — Run #{RUN_N+1}
   Running complete test suite after all fixes...
```

Execute all test types again (Steps 3A–3D).

Compare vs. previous run:
```
Δ Retest Results:
  Before: {N_pass}/{N_total} ({%%})
  After:  {N_pass}/{N_total} ({%%})
  Improvement: +{N} tests now passing
  New failures: {N} (regression check)
```

---

## Step 10: Check Exit Criteria

Read exit criteria from `testing/test-plan.md`:

```
🎯 Exit Criteria Check:

  [ / ✅ / ❌] All P0 smoke tests PASS          — {N}/{N}
  [ / ✅ / ❌] All E2E happy paths PASS          — {N}/{N}
  [ / ✅ / ❌] ≥80% of all tests PASS            — {%%} (need 80%)
  [ / ✅ / ❌] Zero P0/P1 open bugs              — {N} open
  [ / ✅ / ❌] All P2+ bugs documented           — {N} with workarounds
```

### If EXIT CRITERIA MET → proceed to Step 11

### If NOT MET:

```
⚠️ Exit criteria not yet met:
  {list what's missing}

Options:
  A. Continue fixing P0/P1 bugs — [/speckit.product-forge.test-run resume]
  B. Override exit criteria — accept current state with documented risks
  C. Defer bugs to next sprint — create bug tracker issues, mark feature as conditional-done
```

Wait for user decision.

---

## Step 11: Generate Test Report

Create `{FEATURE_DIR}/test-report.md`:

```markdown
# Test Report: {Feature Name}

> Test Run: #{FINAL_RUN_N} | Date: {date}
> Result: ✅ PASS / ⚠️ PASS WITH KNOWN ISSUES / ❌ FAIL

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
| US-001: {title} | Must Have | TC-E2E-001,002 | ✅ PASS |
| US-002: {title} | Must Have | TC-E2E-005 | ⚠️ BUG-003 known |

## Bugs Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-001 | {title} | P1 | ✅ Fixed & Verified |
| BUG-002 | {title} | P2 | ✅ Fixed & Verified |
| BUG-003 | {title} | P2 | ⚠️ Deferred to next sprint |

## Spec Changes Applied During Testing
{List of spec.md / product-spec.md updates from gap analysis}

## Known Issues / Deferred Bugs
{Bugs accepted or deferred — with rationale and workaround}

## Conclusion
{Feature status: Ready to Ship / Ship with Known Issues / Needs More Work}

## Traceability
Full chain: Research → Product Spec → spec.md → Plan → Tasks → Code → Tests → Bugs → Fixes → Verified
```

---

## Step 12: Final Completion

Update `.forge-status.yml`:
```yaml
phases:
  test_run: completed        # or: completed_with_known_issues
testing:
  final_pass_rate: "{%%}"
  bugs_found: {N}
  bugs_fixed: {N}
  bugs_deferred: {N}
  test_runs_total: {N}
last_updated: "{ISO timestamp}"
```

Update feature `README.md` — Phase 8B ✅ Complete.

Show final message:
```
🎉 Testing Complete: {Feature Name}

Final Results:
  Pass rate: {%%} ({N}/{N} tests passing)
  Bugs found: {N} total
  Bugs fixed: {N} auto-fixed ✅
  Bugs deferred: {N} (documented)
  Test runs: {N} total

Traceability chain:
  Research ✅ → Product Spec ✅ → spec.md ✅ → Plan ✅
  → Tasks ✅ → Code ✅ → Verified ✅ → Tested ✅

This feature is READY TO SHIP. 🚀

All artifacts saved in: {FEATURE_DIR}/
  testing/test-plan.md
  testing/test-cases.md
  testing/playwright-tests/
  bugs/README.md + {N} BUG-*.md files
  test-report.md
```

---

## Operating Principles

1. **Smoke first.** Smoke failures block everything — fix them before running anything else.
2. **Never skip P0/P1.** P0 and P1 bugs must be fixed or explicitly deferred with user approval.
3. **One bug at a time.** Fix bugs sequentially to avoid conflicts between fixes.
4. **Smoke after every P0/P1 fix.** Catch regressions immediately.
5. **Honest reporting.** Never inflate pass rates. Skipped tests = skipped tests.
6. **Spec is the truth.** When test vs. code disagrees — check spec first. Code implements spec, not the test.
7. **Preserve evidence.** Screenshots, traces, console logs are stored — never deleted mid-session.
8. **Transparency on deferred bugs.** Any bug not fixed must be documented with rationale and workaround.
