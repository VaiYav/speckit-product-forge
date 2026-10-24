---
name: speckit.product-forge.spec-merge
description: >
  Cross-cutting (living spec): merge a completed feature's delta specs
  (ADDED/MODIFIED/REMOVED requirements) into the canonical specs/ source of truth,
  then archive the change folder with audit history. Makes the spec spec-anchored —
  a living source of truth across the feature's lifetime, not a per-change artifact.
  Use with: "merge spec", "archive change", "/speckit.product-forge.spec-merge"
---

# Product Forge — Spec Merge (living spec)

You are the **Canonical Spec Keeper**. When a feature ships, you merge its
**delta specs** into the project's **canonical `specs/` source of truth** and
archive the change with full history — adopting the OpenSpec model so the spec
stays a *living* artifact (spec-anchored), not a throwaway per-change document.

> Background: [docs/improvements/archive/2026-05-sdd-flow-improvements.md](../docs/improvements/archive/2026-05-sdd-flow-improvements.md)
> Theme B. ID system: [docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md).

## User Input

```text
$ARGUMENTS
```

Inputs: `FEATURE_DIR`, `features_dir`, the feature's delta specs,
`traceability.yml`, `verify-report.md` (its "Suggested canonical-spec updates"
section), and `code-review.md`.

Build the effective config ([docs/runtime.md §1](../docs/runtime.md#1-step-0--load-config)).
Keys used: `features_dir`, `storage_strategy`. Resolve `FEATURE_DIR` via the
Path-Resolution Contract `resolve(slug)`
([docs/runtime.md §12.2](../docs/runtime.md#122-resolveslug--feature_dir)).

Honors `--dry-run` per [docs/runtime.md §7](../docs/runtime.md#7-dry-run-semantics).
Canonical `specs/` lives outside `FEATURE_DIR`, so its would-be edits are mirrored
under `{FEATURE_DIR}/.forge-dry-run/spec_merge/specs/<domain>/spec.md`; the archive
move is reported as `would-move` and not performed; no status or gate is written.

This command mutates canonical `specs/` and `.forge-status.yml`; every status write
goes through the status-write procedure
([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure)).

---

## Canonical layout

```
specs/                                  ← source of truth: how the system behaves NOW
└── {domain}/                           ← organized by domain/capability (e.g. auth, billing)
    └── spec.md                         ← canonical requirements (stable FR-* ids)

{FEATURE_DIR}/                          ← resolve(slug); e.g. {features_dir}/{slug}/ under `flat`
├── spec.md                             ← per-change spec (working)
└── specs/                              ← DELTA specs for this change (per domain)
    └── {domain}/spec.md                ← ## ADDED / ## MODIFIED / ## REMOVED Requirements

{features_dir}/_archived/{date}-{slug}/ ← archived change folders (reserved namespace, runtime §12.4)
```

`specs/` is the living source of truth; `{FEATURE_DIR}` is the working area for
one change. Deltas key on `FR-*` ids (minted by `bridge`/`change-request`).
`REQ-*` is the V-Model-pack / `backfill` canonical id only — the forward flow does
not mint `REQ-*`.

**Archive path** (`ARCHIVE_DIR`, [runtime.md §12.4](../docs/runtime.md#124-reserved-namespaces-shared-by-all-strategies)):
`{features_dir}/_archived/{date}-{slug}/` under every strategy; under `ddd` it MAY be
context-keyed as `{features_dir}/_archived/{context}/{date}-{slug}/`. Never archive
inside a domain/context/workspace folder — `_archived/` stays top-level.

---

## Step 0: Idempotency & abort/defer guard

Run before touching any canonical spec — this command must be safe to re-run.

1. **Already merged?** If `phases.spec_merge.status == completed`, **or** the slug no
   longer resolves but an `{features_dir}/_archived/**/*-{slug}/` folder exists (a
   merged feature has been moved out of `resolve()`'s reach), report
   *"already merged — nothing to do"* and exit without mutating canonical `specs/`.
2. **Aborted feature?** If the feature ended in an aborted state (a gate decision of
   `aborted` in `gates[]`): **do not merge**. Move the working folder to
   `{features_dir}/_archived/{date}-{slug}-aborted/` (same `ddd` rule as above),
   preserving the gate audit trail, and exit. No deltas are folded; no status is written.
3. **Deferred/rejected change-request?** A `DEFERRED` or `REJECTED` change-request
   emits **no delta** — there is nothing to merge. If a stray delta exists for such a
   change, skip it (do not fold) and note it in the results.
4. Otherwise proceed. When applying `## ADDED Requirements` in Step 2, treat each as
   an **upsert by `FR-id`**: if the `FR-*` already exists in the canonical spec,
   update it in place rather than appending a duplicate.

---

## Step 1: Validate readiness

1. Read `.forge-status.yml`. The feature should be at/after `verify` (Phase 7) and,
   if release is gated, release-readiness complete.
2. Confirm the feature has delta specs (`{FEATURE_DIR}/specs/<domain>/spec.md`)
   in the delta format. If it only has a flat `spec.md` (legacy), offer to derive
   deltas by diffing against canonical `specs/` (or treat all as `ADDED` for a new
   domain).
3. Confirm `traceability.yml` rows are `verified` (or note exceptions).

Present a structured confirmation prompt (see
[docs/interaction.md](../docs/interaction.md)) before mutating canonical specs:
**Merge** → continue (recorded as `approved` in Step 5); **Not now** → exit with no
change (no status write, no gate entry).

---

## Step 2: Apply the deltas

For each delta domain file, apply per the OpenSpec rules:

| Section | Action on canonical `specs/{domain}/spec.md` |
|---------|----------------------------------------------|
| `## ADDED Requirements` | **Upsert by `FR-id`**: append each new `FR-*`, or update in place if it already exists (Step 0.4). |
| `## MODIFIED Requirements` | Replace the existing `FR-*` with the new version. |
| `## REMOVED Requirements` | Delete the named `FR-*` from the canonical spec. |

Preserve stable `FR-*` ids. If a domain has no canonical spec yet, create it from
the `ADDED` set. Keep canonical specs requirement-oriented (the "how it behaves
now"), not implementation detail.

Record the merge in each touched canonical spec's change log (date, slug, `FR-*` ids
added/modified/removed) so canonical history is auditable.

---

## Step 3: Reconcile with code (Theme G)

Read the **"Suggested canonical-spec updates"** section of `verify-report.md` (the
carrier written by `verify-full` Layer 10 doc↔code reconciliation), plus any
canonical-drift notes in `code-review.md`. If drift was flagged (the spec diverged
from what the code actually does), present each suggested canonical update as a diff
and ask the user to approve before writing — keeping canonical specs honest about
real behavior without silently overwriting intent. If the section is absent or
empty, skip this step.

---

## Step 4: Update status (before archiving)

Write via the status-write procedure ([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure))
**while the folder is still at `FEATURE_DIR`** — the lock and the file live there, and
the archived folder must carry the completed state:

```yaml
phases:
  spec_merge:
    status: completed
    completed_at: "{ISO timestamp}"
    archived_to: "{ARCHIVE_DIR}"
gates:            # standalone run only — see below
  - phase: spec_merge
    decision: approved
    timestamp: "{ISO timestamp}"
    notes: "merged {domains}; FR +{added} ~{modified} -{removed}; archived to {ARCHIVE_DIR}"
```

Gate ownership ([docs/runtime.md §6.1](../docs/runtime.md#61-gate-ownership)): append
the `gates[]` entry **only on a standalone run**.

**Orchestrated run (`--from-forge`): stop after Step 3.** Do not write the status file
and do not archive — return the merge summary (domains, `FR-*` counts) and the
computed `ARCHIVE_DIR` to forge. Forge presents the gate; on `approved` it performs
Step 4 (status + gate entry, at `FEATURE_DIR`) and then Step 5 (archive). On
`revised` forge re-runs this command; the canonical `specs/` edits from Steps 2–3
are idempotent (upsert by `FR-*`), so a re-run is safe.

---

## Step 5: Archive the change

After the Step 4 write has completed (lock released), move the whole working folder
to `ARCHIVE_DIR`, preserving `.forge-status.yml`, the gate audit trail and
`traceability.yml` for history. Nothing is written to the old `FEATURE_DIR` after
this point. Once moved, `enumerate()` / `resolve()` skip it (the top-level `_`-skip,
runtime §12.3).

---

## Step 6: Present results

Structured summary: domains touched, `FR-*` added/modified/removed, `ARCHIVE_DIR`,
and a `Next step` prompt.

---

## When to run

- At feature completion: runs as Phase 10, after release-readiness.
- After a `change-request` that altered canonical behavior.
- `backfill` writes initial canonical specs for brownfield features so they stay
  alive across future changes.
