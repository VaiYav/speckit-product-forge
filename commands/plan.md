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
```

---

## Step 3: Delegate to SpecKit Plan

**Delegate to SpecKit `plan`** with the enriched context note:

> *"Product Forge context: This spec is backed by thorough research in `research/`.
> Key integration points and affected modules are in `research/codebase-analysis.md`.
> User journeys and wireframes are in `product-spec/`.
> The plan must address all Must Have user stories from `product-spec/product-spec.md`.
> After returning the plan, do NOT proceed to tasks or implementation — stop and return control."*

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

Ask: *"Technical plan ready. Cross-validation: {N}/{N} checks passed.
Approve the plan?*

On approval → update `.forge-status.yml`:

```yaml
phases:
  plan: completed
last_updated: "{ISO timestamp}"
```

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
