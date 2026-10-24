> Template for `spec.md` — written by `bridge` Step 5.

Include the three conditional sections only when their condition holds (see `bridge`
Step 5): **Prerequisites** (related features found), **EDA Events** (event-driven
patterns in `research/codebase-analysis.md`), **Consumer Contract**
(`FEATURE_TYPE = shared_infrastructure`). Omit each one entirely otherwise.

````markdown
# Spec: {Feature Name}

> **Product Forge Feature** | Generated: {date}
> Feature slug: `{feature-slug}` | SpecKit mode: {SPECKIT_MODE}
>
> **Source artifacts:**
> - Product Spec: [product-spec/README.md](./product-spec/README.md)
> - Research: [research/README.md](./research/README.md)
> - Review log: [review.md](./review.md)

---

## Overview

### What We're Building
{2-3 sentences from product-spec.md overview}

### Why We're Building It
{Problem statement + business justification from product-spec.md}

### Research Backing
This spec is backed by a full research phase covering:
- **Competitor analysis:** {top insight from competitors.md — what best implementations do}
- **UX/UI patterns:** {top recommendation from ux-patterns.md}
- **Codebase analysis:** {integration approach from codebase-analysis.md}

> Deep-dive: [research/README.md](./research/README.md)

---

## Prerequisites

| Priority | Feature | Status | Relationship | What's Needed |
|----------|---------|--------|--------------|---------------|
| P1 | {feature-slug} | {✅ done / ⚠️ partial / ⏳ pending} | blocks / complements | {what must exist before this feature can ship} |

---

## Goals

### Primary Goal
{Single most important user outcome}

### Secondary Goals
{2-3 supporting goals}

### Non-Goals (v1 scope)
{Explicit out-of-scope list from product-spec.md}

---

## Users

### Primary Persona
**{Persona Name}** — {role and context}
Key need: {what they need from this feature}

### Secondary Personas
{if any}

---

## User Stories

> Full structured journeys: [product-spec/journeys/](./product-spec/journeys/)

### Must Have (MVP)

- [ ] **{US-001}** As a {user}, I want to {action} so that {benefit}.
  - **AC:** {acceptance criteria — specific, testable}
  - **Wireframe ref:** [{screen name}](./product-spec/wireframes.md#{anchor})

- [ ] **{US-002}** ...

### Should Have

- [ ] **{US-0N}** ...

### Could Have (Future)

- [ ] **{US-0N}** ...

---

## Functional Requirements

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| FR-001 | {requirement} | Must | US-001 |
| FR-002 | {requirement} | Should | US-005 |

---

## Non-Functional Requirements

| Category | Requirement | Source |
|----------|-------------|--------|
| Performance | {e.g., API response < 300ms P95} | research/codebase-analysis |
| Accessibility | WCAG 2.1 AA | research/ux-patterns |
| Security | {relevant requirement} | — |
| Scalability | {requirement} | — |

## NFR Measurement Contract

> Every NFR must have a corresponding measurable signal. Without this, the NFR cannot be verified.
> Rule: if you can't define how to measure it, it is not a real NFR.

| NFR | How to Measure | Signal / Query | Threshold |
|-----|----------------|----------------|-----------|
| {e.g., P95 latency ≤ 300ms} | {e.g., `api_response_time` event, p95 field} | {analytics query or dashboard} | {value} |
| {e.g., Error rate < 0.5%} | {e.g., `request_failed` / `request_total`} | {query} | {value} |

---

## Technical Context

> Detailed analysis: [research/codebase-analysis.md](./research/codebase-analysis.md)

### Integration Points
{Summary of where new code plugs into the existing codebase}

### Reusable Components
{List of existing components/services that can be leveraged}

### New Modules Required
{List of new modules/services to create}

### Data Model Impact
{Schema changes, migrations, new collections}

### Tech Stack Notes
{Relevant tech stack decisions from research/tech-stack.md if available}

### Codebase Constraints

> From `research/codebase-analysis.md` — constraints the architecture must respect.

| Constraint | Source | Impact |
|------------|--------|--------|
| {e.g., circuit breaker required for external calls} | {ADR or file path} | {how it shapes design} |
| {e.g., ID format restrictions} | {source} | {impact} |

---

## EDA Events

| Direction | Event Name | Exact Identifier | Payload Contract | Source File | Status |
|-----------|------------|-----------------|-----------------|-------------|--------|
| emits | {event} | `{EXACT_ENUM_OR_CONSTANT}` | {interface / schema ref} | {path} | exists / to create |
| listens | {event} | `{EXACT_ENUM_OR_CONSTANT}` | {interface / schema ref} | {path} | exists / to create |

> Every event marked "to create" must become a task in tasks.md: "Define event [name] + payload interface".

---

## Consumer Contract

> Include this section only when `FEATURE_TYPE = shared_infrastructure`.
> Omit entirely for end-user features.
>
> Defines the public surface that downstream consumers must depend on.
> Anything not listed here is an internal implementation detail and may change without notice.

### Public API

```typescript
// The single exported surface consumers should use:
// {ServiceName}.{method}(params: {InputType}): Promise<{OutputType}>
//
// Example:
// const result = await this.{serviceName}.{method}({ userId, query });
```

### Consumer Utilities

| Utility | Purpose | Usage |
|---------|---------|-------|
| `{FormatterName}` | {what it formats} | `{FormatterName}.format(rawResult)` |
| `{AdapterName}` | {what it adapts} | `{AdapterName}.toPromptContext(data)` |

### Fallback Behaviour

| Failure Mode | What Consumers Receive | Consumer Action Required |
|--------------|----------------------|--------------------------|
| Service unavailable | `null` / empty result | Use cached or default value |
| Partial result | Result with `partial: true` flag | Degrade gracefully |
| Timeout | Throws `ServiceTimeoutError` | Catch and fall back |

### Integration Pattern

```typescript
// Recommended consumer integration:
// const raw = await this.{serviceName}.{method}(userId, input);
// const context = {FormatterName}.format(raw);
// // → inject context into downstream process
```

---

## Acceptance Criteria

Each user story's AC is listed above. Additionally, the feature is considered complete when:

1. All Must Have user stories are implemented and tested
2. All wireframes match the implemented UI within acceptable deviation
3. Performance NFRs are met (as measured by {measurement method})
4. Accessibility requirements pass automated + manual testing
5. {Additional global AC from product-spec.md}

---

## Success Metrics

> Full metrics definition: [product-spec/metrics.md](./product-spec/metrics.md)

Primary KPI: {metric name} — Target: {value} (Baseline: {current value})

---

## Testing Specification

### Coverage Targets

| Module / Service | Target Coverage | Test Type |
|-----------------|----------------|-----------|
| {module} | {e.g., ≥ 80%} | unit / integration |

### Critical Test Cases

Minimum required test cases (happy path + key edge cases per critical component):

| # | Scenario | Input | Expected Output | Type |
|---|----------|-------|----------------|------|
| TC-001 | {happy path} | {input} | {expected} | unit / integration / e2e |
| TC-002 | {error path} | {input} | {expected} | unit |
| TC-003 | {edge case} | {input} | {expected} | unit |

### E2E Scenarios

| TC-ID | Scenario | Entry Point | Exit Condition |
|-------|----------|------------|----------------|
| TC-E2E-001 | {full happy path} | {starting state} | {success state} |
| TC-E2E-002 | {failure/recovery} | {starting state} | {graceful error state} |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| {risk from product-spec.md} | High/Med/Low | {mitigation} |

---

## Wireframes Reference

> Visual wireframes: [product-spec/wireframes*](./product-spec/)

Key screens:
{for each screen: name + 1-line description + link}

---

## Open Questions

{Remaining open questions from product-spec.md that implementation must resolve}
````
