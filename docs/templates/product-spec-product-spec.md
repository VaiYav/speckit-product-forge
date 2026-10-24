> Template for `product-spec/product-spec.md` — written by `product-spec` Step 4.

Scale each section to `SPEC_DETAIL` (Concise / Standard / Exhaustive). In express and
lite, drop the *Background & Research* subsection and every `../research/` link.

```markdown
# Product Spec: {Feature Name}

> Status: DRAFT | Version: 1.0 | Date: {date}
> Feature: `{feature-slug}` | Size: {FEATURE_SIZE}
>
> **Related documents:** [Journeys](./journeys/) | [Wireframes](./wireframes.md) | [Metrics](./metrics.md) | [Research →](../research/README.md)

## 1. Overview

### Problem Statement
{What problem does this solve? Why does it matter?}

### Solution Summary
{What are we building? 2-3 sentences.}

### Background & Research
Key findings from research phase:
- **Competitors:** {top finding from competitors.md}
- **UX/UI:** {top finding from ux-patterns.md}
- **Technical:** {top finding from codebase-analysis.md}

> Full research available in [research/README.md](../research/README.md)

## 2. Users & Personas

### Primary Persona
**Name:** {Persona Name}
**Role:** {Role}
**Context:** {When/why they use this feature}
**Goals:** {What they're trying to achieve}
**Frustrations:** {Current pain points}

### Secondary Personas (if applicable)
[...]

## 3. User Stories

### Must Have (MVP)
- [ ] As a {user}, I want to {action} so that {benefit}. **AC:** {acceptance criteria}
[...]

### Should Have
[...]

### Could Have (Future)
[...]

## 4. Feature Breakdown

### {Sub-feature or Section 1}
**Description:** {what it does}
**Key interactions:** {list}
**Edge cases:** {list}

[... repeat for each section]

## 5. Functional Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-001 | {requirement} | Must | |
[...]

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | {e.g., loads in <2s on 3G} |
| Accessibility | {WCAG 2.1 AA} |
| Security | {...} |

## 7. Out of Scope (v1)
{Explicit list of what is NOT in this version}

## 8. Success Criteria
{How we define done. Measurable outcomes.}

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {risk} | Low/Med/High | Low/Med/High | {mitigation} |

## 10. Open Questions
{Unresolved questions that need answers before or during implementation}

## 11. Decision Log
| Decision | Rationale | Date |
|----------|-----------|------|
| {decision} | {why} | {date} |
```
