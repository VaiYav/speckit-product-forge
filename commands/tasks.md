---
name: speckit.product-forge.tasks
description: >
  Phase 5B: Generate task breakdown from plan.md with cross-validation against product-spec.
  Ensures every Must Have story and functional requirement has at least one task.
  Standalone — run after plan, before implement (or after any custom step).
  Use: "generate tasks", "task breakdown", "/speckit.product-forge.tasks"
---

# Product Forge — Phase 5B: Task Breakdown

You are the **Task Breakdown Coordinator** for Product Forge Phase 5B.
Your job: generate an actionable, dependency-ordered task list from `plan.md`,
cross-validate it against the product spec, and present it for user approval.

This is a **standalone command** — it does one thing and exits.
The next step is `/speckit.product-forge.implement` (or any custom step you want to insert first).

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `plan` must be `completed`
2. Verify `plan.md` exists in FEATURE_DIR
3. If `tasks.md` already exists with unchecked tasks:
   > ℹ️ `tasks.md` already exists with {N} pending tasks.
   > Regenerating will overwrite it. Confirm to proceed, or run
   > `/speckit.product-forge.implement` to continue with existing tasks.

---

## Step 2: Pre-Tasks Context Brief

Show:

```
📋 Task Breakdown Brief: {Feature Name}

plan.md:          {FEATURE_DIR}/plan.md  ← source of truth for tasks
product-spec:     {FEATURE_DIR}/product-spec/product-spec.md
spec.md:          {FEATURE_DIR}/spec.md

Plan sections to decompose: {N}
Must Have stories needing task coverage: {N}
Functional requirements: {N}
```

---

## Step 3: Delegate to SpecKit Tasks

**Delegate to SpecKit `tasks`** with the enriched context note:

> *"Product Forge context: Decompose `plan.md` into granular, implementation-ready tasks.
> Reference `product-spec/product-spec.md` for acceptance criteria — each task group
> should satisfy one or more acceptance criteria explicitly.
> Group tasks by the feature breakdown sections in `product-spec.md` where possible.
> Tasks should be sized for safe, incremental implementation — avoid tasks that touch
> too many layers at once.
> After returning tasks.md, do NOT begin implementation — stop and return control."*

---

## Step 4: Cross-validate Tasks vs Product Spec

After SpecKit tasks returns, read `tasks.md` and check:

| Check | Status | Notes |
|-------|--------|-------|
| Every Must Have US-NNN has ≥1 implementation task? | ✅/⚠️/❌ | List missing stories |
| Every FR-NNN has ≥1 corresponding task? | ✅/⚠️/❌ | |
| Test / validation tasks included per task group? | ✅/⚠️/❌ | |
| No orphan tasks (tasks without traceable requirement)? | ✅/⚠️/❌ | |
| Task granularity appropriate? (not too large, not trivial) | ✅/⚠️/❌ | |
| Dependency order is sensible? (data model before service before controller) | ✅/⚠️/❌ | |

If ❌ found: surface specific gaps (e.g., "US-003 has no task"), ask user how to resolve.
If only ✅/⚠️: proceed to approval gate.

---

## Step 5: Tasks Approval Gate

Present a summary:

```
📋 Task Breakdown Created: {Feature Name}

Task groups: {N}
  Phase 1: {name} — {N} tasks
  Phase 2: {name} — {N} tasks
  Phase 3: {name} — {N} tasks
  ...
Total tasks: {N}

Coverage check:
  ✅ {N}/{N} Must Have stories covered
  ✅ {N}/{N} Functional requirements covered
  ⚠️ {N} warnings: {list}

Estimated implementation surface:
  Files to create:  {N}
  Files to modify:  {N}
```

Ask: *"Task breakdown ready — {N} tasks across {N} groups.
All {N} Must Have stories covered. Approve and begin implementation?"*

On approval → update `.forge-status.yml`:

```yaml
phases:
  tasks: completed
tasks:
  total: {N}
  groups: {N}
  story_coverage: "{N}/{N}"
last_updated: "{ISO timestamp}"
```

---

## Step 6: Handoff

```
✅ Tasks approved and saved to {FEATURE_DIR}/tasks.md

Next step: /speckit.product-forge.implement
  (or insert any custom step before continuing)
```

> **Extension point:** This is where community commands can be inserted.
> For example: a sprint estimation step, capacity planning check, external review
> workflow, approval gate — before actual code writing begins.
