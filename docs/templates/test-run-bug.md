> Template for `bugs/BUG-{NNN}.md` — written by `test-run` Step 6.

Status values follow the legend in `bugs/README.md`
([test-plan-bugs-readme.md](./test-plan-bugs-readme.md)). `## Fix Applied` gets
one `Attempt {n}: {files changed} — {description}` line per fix attempt (Step 8A).

```markdown
# BUG-{NNN}: {short title}

> Severity: P{0-4} | Status: 🔴 Open
> Test Run: #{RUN_N} | Date: {date}
> Test Case: {TC-ID} | Story: {US-NNN}
> Journey: {JRN-NNN} | Step/Edge: {STEP-NNN|EDGE-NNN}

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
