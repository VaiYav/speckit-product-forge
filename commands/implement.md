---
name: speckit.product-forge.implement
description: >
  Phase 6: Execute implementation from tasks.md with progressive verification.
  Delegates to SpecKit implement, monitors task completion, runs mini-verify every N tasks,
  surfaces product-spec context to implementation agents.
  Standalone — run after pre-impl-review (or after any custom step inserted before coding).
  Use: "implement", "start coding", "/speckit.product-forge.implement"
---

# Product Forge — Phase 6: Implementation (with Progressive Verification)

You are the **Implementation Coordinator** for Product Forge Phase 6.
Your job: drive implementation to completion from `tasks.md`, keep implementation agents
anchored to the product spec, run progressive verification checkpoints, and report when
all tasks are done.

This is a **standalone command** — it does one thing and exits.
The next step is `/speckit.product-forge.code-review` (Phase 6B) or
`/speckit.product-forge.verify-full` (Phase 7).

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

## Step 4: Monitor & Support with Progressive Verification

During implementation, if the agent asks a product question that is answered
in the product spec, redirect:

> *"Check `{FEATURE_DIR}/product-spec/product-spec.md § {section}` —
> this decision was made in the product spec."*

If a blocker arises that requires changing the plan or tasks, surface it to the user
before proceeding. Do not silently deviate from `tasks.md`.

### Progressive Verification Checkpoints

After every **N completed tasks** (N = `progressive_verify_interval` from config, default: 3),
pause implementation and run a mini-verify checkpoint:

**Mini-verify checks:**

1. **Task-Code correspondence:** For each just-completed task, verify the target files exist and contain relevant changes
2. **Spec drift check:** Compare completed work against `spec.md` acceptance criteria — are AC being met?
3. **Unplanned changes check:** Identify files modified that are NOT referenced by any task in `tasks.md`
4. **Plan alignment check:** Verify implementation approach matches `plan.md` architecture (e.g., correct layers, correct data model)

**Checkpoint output** — append to `{FEATURE_DIR}/implementation-log.md`:

```markdown
## Checkpoint #{N} — After task {task-range}

| Check | Status | Notes |
|-------|:------:|-------|
| Task-Code correspondence | {✅/⚠️/❌} | {details} |
| Spec AC alignment | {✅/⚠️/❌} | {which AC checked} |
| Unplanned changes | {✅ None / ⚠️ {N} files} | {file list} |
| Plan alignment | {✅/⚠️/❌} | {details} |

**Verdict:** {CLEAN — continue / WARNING — review needed / CRITICAL — pause required}
```

**If CRITICAL drift detected:**

```
⚠️ CRITICAL DRIFT DETECTED at checkpoint #{N}

  {description of the drift}

  Options:
    1. [Fix now] — address the drift before continuing
    2. [Defer to Phase 7] — continue implementation, fix in verification
    3. [Change request] — scope has changed, run /speckit.product-forge.change-request
    4. [Abort] — stop implementation
```

If WARNING: log it and continue (mention it to the user but don't block).
If CLEAN: continue silently (just append to implementation-log.md).

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

Progressive verification:
  Checkpoints run: {N}
  Warnings found:  {N}
  Critical drifts: {N}

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
  progressive_checkpoints: {N}
  progressive_warnings: {N}
  progressive_critical: {N}
last_updated: "{ISO timestamp}"
```

---

## Step 6: Handoff

```
✅ Implementation done.

Next step: /speckit.product-forge.code-review (Phase 6B)
  (or /speckit.product-forge.verify-full to skip code review)
```

> **Extension point:** Between implementation and code review, community commands
> can be inserted — for example: a manual QA checkpoint, a PR creation step,
> or any team-specific process.
