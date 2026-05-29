---
name: speckit.product-forge.product-spec
description: >
  Phase 2: Interactive product specification creation. Asks detailed questions about
  desired level of detail and document decomposition. Creates product-spec.md,
  structured journeys (journeys/journeys.yml as the E2E source of truth), wireframes,
  metrics.md, and design-system-grounded clickable mockups with a component map.
  All documents are cross-linked via product-spec/README.md index.
  Use with: "create product spec", "/speckit.product-forge.product-spec"
---

# Product Forge — Phase 2: Product Spec Creation

You are the **Product Spec Architect** for Product Forge Phase 2.
Your goal: transform research findings into a complete, structured, and fully linked
product specification — the definitive source of truth before any code is written.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Load Context

Read:
- `{FEATURE_DIR}/research/README.md` — research summary
- `{FEATURE_DIR}/research/competitors.md` — competitor insights
- `{FEATURE_DIR}/research/ux-patterns.md` — UX/UI patterns
- `{FEATURE_DIR}/research/codebase-analysis.md` — integration analysis

Set `PRODUCT_SPEC_DIR = {FEATURE_DIR}/product-spec/`

---

> **Interaction (normative):** every question in this phase uses the structured
> convention in [docs/interaction.md](../docs/interaction.md) (ready snippets in
> [docs/templates/interaction-prompts.md](../docs/templates/interaction-prompts.md)).
> Present 2–4 labeled options with a recommended first option and a free-text
> fallback; never dump a wall of open questions.

## Step 2: Detail Level Configuration

This is the most important configuration step. Ask the user the questions below as
discrete structured prompts (one decision each, related toggles grouped) before
creating any documents.

### 2A. Feature Complexity Assessment

Ask: *"How large/complex is this feature?"*
- **Small** — Single screen or widget, 1-2 user flows, clear scope
- **Medium** — 2-4 screens, multiple user roles or states, moderate complexity
- **Large** — 5+ screens, multiple interconnected flows, requires decomposition into sub-features

Store as `FEATURE_SIZE`.

---

### 2B. Product Spec Main Document — Detail Level

Ask: *"How detailed should the main product-spec.md be?"*

- **Concise** — 2-3 pages: feature summary, top 5 user stories, key metrics, decision log. Fast to write, fast to read.
- **Standard** — 5-8 pages: full personas, user stories with acceptance criteria, feature breakdown, risks. Recommended for most features.
- **Exhaustive** — 10+ pages: full PRD format with business justification, all scenarios, competitive positioning, legal/compliance notes, launch criteria.

Store as `SPEC_DETAIL`.

---

### 2C. User Journeys — Structured (E2E source of truth)

User journeys are **structured artifacts**, not free-form prose — they are the
deterministic source for E2E tests (Playwright-cli). They are authored per the
schema in [docs/journeys.md](../docs/journeys.md) using the
[journey-spec template](../docs/templates/journey-spec.md).

Ask (structured): *"How many distinct user journeys does this feature have?
(best estimate)"* → store as `JOURNEY_COUNT`.

Each journey gets a stable `JRN-NNN` id with ordered `STEP-NNN`s (action +
expected result) and explicit `EDGE-NNN`s for alternate/error/boundary cases
(GIVEN/WHEN/THEN + priority). Steps reference design-system components (`CMP-*`,
from §2E) and backend contracts (`API-*`). Output goes to `product-spec/journeys/`
with `journeys.yml` as the authoritative index.

For each journey, confirm the edge cases with the user via a structured prompt
(don't leave error handling implicit) before writing.

---

### 2D. Wireframes — Format and Detail

Ask: *"What level of wireframe fidelity do you need?"*

- **Text/ASCII** — Markdown text descriptions + ASCII box diagrams. Fast, version-controlled, no tools needed.
- **Basic HTML** — Simple HTML wireframe per screen: boxes, labels, basic layout. Opens in any browser.
- **Detailed HTML** — Full HTML/CSS interactive wireframe with actual colors, typography, spacing, hover states. Styled to match project design system if CSS found in codebase.

Also ask: *"Should wireframes be decomposed by screen? If yes, approximately how many screens?"*
Store as `WIREFRAME_DETAIL`, `WIREFRAME_SCREEN_COUNT`.

If `WIREFRAME_SCREEN_COUNT > 3`, auto-suggest decomposition into individual files.

---

### 2E. Mockups — Design-system-grounded clickable prototype

Mockups are grounded in the project's **real, in-code design system** and decompose
into **real components**, so they transfer cleanly into the codebase.

**Step 1 — Harvest the design system (if UI).** Delegate to
[`speckit.product-forge.design-system-harvest`](./design-system-harvest.md). It
emits `design-system/manifest.yml` (components with `CMP-` ids, props, variants,
stable selectors, and in-code token references). The design system stays in code as
the single source of truth — we harvest a manifest, never duplicate it.

**Step 2 — Choose fidelity** (structured prompt). Read `default_mockup_style` from
config (`"none" | "generic" | "project-styled"`) and present that value as the
**pre-selected / recommended** option:
- **`none`** (`MOCKUP_STYLE = "none"`) — wireframes are sufficient; skip mockups.
- **`generic`** (`MOCKUP_STYLE = "generic"`) — clickable multi-screen HTML
  prototype with a clean generic design system (used when no in-code design system
  was harvested).
- **`project-styled`** (`MOCKUP_STYLE = "project-styled"`, default) — clickable
  multi-screen HTML prototype that uses the harvested tokens/components, navigable
  between screens, mapping 1:1 to real components (e.g.
  `<button data-cmp="button" class="...">` reflecting `CMP-Button` variant
  `primary`).

Ask (structured): *"How many mockup screens?"* → store `MOCKUP_SCREEN_COUNT`.
Store fidelity as the canonical config value `MOCKUP_STYLE` (`none` skips mockups;
`generic` / `project-styled` build a clickable prototype).

**Step 3 — Component map.** Produce `mockups/component-map.yml` linking each mockup
region → design-system component (`CMP-*`) → target code path. This is consumed by
`tasks`/`implement` (FE tasks reference real components) and `verify-full` (the
built UI must use the mapped components), and by journey steps (§2C) for selectors.

---

### 2F. Metrics Document

Ask: *"Do you want a separate metrics.md with KPIs and success criteria?"*
- **Yes, detailed** — Baseline metrics, target metrics, measurement method, reporting cadence
- **Yes, concise** — Just success criteria and top 3 KPIs embedded in product-spec.md
- **No** — Skip metrics.md, brief success criteria in main doc only

---

### 2G. Confirm Document Plan

Before writing anything, show the user a **Document Plan**:

```
📋 Document Plan for: {Feature Name}

Feature size: {FEATURE_SIZE}
Spec detail: {SPEC_DETAIL}

Files to be created:
├── product-spec/
│   ├── README.md                    ← Index + cross-links (always)
│   ├── product-spec.md              ← Main PRD ({SPEC_DETAIL} detail)
│   ├── journeys/                    ← Structured journeys (E2E source of truth)
│   │   ├── journeys.yml             ← Authoritative machine-readable index
│   │   ├── JRN-001-{slug}.md
│   │   └── JRN-002-{slug}.md
│   ├── wireframes.md                ← OR wireframes/ folder with {N} files
│   │   ├── wireframe-{screen1}.html
│   │   └── wireframe-{screen2}.html
│   ├── metrics.md                   ← IF requested
│   └── mockups/                     ← IF UI (design-system grounded)
│       ├── index.html               ← clickable multi-screen prototype hub
│       ├── mockup-{screen1}.html
│       ├── mockup-{screen2}.html
│       └── component-map.yml        ← region → CMP-* → code path
├── design-system/                   ← IF UI (harvested, read-only)
│   ├── manifest.yml                 ← components + tokens + selectors
│   └── manifest.md

Estimated token budget per file: ~2000-4000 tokens
Total estimated output: ~{N * 3000} tokens
```

Ask: *"Does this document plan look correct? Approve to generate, or adjust."*

---

## Step 3: Interactive Spec Interview

Before writing, conduct a brief structured interview to capture what the agent doesn't know from research.
Ask in a single message (not one by one):

```
To write a complete product spec, I need a few answers:

1. **Target user(s):** Who specifically uses this feature? (Role, context, experience level)

2. **Primary goal:** What's the single most important outcome for the user?

3. **Non-goals:** What is explicitly OUT of scope for this version?

4. **Success criteria:** How do we know this feature shipped successfully?

5. **Hard constraints:** Any technical, legal, time, or business constraints to consider?

6. **Priority user stories:** List 3-5 "As a [user], I want [action], so that [benefit]" stories if you have them. I'll generate the rest.

7. **Open questions:** What are you most uncertain about regarding this feature?
```

---

## Step 4: Generate Documents

Generate all documents **sequentially** (not in parallel, to maintain context and cross-reference).

### 4A. product-spec.md

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

---

### 4B. Structured journeys (`journeys/`)

Write the authoritative `product-spec/journeys/journeys.yml` plus one
`JRN-NNN-{slug}.md` per journey, following the schema in
[docs/journeys.md](../docs/journeys.md) and the
[journey-spec template](../docs/templates/journey-spec.md).

Requirements:
- Each journey: stable `JRN-NNN` id, primary actor, mapped `US-NNN` stories, entry
  + success states, preconditions.
- Ordered `STEP-NNN`s with **action** + **expected result**; each UI step
  references a `CMP-*` component (from `design-system/manifest.yml`) and each
  backend step its `API-*` contract.
- Explicit `EDGE-NNN`s for alternate / error / boundary cases in
  **GIVEN/WHEN/THEN** with a priority (P0–P3) — never leave error handling implicit.
- Mark smoke-worthy journeys (`smoke: true`) and set `runner: playwright-cli`.

`journeys.yml` is authoritative; the markdown files must not introduce steps absent
from the YAML. These journeys are consumed by `test-plan` (Phase 8A) to generate
Playwright specs and by `verify-full` for coverage.

---

### 4B.1. Seed the traceability `journeys:` block

product-spec is the **write owner** of the `journeys` column / block in
`{FEATURE_DIR}/traceability.yml` (per
[traceability-matrix template](../docs/templates/traceability-matrix.md)). After
authoring the structured journeys, write the `journeys:` block so the matrix has a
real producer for journey data (US → JRN → STEP/EDGE) instead of a null column.

Create `traceability.yml` if it does not exist (seeding `schema_version: 1`,
`feature`, `last_updated`); otherwise upsert the `journeys:` block by `id` without
disturbing rows owned by other phases. Mirror `journeys/journeys.yml`:

```yaml
journeys:
  - id: "JRN-001"
    title: "{journey title}"
    stories: ["US-001"]              # mapped user stories (US → JRN)
    steps: ["STEP-001", "STEP-002"]
    edges:                           # per-edge; tests stay [] until test-plan
      - {id: EDGE-001, priority: P1, tests: []}
    tests: []                        # journey-level E2E; filled by test-plan/test-run
```

Leave the `tests` fields empty here — `test-plan`/`test-run` own that column. Do not
write row-level `status` (owned by tasks/implement onward). Record this in the digest
handoff notes (seeds the `US → JRN → CMP → API` matrix for downstream phases).

---

### 4C. Wireframes

**If `WIREFRAME_DETAIL = text/ascii`** → Single `wireframes.md` with text+ASCII diagrams:
````markdown
# Wireframes: {Feature Name}

> Navigation: [Screen 1](#screen-1) | [Screen 2](#screen-2)
> Related: [Product Spec](./product-spec.md) | [Mockups](./mockups/)

## Screen 1: {Screen Name}

**Purpose:** {what this screen does}

```
┌─────────────────────────────────┐
│  Header / Navigation            │
├─────────────────────────────────┤
│  [Component: Search Bar]        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │  Card 1  │  │  Card 2  │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  [Button: Primary Action]       │
└─────────────────────────────────┘
```

**Components:** {list of UI components}
**States:** Default | Loading | Empty | Error
````

**If `WIREFRAME_DETAIL = basic-html` or `detailed-html`**:
Create separate `wireframe-{screen-name}.html` per screen.

For **basic HTML**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Wireframe: {Screen Name} — {Feature}</title>
  <style>
    /* Minimal wireframe styles — gray boxes, no decoration */
    body { font-family: sans-serif; background: #f5f5f5; padding: 20px; }
    .screen { max-width: 390px; margin: 0 auto; background: white; border: 2px solid #333; min-height: 844px; padding: 16px; }
    .nav { background: #ddd; padding: 12px; text-align: center; margin-bottom: 16px; }
    .component { background: #eee; border: 1px solid #bbb; padding: 12px; margin-bottom: 8px; border-radius: 4px; }
    .button { background: #333; color: white; padding: 12px 24px; border: none; cursor: pointer; width: 100%; }
    /* Navigation links to other screens */
    .wireframe-nav { text-align: center; margin-bottom: 20px; }
    .wireframe-nav a { margin: 0 8px; color: #0066cc; }
  </style>
</head>
<body>
  <div class="wireframe-nav">
    <strong>Screens:</strong>
    <!-- Links to other wireframe files -->
  </div>
  <div class="screen">
    <!-- Screen content -->
  </div>
</body>
</html>
```

For **detailed HTML**: agent scans `{codebase_path}` for CSS variables and design tokens, applies them.

---

### 4D. metrics.md (if requested)

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

---

### 4E. Mockups — clickable prototype + component map (if UI)

**Skip this step entirely** when `MOCKUP_STYLE == "none"` (user chose wireframes
only) or the feature has no UI — do not create `mockups/` or `component-map.yml`, and
note "mockups skipped" in the digest. Otherwise (`MOCKUP_STYLE` is `generic` or
`project-styled`):

Mockups are grounded in `design-system/manifest.yml` (from §2E,
`design-system-harvest`), so they map 1:1 to real components.

**Create `mockups/index.html`** — a clickable multi-screen prototype hub with
working navigation between screens (anchor/link-based; no build step required).

**For each screen, create `mockups/mockup-{screen-name}.html`**:
1. Use the harvested **tokens** by reference (the manifest's CSS-var/token names),
   so the prototype inherits the real look and never hardcodes drifting hexes.
2. Render each region with the corresponding **component** markup and its stable
   selector (e.g. `<button data-cmp="button" class="...">Save</button>` for
   `CMP-Button` variant `primary`).
3. Include nav to other screens + a back link to `index.html`.
4. Header note: `<!-- Product Forge Mockup | Feature: {slug} | Screen: {name} -->`.

**Create `mockups/component-map.yml`** — the transfer/decomposition map:

```yaml
schema_version: 1
feature: "{feature-slug}"
screens:
  - screen: "settings-notifications"
    regions:
      - region: "save bar"
        component: "CMP-Button"        # from design-system/manifest.yml
        variant: "primary"
        target_path: "frontend:apps/web/src/settings/SaveBar.tsx"  # where it lands
        journeys: ["JRN-001"]          # journey steps that use this region
```

This map lets `tasks`/`implement` create FE tasks against real components and lets
`verify-full` confirm the built UI uses the mapped components.

If no design system was harvested (backend-only or harvest skipped), skip mockups
and note it in the digest.

---

## Step 5: Create product-spec/README.md Index

```markdown
# Product Spec Index: {Feature Name}

> Status: DRAFT | Created: {date} | Last updated: {date}
> Feature slug: `{feature-slug}`
> ← [Back to Feature Root](../README.md) | ← [Research](../research/README.md)

## What We're Building

{2-3 sentence executive summary from product-spec.md}

## Document Map

| Document | Purpose | Detail Level | Status |
|----------|---------|--------------|--------|
| [product-spec.md](./product-spec.md) | Main PRD — goals, stories, requirements | {SPEC_DETAIL} | DRAFT |
| [journeys/journeys.yml](./journeys/) | Structured journeys (E2E source of truth) | {JOURNEY_COUNT} journeys | DRAFT |
| [wireframes.md](./wireframes.md) OR [wireframes/](./wireframes/) | Screen layouts | {WIREFRAME_DETAIL} | DRAFT |
| [metrics.md](./metrics.md) | KPIs and success criteria | {detail} | DRAFT |
| [mockups/index.html](./mockups/index.html) | Clickable design-system prototype | {MOCKUP_STYLE} | DRAFT |
| [mockups/component-map.yml](./mockups/component-map.yml) | Region → component → code path | — | DRAFT |
| [../design-system/manifest.yml](../design-system/manifest.yml) | Harvested design-system manifest | read-only | — |

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| {key product decision} | {choice} | {why} |

## Must Read
> Start with [product-spec.md](./product-spec.md), then review user journeys and wireframes.
> Research artifacts are in [../research/](../research/README.md).
```

---

## Step 6: Create Feature Root README.md

Create `{FEATURE_DIR}/README.md` — top-level index for the entire feature:

```markdown
# Feature: {Feature Name}

> Created: {date} | Status: {current phase}
> Slug: `{feature-slug}`

## Lifecycle Status

| Phase | Status | Documents |
|-------|--------|-----------|
| 1. Research | ✅ Complete | [research/](./research/README.md) |
| 2. Product Spec | 🔄 In Progress | [product-spec/](./product-spec/README.md) |
| 3. Revalidation | ⏳ Pending | [review.md](./review.md) |
| 4. SpecKit Bridge | ⏳ Pending | [spec.md](./spec.md) |
| 5. Plan | ⏳ Pending | [plan.md](./plan.md) |
| 5B. Tasks | ⏳ Pending | [tasks.md](./tasks.md) |
| 5C. Pre-Impl Review | ⏳ Pending | [pre-impl-review.md](./pre-impl-review.md) |
| 6. Implementation | ⏳ Pending | — |
| 6B. Code Review | ⏳ Pending | [code-review.md](./code-review.md) |
| 7. Verification | ⏳ Pending | [verify-report.md](./verify-report.md) |
| 8A. Test Plan | ⏳ Pending | [testing/](./testing/) |
| 8B. Test Run | ⏳ Pending | [test-report.md](./test-report.md) |
| 9. Release Readiness | ⏳ Pending | [release-readiness.md](./release-readiness.md) |

## Quick Start

1. **Read the research:** [research/README.md](./research/README.md)
2. **Read the spec:** [product-spec/product-spec.md](./product-spec/product-spec.md)
3. **See the journeys:** [product-spec/journeys/](./product-spec/journeys/)
4. **See the mockups:** [product-spec/mockups/index.html](./product-spec/mockups/index.html)

## Feature Description

{FEATURE_DESCRIPTION}
```

---

## Step 7: Update Status

Update `{FEATURE_DIR}/.forge-status.yml`:
```yaml
phases:
  product_spec: completed
last_updated: "{ISO timestamp}"
```

---

## Step 8: Present Results

Show the user:
1. The complete document tree that was created
2. Clickable paths to each document
3. Summary of key product decisions captured

Ask: *"Product spec complete with [N] documents. All cross-linked via product-spec/README.md. Ready to proceed to Phase 3: Revalidation? Or would you like to review and adjust any document now?"*

---

## Step 9: Phase Digest (required)

Before returning, write `{FEATURE_DIR}/product-spec/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) and record
its path on `.forge-status.yml` under `phases.product_spec.digest_path`.

The digest must include:
- **Key decisions** — target users, scope boundaries, top 3 user stories, journeys
  identified (`JRN-*`), and whether a design system was harvested.
- **Artifacts produced** — every document in `product-spec/` (including
  `journeys/journeys.yml`, `mockups/component-map.yml`) and
  `design-system/manifest.yml`, with one-line descriptions.
- **Open risks** — any NEEDS-CLARIFICATION items unresolved and why.
- **Handoff notes** — what revalidation and bridge need to verify; seed the
  traceability matrix (`US → JRN → CMP → API`) for downstream phases.

The orchestrator refuses to mark Phase 2 complete until `digest.md` exists.
See [`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).
