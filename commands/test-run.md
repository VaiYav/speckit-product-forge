---
name: speckit.product-forge.test-run
description: >
  Phase 8B: Executes test cases via playwright-cli (interactive browser agent),
  tracks bugs in bugs/<BUG-NNN>.md, auto-fixes P0/P1 bugs and retests,
  performs gap analysis when bugs require spec changes.
  Loop continues until all P0/P1 bugs closed and exit criteria met.
  Use with: "run tests", "execute tests", "/speckit.product-forge.test-run"
---

# Product Forge — Phase 8B: Test Execution & Bug Fix Loop

You are the **Test Execution Coordinator** for Product Forge Phase 8B.
Your goal: execute every test case from `testing/test-cases.md` using **playwright-cli**
(interactive browser agent), track every bug, auto-fix and retest,
and manage the loop until the feature is ready to ship.

**Execution model:** You drive the browser step-by-step using `playwright-cli` commands.
You read each test case's steps from `testing/test-cases.md`, open the browser,
execute each action, take screenshots as evidence, and record PASS / FAIL.
The `.spec.ts` files generated in Phase 8A are for CI/CD pipelines — they are NOT used here.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. `.forge-status.yml` → `test_plan: completed`
2. `testing/test-plan.md` exists
3. `testing/test-cases.md` exists with at least one `TC-*-NNN` entry
4. `testing/env.md` exists with FRONTEND_URL configured
5. `playwright-cli` is available (or `npx playwright-cli`)

If not ready:
> ⚠️ Test plan not found. Run `/speckit.product-forge.test-plan` first.

Load from `testing/test-plan.md`:
- `FRONTEND_URL`, `API_URL`, `TEST_TYPES`, test case counts
- Entry/exit criteria

Load from `testing/env.md`:
- `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD` (if present)
- Any additional environment-specific values

Initialize counters:
```
TEST_RUN = 1
BUGS_FOUND = 0
BUGS_FIXED = 0
BUGS_OPEN  = 0
BUG_SEQ    = 1    ← next BUG-NNN number
```

---

## Step 2: Pre-flight Checks

Verify the app is reachable before opening any browser:

```
🔍 Pre-flight check:

  playwright-cli available?  → playwright-cli --version
  App reachable?             → playwright-cli open {FRONTEND_URL} → snapshot → close
  API reachable?             → playwright-cli open {API_URL}/health → snapshot → close
  Test credentials?          → Verify testing/env.md is populated
```

**App reachability check:**
```bash
playwright-cli open {FRONTEND_URL}
playwright-cli snapshot
playwright-cli close
```

If the snapshot shows an error page, connection refused, or blank page:
```
⚠️ Cannot reach {FRONTEND_URL}.
Is the app running? Start it with:
  {suggest start command from package.json scripts.dev / scripts.start}

Waiting for your confirmation before running tests...
```

Do NOT proceed until app is reachable.

---

## Step 3: Auth Session Setup

Before running any tests that require authentication, establish a reusable auth session:

```
🔐 Setting up auth session...
```

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

Use the snapshot to find the correct element refs (`e1`, `e2`, etc.).
If login succeeds → save auth state for reuse across all authenticated tests.
If login fails → create BUG-001 (P0 Blocker) and stop.

---

## Step 4: Execute Tests — Ordered by Type

Execute test cases in this order (cheapest/fastest first):

```
Execution order:
  1. Smoke Tests     (TC-SMK-NNN) — block all others if failing
  2. E2E Tests       (TC-E2E-NNN)
  3. API Tests       (TC-API-NNN)
  4. Regression Tests (TC-REG-NNN)
```

### For each test case, follow this execution pattern:

#### 4.1 Read the test case

From `testing/test-cases.md`, read:
- `TC-ID` (e.g. TC-E2E-003)
- Preconditions (auth required? specific data state?)
- Test steps (numbered actions)
- Expected result

#### 4.2 Open browser and prepare

```bash
# For authenticated tests — load saved auth state:
playwright-cli -s=pf-test open {FRONTEND_URL}{start_path}
playwright-cli -s=pf-test state-load testing/playwright-results/auth-state.json

# For unauthenticated tests:
playwright-cli -s=pf-test open {FRONTEND_URL}{start_path}
```

Start tracing for evidence:
```bash
playwright-cli -s=pf-test tracing-start
```

#### 4.3 Execute each step

For each numbered step in the test case, translate to playwright-cli commands:

| Test case action | playwright-cli command |
|-----------------|------------------------|
| Navigate to URL | `playwright-cli -s=pf-test goto {URL}` |
| Click element | `playwright-cli -s=pf-test snapshot` → find ref → `playwright-cli -s=pf-test click e{N}` |
| Fill input | `playwright-cli -s=pf-test snapshot` → find ref → `playwright-cli -s=pf-test fill e{N} "{value}"` |
| Select dropdown | `playwright-cli -s=pf-test select e{N} "{value}"` |
| Check checkbox | `playwright-cli -s=pf-test check e{N}` |
| Press key | `playwright-cli -s=pf-test press Enter` |
| Wait for element | `playwright-cli -s=pf-test snapshot` → verify element is present |
| Scroll | `playwright-cli -s=pf-test mousewheel 0 300` |
| Verify text present | `playwright-cli -s=pf-test eval "document.body.innerText.includes('{text}')"` |
| Verify URL | `playwright-cli -s=pf-test eval "window.location.pathname"` |
| Check network error | `playwright-cli -s=pf-test console` / `playwright-cli -s=pf-test network` |

Take a snapshot **after every meaningful action** to confirm state.

#### 4.4 Take evidence screenshot

```bash
playwright-cli -s=pf-test screenshot --filename=testing/playwright-results/{TC_ID}-final.png
```

#### 4.5 Stop tracing and close

```bash
playwright-cli -s=pf-test tracing-stop
# → saves to testing/playwright-results/{TC_ID}-trace.zip automatically
playwright-cli -s=pf-test close
```

#### 4.6 Record result

Compare final snapshot with **Expected Result** from test case:
- **PASS** — final state matches expected result
- **FAIL** — state does not match, error shown, or unexpected behavior
- **BLOCKED** — prerequisite step failed (e.g. auth not available)

---

### 4A: Smoke Tests

```
🚬 Running Smoke Tests (TC-SMK-NNN)...
```

Execute each `TC-SMK-*` test case using the pattern above.

**If any smoke test results in FAIL:**
```
🚫 BLOCKER: Smoke test {TC-SMK-NNN} failed.

{description of failure from snapshot/screenshot}

Smoke failures block all further testing.
Options:
  1. [FIX] Auto-fix — I'll analyze and fix the issue now
  2. [SKIP] Skip this smoke test and continue (mark as blocked)
  3. [ABORT] Stop testing session
```

Wait for user choice before continuing.

### 4B: E2E Tests

```
🎭 Running E2E Tests (TC-E2E-NNN)...
  {N} test cases covering {N} user stories
```

Execute each `TC-E2E-*` test case. Reuse `pf-auth` auth state for authenticated tests.

### 4C: API Tests

If `TC-API-*` test cases exist in `testing/test-cases.md`:

```
🔌 Running API Tests (TC-API-NNN)...
```

For each API test case:
```bash
# Navigate to the API endpoint directly to verify response
playwright-cli -s=pf-api open {API_URL}{endpoint}
playwright-cli -s=pf-api snapshot
# Or use eval for POST/PUT:
playwright-cli -s=pf-api run-code "async page => {
  const res = await page.evaluate(async () => {
    const r = await fetch('{API_URL}{endpoint}', {
      method: '{METHOD}',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({PAYLOAD})
    });
    return { status: r.status, body: await r.json() };
  });
  return JSON.stringify(res);
}"
playwright-cli -s=pf-api close
```

Compare actual response status and body vs expected in test case.

### 4D: Regression Tests

```
🔄 Running Regression Tests (TC-REG-NNN)...
  Checking existing features are not broken by new implementation
```

Execute each `TC-REG-*` test case.

---

## Step 5: Collect and Triage All Results

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
  {list each: TC-ID | title | brief failure description}
```

For each FAILED test → auto-assign severity:
- **P0** — smoke failure, auth broken, or app unreachable
- **P1** — Must Have story E2E failure (happy path)
- **P2** — Should Have story or error-state failure
- **P3** — Edge case, cosmetic, or minor flow failure
- **P4** — Regression on low-risk path

---

## Step 6: Create Bug Reports

For EACH failed test, create `{BUGS_DIR}/BUG-{NNN}.md`:

```markdown
# BUG-{NNN}: {short title}

> Severity: P{0-4} | Status: 🔴 Open
> Test Run: #{RUN_N} | Date: {date}
> Test Case: {TC-ID} | Story: {US-NNN}

## Description
{Clear one-sentence description of what's wrong}

## Steps to Reproduce
1. Open: {FRONTEND_URL}{start_path}
2. {step}
3. {step}

## Expected Behavior
{What should happen per acceptance criteria}
> AC Reference: {US-NNN} — {AC text from spec.md}

## Actual Behavior
{What actually happened — from final snapshot / screenshot}

## Evidence
- Screenshot: `testing/playwright-results/{TC-ID}-final.png`
- Trace: `testing/playwright-results/{TC-ID}-trace.zip`
- Console errors: {from playwright-cli console output}
- Network: {from playwright-cli network output if applicable}

## Gap Analysis
- [ ] Implementation bug (code doesn't match spec — fix code)
- [ ] Spec gap (spec is ambiguous — needs clarification)
- [ ] Test issue (test steps are wrong — fix test case)
- [ ] Environment issue (test env problem — not a product bug)

## Fix Approach
{Agent's analysis of root cause and fix plan}

## Fix Applied
{Filled after fix — files changed, description of change}

## Retest Result
{Filled after retest — PASS / FAIL / BLOCKED}
```

Update `{BUGS_DIR}/README.md` dashboard with all new bugs.

---

## Step 7: Gap Analysis — Spec Impact Check

For each open bug, analyze whether it requires spec changes.
Read `spec.md` → find the acceptance criteria for the broken user story.

**Decision matrix:**

| Bug type | Impact on spec | Action |
|----------|---------------|--------|
| Implementation doesn't match clear AC | None — code is wrong | Fix code only |
| AC is ambiguous | Minor — clarify spec.md | Update spec.md § acceptance criteria |
| Bug reveals missing requirement | Medium — spec gap | Add to spec.md + product-spec.md |
| Bug reveals incorrect requirement | Medium — spec error | Update spec.md + product-spec.md |
| Valid behavior per spec but bad UX | Medium — UX gap | Ask user — should spec change? |

For bugs that need spec updates, show the user:
```
📋 Spec Gap Detected — BUG-{NNN}

The failing test reveals that {spec.md § User Stories} needs clarification:

Current spec text:
> "{current AC text}"

Proposed update:
> "{proposed clearer text}"

Apply this spec update? [Yes / No / Modify]
```

Log all spec updates in `review.md` (continue the revalidation chain).

---

## Step 8: Auto-Fix Loop

For each P0/P1 bug (in severity order), fix and retest:

### 8A: Fix

```
🔧 Fixing BUG-{NNN}: {title}
   Severity: P{N} | Test: {TC-ID}
```

Launch a Fix Agent:
> *"You are the Bug Fix Agent for Product Forge.*
> *Bug: {bug description}*
> *Failed test: {TC-ID} — steps: {steps from test case}*
> *Expected per spec: {AC text from spec.md}*
> *Evidence: {screenshot path} — {what was visible}*
> *Gap analysis: {implementation / spec / test / env}*
> *Fix ONLY what's needed. Report: files changed + description."*

After fix agent returns:
- Update `BUG-NNN.md` § Fix Applied
- Record in `{FEATURE_DIR}/review.md` (testing phase section)

### 8B: Retest the Fixed Bug

Re-execute ONLY the failed test case using playwright-cli:

```bash
playwright-cli open {FRONTEND_URL}{start_path}
playwright-cli state-load testing/playwright-results/auth-state.json  # if needed
# ... re-run exact steps from TC-{ID} ...
playwright-cli screenshot --filename=testing/playwright-results/{TC_ID}-retest.png
playwright-cli close
```

If PASS → update `BUG-NNN.md` status: `✅ Verified`
If FAIL → escalate:
```
⚠️ BUG-{NNN} still failing after fix attempt.

Fix applied: {what was changed}
Still failing: {snapshot / error description}

Options:
  1. [RETRY] Try a different fix approach
  2. [MANUAL] Mark for manual developer review
  3. [SKIP] Skip and continue (lowers coverage)
```

### 8C: Smoke Regression Check After Fix

After fixing any P0/P1 bug, re-run the smoke test cases to ensure no regression:

```bash
# Re-execute all TC-SMK-NNN cases using playwright-cli
```

If new smoke failures appeared:
```
⚠️ Fix for BUG-{NNN} caused smoke regression:
  {TC-SMK-NNN} now failing.
  Rolling back and trying alternative approach...
```

### 8D: Progress Update

After each fix+retest:
```
Bug Fix Progress: {N}/{N} fixed ✅ | {N} remaining | {N} skipped
```

---

## Step 9: Mid-Session Report (every 5 bugs or on request)

```
📊 Testing Session Report — Run #{RUN_N}
══════════════════════════════════════════

  Bugs found:  {N}
    🔴 P0 Blocker:  {N open} / {N total}
    🔴 P1 Critical: {N open} / {N total}
    🟡 P2 High:     {N open} / {N total}
    🟢 P3 Medium:   {N open} / {N total}
    🟢 P4 Low:      {N open} / {N total}

  Auto-fixed:   {N} ✅
  Spec updates: {N} clarifications applied

  Blocking issues:
    {list P0 open bugs}

  Story coverage:
    Full PASS: {N}/{N_must_have} Must Have stories
    Partial:   {N}
    Blocked:   {N}
```

Ask: *"Continue fixing remaining bugs, or want to take over any fixes manually?"*

---

## Step 10: Full Retest Pass

After ALL auto-fixes applied, run the complete suite once more using playwright-cli:

```
🔁 Full Retest — Run #{RUN_N+1}
   Re-executing all test cases after fixes...
```

Re-execute all test cases (Steps 4A–4D) using the same playwright-cli pattern.

Compare vs. previous run:
```
Δ Retest Results:
  Before: {N_pass}/{N_total} ({%%})
  After:  {N_pass}/{N_total} ({%%})
  Improvement: +{N} tests now passing
  New failures: {N} (regression check)
```

---

## Step 11: Check Exit Criteria

Load exit criteria from `testing/test-plan.md`:

```
🎯 Exit Criteria Check:

  [✅/❌] All P0 smoke tests PASS          — {N}/{N}
  [✅/❌] All E2E happy paths PASS          — {N}/{N}
  [✅/❌] ≥80% of all tests PASS            — {%%} (need 80%)
  [✅/❌] Zero P0/P1 open bugs              — {N} open
  [✅/❌] All P2+ bugs documented           — {N} with workarounds
```

### If EXIT CRITERIA MET → proceed to Step 12

### If NOT MET:

```
⚠️ Exit criteria not yet met:
  {list what's missing}

Options:
  A. Continue fixing P0/P1 bugs — [/speckit.product-forge.test-run resume]
  B. Override exit criteria — accept current state with documented risks
  C. Defer bugs to next sprint — mark feature as conditional-done
```

Wait for user decision.

---

## Step 12: Generate Test Report

Create `{FEATURE_DIR}/test-report.md`:

```markdown
# Test Report: {Feature Name}

> Test Run: #{FINAL_RUN_N} | Date: {date}
> Execution: playwright-cli (agent-driven, step-by-step)
> Result: ✅ PASS / ⚠️ PASS WITH KNOWN ISSUES / ❌ FAIL

## Executive Summary
{2-3 sentences: what was tested, how, overall outcome, key stats}

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
| US-001: {title} | Must Have | TC-E2E-001, TC-E2E-002 | ✅ PASS |
| US-002: {title} | Must Have | TC-E2E-005 | ⚠️ BUG-003 known |

## Bugs Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-001 | {title} | P1 | ✅ Fixed & Verified |
| BUG-002 | {title} | P2 | ⚠️ Deferred to next sprint |

## Evidence
All screenshots and traces saved in `testing/playwright-results/`:
- {TC-ID}-final.png — final state screenshot per test
- {TC-ID}-trace.zip — Playwright trace for debugging

## Spec Changes Applied During Testing
{List spec.md / product-spec.md updates from gap analysis}

## Known Issues / Deferred Bugs
{Bugs accepted or deferred — with rationale and workaround}

## Conclusion
{Feature status: Ready to Ship / Ship with Known Issues / Needs More Work}

## Traceability
Research → Product Spec → spec.md → Plan → Tasks → Code → Tests → Bugs → Fixes → Verified
```

---

## Step 13: Final Completion

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

Clean up browser sessions:
```bash
playwright-cli close-all
```

Update feature `README.md` — Phase 8B ✅ Complete.

Show final message:
```
🎉 Testing Complete: {Feature Name}

Final Results:
  Pass rate:     {%%} ({N}/{N} tests passing)
  Bugs found:    {N} total
  Bugs fixed:    {N} auto-fixed ✅
  Bugs deferred: {N} (documented)
  Test runs:     {N} total
  Evidence:      testing/playwright-results/ ({N} screenshots, {N} traces)

Traceability chain:
  Research ✅ → Product Spec ✅ → spec.md ✅ → Plan ✅
  → Tasks ✅ → Code ✅ → Verified ✅ → Tested ✅

This feature is READY TO SHIP. 🚀

All artifacts: {FEATURE_DIR}/
  testing/test-plan.md
  testing/test-cases.md
  testing/playwright-tests/     ← .spec.ts files for CI/CD
  testing/playwright-results/   ← screenshots + traces
  bugs/README.md + {N} BUG-*.md files
  test-report.md
```

---

## Operating Principles

1. **Smoke first.** Smoke failures block everything — fix before running anything else.
2. **playwright-cli is the execution engine.** Read test case steps → translate to CLI commands → verify from snapshot.
3. **Snapshot after every action.** Never assume state — always take a snapshot to confirm before the next step.
4. **Reuse auth state.** Log in once, save with `state-save`, load with `state-load` for all authenticated tests.
5. **Evidence is mandatory.** Screenshot + trace for every FAIL. Screenshots for every PASS final state.
6. **Never skip P0/P1.** Must be fixed or explicitly deferred with user approval.
7. **One bug at a time.** Fix sequentially to avoid conflicting fixes.
8. **Smoke after every P0/P1 fix.** Catch regressions immediately.
9. **Spec is the truth.** When test vs. code disagrees — check spec first.
10. **Transparent deferred bugs.** Any unfixed bug must be documented with rationale and workaround.
