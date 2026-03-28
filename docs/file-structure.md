# Product Forge — File Structure Reference

Every Product Forge feature lives in a self-contained directory under `features/`.
All documents within a feature are cross-linked via README.md index files.

---

## Feature Directory Layout

```
features/
└── {feature-slug}/                          ← One folder per feature
    │
    ├── README.md                            ← 🗂️ Feature root index (all phases + links)
    ├── .forge-status.yml                    ← 📊 Phase tracker (read by all commands)
    │
    ├── research/                            ← Phase 1 artifacts
    │   ├── README.md                        ← Research index + executive summary
    │   ├── competitors.md                   ← [MANDATORY] Competitor analysis
    │   ├── ux-patterns.md                   ← [MANDATORY] UX/UI best practices
    │   ├── codebase-analysis.md             ← [MANDATORY] Integration points
    │   ├── tech-stack.md                    ← [OPTIONAL] Library recommendations
    │   └── metrics-roi.md                   ← [OPTIONAL] Business impact
    │
    ├── product-spec/                        ← Phase 2 artifacts
    │   ├── README.md                        ← Spec index + document map
    │   ├── product-spec.md                  ← Main PRD document
    │   │
    │   ├── user-journey.md                  ← User flows (single file)
    │   │   OR                               ← OR decomposed (large features):
    │   ├── user-journey-{flow-name}.md      ← One file per major flow
    │   ├── user-journey-{flow-name}.md
    │   │
    │   ├── wireframes.md                    ← Wireframes (single .md file)
    │   │   OR                               ← OR:
    │   ├── wireframe-{screen}.html          ← One HTML file per screen (basic)
    │   │   OR                               ← OR:
    │   └── wireframes/                      ← Folder for multi-screen HTML wireframes
    │       ├── index.html                   ← Navigation hub
    │       ├── wireframe-{screen-1}.html
    │       └── wireframe-{screen-2}.html
    │
    │   ├── metrics.md                       ← [OPTIONAL] KPIs and success criteria
    │   │
    │   └── mockups/                         ← [OPTIONAL] High-fidelity HTML mockups
    │       ├── index.html                   ← Navigation hub (links all screens)
    │       ├── mockup-{screen-1}.html
    │       └── mockup-{screen-2}.html
    │
    ├── spec.md                              ← Phase 4: SpecKit specification
    ├── plan.md                              ← Phase 5: Technical plan (SpecKit)
    ├── tasks.md                             ← Phase 5: Task breakdown (SpecKit)
    ├── review.md                            ← Phase 3: Revalidation log
    └── verify-report.md                     ← Phase 7: Verification report
```

---

## Decomposition Rules

Product Forge automatically suggests decomposition when documents would be too large.
The decomposition threshold is `max_tokens_per_doc` in config (default: 4000 tokens ≈ 3000 words).

| Document | When to Decompose | How |
|----------|------------------|-----|
| `user-journey.md` | > 2 distinct user flows, or large feature | One `.md` file per flow |
| `wireframes.md` | > 3 screens, or HTML detail requested | One `.html` file per screen in `wireframes/` |
| `mockups/` | Always decomposed when > 1 screen | One `.html` per screen + `index.html` |
| `product-spec.md` | Almost never — keep as single source of truth | Use sections/headers instead |

---

## Cross-linking Convention

All documents use **relative links**. Every generated document includes a navigation header:

```markdown
> Related: [Product Spec](./product-spec.md) | [User Journey](./user-journey.md) | [Research →](../research/README.md)
```

HTML files include an in-page navigation bar linking sibling screens.

---

## .forge-status.yml Schema

```yaml
feature: "feature-slug"               # kebab-case feature identifier
created_at: "2026-03-28"              # ISO date
phases:
  research: pending                   # pending | in_progress | completed | skipped
  product_spec: pending
  revalidation: pending               # uses "approved" instead of "completed"
  bridge: pending
  plan_tasks: pending                 # covers both plan + tasks sub-phases
  implement: pending
  verify: pending
speckit_mode: ""                      # "classic" | "v-model" — set in Phase 4
last_updated: "2026-03-28T10:00:00"   # ISO timestamp
```

---

## review.md Schema

```markdown
# Review Log: {Feature Name}

> Feature: {slug} | Status: OPEN | APPROVED
> Started: {date}

## Current Status: UNDER REVIEW | APPROVED

## Revision History

## Revision #1 — {date}
**User feedback:** > {verbatim}
**Changes applied:** | File | Type | Description |
**Agent notes:** {notes}

---

## ✅ APPROVED — {date}
**Approved after {N} revision(s)**
**Final document inventory:** | Document | Lines | Last Modified |
**Status: LOCKED**
```

---

## verify-report.md Schema

```markdown
# Verification Report: {Feature}

## Summary
| Status | Count |
| ❌ CRITICAL | N |
| ⚠️ WARNING  | N |
| ✅ PASSED   | N |

**Overall verdict:** PASS | PASS WITH WARNINGS | FAIL

## Layer 1: Code ↔ Tasks
## Layer 2: Code ↔ Plan
## Layer 3: User Stories ↔ Implementation
## Layer 4: spec.md ↔ product-spec.md Drift
## Layer 5: Research Alignment
## Layer 6: Document Integrity

## Critical Issues (if any)
## Warnings (if any)
## Traceability Matrix
## Conclusion
```

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Feature directory | `kebab-case` | `push-notification-preferences` |
| User journey files | `user-journey-{flow}.md` | `user-journey-settings.md` |
| Wireframe files | `wireframe-{screen}.html` | `wireframe-home-screen.html` |
| Mockup files | `mockup-{screen}.html` | `mockup-settings-panel.html` |
| Feature slug in YAML | `kebab-case` | `push-notification-preferences` |
| User story IDs | `US-NNN` (3 digits) | `US-001`, `US-012` |
| Functional req IDs | `FR-NNN` | `FR-001`, `FR-012` |
