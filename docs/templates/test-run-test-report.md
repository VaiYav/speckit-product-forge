> Template for `test-report.md` — written by `test-run` Step 12.

With `KNOWN_ISSUES = true`, every open bug (deferred or blocked) goes into
*Known Issues / Deferred Bugs* with its rationale and workaround.

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
| BUG-002 | {title} | P2 | ⏸ Deferred to next sprint |

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
