# Journey Spec Template

> One file per journey at `product-spec/journeys/JRN-NNN-{slug}.md`, paired with an
> entry in `product-spec/journeys/journeys.yml` (the authoritative source — see
> [docs/journeys.md](../journeys.md)). The markdown is the human-readable narrative;
> the YAML drives Playwright-cli E2E generation. Keep them in sync.

```markdown
# JRN-{NNN}: {Journey title}

> Feature: `{feature-slug}` | Actor: {primary actor}
> Stories: {US-NNN, …} | Entry: {entry point} | Success: {success state}
> Related: [Product Spec](../product-spec.md) | [Component map](../mockups/component-map.yml)

## Preconditions
- {what must be true before the journey starts}

## Happy path
| Step | Action | UI (CMP-) | Expected result | Contract (API-) | Event (EVT-) |
|------|--------|-----------|-----------------|-----------------|--------------|
| STEP-001 | {user action} | CMP-{Component} | {expected} | API-{name} | — |
| STEP-002 | {user action} | CMP-{Component} | {expected} | API-{name} | EVT-{name} |

## Alternate flows
| Edge | Of step | Case | Given / When / Then | Priority |
|------|---------|------|---------------------|----------|
| EDGE-001 | STEP-002 | {alternate scenario} | GIVEN … / WHEN … / THEN … | P2 |

## Error / boundary cases
| Edge | Of step | Case | Given / When / Then | Priority |
|------|---------|------|---------------------|----------|
| EDGE-002 | STEP-002 | {failure} | GIVEN {API 500} / WHEN {save} / THEN {error toast, revert} | P1 |

## E2E
- Runner: `playwright-cli` (default)
- Smoke: {yes/no — include in smoke suite}
- Test cases: {TC-E2E-NNN, TC-SMK-NNN — filled by test-plan}
```

## Checklist before approving a journey
- [ ] Every step has an `expect`.
- [ ] Every backend step lists its `API-` contract.
- [ ] Every UI step references a `CMP-` component from the design-system manifest.
- [ ] Every branch/error is an `EDGE-` with GIVEN/WHEN/THEN and a priority.
- [ ] The journey maps to ≥1 user story; the YAML entry matches this narrative.
