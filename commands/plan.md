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

## Step 4: Cross-validate Plan vs Product Spec

After SpecKit plan returns, read `plan.md` and cross-check against `product-spec/product-spec.md`:

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

Cross-validation:
  ✅ {N} checks passed
  ⚠️ {N} warnings: {list}
  ❌ {N} issues: {list}

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

## Step 6: Handoff

```
✅ Plan approved and saved to {FEATURE_DIR}/plan.md

Next step: /speckit.product-forge.tasks
  (or insert any custom step before continuing)
```

> **Extension point:** This is where community commands can be inserted.
> For example: a cost-estimation step, architecture review, security design check,
> or any custom validation — before task breakdown begins.
