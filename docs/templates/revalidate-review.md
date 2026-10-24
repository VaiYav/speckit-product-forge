> Template for `review.md` — written by `revalidate` Step 1 (skeleton), Step 3D
> (revision record), Step 4B (approval block) and Step 4C (drift warning).

## Skeleton (Step 1, when `review.md` does not exist)

```markdown
# Review Log: {Feature Name}

> Feature: {feature-slug} | Status: OPEN
> Started: {date}

## Current Status: UNDER REVIEW

## Open Questions Resolution

> Track how open questions from product-spec.md were answered during revalidation.
> Move resolved questions here instead of marking them ~~strikethrough~~ in the spec.

| # | Question | Decision | Rationale | Resolved in Revision |
|---|----------|----------|-----------|----------------------|
<!-- Add rows as questions are resolved -->

## Decision Log

> Key decisions made during revalidation — not individual edits, but significant choices.

| Date | Decision | Rationale |
|------|----------|-----------|
<!-- Append decisions as they are made -->

## Change History

> High-level version deltas — one line per revision.

<!-- Format: v1.0 → v1.1: [summary of what changed] -->

## Revision History

<!-- Individual revision records will be added below -->
```

## Revision record (Step 3D, appended under `## Revision History`)

```markdown
## Revision #{N} — {date}

**User feedback:**
> {user's original feedback verbatim}

**Changes applied:**
| File | Change Type | Description |
|------|-------------|-------------|
| {file} | Modify/Add/Remove/Restructure | {description} |

**Agent notes:**
{Any clarifications or edge cases the agent noted during revision}

---
```

## Approval block (Step 4B)

```markdown
## ✅ APPROVED — {date}

**Approved by user after {N} revision(s)**

**Final document inventory:**
| Document | Lines | Last Modified |
|----------|-------|---------------|
| product-spec.md | {N} | {date} |
| journeys/journeys.yml + JRN-*.md | {N} | {date} |
| wireframes* | {N} | {date} |
| metrics.md | {N} | {date} |
| mockups/ | {N} files | {date} |

**Status: LOCKED — Ready for SpecKit Bridge (Phase 4)**
```

## Drift warning (Step 4C, only when `spec.md` diverged)

```markdown
## ⚠️ Drift Warning — {date}

Product-spec was updated after spec.md was last generated.
The following sections diverged:
- {section}: {description of divergence}

Action required: re-run `/speckit.product-forge.bridge` to regenerate spec.md.
```
