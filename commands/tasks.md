---
name: speckit.product-forge.tasks
description: >
  Phase 5B (standard/v-model): break plan.md into dependency-ordered, test-first tasks
  and check every Must Have story and functional requirement has at least one task.
  Run after plan, before implement.
---

# Product Forge — Phase 5B: Task Breakdown

You are the **Task Breakdown Coordinator**. Turn `plan.md` into an actionable,
dependency-ordered `tasks.md`, cross-validate it against the product spec, seed the
traceability matrix, and take it through the tasks gate.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `tasks` (Phase 5B)
- **Config keys:** `codebase.paths` (monorepo workspaces), `require_pre_impl_review`,
  `require_skip_reason`
- **Writes:** `tasks.md`, `traceability.yml` (`tasks` column), `tasks/digest.md`,
  `phases.tasks.*`, `task_log[].size`, `scope.paths`, `scope.cross_workspace`
- **Contract deltas:** in express/lite the stop message is *"Tasks is not in scope for
  {mode} features — the plan carries an inline `## Tasks` list
  ([docs/runtime.md §11.2](../docs/runtime.md#112-per-phase-required-upstream-artifacts))."*

## Step 1: Check inputs

1. `plan` is `completed` and `plan.md` exists.
2. If `tasks.md` already exists with unchecked tasks, say it has {N} pending tasks and
   that regenerating overwrites it; ask: regenerate, or keep it and run
   `/speckit.product-forge.implement`.

## Step 2: Brief

Show: feature name; `plan.md` (source of truth for tasks), `product-spec/product-spec.md`
and `spec.md` paths; plan sections to decompose ({N}); Must Have stories needing task
coverage ({N}); functional requirements ({N}).

## Step 3: Delegate to SpecKit tasks

Delegate to SpecKit `tasks` with this context note:

> *"Product Forge context: Decompose `plan.md` into granular, implementation-ready tasks.
> Reference `product-spec/product-spec.md` for acceptance criteria — each task group
> should satisfy one or more acceptance criteria explicitly.
> Group tasks by the feature breakdown sections in `product-spec.md` where possible.
> Tasks should be sized for safe, incremental implementation — avoid tasks that touch
> too many layers at once.
> After returning tasks.md, do NOT begin implementation — stop and return control."*

Result: `tasks.md` exists.

## Step 4: Cross-validate against the product spec

| Check | Status | Notes |
|-------|--------|-------|
| Every Must Have US-NNN has ≥1 implementation task? | ✅/⚠️/❌ | List missing stories |
| Every FR-NNN has ≥1 corresponding task? | ✅/⚠️/❌ | |
| Test / validation tasks included per task group? | ✅/⚠️/❌ | |
| No orphan tasks (tasks without traceable requirement)? | ✅/⚠️/❌ | |
| Task granularity appropriate? (not too large, not trivial) | ✅/⚠️/❌ | |
| Dependency order is sensible? (data model before service before controller) | ✅/⚠️/❌ | |
| No contradictory tasks / impossible ordering assumed? | ✅/⚠️/❌ | List conflicts |

For the last row, read the list adversarially and answer the literal question **"Do
any tasks conflict or assume an impossible order?"** Flag a pair when two tasks make
mutually exclusive assumptions or edit the same artifact incompatibly; a task depends
(explicitly or through shared `Paths:`) on output a later task produces; or a task
assumes a prerequisite no task creates. Name the `T-NNN` pair and the conflict.

Any ❌: show the specific gaps (e.g. "US-003 has no task"; "T0xx reads the schema T0yy
only adds later") and ask the user how to resolve them. Only ✅/⚠️: go to Step 4.1.

### Step 4.1: Structural checks (hard errors)

These deterministic checks need no LLM pass. A failure is fixed and the tasks
regenerated; the gate is never reached with one open.

1. **Task ID uniqueness.** Collect every `T-NNN` / `TNNN` id. A repeated id aborts with
   *"Duplicate task ID {id} on lines {n1}, {n2}. Task IDs must be unique — rename and
   re-run tasks."* (Unique ids keep `task_log[]` entries unambiguous.)
2. **Workspace prefix (monorepo only).** With a `codebase.paths` block, every prefixed
   `Paths:` entry (`<workspace>:<relative-path>`) uses a workspace that is a key of
   `codebase.paths`. On mismatch abort with *"Unknown workspace '{prefix}' on task {id}.
   Known workspaces: {list from config}. Fix the Paths: line or add the workspace to
   .product-forge/config.yml."* An unprefixed path is accepted in single-root mode and
   rejected in monorepo mode with *"Missing workspace prefix on task {id} — monorepo
   mode requires '<workspace>:<path>' format."* `Paths: unknown` is always accepted
   (exploratory tasks).

### Step 4.2: Seed the traceability matrix

Create or update `{FEATURE_DIR}/traceability.yml`
([traceability-matrix.md](../docs/templates/traceability-matrix.md)): fill
`tasks: [TASK-*]` on each requirement row. Later phases fill `code`, `tests` and
`events`; this one live matrix is what `verify-full` reads.

Each frontend task should name the design-system component(s) it implements (`CMP-*`
from `product-spec/mockups/component-map.yml`) and its target path; each backend task
names the `API-*` contract(s) it implements.

### Step 4.3: Test-first ordering

For each Must-Have story / journey, order its test task (`TC-*`) **before** its
implementation task, so tests are written and seen failing before code (`implement`
enforces this red gate at the 5B→6 boundary). Mark each such task with a literal
`Test-first: true` sub-line, shaped like `Paths:` / `Size:`, so `implement` Step 2.5
selects them by name:

```markdown
- [ ] TC012 — Unit test: token validation rejects malformed tokens
      Paths: src/modules/users/users.service.test.ts
      Test-first: true
      Size: S
```

The marker covers the unit/contract tests of the red gate, not the Phase 8 browser E2E suite.

Result: every Must-Have story's test task precedes its implementation task and carries
`Test-first: true`.

## Step 5: Paths, sizes and digest

Every task declares the files it touches on a `Paths:` line directly under its title —
the primary input for file-conflict detection in [portfolio](./portfolio.md).
Single-root project — plain paths:

```markdown
- [ ] T007 — Add push token storage to User schema
      Paths: src/modules/users/users.schema.ts, src/modules/users/users.service.ts
      Size: S
```

Monorepo — prefix every path with its workspace name from `codebase.paths`; a task that
touches several workspaces lists them all:

```markdown
- [ ] T007 — Add push token storage to User schema
      Paths: backend:src/modules/users/users.schema.ts, backend:src/modules/users/users.service.ts
      Size: S

- [ ] T015 — Share validation logic
      Paths: shared:src/validation/token.ts, backend:src/modules/users/users.service.ts, frontend:src/features/settings/push-token.vue
      Size: M
```

When paths cannot be known in advance (exploratory tasks), write `Paths: unknown`
rather than omitting the line — portfolio uses the line's presence to set its accuracy level.

The orchestrator also records each task's `size` under `task_log[].size`: `XS` (≤1 h),
`S` (≤ half-day), `M` (≤ 1 day), `L` (≤ 2 days), `XL` (> 2 days — flag for
decomposition). It sets `scope.paths` to the union of workspaces referenced across all
tasks, and `scope.cross_workspace: true` when more than one workspace is touched.

Write `{FEATURE_DIR}/tasks/digest.md` from
[phase-digest.md](../docs/templates/phase-digest.md) with:

- **Key decisions** — task count, parallelizable groups, dependency shape, XL tasks flagged.
- **Artifacts produced** — `tasks.md`.
- **Open risks** — tasks needing extra review (mega-tasks, high-risk areas, unfamiliar territory).
- **Handoff notes** — which tasks implement should start with; recommended commit granularity.

## Step 6: Gate

Show the summary: task groups with their task counts, total tasks; coverage — Must Have
stories `{N}/{N}`, functional requirements `{N}/{N}`, warnings {list}; estimated surface
— files to create {N}, files to modify {N}.

Standalone, show the Gate with outcome *"Tasks complete — {N} tasks across {N} groups,
{N}/{N} Must Have stories covered"* and `{next phase}` = Pre-Implementation Review. It
is `opt`, so **Skip Pre-Implementation Review** is offered unless
`require_pre_impl_review: true`; on Skip with `require_skip_reason: true`, ask for the
reason. Skip sets `tasks` → `completed` and `pre_impl_review` → `skipped` + `skip_reason`.

```yaml
phases:
  tasks:
    digest_path: "tasks/digest.md"
    total: {N}
    groups: {N}
    story_coverage: "{N}/{N}"
    status: completed        # approved / approved_with_conditions / skipped (next phase)
```

With `--from-forge`, write these fields without `status`.

## Step 7: Hand-off

Report `Tasks approved and saved to {FEATURE_DIR}/tasks.md`, then
`Next step: /speckit.product-forge.implement`. A custom step (sprint estimate, capacity
check, external review) may be inserted before it.

## Done when

- Every Must Have `US-NNN` and every `FR-NNN` has ≥1 task, and no task is orphaned, or
  the user resolved each gap at Step 4.
- No conflicting or impossibly ordered task pair remains unflagged.
- Task ids are unique; in a monorepo every `Paths:` entry carries a known workspace
  prefix (or is `Paths: unknown`).
- Every task has a `Paths:` line and a size; every Must-Have story's test task precedes
  its implementation task and carries `Test-first: true`.
- `traceability.yml` has `tasks` filled on every requirement row; `tasks/digest.md`
  exists with all four sections.
- Standalone: the Gate was shown, the decision recorded, and status set from it
  (Skip also marks `pre_impl_review` skipped). `--from-forge`: the Step 6 fields
  written without `status` and the summary returned to forge (no gate prompt, no
  status write).
