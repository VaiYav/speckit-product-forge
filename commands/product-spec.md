---
name: speckit.product-forge.product-spec
description: >
  Phase 2: Interactive product specification creation. Asks detailed questions about
  desired level of detail and document decomposition. Creates product-spec.md,
  user-journey.md, wireframes, metrics.md, and optional mockups.html.
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

## Step 2: Detail Level Configuration

This is the most important configuration step. Ask the user ALL questions below before creating any documents.

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

### 2C. User Journey — Format and Detail

Ask: *"How should we document user journeys?"*

- **Simple flow** — One linear Markdown text flow in user-journey.md
- **Standard** — Separate sections per user role/persona in user-journey.md, with decision branches
- **Detailed multi-file** — One file per major flow (e.g., `user-journey-onboarding.md`, `user-journey-settings.md`), all linked from README

Also ask: *"How many distinct user journeys does this feature have? (best estimate)"*
Store as `JOURNEY_COUNT`.

If `JOURNEY_COUNT > 2` or `FEATURE_SIZE = large`, automatically suggest multi-file.

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

### 2E. Mockups — Create or Skip?

Ask: *"Do you want HTML mockups created? These are higher-fidelity interactive previews."*
- **No mockups** — Skip. Wireframes are sufficient.
- **Generic mockups** — Clean HTML/CSS, no specific project styles. Works for any project.
- **Project-styled mockups** — Agent analyzes your CSS/SCSS/design tokens and creates mockups that match your project's look and feel.

If "Project-styled": agent will scan `{codebase_path}` for CSS variables, design tokens, color palettes, typography.

Also ask: *"How many mockup screens? (If feature is large, we'll create multiple linked HTML files with a navigation index)"*
Store as `MOCKUP_STYLE`, `MOCKUP_SCREEN_COUNT`.

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
│   ├── user-journey.md              ← OR multiple files if {JOURNEY_COUNT > 2}
│   │   ├── user-journey-{flow1}.md
│   │   └── user-journey-{flow2}.md
│   ├── wireframes.md                ← OR wireframes/ folder with {N} files
│   │   ├── wireframe-{screen1}.html
│   │   └── wireframe-{screen2}.html
│   ├── metrics.md                   ← IF requested
│   └── mockups/                     ← IF requested
│       ├── index.html
│       ├── mockup-{screen1}.html
│       └── mockup-{screen2}.html

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
> **Related documents:** [User Journey](./user-journey.md) | [Wireframes](./wireframes.md) | [Metrics](./metrics.md) | [Research →](../research/README.md)

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

### 4B. user-journey.md (or multiple files)

If `JOURNEY_COUNT <= 2` → single `user-journey.md`
If `JOURNEY_COUNT > 2` → create `user-journey-{name}.md` per flow, link from README

Each journey file format:
```markdown
# User Journey: {Flow Name}

> Feature: {feature-name} | Persona: {primary persona}
> Related: [Product Spec](./product-spec.md) | [Wireframes](./wireframes.md)

## Journey Map

| Step | User Action | System Response | Emotion | Notes |
|------|-------------|-----------------|---------|-------|
| 1 | {what user does} | {what system does} | 😊/😐/😤 | {edge case or note} |
[...]

## Alternative Paths

### Path B: {Alternative scenario}
[Step-by-step]

## Error Scenarios
[How the journey breaks and recovers]

## Journey Metrics
- **Entry point:** {where journey starts}
- **Exit point:** {success state}
- **Expected completion time:** {seconds/minutes}
- **Drop-off risk points:** {where users might abandon}
```

---

### 4C. Wireframes

**If `WIREFRAME_DETAIL = text/ascii`** → Single `wireframes.md` with text+ASCII diagrams:
```markdown
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
```

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

### 4E. Mockups (if requested)

**Create `mockups/index.html`** — navigation hub linking all mockup screens.

**For each screen, create `mockups/mockup-{screen-name}.html`**:

If `MOCKUP_STYLE = generic`:
```html
<!-- Clean, professional HTML mockup with generic design system -->
<!-- Bootstrap-inspired utility classes, no dependencies -->
```

If `MOCKUP_STYLE = project-styled`:
1. Agent scans `{codebase_path}` for:
   - CSS custom properties (`:root { --color-... }`)
   - SCSS variables
   - Tailwind config
   - Design token files
2. Extracts: colors, typography, spacing, border-radius, shadows
3. Creates mockup with extracted values inline

Every mockup file includes:
- Navigation bar linking to other screens in this feature
- Back link to `index.html`
- Note: `<!-- Product Forge Mockup | Feature: {slug} | Screen: {name} -->`

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
| [user-journey-{name}.md](./user-journey-{name}.md) | {Flow name} user journey | {detail} | DRAFT |
| [wireframes.md](./wireframes.md) OR [wireframes/](./wireframes/) | Screen layouts | {WIREFRAME_DETAIL} | DRAFT |
| [metrics.md](./metrics.md) | KPIs and success criteria | {detail} | DRAFT |
| [mockups/index.html](./mockups/index.html) | Interactive visual mockups | {MOCKUP_STYLE} | DRAFT |

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
| 3. Revalidation | ⏳ Pending | — |
| 4. SpecKit Bridge | ⏳ Pending | [spec.md](./spec.md) |
| 5. Plan + Tasks | ⏳ Pending | [plan.md](./plan.md) · [tasks.md](./tasks.md) |
| 6. Implementation | ⏳ Pending | — |
| 7. Verification | ⏳ Pending | [verify-report.md](./verify-report.md) |

## Quick Start

1. **Read the research:** [research/README.md](./research/README.md)
2. **Read the spec:** [product-spec/product-spec.md](./product-spec/product-spec.md)
3. **See the journeys:** [product-spec/user-journey*.md](./product-spec/)
4. **See the wireframes:** [product-spec/wireframes*](./product-spec/)

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
