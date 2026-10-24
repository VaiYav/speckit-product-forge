> Template for `code-review.md` — written by `code-review` Step 4.

Fill every placeholder. `spec-merge` reads the **Suggested canonical-spec updates**
section by that exact heading; omit the section only when Dimension 5 found no drift.
Status markers follow the [interaction legend](../interaction.md#4-rules).

````markdown
# Code Review: {Feature Name}

> Feature: {slug} | Date: {today}
> Files reviewed: {N} | Tasks covered: {N}/{N}
> Status: {APPROVED / APPROVED WITH CONDITIONS / NEEDS FIXES}

## Summary

| Dimension | CRITICAL | HIGH | MEDIUM | LOW | Total |
|-----------|:--------:|:----:|:------:|:---:|:-----:|
| Quality | {N} | {N} | {N} | {N} | {N} |
| Security | {N} | {N} | {N} | {N} | {N} |
| Patterns | {N} | {N} | {N} | {N} | {N} |
| Tests | {N} | {N} | {N} | {N} | {N} |
| Doc↔Code | {N} | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** |

**Recommendation:** {PROCEED TO VERIFY / FIX CRITICAL+HIGH FIRST / NEEDS REWORK}

## Machine gates

| Gate | Result | Notes |
|------|:------:|-------|
| Lint | {✅/❌} | {errors} |
| Types | {✅/❌} | {errors} |
| Security scan (SCA + SAST) | {✅/❌} | {high/critical findings} |
| Coverage | {✅/❌} | {actual vs minimum} |

## Positive Highlights

{2-3 things done well — good patterns, thorough error handling, clean architecture}

## Findings

{All REV-NNN entries, grouped by dimension, each in the block below}

### REV-{NNN} [{CRITICAL / HIGH / MEDIUM / LOW}]: {short title}

| Field | Value |
|-------|-------|
| **Dimension** | Quality / Security / Patterns / Tests / Doc↔Code |
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW |
| **File** | `{file path}:{line range}` |
| **Rule** | {which principle is violated} |

**What:** {description of the issue}

**Why it matters:** {impact — security risk, maintenance burden, bug risk}

**Suggested fix:**
```{language}
// Before
{current code}

// After
{suggested code}
```

## Required Before Verification (Phase 7)

{CRITICAL and HIGH findings that should be addressed}

## Suggested Improvements (Optional)

{MEDIUM and LOW findings — nice-to-have, not blocking}

## Test Coverage Gap Analysis

| Requirement | Test Status | Gap |
|------------|:----------:|-----|
| {requirements with missing or inadequate tests} |

## Suggested canonical-spec updates

> Doc↔code drift from Dimension 5 that `spec-merge` should reconcile. One row per
> proposed delta, keyed on `FR-*`; same carrier as `verify-full`'s
> "Suggested canonical-spec updates". Omit if no drift.

| FR / domain | Current canonical text | Observed-from-code behavior | Proposed delta |
|-------------|------------------------|-----------------------------|----------------|
| FR-NNN | {what the spec says} | {what the code actually does} | MODIFY FR-NNN: {proposed change} |
| {domain} | {none — undocumented} | {observed behavior} | ADD FR-NNN: {proposed addition} |

## Review Checklist

- [ ] All CRITICAL findings addressed
- [ ] All HIGH findings addressed or acknowledged
- [ ] Test coverage adequate for Must Have stories
- [ ] No security vulnerabilities in new code
````
