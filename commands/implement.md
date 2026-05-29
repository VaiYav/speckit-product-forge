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
  • Mockups + component map: {FEATURE_DIR}/product-spec/mockups/ (+ component-map.yml)
  • Design system manifest:  {FEATURE_DIR}/design-system/manifest.yml (use real CMP-* components)
  • Structured journeys:     {FEATURE_DIR}/product-spec/journeys/journeys.yml
  • Acceptance criteria in spec.md — reference these for each task group
  • Live matrix:             {FEATURE_DIR}/traceability.yml (fill code paths as you go)
```

---

## Step 2.5: Test-first "Red" gate (v1.6, Theme D)

Scope: this gate covers **unit and contract tests** (the layers exercised by the
progressive-verify checkpoints in this phase) — it does NOT move the optional
Phase 8 browser **E2E** suite earlier. E2E remains journey-driven in Phases 8A/8B.

Per the spec-kit Red gate: for each Must-Have story/journey, the unit/contract test
tasks carrying the `Test-first: true` marker in `tasks.md` (Step 4.3) MUST be written
and confirmed **failing** before their implementation tasks run. Select these tasks by
that exact `Test-first: true` field. Run the relevant tests, confirm they fail
for the right reason, and note it in `implementation-log.md`. Only then proceed to
implement those tasks. (Skippable only when the user explicitly opts out via a
structured prompt — record the skip reason; this sets `red_gate.status: skipped` in the
Step 5 status update and the orchestrator gate-records the skip.)

---

## Step 3: Delegate to SpecKit Implement

**Delegate to SpecKit `implement`** with the enriched context note:

> *"Product Forge context:
> — Wireframes and mockups are in `product-spec/mockups/` — use them for UI implementation.
> — Structured journeys are in `product-spec/journeys/journeys.yml` (JRN/STEP/EDGE) — match UX flows exactly.
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
  implement:
    status: completed
    red_gate:                     # v1.6, Theme D — Step 2.5 Red-gate outcome
      status: confirmed_failing   # confirmed_failing | skipped
      tests: [TC-*]               # the test-first tasks the gate covered
      skip_reason: null           # set to the recorded reason when status: skipped
implement:
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
    log_path: "{FEATURE_DIR}/dependency-log.md"
last_updated: "{ISO timestamp}"
```

---

## Step 6: Phase Digest (required)

Before handoff, write `{FEATURE_DIR}/implement/digest.md` using the template at
[`docs/templates/phase-digest.md`](../docs/templates/phase-digest.md) and record
its path on `.forge-status.yml` under `phases.implement.digest_path`.

The digest must include:
- **Key decisions** — deviations from `plan.md`, shortcuts taken, intentional TODOs left for follow-up.
- **Artifacts produced** — implementation log, `dependency-log.md` (W5-C2 install-time dep vetting — every added dep with verdict + evidence), new/modified source files grouped by module.
- **Open risks** — areas not covered by progressive verify, untested paths, known-tricky code.
- **Handoff notes** — where code-review and verify-full should focus first.

The orchestrator also records each completed task on `.forge-status.yml` under
`task_log[]` with `status`, `paths` (copied from the task's `Paths:` line in
tasks.md), `commit_sha` (when a commit per task is produced), and
timestamps. If a task failed, write `failures/<task-id>.md` and point the
`failure_log_path` field to it.

The `paths` field is the canonical source for `portfolio` file-conflict
detection — see [`commands/portfolio.md §Step 3`](./portfolio.md). Always
copy paths verbatim from tasks.md; if the tasks.md line said `unknown`,
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

The orchestrator refuses to mark Phase 6 complete until `digest.md` exists.
See [`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).

---

## Step 7: Handoff

```
✅ Implementation done.

Next step: /speckit.product-forge.code-review (Phase 6B)
  (or /speckit.product-forge.verify-full to skip code review)
```

> **Extension point:** Between implementation and code review, community commands
> can be inserted — for example: a manual QA checkpoint, a PR creation step,
> or any team-specific process.
