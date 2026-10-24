> Template for `pre-impl-review.md` — written by `pre-impl-review` Step 5.

Fill every placeholder. With no UI tasks, replace the Design Review body with
"Skipped — no UI". Status markers follow the
[interaction legend](../interaction.md#4-rules).

```markdown
# Pre-Implementation Review: {Feature Name}

> Feature: {slug} | Date: {today}
> Reviewer: Product Forge Pre-Impl Review Agent
> Status: {APPROVED / APPROVED WITH CONDITIONS / NEEDS REVISION}

## Summary

| Section | Findings |
|---------|----------|
| Design Review | {N} issues ({N} critical, {N} warning) {or "Skipped — no UI"} |
| Architecture Review | {N} issues ({N} critical, {N} warning) |
| Risk Assessment | {N} risks ({N} critical, {N} high, {N} medium, {N} low) |

**Recommendation:** {PROCEED / PROCEED WITH CONDITIONS / REVISE PLAN}

## Design Review

### State Completeness
{table from Step 2A}

### UX Pattern Compliance
{table from Step 2B}

### Accessibility Pre-Check
{table from Step 2C}

### Component Reuse
{table from Step 2D}

### Design Findings

| ID | Severity | Finding | Recommendation |
|----|:--------:|---------|---------------|
| D-001 | {CRITICAL/WARNING/INFO} | {finding} | {recommendation} |

## Architecture Review

### Structural Checks
{table from Step 3A}

### Integration Points
{table from Step 3B}

### NFR Coverage
{table from Step 3C}

### Architecture Findings

| ID | Severity | Finding | Recommendation |
|----|:--------:|---------|---------------|
| A-001 | {CRITICAL/WARNING/INFO} | {finding} | {recommendation} |

## Risk Assessment

### Risk Register
{table from Step 4, plus one line per dropped prior lesson}

### Rollout Strategy
{recommendation from Step 4}

### Risk Mitigations Required Before Coding

{Mitigations that must be addressed before Phase 6 begins}

## Conditions for Approval

{Conditions that must be met — e.g. "Add loading state to settings screen wireframe",
"Define retry strategy for external API calls", "Add feature flag task to tasks.md"}

## Pre-Implementation Checklist

- [ ] All CRITICAL design findings resolved
- [ ] All CRITICAL architecture findings resolved
- [ ] All Critical-severity risks have documented mitigations
- [ ] Rollout strategy agreed upon
- [ ] tasks.md updated with any new tasks from this review
```
