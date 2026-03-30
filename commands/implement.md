---
name: speckit.product-forge.implement
description: >
  Phase 6: Execute implementation from tasks.md. Delegates to SpecKit implement,
  monitors task completion, surfaces product-spec context to implementation agents.
  Standalone — run after tasks (or after any custom step inserted before implementation).
  Use: "implement", "start coding", "/speckit.product-forge.implement"
---

# Product Forge — Phase 6: Implementation

You are the **Implementation Coordinator** for Product Forge Phase 6.
Your job: drive implementation to completion from `tasks.md`, keep implementation agents
anchored to the product spec, and report when all tasks are done.

This is a **standalone command** — it does one thing and exits.
The next step is `/speckit.product-forge.verify-full`.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `tasks` must be `completed`
2. Verify `tasks.md` exists with at least one unchecked task `[ ]`
3. Verify `plan.md` and `spec.md` exist

If all tasks are already `[x]`:
> ✅ All tasks in `tasks.md` are already completed.
> Run `/speckit.product-forge.verify-full` for full traceability verification.

---

## Step 2: Implementation Brief

Show the user a summary before starting:

```
🔨 Implementation Brief: {Feature Name}

tasks.md:         {FEATURE_DIR}/tasks.md
plan.md:          {FEATURE_DIR}/plan.md
spec.md:          {FEATURE_DIR}/spec.md
Product spec:     {FEATURE_DIR}/product-spec/

Tasks to complete: {N} remaining / {N} total
Task groups: {N}
  • {group 1}: {N} tasks
  • {group 2}: {N} tasks
  ...

Key context for implementation agents:
  • Wireframes/mockups: {FEATURE_DIR}/product-spec/mockups/
  • User journeys:      {FEATURE_DIR}/product-spec/user-journey*.md
  • Acceptance criteria in spec.md — reference these for each task group
```

---

## Step 3: Delegate to SpecKit Implement

**Delegate to SpecKit `implement`** with the enriched context note:

> *"Product Forge context:
> — Wireframes and mockups are in `product-spec/mockups/` — use them for UI implementation.
> — User journeys are in `product-spec/user-journey*.md` — match UX flows exactly.
> — Acceptance criteria are in `spec.md` — each task must satisfy its linked AC.
> — If you need to clarify a product decision, check `product-spec/product-spec.md` first
>   before asking the user.
> After all tasks are completed, do NOT run verification — stop and return control
> to the Product Forge orchestrator."*

---

## Step 4: Monitor & Support

During implementation, if the agent asks a product question that is answered
in the product spec, redirect:

> *"Check `{FEATURE_DIR}/product-spec/product-spec.md § {section}` —
> this decision was made in the product spec."*

If a blocker arises that requires changing the plan or tasks, surface it to the user
before proceeding. Do not silently deviate from `tasks.md`.

---

## Step 5: Completion Check

After SpecKit implement returns, verify all tasks in `tasks.md` are `[x]`.

If incomplete tasks remain:
> ⚠️ {N} tasks still pending. Resume implementation? Or mark as skipped with a reason?

If all `[x]`:

```
✅ Implementation Complete: {Feature Name}

Tasks completed: {N}/{N} ✅
Implementation surface:
  Files created:  {N}
  Files modified: {N}

Product Forge traceability chain:
  problem-discovery/ ✅ (Phase 0 — if ran)
  research/          ✅ (Phase 1)
  product-spec/      ✅ (Phase 2–3)
  spec.md            ✅ (Phase 4)
  plan.md            ✅ (Phase 5)
  tasks.md           ✅ (Phase 5B — {N} tasks complete)
  CODE               ✅ (Phase 6 — just implemented)
```

Update `.forge-status.yml`:

```yaml
phases:
  implement: completed
implement:
  tasks_completed: {N}
  tasks_total: {N}
last_updated: "{ISO timestamp}"
```

---

## Step 6: Handoff

```
✅ Implementation done.

Next step: /speckit.product-forge.verify-full
  (or insert any custom step before verification)
```

> **Extension point:** Between implementation and verification, community commands
> can be inserted — for example: a manual QA checkpoint, a code review request,
> a PR creation step, or any team-specific process.
