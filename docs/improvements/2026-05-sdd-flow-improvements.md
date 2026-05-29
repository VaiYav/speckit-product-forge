# Improving the Product Forge SDD/SDLC Flow

> Status: proposal / roadmap · Date: 2026-05 · Applies to: Product Forge v1.5.x
> Audience: maintainers of `speckit-product-forge`.

This document is a deep-research-backed list of improvements to the Product Forge
spec-driven development (SDD) lifecycle: what to improve in the **existing phases**
and which **new phases/commands** to add. It is organized by theme (A–I), each with
rationale, the concrete change, and the files it touches. A prioritized rollout
(waves) is at the end.

---

## 1. Where Product Forge sits today

Product Forge is a SpecKit extension that orchestrates a 14+ phase lifecycle
(problem-discovery → research → product-spec → revalidate → bridge → plan → tasks
→ implement → code-review → verify → test → release → monitoring/experiment →
retrospective), with `lite` / `standard` / `v-model` modes, human gates between
every phase, `.forge-status.yml` (schema v3) state, an append-only gate audit
trail, a 9-layer `sync-verify` drift checker, per-phase digests, monorepo
awareness, and brown-field backfill.

**Strengths:** governance, state integrity, concurrency safety, audit trail,
mode selection, and bookkeeping are unusually mature for this space.

**Gaps (the focus of this document):** the spec is not a *living* source of truth;
the flow trends toward Big-Design-Up-Front and review overload; traceability is
re-derived rather than maintained; telemetry/quality gates are not wired to real
data; design-system/mockup handling is shallow; FE↔BE contracts and doc↔code
reconciliation are weak; journeys are free-form rather than test-driving; and
user interaction is ad-hoc rather than consistently structured.

---

## 2. SDD landscape (2026) — what others do and what we learn

**GitHub spec-kit** — the canonical `Constitution → Specify → Plan → Tasks →
Implement` loop. Each phase emits a markdown artifact feeding the next. Notable:
a strict **test-first "Red" gate** (tests written, approved, and confirmed
*failing* before any implementation code). Critique: spec lives on a per-change
*branch* — spec-first, not spec-anchored over a feature's life.
([repo](https://github.com/github/spec-kit), [blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/))

**Kiro (AWS)** — lightweight `Requirements → Design → Tasks`; requirements as
user stories with `GIVEN/WHEN/THEN` acceptance criteria; tasks trace back to
requirement numbers; "steering" memory bank (product/structure/tech). Critique:
one-size workflow; heavy for small changes.

**Tessl** — the most ambitious: **spec-as-source**. Specs are the primary artifact;
generated code is marked `// GENERATED FROM SPEC - DO NOT EDIT`; 1:1 spec↔file
mapping; reverse-engineering from existing code. Lesson: anchoring spec→code
tightly reduces drift but reintroduces MDD-style rigidity + LLM non-determinism.

**BMAD** — role-separated multi-agent workflow (analyst/PM/architect/dev/QA
personas), vendor-neutral. Lesson: explicit role/persona separation per phase.

**OpenSpec** — the strongest patterns we currently lack:
- **`specs/` = source of truth** (how the system behaves *now*), separate from
  **`changes/`** (proposed modifications, each its own folder).
- **Delta specs**: `## ADDED / ## MODIFIED / ## REMOVED Requirements`.
- **Archive-on-completion**: deltas merge cleanly into `specs/`; the change moves
  to `changes/archive/` for audit history. Brownfield-first by design.
- **"Actions, not phases"** (`opsx`): a fluid workflow where dependencies are
  *enablers* (what's possible) rather than *gates* (what's required next).
  ([concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md),
  [getting-started](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md))

**Key critiques to design against:**
- *Fowler / Böckeler* — the spec-first vs **spec-anchored** vs **spec-as-source**
  distinction; "reviewing markdown over reviewing code" overload; "false sense of
  control" (agents ignore or over-apply instructions); one workflow can't fit all
  sizes; functional-vs-technical separation is hard.
  ([martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html))
- *marmelab — "Waterfall Strikes Back"* — Big-Design-Up-Front risk, **markdown
  madness**, **double code review** (review the spec's code, then the real code),
  faux-agile user stories, **diminishing returns on large/brownfield codebases**;
  prescribes small iterative slices over heavy upfront specs.
  ([marmelab.com](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html))
- *Agentic-SDLC guides (2026)* — **two-layer review** (machine gates → human
  judgment), governance embedded in the workflow, telemetry-grounded loops, and
  "2026 is the year of AI *quality*" — the bottleneck is verification, not
  generation. ([coderabbit](https://www.coderabbit.ai/guides/agentic-sdlc),
  [beam](https://getbeam.dev/blog/agentic-sdlc-complete-guide.html))

---

## 3. Improvements by theme

### Theme A — Right-sizing & iterativity (anti-waterfall)
**Problem:** 14+ phases push Big-Design-Up-Front; even `lite` (5 phases) is heavy
for trivial changes; the only adaptivity is `lite → standard` escalation.
**Changes:**
1. **Intake/triage** in the orchestrator (`commands/forge.md`): classify the change
   (patch / bugfix / small / standard / large) from the description + codebase
   signals and **recommend a mode/track**, with an explicit **downgrade** path
   (`standard → lite`), not just escalation.
2. **`express` track** below `lite`: a single combined spec→plan→implement→verify
   pass for trivial changes (no separate research/revalidate/bridge).
3. **`flow_mode: gated | fluid`** config: `fluid` = OpenSpec "actions, not phases" —
   any phase runnable on demand, dependencies shown as enablers, `sync-verify`
   still guards drift.
4. **Vertical slices**: allow a feature to be split so each slice runs
   implement→verify quickly instead of one giant upfront spec.
**Files:** `commands/forge.md`, `commands/tasks.md`, `docs/policy.md §4`,
`docs/runtime.md`, `docs/config.md`, `config-template.yml`, `docs/phases.md`.

### Theme B — Spec-anchored / living spec (delta model)
**Problem:** `spec.md` is a per-change artifact; no canonical, persistent spec;
brownfield specs are re-derived each time → "diminishing returns on large codebases."
**Changes (adopt the OpenSpec model):**
1. **Canonical `specs/` directory** (per domain/capability) describing how the
   system behaves *now*, separate from per-change `features/{slug}/` working folders.
2. **Delta-spec format** (`## ADDED / ## MODIFIED / ## REMOVED Requirements`)
   keyed on `FR-*` requirement IDs in the standard/classic forward flow (the
   `bridge` Functional Requirements table already mints `FR-*`) — emitted by
   `bridge` and `change-request`. (`REQ-*` is the V-Model-pack / backfill canonical
   id only; the forward flow is not required to mint `REQ-*`.)
3. New cross-cutting command **`spec-merge`**: on feature completion, merge approved
   deltas into `specs/` and archive the change folder with audit history.
4. **Backfill into `specs/`** so brownfield specs stay alive.
**Files:** new `commands/spec-merge.md`, `commands/bridge.md`,
`commands/change-request.md`, `commands/backfill.md`, `commands/release-readiness.md`,
`docs/file-structure.md`, `docs/schema.md`, `extension.yml`, `docs/phases.md`.

### Theme C — Review UX & traceability
**Problem:** markdown/review overload; traceability is *re-derived* in `verify-full`
each run; artifacts duplicate each other (research vs codebase-analysis vs spec).
**Changes:**
1. **Diff-based review**: phase digests show a diff vs the previous approved state,
   not a full re-read (`docs/templates/phase-digest.md`, `revalidate`, `sync-verify`,
   `code-review`).
2. **One live traceability matrix** `features/{slug}/traceability.yml`
   (REQ → US → JRN → FR → TASK → code path → TEST → telemetry EVT), maintained
   incrementally by `tasks`/`implement` and *consumed* by `verify-full`.
3. **De-duplicate**: phases *reference* prior artifacts by ID instead of restating.
4. **First-class ID system** (REQ/US/JRN/FR/TASK/REV/TC/EVT) documented in
   `docs/schema.md` §8 (mirrored in the traceability-matrix template).
**Files:** `docs/templates/phase-digest.md`, new
`docs/templates/traceability-matrix.md`, `commands/tasks.md`,
`commands/implement.md`, `commands/verify-full.md`, `commands/revalidate.md`,
`commands/sync-verify.md`, `commands/code-review.md`, `commands/research.md`,
`commands/product-spec.md`, `commands/bridge.md`, `docs/schema.md`.

### Theme D — Telemetry / quality gates (real MCPs)
**Problem:** gates aren't grounded in data; retrospective/monitoring assume
NewRelic only, while PostHog / Amplitude / Sentry MCPs are actually connected.
**Changes:**
1. **Test-first / contract-first "Red" gate** (from spec-kit): tests written and
   confirmed *failing* before `implement` proceeds (gate between Phase 5B → 6).
2. **Two-layer review made explicit**: machine gates (lint / type / security scan /
   coverage thresholds) must pass *before* human `code-review`.
3. **Wire to connected MCPs**: `retrospective` pulls real funnels/metrics
   (PostHog/Amplitude) + error rates (Sentry) + experiment results (PostHog);
   `monitoring-setup` generates real dashboards/alerts (PostHog/Sentry, NewRelic
   optional); `experiment-design` can create the actual flag/experiment via PostHog.
**Files:** `commands/forge.md`, `commands/implement.md`, `commands/code-review.md`,
`commands/retrospective.md`, `commands/monitoring-setup.md`,
`commands/experiment-design.md`, `docs/policy.md`, `docs/config.md`.

### Theme E — Design system + mockups (major new capability)
**Problem:** Phase 2 produces free-form wireframes / optional static HTML with no
grounding in the project's real design system, no component decomposition, and no
path into the codebase.
**Decision (documented):** keep the design system **in code** (component library +
tokens) as the single source of truth; Product Forge **harvests a read-only
manifest** rather than duplicating it.
**Changes:**
1. New command **`design-system-harvest`**: discover the design system (component
   library, design tokens, Storybook, Tailwind/CSS config) → emit
   `design-system/manifest.yml` (components + props + variants + tokens) +
   `manifest.md`. Runs before/within Phase 2.
2. **Clickable, DS-grounded mockups** (Phase 2): generate a multi-screen HTML
   prototype using harvested tokens/components, navigable between screens, mapping
   1:1 to real components (`<Button variant="primary">`).
3. **Component map** `mockups/component-map.yml`: each mockup region →
   design-system component → target code path. Consumed by `tasks`/`implement`
   (FE tasks reference real components) and `verify-full` (built UI uses mapped
   components).
**Files:** new `commands/design-system-harvest.md`, `commands/product-spec.md`,
`commands/tasks.md`, `commands/implement.md`, `commands/verify-full.md`,
`docs/file-structure.md`, `docs/phases.md`, `config-template.yml`,
`docs/config.md`, `extension.yml`.

### Theme F — Frontend ↔ backend contract traceability
**Problem:** contracts (API/events) appear only post-implementation via `api-docs`;
no shared FE/BE contract or verification that both honor it.
**Changes:**
1. **Contract-first**: define **OpenAPI 3.1 + AsyncAPI** in `bridge`/`plan`, shared
   by FE & BE tasks; `api-docs` becomes validation/regeneration, not first authorship.
2. **FE↔BE contract map**: frontend data needs (journeys/mockups) → endpoints/events
   → backend handlers, as a section of `traceability.yml` (FE → contract → BE).
3. **Contract-drift layer** in `sync-verify` and `verify-full`: contracts vs actual
   FE client calls and BE route handlers.
**Files:** `commands/bridge.md`, `commands/plan.md`, `commands/api-docs.md`,
`commands/sync-verify.md`, `commands/verify-full.md`, `docs/testing-strategy.md`.

### Theme G — Doc ↔ code comparison
**Problem:** doc/code reconciliation is shallow; drift accumulates silently.
**Changes:**
1. **Doc↔code reconciliation layer** in `verify-full` and `code-review`: every
   documented requirement/endpoint/component checked against code; flag
   **undocumented code** and **unimplemented docs**.
2. **Spec-anchored loop**: drift between code and canonical `specs/` is detected in
   `verify-full`/`code-review`; the canonical-spec update is consolidated into
   `spec-merge` (which presents the diff for approval), not into `implement` (ties
   to Theme B/`spec-merge`).
**Files:** `commands/verify-full.md`, `commands/code-review.md`,
`commands/spec-merge.md`.

### Theme H — Structured journeys/stories → Playwright-cli E2E (committed bet)
**Problem:** user journeys are free-form prose; they don't deterministically drive
E2E tests; edge cases stay implicit.
**Changes:**
1. **Structured journey schema** replacing free-form `user-journey.md`:
   `product-spec/journeys/` with per-journey files + machine-readable
   `journeys/journeys.yml`:
   - stable IDs `JRN-NNN` / `STEP-NNN` / `EDGE-NNN`;
   - per step: actor, precondition, action, UI surface (→ `component-map.yml`),
     expected result, data/contract touchpoints (→ contract map);
   - explicit **happy path + alternate flows + edge/error cases** in
     `GIVEN/WHEN/THEN`;
   - each `US-NNN` maps to ≥1 `JRN-NNN`.
2. **Journey → test traceability**: every `JRN/STEP/EDGE` maps to `TC-E2E-NNN` /
   `TC-SMK-NNN` in `traceability.yml`; `verify-full` fails if a Must-Have
   journey/edge lacks an E2E test.
3. **Playwright-cli as the first-class E2E target**:
   - `test-plan` (8A) generates Playwright `.spec.ts` **directly from
     `journeys.yml`** (steps→actions, edge cases→assertions, selectors from
     `component-map.yml`);
   - `test-run` (8B) executes via `playwright-cli` (Smoke→E2E) and maps failures
     back to `JRN/STEP/EDGE` in `BUG-NNN.md`;
   - document the journey→playwright pipeline + `playwright-cli` setup in
     `docs/testing-strategy.md`.
4. **Runner-agnostic schema** so other MCP/CLI runners can consume it, but ship
   `playwright-cli` as the default.
**Files:** `commands/product-spec.md`, new `docs/journeys.md`, new
`docs/templates/journey-spec.md`, `commands/test-plan.md`, `commands/test-run.md`,
`commands/verify-full.md`, `docs/testing-strategy.md`, `docs/file-structure.md`,
`docs/phases.md`, `config-template.yml` (`e2e_runner: playwright-cli`).

### Theme I — Standardized interactive elicitation at every step
**Problem:** commands say "ask the user…" in free text; interaction is inconsistent
and easy for an agent to skip or do poorly.
**Changes:**
1. **Canonical interaction convention** (`docs/interaction.md` +
   `docs/templates/interaction-prompts.md`): structured question shape (header chip,
   question, 2–4 options with descriptions, recommended option first, single/multi-
   select, always a free-text fallback) — modeled on Claude Code's `AskUserQuestion`.
2. **Mandatory usage**: mode/track selection, every phase **gate** (Approve / Revise
   / Skip / Abort / Rollback), skip-reason capture, clarification rounds, and the
   **next-action** choice at each phase handoff.
3. **Per-step questioning** inside long phases (research scope opt-ins, product-spec
   detail levels, journey edge-case confirmation, component choices) as structured
   questions, not walls of text.
4. **Tool-agnostic** in docs (host agent supplies the UI), but exact structure
   specified so any runner renders consistent prompts.
**Files:** new `docs/interaction.md`, `docs/templates/interaction-prompts.md`,
`docs/policy.md §2`, `docs/runtime.md`, `commands/forge.md`, and the interaction
sections of phase commands (`research`, `product-spec`, `revalidate`, `bridge`,
`plan`, `tasks`, `test-plan`, `release-readiness`, …), `docs/phases.md`.

---

## 4. Improvements to each existing phase (quick reference)

| Phase | Improvement |
|-------|-------------|
| 0 Problem Discovery | Triage classifies whether phase 0 is even needed (Theme A); go/no-go as a structured question (I). |
| 1 Research | De-dupe vs codebase-analysis; emit IDs consumed downstream (C); scope opt-ins as structured questions (I). |
| 2 Product Spec | Structured journeys schema (H); DS-grounded clickable mockups + component map (E); detail-level prompts structured (I). |
| 3 Revalidate | Diff-based review instead of full re-read (C); approval as structured gate (I). |
| 4 Bridge | Emit delta specs vs canonical `specs/` (B); define OpenAPI+AsyncAPI contracts (F). |
| 5 Plan | Contract-first artifacts (F); cross-validate against journeys + component map (E/H). |
| 5B Tasks | Maintain `traceability.yml` incrementally (C); FE tasks reference component map (E); seed Red-gate test tasks (D). |
| 6 Implement | Test-first Red gate (D); update traceability (C); progressive verify checks component map (E). |
| 6B Code Review | Machine gates before human review (D); doc↔code reconciliation (G). |
| 7 Verify Full | Consume the live matrix instead of re-deriving (C); add component-map, contract-drift, doc↔code, journey-coverage layers (E/F/G/H). |
| 8A Test Plan | Generate Playwright specs from `journeys.yml` (H). |
| 8B Test Run | `playwright-cli` default; map failures to JRN/STEP/EDGE (H). |
| 9 Release Readiness | After release-readiness, run `spec-merge` into canonical specs (B); confirm telemetry wiring (D). |
| 9.5 Monitoring | Real PostHog/Sentry dashboards/alerts (D). |
| 9B Experiment | Create the real flag/experiment via PostHog (D). |
| Retrospective | Pull real metrics/errors/experiment results from MCPs (D). |
| sync-verify | Add contract-drift + doc↔code layers (F/G); diff-based output (C). |
| change-request | Delta-spec format (B). |
| backfill | Write into canonical `specs/` (B). |

---

## 5. New phases / commands

- **`spec-merge`** — delta → canonical `specs/` merge + archive (Theme B).
- **`design-system-harvest`** — manifest of the in-code design system (Theme E).
- **Intake/triage + `express` track + `flow_mode: fluid`** in `forge` (Theme A).
- **Contract-first definition + FE↔BE contract map + drift layer** (Theme F).
- **Doc↔code reconciliation layer** in verify/review (Theme G).
- **Structured journeys → Playwright-cli E2E pipeline** (Theme H).
- **Standardized interactive elicitation** convention applied everywhere (Theme I).

---

## 6. Prioritized rollout (waves)

1. **Wave 1 — overload reduction, applies everywhere:** Theme C (live traceability
   matrix + diff review), Theme A (triage / express / fluid), Theme I (structured
   interaction).
2. **Wave 2 — UX → tests backbone:** Theme E (design-system-harvest + clickable
   mockups + component map) and Theme H (structured journeys → Playwright-cli);
   they share the component-map + traceability backbone.
3. **Wave 3 — living spec + reconciliation:** Theme B (canonical specs + delta +
   `spec-merge`) and Theme G (doc↔code).
4. **Wave 4 — contracts + data:** Theme F (FE↔BE contracts) and Theme D (telemetry
   MCP wiring + test-first gate).

---

## 7. Sources

- GitHub Spec Kit — [repo](https://github.com/github/spec-kit) ·
  [blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) ·
  [spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- Birgitta Böckeler / Martin Fowler — [Understanding SDD: Kiro, spec-kit, Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- François Zaninotto / marmelab — [Spec-Driven Development: The Waterfall Strikes Back](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html)
- OpenSpec — [concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) ·
  [getting-started](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md) ·
  [commands](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md)
- Comparisons — [redreamality: BMAD vs spec-kit vs OpenSpec vs PromptX](https://redreamality.com/blog/-sddbmad-vs-spec-kit-vs-openspec-vs-promptx/) ·
  [spec-compare](https://github.com/cameronsjo/spec-compare) ·
  [MarkTechPost: 9 best SDD tools 2026](https://www.marktechpost.com/2026/05/08/9-best-ai-tools-for-spec-driven-development-in-2026-kiro-bmad-gsd-and-more-compare/)
- Agentic SDLC — [CodeRabbit](https://www.coderabbit.ai/guides/agentic-sdlc) ·
  [Beam](https://getbeam.dev/blog/agentic-sdlc-complete-guide.html)
