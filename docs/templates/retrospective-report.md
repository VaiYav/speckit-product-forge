> Template for `retrospective.md` — written by `retrospective` Step 4.

Status cells use the legend: ✅ on target / exceeded · ⚠️ below target.
When `research/metrics-roi.md` was missing, the *Predicted* column reads `N/A`.

````markdown
# Post-Launch Retrospective: {Feature Name}

> Shipped: {launch_date} | Retrospective: {today}
> Days since launch: {N} | Feature: `{feature-slug}`

## Lifecycle Summary

```
Phase 0 Problem Discovery  → {date} — {duration}
Phase 1 Research           → {date} — {duration}
Phase 2 Product Spec       → {date} — {duration}
Phase 3 Revalidation       → {date} — N iterations
Phase 4 Bridge             → {date}
Phase 5-6 Implement        → {date} — {duration}
Phase 7 Verify             → {date}
Phase 8A Test Plan         → {date}
Phase 8B Test Run          → {date} — {N} bugs found, {N} fixed
Ship Date                  → {date}
Retrospective              → {today} ({N} days post-launch)
```

Total time: research → ship = {N} days

## Predicted vs Actual

| Metric | Predicted | Actual | Delta | Status |
|--------|-----------|--------|-------|--------|
| Adoption (30-day) | {N}% | {N}% | {+/-N}% | {✅ On target / ⚠️ Below / ✅ Exceeded} |
| Completion rate | {N}% | {N}% | {+/-N}% | |
| P95 response time | <{N}ms | {N}ms | {+/-N}ms | |
| Error rate | <{N}% | {N}% | {+/-N}% | |
| {Business metric} | {target} | {actual} | {delta} | |
| ROI payback | {N} months | {estimate} | | |

## Performance Data ({apm_provider})

### Request Volume
{chart or table of daily requests since launch}

### Error Rate
{error rate trend — target vs actual}

### P95 Response Time
{latency trend}

## Analytics Funnel

```
{feature}_viewed:    {N} unique users ({N}% of DAU)
{feature}_started:   {N} users ({conversion}%)
{feature}_completed: {N} users ({conversion}%)
{feature}_abandoned: {N} users ({abandonment}%)

Completion rate: {N}% (target was {N}%)
Abandonment rate: {N}%
  Top drop-off step: {step} ({N}% abandon here)
```

## Error Analysis

| Error Code | Count | % of Sessions | Root Cause | Status |
|------------|-------|--------------|------------|--------|
| {error_code} | {N} | {N}% | {cause} | {fixed / known / investigating} |

## What Went Right ✅

1. **{aspect}** — {what worked and why}
2. **{aspect}** — {what worked and why}
3. **{aspect}** — {what worked and why}

## What Could Be Better ⚠️

1. **{aspect}** — {what didn't go as expected}
   *Root cause:* {why}
   *Fix for next time:* {improvement}

2. **{aspect}** — {what didn't go as expected}
   *Root cause:* {why}
   *Fix for next time:* {improvement}

## Research Accuracy Audit

*How well did Phase 1 research predict reality?*

| Research Prediction | Actual | Accuracy |
|--------------------|--------|----------|
| {competitor had this feature} | {confirmed/wrong} | ✅/❌ |
| {user pain point assumed} | {validated/invalidated} | ✅/❌ |
| {tech complexity estimate} | {vs actual} | ✅/❌ |
| {adoption metric predicted} | {vs actual} | ✅/❌ |

Research accuracy score: {N}/10

## Open Issues & Follow-up

| ID | Type | Description | Priority | Owner |
|----|------|-------------|----------|-------|
| {ID} | Bug | {description} | {P0-P4} | {owner} |
| {ID} | Enhancement | {description} | {High/Med/Low} | |
| {ID} | Tech debt | {description} | | |

## Next Steps

Based on the data:

1. **{action}** — {rationale from data}
2. **{action}** — {rationale from data}
3. **{action}** — {rationale from data}

*If adoption < target:* {specific recommendation — onboarding, push notification, A/B test}
*If completion < target:* {specific recommendation — UX improvement, step simplification}
*If error rate > target:* {specific recommendation — fix list, monitoring alert}

## Lessons Learned for Future Features

1. **Process:** {what to do differently in the lifecycle}
2. **Research:** {what to research more/less thoroughly}
3. **Implementation:** {technical patterns to adopt or avoid}
4. **Testing:** {what the test phase caught / missed}
````
