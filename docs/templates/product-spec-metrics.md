> Template for `product-spec/metrics.md` — written by `product-spec` Step 4 (only when the user chose "Yes, detailed").

```markdown
# Metrics & Success Criteria: {Feature Name}

> Feature: {feature-slug} | Related: [Product Spec](./product-spec.md)

## Success Definition
{In plain language: what does "success" look like 30 days after launch?}

## KPIs

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| {metric} | {current} | {goal} | {how to measure} |

## Leading Indicators
{Early signals that show we're on track, before final KPIs are measurable}

## Guardrail Metrics
{Metrics that must NOT regress: {e.g., "P95 API response time must stay < 500ms"}}

## Measurement Plan
- **Day 1:** {what to check immediately after launch}
- **Week 1:** {early signals}
- **Day 30:** {primary KPI review}
- **Quarter:** {long-term impact}

## Anti-metrics (what failure looks like)
{What signals would tell us the feature failed or caused harm}
```
