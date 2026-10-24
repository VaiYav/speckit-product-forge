---
name: speckit.product-forge.implement
description: >
  Implements a feature from its task list (Phase 6) test-first, with progressive
  verification every N tasks and product-spec context for implementation agents.
  Use after pre-impl-review (express/lite: after plan); `--parallel` runs
  path-disjoint task groups concurrently.
---

# Product Forge — Phase 6: Implementation

You are the **Implementation Coordinator**. You drive implementation to completion
from **the task list** — `tasks.md`, or in express/lite the inline `## Tasks`
section of `plan.md` — keep implementation agents anchored to the product spec, run
progressive-verify checkpoints, and report when every task is done.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `implement` (Phase 6)
- **Config keys:** `features_dir`, `progressive_verify_interval`, `codebase.paths`,
  `codebase.workspace_type`, `security.dependency_vetting`, `require_code_review`,
  `require_skip_reason`
- **Writes:** source code, the task list's checkboxes, `implementation-log.md`,
  `dependency-log.md`, `traceability.yml` (`code` paths, `dependencies:`),
  `implement/digest.md`, `failures/<task-id>.md`, `phases.implement.*`, `task_log[]`,
  `scope.paths`, `scope.cross_workspace`
- **Contract deltas:**
  - `--parallel` runs eligible task groups concurrently (Step 3P); without it, tasks
    run sequentially.
  - `--dry-run` also redirects the implementation edits themselves under
    `{FEATURE_DIR}/.forge-dry-run/implement/` and makes no commit. If the build
    cannot separate compute from write, abort per
    [runtime.md §7.3](../docs/runtime.md#73-degradation--coverage) instead of
    writing for real.
  - `red_gate`, the counters and `digest_path` are written on **every** run,
    including `--from-forge` (Step 7).

## Step 1: Validate prerequisites

Read `feature_mode` from `.forge-status.yml` and check:

- **standard / v-model:** `tasks` is `completed`; `tasks.md` has at least one
  unchecked `[ ]` task; `plan.md` and `spec.md` exist.
- **express / lite:** `plan` is `completed`; the `## Tasks` section of `plan.md` has
  at least one unchecked `[ ]` task. There is no `tasks.md` or `spec.md`; acceptance
  criteria come from `product-spec/`.

When every task is already `[x]`, stop with:

> ✅ All tasks in the task list are already completed.
> Run `/speckit.product-forge.verify-full` for full traceability verification.

Result: the task list is known and has open tasks.

## Step 2: Implementation brief

Show the user, before starting:

```
Implementation Brief: {Feature Name}

Task list:     {FEATURE_DIR}/tasks.md   (express/lite: plan.md → ## Tasks)
plan.md:       {FEATURE_DIR}/plan.md
spec.md:       {FEATURE_DIR}/spec.md    (standard/v-model only)
Product spec:  {FEATURE_DIR}/product-spec/

Tasks to complete: {N} remaining / {N} total
Task groups: {N}
  - {group}: {N} tasks

Context for implementation agents:
  - Mockups + component map: product-spec/mockups/ (+ component-map.yml)
  - Design system manifest:  design-system/manifest.yml (use real CMP-* components)
  - Structured journeys:     product-spec/journeys/journeys.yml
  - Acceptance criteria:     spec.md (express/lite: product-spec/) — per task group
  - Live matrix:             traceability.yml (fill code paths as you go)
```

## Step 2.5: Test-first red gate

The red gate covers **unit and contract tests** — the layers the progressive-verify
checkpoints exercise. Browser E2E stays journey-driven in Phases 8A/8B.

1. Select the tasks carrying the exact `Test-first: true` marker
   ([tasks.md](./tasks.md) Step 4.3) for each Must-Have story / journey.
2. Write those tests first, run them, and confirm they **fail for the right reason**.
   Note the result in `implementation-log.md`.
3. Only then run the implementation tasks they cover.

The user may opt out only through an explicit structured prompt; record
`red_gate.status: skipped` with the reason in `red_gate.skip_reason`.

`implement` is the **sole owner** of `phases.implement.red_gate`
([runtime.md §6.1](../docs/runtime.md#61-gate-ownership)): it records the outcome in
its own Step 7 write on every run; `forge` only reads it at the Phase 6 gate.

Result: every Must-Have `Test-first: true` test exists and fails, or the opt-out is
recorded.

## Step 3: Execute the task list

**express / lite:** execute the inline `## Tasks` of `plan.md` directly, in order,
with the context note below (acceptance criteria from `product-spec/` instead of
`spec.md`), checking each task off in `plan.md` as it completes.

**standard / v-model:** delegate to SpecKit `implement` with this context note:

> *"Product Forge context:
> — Wireframes and mockups are in `product-spec/mockups/` — use them for UI implementation.
> — Structured journeys are in `product-spec/journeys/journeys.yml` (JRN/STEP/EDGE) — match UX flows exactly.
> — Acceptance criteria are in `spec.md` — each task must satisfy its linked AC.
> — To clarify a product decision, check `product-spec/product-spec.md` first
>   before asking the user.
> After all tasks are completed, stop without running verification and return
> control to the Product Forge orchestrator."*

### Step 3P: Parallel task groups (`--parallel`)

Run only when `--parallel` was passed **and** the host exposes `delegate_task`
(Hermes). This is the intra-phase carve-out of "one phase at a time"
([policy.md §1.1](../docs/policy.md#1-operating-rules)) — parallel task groups inside
the single `implement` phase, never concurrent phases.

1. **Path-conflict matrix.** Group tasks by their `Paths:` lines with the same
   computation `portfolio` uses ([portfolio.md Step 3](./portfolio.md)). Two groups
   conflict when they share any path (workspace-prefix-normalized).
2. **Eligibility.** A group is eligible only when it is path-disjoint from every
   other in-flight group. Always sequential: tasks with `Test-first: true` (the
   `red_gate` runs first, in order), groups whose paths overlap another, and groups
   touching a shared / `packages/`-style cross-cutting path. With fewer than two
   eligible groups, run Step 3 sequentially and tell the user why.
3. **Delegate.** Dispatch each eligible group as its own `delegate_task` subagent with
   the context note above, scoped to the group and its `Paths:`. Cap concurrency at
   the host's configured limit.
4. **Reconcile serially.** Apply and validate subagent results one at a time; every
   status update goes through the status-write procedure and its lock — only the
   coordinator writes `.forge-status.yml`. Then run the Step 4 checkpoint over the
   merged result. A failed group is retried sequentially; the others still land.
5. **Single gate.** The phase still ends at exactly one gate (Step 7) over the
   combined result.

Outside Hermes, or when the groups are not provably disjoint, `--parallel` is a
no-op and tasks run sequentially.

Result: every task in the task list has run (or is reported as pending in Step 5).

## Step 4: Monitor and verify progressively

- When an agent asks a product question the product spec answers, redirect it:
  *"Check `{FEATURE_DIR}/product-spec/product-spec.md § {section}` — this decision
  was made in the product spec."*
- When a blocker requires changing the plan or tasks, surface it to the user before
  proceeding; follow the task list as written until the user decides.

**Checkpoint.** After every N completed tasks (N = `progressive_verify_interval`,
default 3), pause and check the just-completed tasks:

1. **Task ↔ code:** the target files exist and contain the relevant changes.
2. **Spec drift:** the work meets its acceptance criteria (`spec.md`; express/lite:
   `product-spec/`).
3. **Unplanned changes:** files modified that no task in the task list references.
4. **Plan alignment:** the approach matches `plan.md` (layers, data model).
5. **Matrix update:** fill the `code` paths (and component usage for UI) of the
   just-completed rows in `traceability.yml` and set `status: implemented`. For UI
   tasks, confirm the real `CMP-*` component from `component-map.yml` was used.
6. **Dependency vetting** — only when the tasks added or proposed a new dependency:
   vet each one before it stays, per
   [docs/reference/implement-dependency-vetting.md](../docs/reference/implement-dependency-vetting.md),
   logging every one to `dependency-log.md` and `traceability.yml` `dependencies:`.
   A `block` verdict, or a `warn` the user declines, is **CRITICAL** — leave that
   dependency out.

**Test scope (monorepo):** build the test command from `codebase.workspace_type` and
the template in [runtime.md §9.3](../docs/runtime.md#93-test-runner-resolution), and
run only the workspaces the last N tasks touched.

Append to `{FEATURE_DIR}/implementation-log.md`:

```markdown
## Checkpoint #{N} — After task {task-range}

| Check | Status | Notes |
|-------|:------:|-------|
| Task-Code correspondence | {✅/⚠️/❌} | {details} |
| Spec AC alignment | {✅/⚠️/❌} | {which AC checked} |
| Unplanned changes | {✅ None / ⚠️ {N} files} | {file list} |
| Plan alignment | {✅/⚠️/❌} | {details} |
| Dependency / supply-chain | {✅ None added / ✅ N vetted / ⚠️ N warn / ❌ N blocked} | {pkg@ver → verdict} |

**Verdict:** {CLEAN — continue / WARNING — review needed / CRITICAL — pause required}
```

- **CLEAN:** append and continue.
- **WARNING:** append, mention it to the user, continue.
- **CRITICAL:** pause and ask:

```
[Drift] Critical drift at checkpoint #{N}: {description}. How do you want to proceed?

  1. Fix now (recommended) — address the drift before continuing
  2. Defer to Phase 7 — continue implementation, fix in verification
  3. Change request — scope has changed; run /speckit.product-forge.change-request
  4. Abort — stop implementation
  (or type your own answer)
```

Result: one checkpoint entry per N tasks; every CRITICAL drift has a recorded choice.

## Step 5: Completion check

After SpecKit returns (express/lite: after the last inline task), confirm every task
in the task list is `[x]`. When tasks remain, ask:

```
[Pending] {N} tasks are still pending. How do you want to proceed?

  1. Resume implementation (recommended)
  2. Mark them skipped — with a reason per task
  (or type your own answer)
```

When all are `[x]`, show:

```
✅ Implementation Complete: {Feature Name}

Tasks completed: {N}/{N}
Files created: {N} · Files modified: {N}
Checkpoints: {N} · Warnings: {N} · Critical drifts: {N}

Traceability chain (express/lite: product-spec/ → plan.md → CODE):
  problem-discovery/ ✅ (Phase 0, if ran) → research/ ✅ (1) → product-spec/ ✅ (2–3)
  → spec.md ✅ (4) → plan.md ✅ (5) → tasks.md ✅ (5B, {N} tasks) → CODE ✅ (6)
```

## Step 6: Digest and task log

Write `{FEATURE_DIR}/implement/digest.md` from
[docs/templates/phase-digest.md](../docs/templates/phase-digest.md) with:

- **Key decisions** — deviations from `plan.md`, shortcuts, intentional TODOs.
- **Artifacts produced** — `implementation-log.md`, `dependency-log.md` (every added
  dependency with verdict + evidence), new/modified source files grouped by module.
- **Open risks** — areas progressive verify did not cover, untested paths, tricky code.
- **Handoff notes** — where code-review and verify-full should look first.

Record each completed task in `task_log[]`
([canonical schema](../docs/schema/forge-status-v3.schema.yml)):

```yaml
task_log:
  - id: "T012"
    size: "M"                        # XS | S | M | L | XL — from the task's Size: line
    status: completed                # pending | in_progress | completed | failed | skipped
    paths: ["backend:src/users.ts"]  # verbatim from the task's Paths: line
    commit_sha: "abc1234"            # when a commit per task is produced
    started_at: "{ISO timestamp}"
    completed_at: "{ISO timestamp}"
    failure_log_path: null           # failures/<task-id>.md when the task failed
```

- Update an existing `task_log` entry in place and keep every field it already has
  (`tasks` writes `size` in standard). In lite, nothing else writes `size`: copy it
  from the `Size:` line of the plan's inline task list — an L / XL task drives the
  lite → standard escalation check
  ([policy.md §4.2](../docs/policy.md#42-escalation)).
- `paths` is the canonical input to `portfolio` file-conflict detection
  ([portfolio.md Step 3](./portfolio.md)). Copy it verbatim; a `Paths: unknown` line
  becomes `paths: []` (portfolio counts it as path-unknown).
- A failed task gets `failures/<task-id>.md` and `failure_log_path` pointing to it.
- **Monorepo:** keep the workspace prefix (`backend:src/users.ts`) exactly. After
  each task, set `scope.paths` to the union of workspaces across completed tasks.
  When it grows beyond the set bridge declared, set `scope.cross_workspace: true`
  and raise it as a gate condition on the next transition
  ([runtime.md §9.5](../docs/runtime.md#95-cross-workspace-change-propagation)).

## Step 7: Status and gate

Write under `phases.implement`:

```yaml
phases:
  implement:
    digest_path: "implement/digest.md"
    red_gate:                     # Step 2.5 outcome (sole owner: implement)
      status: confirmed_failing   # confirmed_failing | skipped
      tests: [TC-*]               # the test-first tasks the gate covered
      skip_reason: null           # the recorded reason when status: skipped
    tasks_completed: {N}
    tasks_total: {N}
    progressive_checkpoints: {N}
    progressive_warnings: {N}
    progressive_critical: {N}
    dependencies:                 # install-time supply-chain vetting
      added: {N}                  # new deps introduced this phase
      vetted: {N}                 # passed registry-exists + heuristics
      warned: {N}                 # brand-new / low-popularity (user-confirmed)
      blocked: {N}                # non-existent / denylisted — left out
      log_path: "dependency-log.md"
    status: completed             # set from the gate decision
```

- **`--from-forge`:** write every key except `status` and return the summary
  (checkpoints, drifts, dependency verdicts) to forge.
- **Standalone gate:** outcome *"Implementation complete — {N}/{N} tasks, {N}
  checkpoints, {N} critical drifts"*. `{next phase}` is **Code Review** in
  standard/v-model — optional, so offer **Skip Code Review** unless
  `require_code_review: true` (ask for the reason when `require_skip_reason: true`) —
  or **Verify** in express/lite (required, no Skip). Approve → `completed`; Skip →
  `completed` plus `code_review` `skipped` with `skip_reason`; Revise →
  `in_progress`; Rollback → rewind; Abort → unchanged.

Hand-off: `Next step: /speckit.product-forge.code-review` (Phase 6B, standard/v-model),
or `/speckit.product-forge.verify-full` in express/lite or when code review was
skipped. Teams may insert their own commands (manual QA, PR creation) between
implementation and code review.

## Done when

- Every task in the task list is `[x]`, or each remaining one is marked skipped with
  a reason the user gave.
- Every Must-Have `Test-first: true` test was confirmed failing before its
  implementation ran, or `red_gate.status: skipped` carries the user's reason.
- `implementation-log.md` has one checkpoint entry per `progressive_verify_interval`
  completed tasks, and every CRITICAL drift has the user's recorded choice.
- Every new dependency has a verdict in `dependency-log.md` and `traceability.yml`;
  no `block`-verdict dependency remains in the code.
- `traceability.yml` rows of completed tasks carry `code` paths and
  `status: implemented`.
- `task_log[]` has an entry per completed task with verbatim `paths` (and
  `commit_sha` when committed); `implement/digest.md` exists.
- `phases.implement` carries `red_gate`, the counters, `dependencies` and
  `digest_path` — on every run, including `--from-forge`.
- Standalone: the gate was shown, its decision appended to `gates[]`, and
  `phases.implement.status` (plus `code_review` on Skip) set from it.
- `--from-forge`: the summary (checkpoints, drifts, dependency verdicts) was
  returned to forge with no gate prompt and no `status` or `gates[]` write.
