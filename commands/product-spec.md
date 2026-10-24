---
name: speckit.product-forge.product-spec
description: >
  Writes the product specification (Phase 2): product-spec.md, structured journeys
  (journeys.yml, the E2E source of truth), wireframes, metrics and design-system
  mockups, cross-linked from product-spec/README.md. Use after research, or first
  in express/lite.
---

# Product Forge — Phase 2: Product Spec

You are the **Product Spec Architect**. You turn research findings (or, in express /
lite, the user's description) into a structured, cross-linked product specification
— the source of truth before any code is written.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `product_spec` (Phase 2)
- **Config keys:** `features_dir`, `codebase_path`, `default_wireframe_detail`,
  `default_mockup_style`, `default_feature_mode` (only when this phase creates the
  status file)
- **Writes:** `product-spec/` (`README.md`, `product-spec.md`, `journeys/`,
  wireframes, `metrics.md`, `mockups/`, `digest.md`), `{FEATURE_DIR}/README.md`, the
  `journeys:` block of `traceability.yml`, `phases.product_spec.*`
- **Contract deltas:** may create `.forge-status.yml` in express / lite (Step 8).
  `PRODUCT_SPEC_DIR` = `{FEATURE_DIR}/product-spec/`.

## Step 1: Load context

Read `feature_mode` from `.forge-status.yml` (absent → `--mode` or
`default_feature_mode`), then the inputs for the mode:

| Mode | Inputs | Shape of this phase |
|------|--------|---------------------|
| standard / v-model | `research/README.md`, `research/competitors.md`, `research/ux-patterns.md`, `research/codebase-analysis.md` (all required) | full Step 2 configuration |
| lite | `problem-discovery/` when present; the user's description; the codebase | Step 2 at the light end of each option (recommend Small / Concise) |
| express | the user's description; the codebase | minimal ([policy.md §4.1](../docs/policy.md#41-phase-maps)): skip Step 2; a concise `product-spec.md` with exactly **one journey + its acceptance criteria** (`JRN-001` in `journeys/journeys.yml`); wireframes, mockups and `metrics.md` only when the user asks |

In express and lite there is no research: omit the *Background & Research* section
and every `../research/` link from the generated documents.

Result: mode known and its inputs read.

## Step 2: Detail-level configuration

Ask each question below as its own structured prompt before writing any document.

**2A. Size** — *"How large/complex is this feature?"* → `FEATURE_SIZE`
- **Small** — single screen or widget, 1–2 user flows, clear scope
- **Medium** — 2–4 screens, multiple user roles or states, moderate complexity
- **Large** — 5+ screens, interconnected flows, needs decomposition into sub-features

**2B. Spec detail** — the *Product-spec detail level* prompt
([interaction-prompts.md](../docs/templates/interaction-prompts.md#product-spec-detail-level))
→ `SPEC_DETAIL`
- **Standard** (recommended) — 5–8 pages: full personas, user stories with acceptance
  criteria, feature breakdown, risks
- **Concise** — 2–3 pages: summary, top 5 user stories, key metrics, decision log
- **Exhaustive** — 10+ pages: full PRD with business justification, all scenarios,
  competitive positioning, legal/compliance notes, launch criteria

**2C. Journeys** — journeys are structured artifacts and the deterministic source for
E2E tests (playwright-cli), authored per [journeys.md](../docs/journeys.md) with the
[journey-spec template](../docs/templates/journey-spec.md). Ask *"How many distinct
user journeys does this feature have? (best estimate)"* → `JOURNEY_COUNT`. Each
journey gets a stable `JRN-NNN`, ordered `STEP-NNN`s (action + expected result) and
explicit `EDGE-NNN`s for alternate / error / boundary cases (GIVEN/WHEN/THEN +
priority); steps reference design-system components (`CMP-*`, from 2E) and backend
contracts (`API-*`). Output: `product-spec/journeys/`, with `journeys.yml` as the
authoritative index. Before writing each journey, confirm its edge cases with a
structured prompt so error handling is explicit.

**2D. Wireframes** — *"What level of wireframe fidelity do you need?"*, with
`default_wireframe_detail` (`"text" | "basic-html" | "detailed-html"`) as the
pre-selected, recommended option:
- **Text/ASCII** — Markdown descriptions + ASCII box diagrams; version-controlled, no tools
- **Basic HTML** — one simple HTML wireframe per screen: boxes, labels, layout
- **Detailed HTML** — HTML/CSS with real colors, typography, spacing, hover states,
  styled to the project design system when CSS is found in the codebase

Then ask *"Should wireframes be decomposed by screen? If yes, approximately how many
screens?"* → `WIREFRAME_DETAIL`, `WIREFRAME_SCREEN_COUNT`. When the count is > 3,
suggest one file per screen.

**2E. Mockups** — grounded in the project's real, in-code design system and decomposed
into real components so they transfer cleanly into code.
1. **Harvest** (UI features) — delegate to
   [`speckit.product-forge.design-system-harvest`](./design-system-harvest.md) with `--nested`. It
   emits `design-system/manifest.yml` (components with `CMP-` ids, props, variants,
   stable selectors, in-code token references). The design system stays in code as
   the single source of truth; the manifest only indexes it.
2. **Fidelity** — structured prompt with `default_mockup_style`
   (`"none" | "generic" | "project-styled"`) pre-selected and recommended; store the
   answer as `MOCKUP_STYLE`:
   - **`none`** — wireframes are enough; skip mockups.
   - **`generic`** — clickable multi-screen HTML prototype with a clean generic design
     system (when no in-code design system was harvested).
   - **`project-styled`** (default) — clickable multi-screen prototype using the
     harvested tokens/components, mapping 1:1 to real components (e.g.
     `<button data-cmp="button" class="...">` for `CMP-Button` variant `primary`).
3. Ask *"How many mockup screens?"* → `MOCKUP_SCREEN_COUNT`.
4. **Component map** — `mockups/component-map.yml` links each mockup region →
   `CMP-*` → target code path. `tasks` / `implement` read it (FE tasks use real
   components), `verify-full` checks the built UI uses the mapped components, and
   journey steps take selectors from it.

**2F. Metrics** — *"Do you want a separate metrics.md with KPIs and success criteria?"*
- **Yes, detailed** — baseline and target metrics, measurement method, reporting cadence
- **Yes, concise** — success criteria and top 3 KPIs embedded in `product-spec.md`
- **No** — no `metrics.md`; brief success criteria in the main doc only

**2G. Document plan** — show the plan and ask *"Does this document plan look correct?
Approve to generate, or adjust."*:

```
Document Plan for: {Feature Name}
Feature size: {FEATURE_SIZE} · Spec detail: {SPEC_DETAIL}

product-spec/
├── README.md                ← index + cross-links (always)
├── product-spec.md          ← main PRD ({SPEC_DETAIL} detail)
├── journeys/                ← journeys.yml (authoritative) + JRN-NNN-{slug}.md
├── wireframes.md            ← OR wireframes/ with {N} wireframe-{screen}.html
├── metrics.md               ← if requested
└── mockups/                 ← if UI: index.html, mockup-{screen}.html, component-map.yml
design-system/               ← if UI (harvested, read-only): manifest.yml, manifest.md

Estimated token budget per file: ~2000-4000 tokens · Total: ~{N * 3000} tokens
```

Result: every variable above set and the document plan approved.

## Step 3: Spec interview

Ask what research does not answer, together in one free-text message:

1. **Target user(s)** — role, context, experience level
2. **Primary goal** — the single most important outcome for the user
3. **Non-goals** — what is explicitly out of scope for this version
4. **Success criteria** — how we know the feature shipped successfully
5. **Hard constraints** — technical, legal, time or business
6. **Priority user stories** — 3–5 "As a [user], I want [action], so that [benefit]"
   if available; the rest are generated
7. **Open questions** — what the user is most uncertain about

## Step 4: Generate documents

Write the documents **one after another** (not in parallel) so each can cross-reference
the previous ones.

**4A. `product-spec.md`** — write `{PRODUCT_SPEC_DIR}/product-spec.md` from
[docs/templates/product-spec-product-spec.md](../docs/templates/product-spec-product-spec.md).

**4B. Journeys** — write `journeys/journeys.yml` plus one `JRN-NNN-{slug}.md` per
journey, per [journeys.md](../docs/journeys.md) and the
[journey-spec template](../docs/templates/journey-spec.md):
- Each journey: stable `JRN-NNN`, primary actor, mapped `US-NNN` stories, entry and
  success states, preconditions.
- Ordered `STEP-NNN`s with **action** + **expected result**; each UI step references
  a `CMP-*` from `design-system/manifest.yml`, each backend step its `API-*` contract.
- Explicit `EDGE-NNN`s for alternate / error / boundary cases in **GIVEN/WHEN/THEN**
  with priority P0–P3 — every journey states its error handling.
- Smoke-worthy journeys get `smoke: true`; every journey `runner: playwright-cli`.

`journeys.yml` is authoritative: the Markdown files carry only steps that exist in the
YAML. `test-plan` (Phase 8A) generates Playwright specs from it and `verify-full`
measures coverage against it.

**4B.1. Seed the `journeys:` block of `traceability.yml`** — product-spec is its write
owner ([traceability-matrix template](../docs/templates/traceability-matrix.md)).
Create `{FEATURE_DIR}/traceability.yml` when missing (seed `schema_version: 1`,
`feature`, `last_updated`); otherwise upsert the `journeys:` block by `id` and leave
rows owned by other phases as they are. Mirror `journeys/journeys.yml`:

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

Leave every `tests` field empty (`test-plan` / `test-run` own it) and write no
row-level `status` (owned from `tasks` / `implement` on). Note the seeding in the
digest handoff notes.

**4C. Wireframes** — from [docs/templates/product-spec-wireframes.md](../docs/templates/product-spec-wireframes.md):
`text` → one `wireframes.md` with text + ASCII diagrams; `basic-html` /
`detailed-html` → one `wireframe-{screen-name}.html` per screen (detailed applies the
CSS variables and design tokens found in `{codebase_path}`).

**4D. `metrics.md`** (only for "Yes, detailed") — from
[docs/templates/product-spec-metrics.md](../docs/templates/product-spec-metrics.md).

**4E. Mockups** — when `MOCKUP_STYLE` is `none` or the feature has no UI, create no
`mockups/` or `component-map.yml` and record "mockups skipped" in the digest.
Otherwise build them: `project-styled` grounds them in `design-system/manifest.yml`;
`generic` (no harvested design system) uses a clean generic design system and maps
regions to the components they will become:
- `mockups/index.html` — a clickable hub with working anchor/link navigation between
  screens (no build step).
- `mockups/mockup-{screen-name}.html` per screen:
  1. Use **tokens by reference**, never hard-coded hex values — the manifest's
     CSS-var/token names (`project-styled`) or the generic system's CSS variables
     (`generic`).
  2. Render each region with its **component** markup and stable selector (e.g.
     `<button data-cmp="button" class="...">Save</button>` for `CMP-Button` variant
     `primary`).
  3. Link to the other screens and back to `index.html`.
  4. Header comment: `<!-- Product Forge Mockup | Feature: {slug} | Screen: {name} -->`.
- `mockups/component-map.yml`:

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

Result: every document in the approved plan exists.

## Step 5: `product-spec/README.md` index

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

## Step 6: Feature root `README.md`

Write `{FEATURE_DIR}/README.md` from
[docs/templates/product-spec-feature-readme.md](../docs/templates/product-spec-feature-readme.md).

## Step 7: Phase digest

Write `{PRODUCT_SPEC_DIR}/digest.md` from [phase-digest.md](../docs/templates/phase-digest.md):

- **Key decisions** — target users, scope boundaries, top 3 user stories, journeys
  (`JRN-*`), whether a design system was harvested.
- **Artifacts produced** — every document in `product-spec/` (including
  `journeys/journeys.yml`, `mockups/component-map.yml`) and
  `design-system/manifest.yml`, one line each.
- **Open risks** — unresolved NEEDS-CLARIFICATION items and why.
- **Handoff notes** — what the next phase must verify (revalidation and bridge in
  standard / v-model; plan in express / lite); the seeded `US → JRN → CMP → API`
  traceability rows.

## Step 8: Status and gate

When `.forge-status.yml` is absent (express / lite: this phase may be the first
writer), initialize it from the v3 initial document
([schema.md §3.1](../docs/schema.md#31-initial-document-new-features)); when it
exists, merge into it. Keys this phase owns:

```yaml
phases:
  product_spec:
    digest_path: "product-spec/digest.md"
    status: completed        # set from the gate decision
```

Show the created document tree, a clickable path to each document, and the key
product decisions captured.

Gate outcome line: *"Product Spec complete — [N] documents, cross-linked via
product-spec/README.md"*; `{next phase}` = Revalidation (standard / v-model) or Plan
(express / lite) — both required, so no Skip. On Revise, adjust the documents with the
feedback.

## Done when

- Every document in the approved plan exists; express has exactly one journey
  (`JRN-001`) with acceptance criteria.
- Every journey maps ≥ 1 `US-NNN` story, has ordered steps, and its Markdown file
  adds no step absent from `journeys.yml`. Standard / v-model / lite: each journey has
  ≥ 1 explicit edge case confirmed with the user. Express: `JRN-001` states ≥ 1 edge
  case in its acceptance criteria.
- `traceability.yml` has a `journeys:` row per journey with empty `tests`.
- When mockups ran, every mockup region appears in `component-map.yml` with a
  component (a harvested `CMP-*` for `project-styled`) and a target path; otherwise
  the digest says "mockups skipped".
- `product-spec/README.md` links every created document; `{FEATURE_DIR}/README.md`
  exists; `product-spec/digest.md` has all four sections.
- Standalone: the gate was shown, its decision appended to `gates[]`, and
  `phases.product_spec.status` set from it.
- `--from-forge`: only `phases.product_spec.digest_path` was written; the document
  tree and key decisions were returned to forge with no gate prompt and no status or
  `gates[]` write.
