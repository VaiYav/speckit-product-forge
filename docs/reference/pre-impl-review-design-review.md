> Reference for the design review — run by `pre-impl-review` Step 2 only when the feature has UI tasks.

# Design review

Load the wireframes / mockups from `product-spec/` and the recommendations in
`research/ux-patterns.md`. Each check below produces a table for the report's
**Design Review** section; every gap becomes a `D-NNN` finding. Status markers follow
the [interaction legend](../interaction.md#4-rules).

## 2A: State completeness

For each screen / view in the wireframes or user journeys:

| Screen | Happy State | Empty State | Loading State | Error State | Partial State | Offline State |
|--------|:-----------:|:-----------:|:-------------:|:-----------:|:-------------:|:------------:|
| {screen} | {✅/❌} | {✅/❌} | {✅/❌} | {✅/❌} | {✅/❌/N-A} | {✅/❌/N-A} |

Every missing state is a finding.

## 2B: UX pattern compliance

| UX Recommendation | Addressed in Wireframes? | Notes |
|-------------------|:------------------------:|-------|
| {recommendation from ux-patterns.md} | {✅/❌/Partially} | {details} |

## 2C: Accessibility pre-check

| Check | Status | Notes |
|-------|:------:|-------|
| Color contrast (text on backgrounds) | {✅/⚠️/❌} | |
| Touch target sizes (≥44×44px mobile) | {✅/⚠️/❌} | |
| Focus order logical | {✅/⚠️/❌} | |
| Screen reader landmarks defined | {✅/⚠️/❌} | |
| Error messages descriptive | {✅/⚠️/❌} | |
| Form labels present | {✅/⚠️/❌} | |

## 2D: Component reuse

From `research/codebase-analysis.md`, list existing components this feature should
reuse:

| Existing Component | Applicable For | Reuse Planned? |
|-------------------|---------------|:--------------:|
| {component from codebase-analysis} | {where in this feature} | {✅/❌} |

A new component planned where a reusable one exists is a finding.
