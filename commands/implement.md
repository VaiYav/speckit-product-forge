---
name: speckit.product-forge.implement
description: >
  Phase 6: Execute implementation from tasks.md (express/lite: the plan's inline
  task list) with progressive verification.
  Delegates to SpecKit implement, monitors task completion, runs mini-verify every N tasks,
  surfaces product-spec context to implementation agents.
  Standalone — run after pre-impl-review (or after any custom step inserted before coding).
  Use: "implement", "start coding", "/speckit.product-forge.implement"
---

# Product Forge — Phase 6: Implementation (with Progressive Verification)

You are the **Implementation Coordinator** for Product Forge Phase 6.
Your job: drive implementation to completion from the task list (`tasks.md`, or the
inline `## Tasks` section of `plan.md` in express/lite — called **the task list**
below), keep implementation agents
anchored to the product spec, run progressive verification checkpoints, and report when
all tasks are done.

This is a **standalone command** — it does one thing and exits.
The next step is `/speckit.product-forge.code-review` (Phase 6B) or
`/speckit.product-forge.verify-full` (Phase 7).

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` contains **`--parallel`**, attempt intra-phase task-group
parallelism in **Step 3** (Hermes `delegate_task`), strictly bounded by the
path-disjointness proof and the carve-out in
[docs/policy.md §1.1](../docs/policy.md#1-operating-rules). Without the flag,
implementation runs sequentially as before.

If `$ARGUMENTS` contains **`--dry-run`**, honor the dry-run contract in
[docs/runtime.md §7](../docs/runtime.md#7-dry-run-semantics): redirect every write
(implementation edits, `task_log[]`, status, digest) under
`{FEATURE_DIR}/.forge-dry-run/implement/` instead of the real paths, make **no**
external side-effect (no commit), write a `DRY-RUN-REPORT.md` of what would change,
and do **not** update `.forge-status.yml`. If the build truly cannot separate
compute from write, abort per §7.3 rather than writing for real.

---

## Step 1: Validate Prerequisites

Build the effective config ([docs/runtime.md §1](../docs/runtime.md#1-step-0--load-config))
and read: `features_dir`, `progressive_verify_interval`, `codebase.paths`,
`codebase.workspace_type`, `security.dependency_vetting`, `require_code_review`,
`require_skip_reason`. Resolve `FEATURE_DIR` via
[docs/runtime.md §12.2](../docs/runtime.md#12-path-resolution-contract).

Read `.forge-status.yml` → `feature_mode`, then check the upstream inputs for that mode
([docs/runtime.md §11.2](../docs/runtime.md#112-per-phase-required-upstream-artifacts)):

- **standard / v-model:** `tasks` is `completed`; `tasks.md` exists with at least one
  unchecked task `[ ]`; `plan.md` and `spec.md` exist.
- **express / lite:** `plan` is `completed`; `plan.md` exists and its inline
  `## Tasks` section has at least one unchecked task `[ ]` (no `tasks.md`, no
  `spec.md` — acceptance criteria come from `product-spec/`).

If all tasks are already `[x]`:
> ✅ All tasks in the task list are already completed.
> Run `/speckit.product-forge.verify-full` for full traceability verification.

---

## Step 2: Implementation Brief

Show the user a summary before starting:

```
🔨 Implementation Brief: {Feature Name}

Task list:        {FEATURE_DIR}/tasks.md   (express/lite: plan.md → ## Tasks)
plan.md:          {FEATURE_DIR}/plan.md
spec.md:          {FEATURE_DIR}/spec.md    (standard/v-model only)
Product spec:     {FEATURE_DIR}/product-spec/

Tasks to complete: {N} remaining / {N} total
Task groups: {N}
  • {group 1}: {N} tasks
  • {group 2}: {N} tasks
  ...

Key context for implementation agents:
  • Mockups + component map: {FEATURE_DIR}/product-spec/mockups/ (+ component-map.yml)
  • Design system manifest:  {FEATURE_DIR}/design-system/manifest.yml (use real CMP-* components)
  • Structured journeys:     {FEATURE_DIR}/product-spec/journeys/journeys.yml
  • Acceptance criteria in spec.md (express/lite: product-spec/) — reference these for each task group
  • Live matrix:             {FEATURE_DIR}/traceability.yml (fill code paths as you go)
```

---

## Step 2.5: Test-first "Red" gate (v1.6, Theme D)

Scope: this gate covers **unit and contract tests** (the layers exercised by the
progressive-verify checkpoints in this phase) — it does NOT move the optional
Phase 8 browser **E2E** suite earlier. E2E remains journey-driven in Phases 8A/8B.

Per the spec-kit Red gate: for each Must-Have story/journey, the unit/contract test
tasks carrying the `Test-first: true` marker in the task list (tasks.md Step 4.3) MUST be written
and confirmed **failing** before their implementation tasks run. Select these tasks by
that exact `Test-first: true` field. Run the relevant tests, confirm they fail
for the right reason, and note it in `implementation-log.md`. Only then proceed to
implement those tasks. (Skippable only when the user explicitly opts out via a
structured prompt — record the skip reason as `red_gate.skip_reason` with
`red_gate.status: skipped`.)

`implement` is the **sole owner** of `phases.implement.red_gate`
([docs/runtime.md §6.1](../docs/runtime.md#61-gate-ownership)): it records the outcome
itself in the Step 7 status write on **every** run — standalone or `--from-forge` — and
never relies on the orchestrator to record it. `forge` only reads it at the Phase 6 gate.

---

## Step 3: Delegate to SpecKit Implement

**express / lite:** there is no `tasks.md` for SpecKit to consume — execute the inline
`## Tasks` of `plan.md` directly, in order, with the same context note below
(acceptance criteria from `product-spec/` instead of `spec.md`), checking each task off
in `plan.md` as it completes.

**standard / v-model — delegate to SpecKit `implement`** with the enriched context note:

> *"Product Forge context:
> — Wireframes and mockups are in `product-spec/mockups/` — use them for UI implementation.
> — Structured journeys are in `product-spec/journeys/journeys.yml` (JRN/STEP/EDGE) — match UX flows exactly.
> — Acceptance criteria are in `spec.md` — each task must satisfy its linked AC.
> — If you need to clarify a product decision, check `product-spec/product-spec.md` first
>   before asking the user.
> After all tasks are completed, do NOT run verification — stop and return control
> to the Product Forge orchestrator."*

### Step 3P: Parallel task groups (opt-in, `--parallel`, v1.7, P2-C)

Run this only when `--parallel` was passed AND the host exposes `delegate_task`
(Hermes). This parallelizes **independent task groups within the single
`implement` phase** — it is the intra-phase carve-out of "one phase at a time"
(policy §1.1), not concurrent phases.

1. **Build the path-conflict matrix.** Group the task list's tasks by their `Paths:`
   lines using the **same computation `portfolio` uses**
   ([`commands/portfolio.md §Step 3`](./portfolio.md)). Two groups *conflict* if
   they share any path (workspace-prefix-normalized). Build the set of
   **path-disjoint** groups.
2. **Eligibility gate — refuse to parallelize when unproven.** A group is eligible
   only if it is path-disjoint from every other in-flight group. **Exclusions
   (always sequential):** any task carrying `Test-first: true` (the `red_gate`
   must run first, ordered), any group whose paths overlap another, and any group
   touching a shared/`packages/`-style cross-cutting path. If fewer than two
   eligible disjoint groups remain, **fall back to sequential** Step 3 and say so
   — do not force parallelism.
3. **Delegate.** Dispatch each eligible disjoint group as its own `delegate_task`
   subagent, each with the same enriched context note above scoped to its task
   group + its `Paths:`. Cap concurrency at the host's configured limit.
4. **Reconcile serially.** Subagents return diffs/summaries; the orchestrator
   applies/validates them **one at a time**, and every resulting status update goes
   through the status-write procedure and its lock
   ([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure)) — subagents
   never write `.forge-status.yml` themselves. Then it runs the Step 4 progressive-verify checkpoint
   over the merged result. A subagent failure isolates to its group — the others
   still land; the failed group is retried sequentially.
5. **Single gate.** The phase still ends at exactly **one** human gate (Step 7/§1.2)
   over the combined result — parallelism changes *how* tasks execute, never the
   gate or the audit trail.

> Degradation: outside Hermes (no `delegate_task`), or when the matrix proves the
> groups aren't disjoint, `--parallel` is a no-op and implementation runs
> sequentially. Correctness never depends on parallelism.

---

## Step 4: Monitor & Support with Progressive Verification

During implementation, if the agent asks a product question that is answered
in the product spec, redirect:

> *"Check `{FEATURE_DIR}/product-spec/product-spec.md § {section}` —
> this decision was made in the product spec."*

If a blocker arises that requires changing the plan or tasks, surface it to the user
before proceeding. Do not silently deviate from the task list.

### Progressive Verification Checkpoints

After every **N completed tasks** (N = `progressive_verify_interval` from config, default: 3),
pause implementation and run a mini-verify checkpoint:

**Mini-verify checks:**

1. **Task-Code correspondence:** For each just-completed task, verify the target files exist and contain relevant changes
2. **Spec drift check:** Compare completed work against the acceptance criteria (`spec.md`; express/lite: `product-spec/`) — are AC being met?
3. **Unplanned changes check:** Identify files modified that are NOT referenced by any task in the task list
4. **Plan alignment check:** Verify implementation approach matches `plan.md` architecture (e.g., correct layers, correct data model)
5. **Matrix update (v1.6, Theme C):** fill the `code` paths (and component usage for UI) for the just-completed rows in `traceability.yml`, setting `status: implemented`. For UI tasks, confirm the real `CMP-*` component from `component-map.yml` was used (not a re-implementation).
6. **Dependency / supply-chain vetting (v1.6, W5-C2 — slopsquatting):** if the just-completed tasks **added or proposed a NEW dependency** (a package not already in the lockfile before this phase), vet it BEFORE letting it stay. Skip this check entirely when no new dependency was introduced. See "Install-time dependency vetting" below.

#### Install-time dependency vetting (v1.6, W5-C2)

LLM agents hallucinate plausible-but-nonexistent package names; attackers pre-register those names ("slopsquatting"). A release SBOM cannot catch a dep that was hallucinated and installed mid-build, so vet **at the moment it is added**. For each newly added/proposed package `<pkg>` (with intended version `<ver>`), run the registry's real resolver — do NOT install first:

```bash
# Resolve the per-project ecosystem from config/codebase (npm | pip).
# Read the allow/denylist + thresholds from config under the optional
# `security.dependency_vetting` block (keys: allowlist[], denylist[],
# min_age_days, min_downloads); when the block is absent, use the inline
# defaults shown below (30 days, 1000 downloads, empty lists).

# --- npm / node ---
npm view "<pkg>" version                         # EXISTS? non-zero exit / "E404" => does not exist → BLOCK
npm view "<pkg>" dist-tags --json                 # sanity: is the intended <ver> published?
# brand-new? compute age in days from registry create time → exit 8 if < 30
npm view "<pkg>" time.created | \
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const days=(Date.now()-Date.parse(s.trim()))/864e5;console.log(Math.round(days));process.exit(days<30?8:0)})'
# popularity (low-download heuristic): query the downloads API → exit 9 if < 1000
curl -fsSL "https://api.npmjs.org/downloads/point/last-month/<pkg>" | \
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const n=(JSON.parse(s).downloads)||0;console.log(n);process.exit(n<1000?9:0)})'

# --- pip / python ---
pip index versions "<pkg>"                         # EXISTS + lists <ver>? "No matching distribution" → BLOCK
# brand-new? compute age from first upload → exit 8 if < 30 days
curl -fsSL "https://pypi.org/pypi/<pkg>/json" | \
  python3 -c 'import sys,json,datetime as d; j=json.load(sys.stdin); rels=j["releases"]; first=min((u["upload_time_iso_8601"] for v in rels.values() for u in v), default=None); print(first); sys.exit(8 if first and (d.datetime.now(d.timezone.utc)-d.datetime.fromisoformat(first)).days<30 else 0)'
# Note: pip popularity is omitted (no simple core-registry downloads endpoint;
# pypistats.org can be added later if parity with npm is wanted).
```

Decision rules (default thresholds — overridable via `security.dependency_vetting` config):
- **does-not-exist on the registry → BLOCK** (treat as hallucinated/slopsquat; do not add — surface as CRITICAL drift via the checkpoint's CRITICAL path below).
- **on the project `denylist` → BLOCK.** **on the `allowlist` → PASS** (skip heuristics; trusted).
- **brand-new (< `min_age_days`, default 30) OR low-popularity (< `min_downloads`, default 1000) → WARN** — require an explicit user confirmation through a structured prompt before the dep stays; record the confirmation.

Log **every** added dep (verdict + evidence) to `dependency-log.md` and append a row to `traceability.yml` under a `dependencies:` block so the chain and `/speckit.product-forge.security-check` can consume it:

```yaml
# traceability.yml (appended under a top-level dependencies: block)
dependencies:
  - pkg: "<pkg>"
    version: "<ver>"
    ecosystem: npm            # npm | pip
    added_by_task: "<task-id>"
    registry_exists: true
    age_days: 412
    downloads_last_month: 84210
    list: none                # allowlist | denylist | none
    verdict: pass             # pass | warn | block
    confirmed_by_user: false  # true when a WARN dep was explicitly accepted
```

**Checkpoint output** — append to `{FEATURE_DIR}/implementation-log.md`:

```markdown
## Checkpoint #{N} — After task {task-range}

| Check | Status | Notes |
|-------|:------:|-------|
| Task-Code correspondence | {✅/⚠️/❌} | {details} |
| Spec AC alignment | {✅/⚠️/❌} | {which AC checked} |
| Unplanned changes | {✅ None / ⚠️ {N} files} | {file list} |
| Plan alignment | {✅/⚠️/❌} | {details} |
| Dependency / supply-chain (W5-C2) | {✅ None added / ✅ N vetted / ⚠️ N warn / ❌ N blocked} | {pkg@ver → verdict} |

**Verdict:** {CLEAN — continue / WARNING — review needed / CRITICAL — pause required}
```

A dependency `block` verdict (non-existent / denylisted package) maps to **CRITICAL** —
route it through the CRITICAL drift path below (do NOT add the dep). A `warn`
verdict that the user declines also escalates to CRITICAL for that dep.

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

After SpecKit implement returns (or, in express/lite, after the last inline task),
verify all tasks in the task list are `[x]`.

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

Product Forge traceability chain:          (express/lite: product-spec/ → plan.md → CODE)
  problem-discovery/ ✅ (Phase 0 — if ran)
  research/          ✅ (Phase 1)
  product-spec/      ✅ (Phase 2–3)
  spec.md            ✅ (Phase 4)
  plan.md            ✅ (Phase 5)
  tasks.md           ✅ (Phase 5B — {N} tasks complete)
  CODE               ✅ (Phase 6 — just implemented)
```

---

## Step 6: Phase Digest (required)

Write `{FEATURE_DIR}/implement/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) **before**
any status write marks the phase complete (Step 7;
[docs/runtime.md §8](../docs/runtime.md#8-phase-digest-requirement-a4)).

The digest must include:
- **Key decisions** — deviations from `plan.md`, shortcuts taken, intentional TODOs left for follow-up.
- **Artifacts produced** — implementation log, `dependency-log.md` (W5-C2 install-time dep vetting — every added dep with verdict + evidence), new/modified source files grouped by module.
- **Open risks** — areas not covered by progressive verify, untested paths, known-tricky code.
- **Handoff notes** — where code-review and verify-full should focus first.

The orchestrator also records each completed task on `.forge-status.yml` under
`task_log[]` with `status`, `paths` (copied from the task's `Paths:` line in
the task list), `commit_sha` (when a commit per task is produced), and
timestamps. If a task failed, write `failures/<task-id>.md` and point the
`failure_log_path` field to it.

The `paths` field is the canonical source for `portfolio` file-conflict
detection — see [`commands/portfolio.md §Step 3`](./portfolio.md). Always
copy paths verbatim from the task list; if the `Paths:` line said `unknown`,
record `paths: []` here and the portfolio command will count this task
as "path-unknown" rather than silently missing it.

**Monorepo mode:** paths carry the workspace prefix (e.g.
`backend:src/users.ts`). Preserve the prefix exactly when copying to
`task_log[].paths`. After each task completes, the orchestrator
updates `scope.paths` on `.forge-status.yml` with the union of
workspaces referenced across all completed tasks. If `scope.paths`
grows beyond the set originally declared by bridge, set
`scope.cross_workspace: true` and surface it as a gate condition on the
next phase transition (see [runtime.md §9.5](../docs/runtime.md#95-cross-workspace-change-propagation)).

**Test execution during progressive verify:** in monorepo mode, read
`codebase.workspace_type` from config and build the test command from
the template in [runtime.md §9.3](../docs/runtime.md#93-test-runner-resolution).
Run tests scoped to the workspaces affected by the last N completed
tasks, not the whole monorepo.

---

## Step 7: Update Status & Gate

Write via the status-write procedure ([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure)).
Keys this phase owns — all under `phases.implement`:

```yaml
phases:
  implement:
    digest_path: "implement/digest.md"
    red_gate:                     # v1.6, Theme D — Step 2.5 Red-gate outcome (sole owner: implement)
      status: confirmed_failing   # confirmed_failing | skipped
      tests: [TC-*]               # the test-first tasks the gate covered
      skip_reason: null           # set to the recorded reason when status: skipped
    tasks_completed: {N}
    tasks_total: {N}
    progressive_checkpoints: {N}
    progressive_warnings: {N}
    progressive_critical: {N}
    dependencies:                 # v1.6, W5-C2 — install-time supply-chain vetting
      added: {N}                  # new deps introduced this phase
      vetted: {N}                 # passed registry-exists + heuristics
      warned: {N}                 # brand-new / low-popularity (user-confirmed)
      blocked: {N}                # non-existent / denylisted — NOT added
      log_path: "dependency-log.md"
    status: completed             # set from the gate decision — see below
```

`red_gate`, the counters and `digest_path` are written on **every** run, including
`--from-forge` — forge reads `red_gate` at the Phase 6 gate.

**Gate** ([docs/runtime.md §6.1](../docs/runtime.md#61-gate-ownership)–[§6.3](../docs/runtime.md#63-gate-prompt)):

- **`--from-forge` in `$ARGUMENTS`** — write the keys above except `status`, do not
  prompt and do not append to `gates[]`; return the summary (checkpoints, drifts,
  dependency verdicts) to the orchestrator, which presents the gate and sets
  `phases.implement.status` from its decision.
- **Standalone** — present the **Gate** prompt from
  [interaction-prompts.md](../docs/templates/interaction-prompts.md#gate-after-every-phase):
  *"Implementation complete — {N}/{N} tasks, {N} checkpoints, {N} critical drifts"*.
  `{next phase}` is Code Review in standard/v-model — `opt`, so **Skip Code Review** is
  offered unless `require_code_review: true` (on Skip with `require_skip_reason: true`,
  ask for the reason) — or Verify in express/lite (required, no Skip). Map the answer per
  [§6.2](../docs/runtime.md#62-status-follows-the-decision): Approve → `completed`;
  Skip → `completed` and `code_review` `skipped` + `skip_reason`; Revise →
  `in_progress`; Rollback → rewind; Abort → unchanged. Append one `gates[]` entry.

---

## Step 8: Handoff

```
✅ Implementation done.

Next step: /speckit.product-forge.code-review (Phase 6B, standard/v-model)
  (or /speckit.product-forge.verify-full — directly in express/lite, or when code review was skipped)
```

> **Extension point:** Between implementation and code review, community commands
> can be inserted — for example: a manual QA checkpoint, a PR creation step,
> or any team-specific process.
