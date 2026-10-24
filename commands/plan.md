---
name: speckit.product-forge.plan
description: >
  Phase 5: write the technical plan — from spec.md after bridge (standard/v-model),
  or from the product spec with an inline task list (express/lite) — and check it
  covers every Must Have story, the codebase analysis and the constitution.
---

# Product Forge — Phase 5: Technical Plan

You are the **Plan Architect**. Produce `plan.md`, cross-validate it against the
product spec and the project constitution, and take it through the plan gate.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `plan` (Phase 5)
- **Config keys:** `codebase_path`, `constitution_path`
- **Writes:** `plan.md` (express/lite: with an inline `## Tasks` section), any ADRs,
  `contracts/openapi.yaml` / `contracts/asyncapi.yaml` additions (standard/v-model),
  `plan/digest.md`, `phases.plan.*`
- **Contract deltas:** with `--from-forge`, write only `phases.plan.digest_path`.

## Step 1: Check inputs

1. Read `feature_mode` from `.forge-status.yml` and check the inputs for that mode:
   - **standard / v-model:** `bridge` is `completed` and `spec.md` exists.
   - **express / lite:** `product-spec/README.md` exists. There is no bridge and no
     `spec.md`; the plan reads the product spec directly.
2. If `plan.md` already exists, say that regenerating overwrites it and ask: regenerate,
   or keep the existing plan and continue with `/speckit.product-forge.tasks`
   (standard/v-model) or `/speckit.product-forge.implement` (express/lite).

Result: the mode's inputs are present and the user chose to (re)generate.

## Step 2: Build the plan brief

Read:

- `product-spec/product-spec.md` → Must Have stories, functional requirements, tech constraints.
- standard/v-model: `research/codebase-analysis.md` → integration points, affected
  modules, naming patterns. express/lite: scan `{codebase_path}` for the affected modules.
- standard/v-model: `spec.md` → acceptance criteria and technical requirements.
  express/lite: take acceptance criteria from the product spec's journeys / stories.

**Prior lessons.** Read `research/README.md` and take the section titled exactly
**"Prior lessons that apply"** — the selection `research` already scored
([research.md Step 3: Consult prior lessons](./research.md), [lessons-format.md](../docs/lessons-format.md)).
Consume that selection as-is: `.product-forge/lessons.md` is not re-read and nothing
is re-scored here.

- No `research/README.md`, or no such section → forward no lessons and note
  *"No prior lessons forwarded"* in the brief.
- Otherwise carry each selected lesson (title + one-line relevance) into Step 3 as a
  **planning constraint**.

Show the brief as a short list: feature name; `spec.md` path (standard/v-model) and
`product-spec/` path; `codebase_path`; Must Have stories to plan ({N}); integration
points ({N}, from codebase-analysis.md); the top 3 tech constraints; prior lessons to
respect ({N} with `{title} — {relevance}`, or "none").

Result: the brief is shown and the lesson constraints are fixed.

## Step 3: Write the plan

**express / lite.** Author `plan.md` directly from `product-spec/` — inline and short
in express ([policy.md §4.1](../docs/policy.md#41-phase-maps)) — honouring the lesson
constraints. End it with an inline **`## Tasks`** section in the exact `tasks.md`
task format ([tasks.md Step 4.3 and Step 5](./tasks.md)): `T001`… ids, one `Paths:`
line and one `Size:` line per task, and `Test-first: true` on each unit/contract test
task that must go red first:

```markdown
## Tasks

- [ ] T001 — Unit test: export retries on 503
      Paths: src/export/client.test.ts
      Test-first: true
      Size: XS
- [ ] T002 — Add retry to the export client
      Paths: src/export/client.ts
      Size: S
```

This list is what `implement` executes in express/lite (there is no tasks phase).
Continue at Step 3.5.

**standard / v-model.** Delegate to SpecKit `plan` with this context note:

> *"Product Forge context: This spec is backed by thorough research in `research/`.
> Key integration points and affected modules are in `research/codebase-analysis.md`.
> User journeys and wireframes are in `product-spec/`.
> The plan must address all Must Have user stories from `product-spec/product-spec.md`.
> After returning the plan, do NOT proceed to tasks or implementation — stop and return control."*

When Step 2 forwarded lessons, append them as constraints the plan must satisfy:

> *"Prior lessons that apply (from `research/README.md`) — the plan MUST account for
> each: {for each forwarded lesson} `{title}` — {one-line relevance}. Where a lesson
> implies a guard (e.g. a resilience strategy, a check, a test), reflect it in the
> plan's design or its risks section."*

With no forwarded lessons, send the first note alone.

Result: `plan.md` exists (express/lite: ending in `## Tasks`).

## Step 3.5: Constitution compliance

Resolve `CONSTITUTION_PATH`: `constitution_path` from config, else
`.specify/memory/constitution.md`. When neither exists, skip this step and put
"No constitution found — compliance check skipped" in the gate summary.

Mark each item ✅ / ⚠️ / ❌ from what `plan.md` contains:

- **Resilience & external services** — every external call has a resilience strategy
  (circuit breaker, retry policy, or documented degraded mode); rate limiting on public
  endpoints; timeouts on external calls.
- **Data & privacy** — a data-deletion handler when the feature stores user data (e.g.
  a user-deletion event listener); sensitive fields identified with a protection strategy.
- **Testing** — coverage targets per service or module; an integration test strategy
  (not only unit tests); at least one test case per critical path in `spec.md`
  (express/lite: in the product spec's journeys).
- **EDA** (skip when not applicable) — event handlers catch and log errors instead of
  propagating them to the bus; events are emitted after data is persisted; correlation /
  trace IDs in every event payload; events that do not exist yet are listed as plan tasks.
- **Code quality** — no circular dependencies between modules introduced by the
  feature; functions and modules respect the constitution's size conventions.

Show `Constitution Compliance: {Feature Name}` with ✅ passed {N}, ⚠️ warnings {list},
❌ violated {list}. Add every ❌ as a row of the Step 4 table.

Result: every applicable item is marked.

## Step 3.6: Contract refinement (standard / v-model only)

`bridge` already authored the FE↔BE contracts — `contracts/openapi.yaml` (OpenAPI 3.1,
HTTP) and `contracts/asyncapi.yaml` (AsyncAPI, events), each operation/message with a
stable `API-*` id. Planning may add endpoints or events bridge did not foresee; refine,
do not re-author:

1. Read both files. When neither exists (no API surface), skip this step.
2. Add each endpoint/event the plan introduces that the contracts lack, with a new
   `API-*` id. Existing `API-*` ids keep their number and meaning.
3. Describe request/response and event shapes only (FE → contract → BE); the
   persistence leg stays out of the contract.
4. Reference each new `API-*` id from the relevant journey steps and the `contracts:`
   column of `traceability.yml`, as bridge does.

`api-docs` later validates the contracts against the implementation.

Result: every endpoint/event in `plan.md` has an `API-*` id in the contracts.

## Step 4: Cross-validate against the product spec

Check `plan.md` against `product-spec/product-spec.md`:

| Check | Status | Notes |
|-------|--------|-------|
| All Must Have user stories addressed in plan? | ✅/⚠️/❌ | List any missing |
| Technical integration matches codebase-analysis findings? | ✅/⚠️/❌ | |
| No unresolved open questions from product-spec? | ✅/⚠️/❌ | |
| Data model / schema aligned with product-spec requirements? | ✅/⚠️/❌ | |
| Non-functional requirements (perf, security) addressed? | ✅/⚠️/❌ | |
| API contracts consistent with product-spec user journeys? | ✅/⚠️/❌ | |

Any ❌ (including constitution violations): show the exact mismatches and ask the user
how to resolve them before the gate. Only ✅/⚠️: go on.

Result: no unresolved ❌ remains.

## Step 5: Phase digest

Write `{FEATURE_DIR}/plan/digest.md` from
[phase-digest.md](../docs/templates/phase-digest.md) with:

- **Key decisions** — tech choices, module boundaries, major data-model shapes, top 3 NFRs.
- **Artifacts produced** — `plan.md` (with its inline `## Tasks` in express/lite) and any ADRs.
- **Open risks** — unresolved architectural trade-offs or dependencies.
- **Handoff notes** — what tasks (standard/v-model) or implement (express/lite) must
  keep in mind: sequencing hints, shared work.
- **Prior lessons applied** — each forwarded lesson title with a one-line note on how
  the plan honours it, or *"none"*. This carries the lessons on to `tasks` / `implement`.

## Step 6: Gate

Show the summary: plan sections ({N}) — architecture / data model, API contracts
({N} endpoints), frontend components ({N}), backend services ({N}), migrations / schema
changes ({N}), inline tasks ({N}, express/lite only); cross-validation ✅/⚠️/❌ counts
with lists; constitution compliance ✅/⚠️/❌ counts with lists (or the skip note);
story coverage `{N}/{N} Must Have stories addressed`.

Standalone, show the Gate with outcome *"{N}/{N} Must Have stories addressed,
cross-validation {N}/{N} passed"* and `{next phase}` = Tasks (standard/v-model) or
Implement (express/lite). Both are required, so the options are Approve, Revise,
Rollback, Abort — no Skip.

```yaml
phases:
  plan:
    digest_path: "plan/digest.md"
    status: completed        # approved / approved_with_conditions
```

Revise → `in_progress` and re-run from Step 3 with the user's feedback.

## Step 7: Hand-off

Report `Plan approved and saved to {FEATURE_DIR}/plan.md`, then
`Next step: /speckit.product-forge.tasks` (standard/v-model) or
`/speckit.product-forge.implement` (express/lite — it executes the inline `## Tasks`).
A custom step (cost estimate, architecture review, security design check) may be
inserted before it.

## Done when

- `plan.md` exists; in express/lite it ends with a `## Tasks` list where every task has
  a `T0NN` id, a `Paths:` line and a `Size:` line.
- Every Must Have story is addressed in the plan (story coverage `N/N`), or the user
  resolved each gap at Step 4.
- Every constitution item is marked, or the skip note is recorded.
- standard/v-model: every endpoint/event the plan adds has an `API-*` id in
  `contracts/*`, and no existing id changed.
- `plan/digest.md` exists with all five sections, including prior lessons applied.
- Standalone: the Gate was shown, the decision recorded, and `phases.plan.status` set
  from it. `--from-forge`: `phases.plan.digest_path` written and the Step 6 summary
  returned to forge (no gate prompt, no status write).
