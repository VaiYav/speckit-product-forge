---
name: speckit.product-forge.pre-impl-review
description: >
  Reviews a feature before coding (Phase 5C): design completeness, architecture
  soundness and a risk register with rollout recommendation. Use after tasks; optional
  for features with five or fewer tasks and no UI.
---

# Product Forge — Phase 5C: Pre-Implementation Review

You are the **Pre-Implementation Reviewer**. Before any code is written, you check
design completeness, architecture soundness and risks, and write
`pre-impl-review.md` with design / architecture findings, a risk register and the
conditions for approval.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `pre_impl_review` (Phase 5C)
- **Config keys:** `require_pre_impl_review`, `require_skip_reason`
- **Writes:** `pre-impl-review.md`, `gate-review.md` (`F-NNN` rows), `tasks.md`
  (accepted conditions, with confirmation), `phases.pre_impl_review.status`,
  `phases.pre_impl_review.skip_reason`
- **Contract deltas:**
  - The phase may be skipped at its **start** (Step 1), not only at the previous gate.
  - Gate extras: `conditions`, `risks_accepted` (Step 7).

## Step 0: Load context

Require `phases.tasks.status: completed`; otherwise stop with
*"Phase 5B (Tasks) must be completed first."*

Read from `{FEATURE_DIR}`:

- `spec.md` — requirements, acceptance criteria, NFRs
- `plan.md` — architecture and data model
- `tasks.md` — task breakdown and file paths
- `product-spec/product-spec.md` — product context
- `product-spec/journeys/journeys.yml` — structured journeys (JRN/STEP/EDGE)
- `product-spec/wireframes*`, `product-spec/mockups/` — UI designs (if present)
- `research/ux-patterns.md` — UX best practices
- `research/codebase-analysis.md` — integration points, reusable components
- `research/README.md` — its **"Prior lessons that apply"** section (selected by
  `research` Step 3 from `.product-forge/lessons.md`). Use that section as the only
  lessons input; when it is absent, there are no lesson-derived risks.

## Step 1: Determine the review scope

Count the tasks in `tasks.md` and classify them:

- **UI tasks** — reference `.vue`, `.tsx`, `.jsx`, `.html`, `.css`, `.scss`, or
  "component", "screen", "page", "view"
- **API tasks** — reference controllers, endpoints, routes
- **Backend tasks** — reference services, repositories, models

Sections: Architecture Review and Risk Assessment always run; Design Review runs only
with UI tasks.

When there are **≤ 5 tasks and no UI tasks** and `require_pre_impl_review` is not
`true` (the phase is `opt` in [phase-map.yml](../docs/schema/phase-map.yml)), ask:

```
[Run Pre-Impl Review?] This feature has {N} tasks and no UI components. Pre-implementation
review is optional for small backend features.

  1. Run review anyway (recommended for features with external API integrations)
  2. Skip to implementation
  (or type your own answer)
```

When the config requires the review, run it without asking. On **Skip**, collect
`skip_reason` (ask for it when `require_skip_reason: true`; an empty answer is
re-asked), then stop: standalone, set `phases.pre_impl_review.status: skipped` and
`phases.pre_impl_review.skip_reason`, and append the Step 7 gate entry with `decision: skipped`; with `--from-forge`, return
the skip and its reason to forge.

## Step 2: Design review (UI tasks only)

Run checks 2A–2D from
[docs/reference/pre-impl-review-design-review.md](../docs/reference/pre-impl-review-design-review.md):
state completeness, UX pattern compliance, accessibility pre-check, component reuse.
Each gap is a `D-NNN` finding.

## Step 3: Architecture review

From the `plan.md` architecture and `research/codebase-analysis.md`:

**3A: Structural checks**

| Check | Status | Evidence |
|-------|:------:|---------|
| Separation of concerns (controller/service/repo layers) | {✅/⚠️/❌} | {from plan.md} |
| Dependency direction correct (no circular deps) | {✅/⚠️/❌} | |
| API contracts complete (request/response schemas) | {✅/⚠️/❌} | |
| Data model consistent with spec.md entities | {✅/⚠️/❌} | |
| Migration strategy defined (if DB changes) | {✅/⚠️/❌/N-A} | |
| Error handling patterns defined | {✅/⚠️/❌} | |
| Authentication/authorization approach defined | {✅/⚠️/❌/N-A} | |
| Caching strategy defined (if needed) | {✅/⚠️/❌/N-A} | |

**3B: Integration points** — each integration point in `codebase-analysis.md` has a plan:

| Integration Point | Plan Coverage | Risk Level |
|------------------|:------------:|:----------:|
| {integration from codebase-analysis} | {✅ Covered / ⚠️ Partial / ❌ Missing} | {H/M/L} |

**3C: NFR coverage** — each `spec.md` NFR has an adequate plan approach:

| NFR | Plan Approach | Adequate? |
|-----|:-------------|:---------:|
| {NFR from spec.md} | {approach from plan.md} | {✅/⚠️/❌} |

Each gap is an `A-NNN` finding.

## Step 4: Risk assessment

Build a risk register from all loaded artifacts. Look for:

- **Technical** — a library or technology new to the codebase, complex data
  migrations, performance-sensitive work without targets, unreliable external APIs.
- **Scope** — ambiguous acceptance criteria, > 15 tasks, task dependencies that form
  a critical-path bottleneck.
- **Integration** — external API availability / rate limits / breaking changes,
  third-party compatibility, schema changes affecting existing features, shared
  state or cache invalidation.
- **Rollback** — irreversible migrations, breaking API changes for existing clients,
  a needed feature flag that is not planned, persistent data-format changes.

**Prior lessons.** For each lesson under "Prior lessons that apply":

1. Treat it as a candidate risk for this feature.
2. Add a row: **Category** = the closest of the four; **Risk** = the lesson restated
   as a forward-looking risk, citing `(lesson: "{title}", {date})`; Likelihood /
   Impact / Severity assessed for *this* feature (a recurring lesson is not
   automatically High); **Mitigation** = the corrective action, concrete for this plan.
3. When the lesson does not apply to this feature's surface, drop it and note the
   omission in one line under the register.

**Adversarial pass** — fold the results into the register as rows:

1. **Contradictions.** Compare `spec.md` requirements and acceptance criteria
   pairwise, and against `plan.md` decisions and `journeys.yml` steps. Each genuine
   conflict is a **Scope** row citing both ids (e.g. `FR-012 vs AC-3`), mitigation
   "resolve before coding".
2. **Determinism.** For each acceptance criterion ask: *"Would two competent
   implementers build different things from this criterion?"* Each yes is a
   **Scope** row quoting the criterion id and the divergence, mitigation "tighten the
   criterion to one observable outcome".

With neither, state *"No contradictions; all criteria deterministic"*.

Register format and severity:

| ID | Category | Risk | Likelihood | Impact | Severity | Mitigation |
|----|----------|------|:----------:|:------:|:--------:|-----------|
| R-001 | Technical | {description} | H/M/L | H/M/L | {H×H=Critical, etc.} | {strategy} |

- **Critical** (H×H) — mitigation required before coding
- **High** (H×M, M×H) — mitigation planned
- **Medium** (M×M, H×L, L×H) — document and monitor
- **Low** (M×L, L×M, L×L) — acknowledge

Rollout recommendation:

| Risk profile | Recommended rollout |
|--------------|---------------------|
| ≥ 1 Critical | Feature flag + canary (1% → 10% → 50% → 100%) |
| ≥ 3 High | Feature flag + staged rollout (10% → 50% → 100%) |
| Mostly Medium / Low | Feature flag recommended, not required |
| All Low | Direct release acceptable |

## Step 5: Write `pre-impl-review.md`

Write `{FEATURE_DIR}/pre-impl-review.md` from
[docs/templates/pre-impl-review-report.md](../docs/templates/pre-impl-review-report.md).
Every finding cites its source artifact (and line or requirement id) and carries a
specific recommendation; flag only concerns the artifacts evidence. Keep the
review proportional: a small feature gets a lightweight review, a large one a
thorough review.

Append each design, architecture and risk finding to `{FEATURE_DIR}/gate-review.md`
in the single `F-NNN` namespace with `source: pre-impl-review`,
`dimension: design|architecture|risk` and `raised@{git-sha}`, continuing from the
current max `F-NNN`. `D-/A-/R-NNN` stay the in-document labels
([template](../docs/templates/gate-review.md)).

## Step 6: Present and gate

Show design, architecture and risk counts (critical / high) and the recommendation.
For each condition, ask:

```
[Condition {N}] {condition} — affects {artifact path}; required before Phase 6.

  1. Accept condition (recommended)
  2. Reject — proceed anyway
  3. Discuss
  (or type your own answer)
```

Standalone, show the gate (no Skip — Implement is required in every mode):

```
[Gate] Pre-implementation review complete — {one-line outcome}. How do you want to proceed?

  1. Approve (recommended) — all conditions accepted; proceed to Phase 6
  2. Revise — fix the issues in plan.md / tasks.md, then re-run this review
  3. Rollback — return to an earlier, completed phase by name
  4. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

Accepting open risks is an **Approve** with the accepted counts in `risks_accepted`.

| Option | Decision | `phases.pre_impl_review.status` |
|--------|----------|---------------------------------|
| Approve, nothing deferred | `approved` | `completed` |
| Approve, conditions tracked as tasks rather than resolved now | `approved_with_conditions` (list `conditions`) | `completed` |
| Revise | `revised` | `in_progress` (the review re-runs) |
| Rollback | `rolled_back` + `rolled_back_to` | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort | `aborted` | unchanged |

## Step 7: Status and gate entry

Standalone, set `phases.pre_impl_review.status` from the table (or `skipped` from
Step 1) and append:

```yaml
gates:
  - phase: pre_impl_review
    decision: "{approved / approved_with_conditions / revised / skipped / rolled_back / aborted}"
    rolled_back_to: "{phase}"   # only when decision is rolled_back
    timestamp: "{ISO timestamp}"
    notes: "{user's decision context}"
    conditions:
      - "{condition 1}"
    skip_reason: "{reason}"     # only when decision is skipped (Step 1)
    risks_accepted:             # counts of accepted open risks by severity
      critical: {N}
      high: {N}
```

With `--from-forge`, return the findings summary, `conditions` and `risks_accepted`
(or the Step 1 skip and its reason) to forge.

For each accepted condition, propose a task for `tasks.md` and add it once the user
confirms.

Hand-off: `Next step: /speckit.product-forge.implement` (Phase 6).

## Done when

- The scope classification is shown; the skip offer appeared only for ≤ 5 tasks, no
  UI and `require_pre_impl_review` not `true`, and a skip recorded `skipped` with its
  reason.
- Otherwise `pre-impl-review.md` is written from the template, with Design Review
  (2A–2D) for UI features or "Skipped — no UI", all three architecture tables, and a
  risk register covering the four categories, every applicable prior lesson, and the
  contradiction and determinism results.
- Every design / architecture / risk finding is in `gate-review.md` as a new `F-NNN`
  continuing the existing numbering.
- Every condition has the user's answer; each accepted condition the user confirmed
  is a task in `tasks.md`.
- Standalone: the gate was shown, its decision appended to `gates[]` with
  `conditions` and `risks_accepted`, and `phases.pre_impl_review.status` set from it.
- `--from-forge`: the findings summary, `conditions` and `risks_accepted` were
  returned to forge with no gate prompt and no status or `gates[]` write.
