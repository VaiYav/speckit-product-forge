> Template for the `research/<dimension>.md` reports — written by `research` Step 4 (one section per research agent).

Each research agent writes its own file under `{FEATURE_DIR}/research/` from the
section below that names it. Fill every placeholder; drop a section only where it
says so.

---

## competitors.md

```markdown
# Competitor Analysis: {Feature}

> Generated: {date} | Dimensions: {N competitors analyzed}

## Executive Summary
{2–3 paragraphs: dominant patterns, gaps, top recommendation}

## Competitors Analyzed

### 1. {Name} — [{score}/5]
- **Feature:** {how they implement it}
- **Core UX pattern:** {how user interacts}
- **Differentiator:** {unique strength}
- **Access:** Free/Premium/Paid
- **User sentiment:** {+positive / -negative patterns}
- **Reference:** {link if available}

[repeat for each competitor]

## Common Patterns
{What 80%+ of competitors do — table stakes}

## Differentiation Opportunities
{What no one does well — ranked by impact}

## Top 3 Reference Implementations
1. {Name} — {why it's best}
2. {Name} — {why}
3. {Name} — {why}
```

---

## ux-patterns.md

```markdown
# UX/UI Patterns: {Feature}

> Generated: {date}

## Core User Flows

### Primary (Happy Path)
{Step-by-step with expected user mental model at each step}

### Alternative Paths
{List of key alternative scenarios}

## State Inventory
| State | Trigger | Recommended Pattern |
|-------|---------|---------------------|
| Empty | No data yet | {recommendation} |
| Loading | Data fetching | {skeleton/spinner} |
| Error | Request failed | {user-friendly error} |
| Success | Action complete | {confirmation} |
| Partial | Some data missing | {graceful degradation} |

## UI Pattern Library
{3–5 proven patterns with sources and descriptions}

## Micro-interactions & Animations
{Key moments worth animating — entry, transition, confirmation, error}

## Accessibility Requirements (WCAG 2.1 AA)
{Specific criteria relevant to this feature — not generic}

## Platform Considerations
{Mobile: touch targets ≥44px, gesture conflicts, safe areas}
{Web: keyboard navigation, focus management}

## Anti-patterns to Avoid
{Common mistakes for this feature type — with explanations}

## Recommended Approach
{3–5 sentences synthesizing the best UX for our context}
```

---

## codebase-analysis.md

```markdown
# Codebase Analysis: {Feature}

> Generated: {date} | Codebase: {codebase_path}

## Architecture Overview
{High-level: what layers exist, how they're organized}

## Reusable Existing Code
| Component/Service | Location | How to Reuse |
|------------------|----------|--------------|
| {name} | {path} | {description} |

## Reference Implementations (Similar Features)
| Feature | Location | Key Pattern |
|---------|----------|-------------|
| {name} | {path} | {what to learn from it} |

## Integration Points
| Layer | Location | Change Type | Description |
|-------|----------|-------------|-------------|
| API | {path} | New endpoint | {description} |
| Service | {path} | Extend | {description} |
| DB | {schema} | New collection | {description} |
| UI | {path} | New component | {description} |

## Codebase Constraints

> Non-negotiable patterns and limitations discovered in the codebase.
> These MUST be reflected in spec.md and plan.md — ignoring them causes design bugs.

| Constraint | Source (file / ADR) | Impact on Feature Design |
|------------|---------------------|--------------------------|
| {e.g., all external service calls require a circuit breaker} | {path or ADR-NNN} | {must wrap X with circuit breaker} |
| {e.g., external service requires UUID v4 IDs, not sequential} | {path} | {ID generation strategy must change} |
| {e.g., cache keys follow `{module}:{entity}:{id}` pattern} | {constitution §IV} | {cache key design constraint} |
| {e.g., events emitted only after DB persist} | {constitution §V / path} | {event emission order} |

## Event / Message Patterns (if applicable)

> If the project uses event-driven architecture, document existing patterns here.
> These exact identifiers and payload shapes must be used in spec.md — invented names cause silent failures.

| Event / Topic | Exact Identifier | Payload Interface | Source File | Notes |
|---------------|-----------------|-------------------|-------------|-------|
| {event name} | `{EXACT_VALUE}` | `{InterfaceName}` | {path} | {emitted by / consumed by} |

> Leave empty and note "N/A — no EDA patterns detected" if not applicable.

## Data Model Impact
{New schemas, migrations, relationships}

## Technical Complexity
- **Overall:** Low / Medium / High
- **New modules:** {list or "none"}
- **Breaking change risk:** None / Low / Medium / High
- **Estimated touch points:** {N files/modules}

## Current Tech Capabilities
{What the project already supports that this feature leverages}

## Implementation Guidance
{2–3 key technical decisions or constraints for planning phase}
```

---

## tech-stack.md

```markdown
# Tech Stack Research: {Feature}

> Generated: {date}

## Sub-problems to Solve
{List of technical challenges this feature needs to address}

## Option Comparison

### Sub-problem 1: {name}
| Option | Stars | Downloads/wk | Bundle | License | Verdict |
|--------|-------|--------------|--------|---------|---------|
| {lib} | 12k | 800k | 45KB | MIT | ✅ Recommended |
| {lib} | 5k | 200k | 120KB | Apache | ⚠️ Heavy |

**Recommendation:** {option} — {rationale}

[repeat per sub-problem]

## Final Recommendation Stack
{Summary table: what to use for each need}

## Integration Notes
{How recommended libs fit into the existing tech stack}
```

---

## metrics-roi.md

```markdown
# Metrics & ROI: {Feature}

> Generated: {date}

## Industry Benchmarks
{What impact do similar features typically have? Sources cited.}

## User Impact Signals
| Metric | Expected Impact | Confidence | Source |
|--------|----------------|------------|--------|
| {metric} | +X% | High/Med/Low | {source} |

## Revenue Impact
{Direct/indirect revenue analysis}

## Effort vs. Impact
{Quick assessment: high/medium/low for both dimensions}

## Recommended KPIs
| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| {metric} | {current} | {goal} | {how} |

## Measurement Plan
- Day 1: {early signal}
- Week 1: {leading indicator}
- Month 1: {primary KPI review}
```
