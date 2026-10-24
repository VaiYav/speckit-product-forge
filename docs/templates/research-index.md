> Template for `research/README.md` — written by `research` Step 5.

Rows for optional dimensions (Tech Stack, Metrics) appear only when they ran.
The *Prior lessons that apply* section appears only when Step 3 matched lessons.

```markdown
# Research Index: {Feature Name}

> Generated: {date} | Feature: {feature-slug}
> Input richness: {score}/8 | Interview mode: {FULL/PARTIAL/CONFIRM}
> Research dimensions: {list completed}

## Executive Summary

{2–3 sentences synthesizing the most important findings across all dimensions}

## Key Findings

| Dimension | Top Insight |
|-----------|-------------|
| Competitors | {1-sentence finding} |
| UX/UI | {1-sentence finding} |
| Codebase | {1-sentence finding} |
| Constraints | {top codebase constraint that will affect spec/plan} |
| Tech Stack | {1-sentence finding — if researched} |
| Metrics | {1-sentence finding — if researched} |

## Research Documents

| Document | Status | Key Insight |
|----------|--------|-------------|
| [competitors.md](./competitors.md) | ✅ | {insight} |
| [ux-patterns.md](./ux-patterns.md) | ✅ | {insight} |
| [codebase-analysis.md](./codebase-analysis.md) | ✅ | {insight} |
| [tech-stack.md](./tech-stack.md) | ✅ Optional | {insight} |
| [metrics-roi.md](./metrics-roi.md) | ✅ Optional | {insight} |

## Prior lessons that apply

- **{lesson title}** ({date}) — {one-line relevance note}

## Synthesis: Recommended Approach
{4–6 sentences: what to build, how to build it, what to prioritize}

## Open Questions for Product Spec
{Questions research raised but couldn't answer — to resolve in Phase 2}

## Red Flags / Risks Identified
{Any significant risks discovered during research}
```

When `.product-forge/lessons.md` does not exist, replace the *Prior lessons* section
with the line `No prior lessons log yet`.
