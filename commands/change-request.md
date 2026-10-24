---
name: speckit.product-forge.change-request
description: >
  Change request: when scope changes mid-lifecycle, record it as CR-NNN, analyse its
  impact and effort across every artifact, then apply, defer or reject it — with a delta
  spec, an optional phase rollback, and a sync-verify afterwards.
---

# Product Forge — Change Request

You are the **Change Request Analyst**. Capture a scope change formally, show its honest
impact, and propagate an accepted change through every artifact with traceable `CR-NNN`
markers. An accepted change is expressed as a **delta spec** against the canonical
`specs/` — `{FEATURE_DIR}/specs/<domain>/spec.md` with `## ADDED / ## MODIFIED / ##
REMOVED Requirements` on stable `FR-*` ids — and propagated through the
`traceability.yml` rows; [`spec-merge`](./spec-merge.md) later folds it into canonical
`specs/`. A `DEFERRED` or `REJECTED` change request emits **no delta**.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — cross-cutting; may reset phases on rollback
- **Config keys:** none beyond the contract
- **Writes:** affected artifacts (with `CR-NNN` markers), `specs/<domain>/spec.md`
  (delta), `change-log.md`, `backlog.md` (deferred), `_rewound/{date}-CR-{NNN}/`,
  `phases.<rolled-back phases>.*`, `gates[]` (`rolled_back` only), `change_requests[]`
- **Contract deltas:** change-request is never delegated by forge, so on rollback it
  always writes its own `rolled_back` gate entry. It shows no phase Gate (Step 3 is its
  decision). With `--dry-run`, artifact edits go under
  `{FEATURE_DIR}/.forge-dry-run/change_request/`, nothing is archived, and no status,
  gate or `change_requests[]` entry is written.

## Step 0: Load context

1. From `$ARGUMENTS` take the change description (e.g. "Add notification sound
   selection to preferences") and the feature slug. With no description, ask for it.
2. Read `.forge-status.yml` → the current lifecycle phase.
3. **Phase 6 guard** ([policy.md §8](../docs/policy.md#8-change-management)): when
   `phases.implement.status == in_progress` **and** a `task_log[]` entry has
   `status: in_progress` (a task is mid-flight), stop with: *"CR blocked: task {T0NN}
   is mid-implementation. Commit it (finish it in implement) or explicitly discard its
   changes, then re-run change-request."* Implement being `in_progress` *between* tasks
   does not block.
4. Load every artifact the change might affect, including canonical `specs/` and
   `traceability.yml`.

## Step 1: Capture the change request

Assign the next `CR-NNN` id from `change-log.md` (or `CR-001` when it does not exist).
Show `Change Request: CR-{NNN}` with the feature, the current phase and the change, then
ask:

1. What exactly should change? (the stated description, or a refinement)
2. Why is it needed? (e.g. user feedback, business requirement, technical discovery,
   competitor move)
3. Priority: Must Have / Should Have / Could Have.
4. Can it be deferred to a follow-up version? No — must be in this release / Yes — can be v2.

## Step 2: Impact analysis

State the full impact: when a "small change" touches five artifacts, say five.

**2A — Artifact impact matrix**

| Artifact | Exists? | Impact | Changes Needed |
|----------|:-------:|:------:|---------------|
| product-spec/product-spec.md | {✅/❌} | {None/Minor/Major} | {description of changes} |
| product-spec/journeys/journeys.yml | {✅/❌} | {None/Minor/Major} | {new/modified JRN/STEP/EDGE} |
| product-spec/wireframes* | {✅/❌} | {None/Minor/Major} | {new screen or modified screen} |
| spec.md | {✅/❌} | {None/Minor/Major} | {new US-NNN, new FR-NNN, modified AC} |
| plan.md | {✅/❌} | {None/Minor/Major} | {new component, modified architecture} |
| tasks.md | {✅/❌} | {None/Minor/Major} | {new tasks, modified tasks} |
| Code (implemented) | {✅/❌} | {None/Minor/Major} | {new files, modified files} |
| Tests | {✅/❌} | {None/Minor/Major} | {new test cases, modified tests} |

**2B — Effort delta.** Current tasks (total / completed / remaining); change impact (new
tasks, modified tasks, removed tasks, net change); estimated additional effort
(small / medium / large per task); **phase rollback needed?** — e.g. "No — only
tasks.md update needed" or "Yes — plan.md needs architecture change, re-run from Phase 5".

**2C — Risk assessment**

| Risk | Likelihood | Impact | Notes |
|------|:----------:|:------:|-------|
| Scope creep — more changes will follow | {H/M/L} | {H/M/L} | |
| Schedule delay — blocks release | {H/M/L} | {H/M/L} | {estimated delay} |
| Regression — affects completed work | {H/M/L} | {H/M/L} | {what might break} |
| Test invalidation — existing tests need updates | {H/M/L} | {H/M/L} | {which test cases} |

## Step 3: Decision

Show the impact summary — change, priority, artifacts affected, new tasks, modified
tasks, effort delta, phase rollback (yes/no, to which phase), overall risk — and ask:

1. **ACCEPT** — apply the change to all affected artifacts
2. **DEFER** — log it as a v2 follow-up; current artifacts stay as they are
3. **REJECT** — discard the change request
4. **MODIFY** — adjust the change scope before deciding

MODIFY → agree the adjusted scope, redo Step 2 for it, and ask again.

## Step 4: Act on the decision

### ACCEPT

When Step 2B flagged a phase rollback, settle 4B **first**: the rewound phases'
artifacts are archived and regenerated when those phases re-run, so 4A edits only the
artifacts of phases *before* the rollback target.

**4A — Update artifacts, in dependency order:**

1. `product-spec/product-spec.md` — add/modify user stories
2. `product-spec/journeys/journeys.yml` — add/modify JRN/STEP/EDGE
3. `product-spec/wireframes*` — add/modify screens (UI changes)
4. `spec.md` — add/modify US-NNN, FR-NNN, acceptance criteria
5. `plan.md` — add/modify architecture sections
6. `tasks.md` — add new tasks, modify existing ones
7. `{FEATURE_DIR}/specs/<domain>/spec.md` — the delta spec for each domain the change
   touches, keyed on the `FR-*` ids changed in `spec.md`, each entry with the marker.
   Omit a section that has no entries.

For each edit: show the proposed change, wait for confirmation, apply it with the marker
`<!-- CR-{NNN}: {brief description} -->`, and log it in `change-log.md`. Update the
affected `traceability.yml` rows. Every change then traces with `grep "CR-{NNN}"`.

**4B — Phase rollback.** When the change requires re-running an earlier phase, show the
reason (e.g. "architecture change needs plan.md update") and the phases that will
re-run (Phase {N}: {phase} — to update {artifact}; Phase {N+1}… — dependent artifacts),
and ask: **Yes — roll back to Phase {N}** / **No — apply only to current artifacts**.

The target must already be `completed` for this feature
([runtime.md §6.3](../docs/runtime.md#63-gate-prompt)); otherwise there is nothing to
rewind — apply the change to the current artifacts instead.

**No** → no gate entry, no status change; continue with 4A on the current artifacts.

**Yes** (decision `rolled_back`, [policy.md §2](../docs/policy.md#2-gate-decisions)):

1. **Archive, never delete** ([policy.md §8](../docs/policy.md#8-change-management)).
   Move the artifacts of the target phase and every later phase (e.g. `plan.md`,
   `tasks.md`, `pre-impl-review.md`, `code-review.md`, `verify-report.md`, their
   `<phase>/digest.md`) to `{FEATURE_DIR}/_rewound/{date}-CR-{NNN}/`, keeping each
   file's relative path. Repository code stays where it is; only feature-dir artifacts move.
2. **Reset status** ([runtime.md §6.2](../docs/runtime.md#62-status-follows-the-decision)):

   ```yaml
   phases:
     {rolled_back_to}:         # and every later phase in phase-map order
       status: pending
       completed_at: null      # stale — the phase will re-run
       digest_path: null       # the digest was archived in step 1
       skip_reason: null       # a previously skipped phase is re-offered at its gate
   gates:
     - phase: "{current phase}"
       decision: rolled_back
       rolled_back_to: "{rolled_back_to}"
       timestamp: "{ISO timestamp}"
       notes: "CR-{NNN}: {reason}; rewound artifacts archived to _rewound/{date}-CR-{NNN}/"
   ```

   `not_applicable` phases stay `not_applicable`; the original completions remain in
   `gates[]` history.
3. The forge orchestrator resumes from the rolled-back phase on its next run.

**4C — Sync-verify.** After all edits, run `sync-verify --quick` and report any drift
the change introduced.

### DEFER

Emit no delta spec (a deferred change does not alter canonical behaviour); remove one if
it was drafted. Leave the artifacts unchanged. Add the CR to `{FEATURE_DIR}/backlog.md`,
creating it when missing:

```markdown
# Feature Backlog: {Feature Name}

Deferred changes and v2 improvements logged during the lifecycle.

## CR-{NNN}: {title} [DEFERRED]
- **Priority:** {priority}
- **Rationale for deferral:** {reason}
- **Estimated effort:** {effort}
- **Dependencies:** {what must exist first}
- **Suggested phase to resume:** Phase {N}
```

### REJECT

Emit no delta spec (canonical `specs/` stays untouched); remove one if it was drafted.
Leave every artifact unchanged.

## Step 5: Log the change request

For every decision, append the CR to `{FEATURE_DIR}/change-log.md` from
[change-request-change-log.md](../docs/templates/change-request-change-log.md), with
status ACCEPTED / DEFERRED / REJECTED and the decision notes.

## Step 6: Update status

For every decision, append to `change_requests`:

```yaml
change_requests:
  - id: "CR-{NNN}"
    title: "{title}"
    status: "{accepted/deferred/rejected}"
    timestamp: "{ISO timestamp}"
    artifacts_affected: {N}
    tasks_added: {N}
    phase_rollback: "{phase or null}"
```

## Done when

- The CR has a unique `CR-NNN` id, a recorded rationale and priority, and a decision.
- A blocked CR (task mid-implementation) stopped at Step 0 with the guard message and
  wrote nothing.
- ACCEPT: every confirmed edit carries `<!-- CR-{NNN}: … -->`, the delta spec covers each
  changed `FR-*`, `traceability.yml` rows are updated, and `sync-verify --quick` ran with
  its drift reported. On rollback: the target and later phases' artifacts are in
  `_rewound/{date}-CR-{NNN}/`, those phases are `pending` with nulled
  `completed_at` / `digest_path` / `skip_reason`, and one `rolled_back` gate entry exists.
- DEFER / REJECT: no delta spec exists and no artifact changed; a deferred CR is in `backlog.md`.
- `change-log.md` has the CR section and `change_requests[]` has its entry.
