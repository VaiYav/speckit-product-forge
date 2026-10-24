> Template for `release-readiness.md` — written by `release-readiness` Step 6.

Fill every placeholder. Every supply-chain finding and every missing tool or provider
appears in **Action Items Before Ship**. Status markers follow the
[interaction legend](../interaction.md#4-rules).

```markdown
# Release Readiness: {Feature Name}

> Feature: {slug} | Date: {today}
> Verdict: {READY TO SHIP / CONDITIONALLY READY / NOT READY}

## Summary

| Category | Status | Action Items |
|----------|:------:|:------------:|
| Feature Flags & Rollout | {✅/⚠️/❌} | {N} |
| Documentation | {✅/⚠️/❌} | {N} |
| Monitoring & Observability | {✅/⚠️/❌} | {N} |
| Analytics | {✅/⚠️/❌} | {N} |
| Deployment Dependencies | {✅/⚠️/❌} | {N} |
| Security | {✅/⚠️/❌} | {N} |

## Prior Quality Gates

| Gate | Status | Date |
|------|:------:|------|
| Pre-Impl Review | {result from pre-impl-review.md or "Skipped"} | {date} |
| Code Review | {result from code-review.md or "Skipped"} | {date} |
| Verification | {result from verify-report.md} | {date} |
| Test Run | {result from test-report.md or "Skipped"} | {date} |
| API Docs | {result from api-docs/ or "Not run"} | {date} |
| Tracking Plan | {result from tracking/tracking-plan.md or "Not run"} | {date} |
| Security Check | {result from security-check.md or "Not run"} | {date} |

## Rollout Plan

{Rollout strategy from Step 1B}

## Rollback Plan

{Rollback plan from Step 1C}

## Action Items Before Ship

| # | Category | Action | Priority | Status |
|---|----------|--------|:--------:|:------:|
| 1 | {cat} | {action} | {MUST/SHOULD/NICE-TO-HAVE} | {TODO/DONE} |

## Ship Checklist

- [ ] All MUST-priority action items completed
- [ ] Feature flag configured and defaulting to OFF
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested or documented
- [ ] Team notified of upcoming release
- [ ] Release notes drafted

## Verdict

**{READY TO SHIP / CONDITIONALLY READY / NOT READY}**

{If CONDITIONALLY READY: list the conditions}
{If NOT READY: list the blockers}
```
