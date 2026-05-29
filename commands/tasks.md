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
| No contradictory tasks / impossible ordering assumed? (v1.6, W5-E1) | ✅/⚠️/❌ | List conflicts |

For the last row, read the task list adversarially and ask the literal question:
**"Do any tasks conflict or assume an impossible order?"** Flag a pair when: two tasks
make mutually exclusive assumptions or edit the same artifact in incompatible ways; a
task depends (explicitly or via shared `Paths:`) on output a later task produces; or a
task assumes a prerequisite no listed task ever creates. Name the offending `T-NNN`
pair and the conflict.

If ❌ found: surface specific gaps (e.g., "US-003 has no task"; "T0xx reads the schema
T0yy only adds later"), ask user how to resolve.
If only ✅/⚠️: proceed to Step 4.1.

### Step 4.1: Structural validation (hard checks — never ship past these)

Before proceeding to the approval gate, also run these two structural
checks. Failures are hard errors — fix and regenerate, do not gate.

1. **Task ID uniqueness.** Collect every `T-NNN` / `TNNN` identifier in
   `tasks.md`. If any ID appears twice or more, abort with:
   *"Duplicate task ID {id} on lines {n1}, {n2}. Task IDs must be
   unique — rename and re-run tasks."* This prevents ambiguous
   `task_log[]` entries downstream.

2. **Workspace-prefix validation (monorepo only).** If the project
   config has a `codebase.paths` block, every `Paths:` line with a
   prefix (`<workspace>:<relative-path>`) MUST use a workspace name
   that appears as a key in `codebase.paths`. On mismatch abort with:
   *"Unknown workspace '{prefix}' on task {id}. Known workspaces:
   {list from config}. Fix the Paths: line or add the workspace to
   .product-forge/config.yml."* Lines without a prefix are accepted
   in single-root mode and rejected in monorepo mode with
   *"Missing workspace prefix on task {id} — monorepo mode requires
   '<workspace>:<path>' format."* Lines written as `Paths: unknown`
   are always accepted (exploratory tasks).

Both checks are deterministic and cheap. Neither requires an LLM pass.

### Step 4.2: Seed the live traceability matrix (v1.6, Theme C)

Create/update `{FEATURE_DIR}/traceability.yml` (see
[docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md)).
For each requirement row, fill `tasks: [TASK-*]` now (other columns — `code`,
`tests`, `events` — are filled by later phases). This is the single live matrix
that `verify-full` consumes instead of re-deriving the chain.

For UI work, each frontend task SHOULD reference the design-system component(s) it
implements (`CMP-*` from `product-spec/mockups/component-map.yml`) and its target
path, so the component map and tasks stay linked. For backend work, reference the
`API-*` contract(s) the task implements.

### Step 4.3: Test-first task ordering (v1.6, Theme D)

Per the spec-kit "Red" gate: for each Must-Have story/journey, order the test task
(`TC-*`) **before** its implementation task so tests can be written and confirmed
failing before code (enforced at the Phase 5B→6 boundary by `implement`).

Mark each such test task with a literal `Test-first: true` sub-line (same shape as the
`Paths:` / `Size:` sub-lines), so `implement` Step 2.5 can select them by name:

```markdown
- [ ] TC012 — Unit test: token validation rejects malformed tokens
      Paths: src/modules/users/users.service.test.ts
      Test-first: true
      Size: S
```

Scope: this marker is for the unit/contract test tasks the Red gate covers — not the
Phase 8 browser E2E suite.

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

## Step 6: Phase Digest (required)

Before handoff, write `{FEATURE_DIR}/tasks/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) and record
its path on `.forge-status.yml` under `phases.tasks.digest_path`.

The digest must include:
- **Key decisions** — task count, parallelizable groups, dependency shape, any XL-sized tasks flagged.
- **Artifacts produced** — `tasks.md`.
- **Open risks** — tasks that need extra review (mega-tasks, high-risk areas, unfamiliar territory).
- **Handoff notes** — which tasks implement should start with; recommended commit granularity.

The orchestrator also records each task's `size` on `.forge-status.yml` under
`task_log[].size`. Supported sizes: `XS` (≤1 h), `S` (≤ half-day), `M` (≤ 1 day),
`L` (≤ 2 days), `XL` (> 2 days — flag for decomposition).

Each task in `tasks.md` MUST declare the files it will touch using a
`Paths:` line immediately under the task title. This is the primary
source for file-conflict detection in
[`portfolio`](./portfolio.md).

**Single-root project** example:

```markdown
- [ ] T007 — Add push token storage to User schema
      Paths: src/modules/users/users.schema.ts, src/modules/users/users.service.ts
      Size: S
```

**Monorepo project** — prefix each path with the workspace name from
`codebase.paths`:

```markdown
- [ ] T007 — Add push token storage to User schema
      Paths: backend:src/modules/users/users.schema.ts, backend:src/modules/users/users.service.ts
      Size: S

- [ ] T012 — Render token status in settings screen
      Paths: frontend:src/features/settings/push-token.vue
      Size: M
```

A single task may touch multiple workspaces — list them all:

```markdown
- [ ] T015 — Share validation logic
      Paths: shared:src/validation/token.ts, backend:src/modules/users/users.service.ts, frontend:src/features/settings/push-token.vue
      Size: M
```

When paths are not knowable in advance (exploratory tasks), write
`Paths: unknown` explicitly rather than omitting — the portfolio command
uses presence of the line to decide accuracy level.

The orchestrator also updates `.forge-status.yml` `scope.paths` with
the union of workspaces referenced across all tasks, and sets
`scope.cross_workspace: true` when more than one workspace is touched.

The orchestrator refuses to mark Phase 5B complete until `digest.md` exists.
See [`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).

---

## Step 7: Handoff

```
✅ Tasks approved and saved to {FEATURE_DIR}/tasks.md

Next step: /speckit.product-forge.implement
  (or insert any custom step before continuing)
```

> **Extension point:** This is where community commands can be inserted.
> For example: a sprint estimation step, capacity planning check, external review
> workflow, approval gate — before actual code writing begins.
