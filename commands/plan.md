---
name: speckit.product-forge.plan
description: >
  Phase 5: Generate technical plan from spec.md with cross-validation against product-spec.
  Ensures plan covers all Must Have user stories and aligns with codebase analysis.
  Standalone — run independently, before tasks or implement.
  Use: "create plan", "technical plan", "/speckit.product-forge.plan"
---

# Product Forge — Phase 5: Technical Plan

You are the **Plan Architect** for Product Forge Phase 5.
Your job: generate a technical plan from `spec.md`, cross-validate it against the
product spec, and present the plan for user approval.

This is a **standalone command** — it does one thing and exits.
The next step is `/speckit.product-forge.tasks` (or any custom step you want to insert first).

## User Input

```text
$ARGUMENTS
```

---

> **Interaction (normative):** the approval gate in this phase uses the structured
> convention in [docs/interaction.md](../docs/interaction.md) (ready snippets in
> [docs/templates/interaction-prompts.md](../docs/templates/interaction-prompts.md)).
> Present the *Gate* template — labeled options, recommended first, free-text
> fallback — rather than a free-form "say approved" prompt.

---

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `bridge` must be `completed`
2. Verify `spec.md` exists in FEATURE_DIR
3. If `plan.md` already exists:
   > ℹ️ `plan.md` already exists. Regenerating will overwrite it.
   > Confirm to proceed, or run `/speckit.product-forge.tasks` to continue with the existing plan.

---

## Step 2: Pre-Plan Context Brief

Collect context to pass to the plan agent:

Read the following artifacts to build a rich brief:
- `product-spec/product-spec.md` → Must Have stories, functional requirements, tech constraints
- `research/codebase-analysis.md` → integration points, affected modules, naming patterns
- `spec.md` → acceptance criteria, technical requirements

**Prior lessons (v1.6, W5-D1).** Read `research/README.md` and extract the section
titled exactly **"Prior lessons that apply"** — the selection `research` already
scored and rendered there (see [research.md Step 2.5](./research.md) and
[`docs/lessons-format.md`](../docs/lessons-format.md)). Do **not** re-read
`.product-forge/lessons.md` or re-score here — consume the existing selection only.
- If `research/README.md` is absent, or it contains no such section → forward no
  lessons and note *"No prior lessons forwarded"* in the brief. Do not invent any.
- Otherwise, carry the selected lesson blocks (title + one-line relevance) forward
  as **planning constraints** for Step 3.

Show:

```
🎯 Plan Brief: {Feature Name}

SpecKit spec:     {FEATURE_DIR}/spec.md
Product spec:     {FEATURE_DIR}/product-spec/
Codebase path:    {codebase_path}

Must Have stories to plan: {N}
Integration points:        {N} (from codebase-analysis.md)
Key tech constraints:
  • {constraint 1 from research}
  • {constraint 2 from research}
  • {constraint 3 from research}
Prior lessons to respect:  {N} (from research/README.md → "Prior lessons that apply"; "none" if absent)
  • {lesson title} — {one-line relevance}
```

> **Future (W5-D1):** lessons may later carry a Kiro-style `applies_to_globs` field
> to scope which features they bind. If adopted, it MUST ship with a *deterministic*
> glob-matcher (match each lesson's globs against the affected module paths already
> listed in `research/codebase-analysis.md`) — never an LLM "does this seem relevant?"
> judgment. Until that matcher exists, selection stays tag-based in `research` and is
> consumed here as-is.

---

## Step 3: Delegate to SpecKit Plan

**Delegate to SpecKit `plan`** with the enriched context note:

> *"Product Forge context: This spec is backed by thorough research in `research/`.
> Key integration points and affected modules are in `research/codebase-analysis.md`.
> User journeys and wireframes are in `product-spec/`.
> The plan must address all Must Have user stories from `product-spec/product-spec.md`.
> After returning the plan, do NOT proceed to tasks or implementation — stop and return control."*

If Step 2 forwarded any **Prior lessons** (v1.6, W5-D1), append them to the context
note as explicit constraints the plan must satisfy — not background reading:

> *"Prior lessons that apply (from `research/README.md`) — the plan MUST account for
> each: {for each forwarded lesson} `{title}` — {one-line relevance}. Where a lesson
> implies a guard (e.g. a resilience strategy, a check, a test), reflect it in the
> plan's design or its risks section."*

If no lessons were forwarded, omit this paragraph entirely.

---

## Step 3.5: Constitution Compliance Check

After SpecKit plan returns, automatically verify `plan.md` against the project constitution.

**Locate the constitution file** (in priority order):
1. Read `.product-forge/config.yml` → look for `constitution_path` key
2. Fall back to `.specify/memory/constitution.md`
3. If neither file exists → skip this step silently and note "No constitution found — compliance check skipped" in the approval summary

Store resolved path as `CONSTITUTION_PATH`.

For each section below, mark ✅ / ⚠️ / ❌ based on what's present in `plan.md`:

**Resilience & External Services**
- [ ] Every external service call has a resilience strategy (circuit breaker, retry policy, or documented degraded mode)
- [ ] Rate limiting addressed for any public-facing endpoints
- [ ] Timeout configuration mentioned for external calls

**Data & Privacy**
- [ ] If the feature stores user data: a data deletion handler is included (e.g., user deletion event listener)
- [ ] Sensitive data fields identified and protection strategy described

**Testing**
- [ ] Coverage targets specified per service or module
- [ ] Integration test strategy described (not just unit tests)
- [ ] At least one test case listed per critical path in spec.md

**EDA (skip if not applicable)**
- [ ] Event handlers do not throw — errors are caught and logged, never propagated to the bus
- [ ] Events are emitted after data is persisted, not before
- [ ] Correlation / trace IDs are present in all event payloads
- [ ] New events that don't exist yet are listed as tasks in the plan

**Code Quality**
- [ ] No circular dependencies between modules introduced by this feature
- [ ] Functions and modules respect size conventions from the constitution

Present results:

```
⚖️ Constitution Compliance: {Feature Name}

✅ Passed:   {N} checks
⚠️ Warnings: {list — present but needs attention}
❌ Violated: {list — must be fixed before approval}
```

If ❌ violations found: add them as additional rows in the Cross-Validation table (Step 4).

---

## Step 3.6: Contract refinement (Theme F)

`bridge` Step 4.6 already authored the FE↔BE contracts — `contracts/openapi.yaml`
(OpenAPI 3.1, HTTP endpoints) and `contracts/asyncapi.yaml` (AsyncAPI, events) — each
operation/message carrying a stable `API-*` id. Planning is the first phase that may
introduce *new* endpoints or events (e.g., an internal sync call, a derived event) not
foreseen at bridge time. This is a light refinement step, not a re-author:

1. Read `contracts/openapi.yaml` and `contracts/asyncapi.yaml` (skip silently if the
   feature defines no API surface and neither file exists).
2. For each endpoint/event the plan introduces that is missing from the contracts, add
   it with a new `API-*` id. **Keep existing `API-*` ids stable** — never renumber or
   repurpose an id `bridge` already minted.
3. Scope is **FE → contract → BE** only — describe request/response and event shapes.
   Do not model a database/persistence leg here.
4. Reference any newly added `API-*` ids from the relevant journey steps and the
   `contracts:` column of `traceability.yml`, matching bridge's convention.

`api-docs` later validates/regenerates against the implementation; this step only keeps
the up-front contract in sync with what the plan actually adds.

---

## Step 4: Cross-validate Plan vs Product Spec

Read `plan.md` and cross-check against `product-spec/product-spec.md`:

| Check | Status | Notes |
|-------|--------|-------|
| All Must Have user stories addressed in plan? | ✅/⚠️/❌ | List any missing |
| Technical integration matches codebase-analysis findings? | ✅/⚠️/❌ | |
| No unresolved open questions from product-spec? | ✅/⚠️/❌ | |
| Data model / schema aligned with product-spec requirements? | ✅/⚠️/❌ | |
| Non-functional requirements (perf, security) addressed? | ✅/⚠️/❌ | |
| API contracts consistent with product-spec user journeys? | ✅/⚠️/❌ | |

If ❌ found: surface exact mismatches, ask user how to resolve before proceeding.
If only ✅/⚠️: proceed to approval gate.

---

## Step 5: Plan Approval Gate

Present a summary:

```
📐 Technical Plan Created: {Feature Name}

Plan sections: {N}
  • Architecture / data model
  • API contracts: {N} endpoints
  • Frontend components: {N}
  • Backend services: {N}
  • Migrations / schema changes: {N}

Cross-validation (product spec):
  ✅ {N} checks passed
  ⚠️ {N} warnings: {list}
  ❌ {N} issues: {list}

Constitution compliance:
  ✅ {N} checks passed
  ⚠️ {N} warnings: {list}
  ❌ {N} violations: {list}

Story coverage: {N}/{N} Must Have stories addressed
```

Then present the **Gate** prompt from
[interaction-prompts.md](../docs/templates/interaction-prompts.md):

```
[Gate] Plan complete — {N}/{N} Must Have stories addressed, cross-validation {N}/{N} passed. How do you want to proceed?

  1. Approve (recommended) — accept the plan and continue to tasks
  2. Revise — re-run this phase with feedback
  3. Skip tasks — move on without it (a reason may be required)
  4. Rollback — return to an earlier phase by name
  5. Abort — stop the lifecycle for this feature
  (or type your own answer)
```

On **Approve** → update `.forge-status.yml`:

```yaml
phases:
  plan: completed
last_updated: "{ISO timestamp}"
```

On **Revise**, loop back with the user's feedback. On **Rollback**/**Abort**, hand
control back to the orchestrator without marking `plan` complete.

---

## Step 6: Phase Digest (required)

Before handoff, write `{FEATURE_DIR}/plan/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) and record
its path on `.forge-status.yml` under `phases.plan.digest_path`.

The digest must include:
- **Key decisions** — tech choices, module boundaries, major data model shapes, top 3 NFRs.
- **Artifacts produced** — `plan.md` and any ADRs created during planning.
- **Open risks** — unresolved architectural trade-offs or dependencies.
- **Handoff notes** — what tasks generation must keep in mind (sequencing hints, shared work).
- **Prior lessons applied (v1.6, W5-D1)** — list each forwarded lesson (title) and the
  one-line note on how the plan honors it, or *"none"* if Step 2 forwarded no lessons.
  This carries the lessons forward through the brief→digest chain so `tasks`/`implement`
  inherit them rather than re-discovering them.

The orchestrator refuses to mark Phase 5 complete until `digest.md` exists.
See [`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).

---

## Step 7: Handoff

```
✅ Plan approved and saved to {FEATURE_DIR}/plan.md

Next step: /speckit.product-forge.tasks
  (or insert any custom step before continuing)
```

> **Extension point:** This is where community commands can be inserted.
> For example: a cost-estimation step, architecture review, security design check,
> or any custom validation — before task breakdown begins.
