---
name: speckit.product-forge.spec-merge
description: >
  Merge a shipped feature's delta specs (ADDED / MODIFIED / REMOVED requirements)
  into the canonical `specs/` and archive the feature folder with its history.
  Use after Release Readiness, or after a change request that altered canonical
  behaviour.
---

# Product Forge — Phase 10: Spec Merge

You are the **Canonical Spec Keeper**. When a feature ships, fold its **delta
specs** into the project's **canonical spec** (`specs/<domain>/spec.md`, how the
system behaves now) and archive the change folder with full history, so the
spec stays a living source of truth rather than a per-change document.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `spec_merge` (Phase 10)
- **Config keys:** `features_dir`, `storage_strategy`
- **Writes:** canonical `specs/<domain>/spec.md` (outside `FEATURE_DIR`), the
  archive move to `ARCHIVE_DIR`, `phases.spec_merge.*`
- **Contract deltas:**
  - `--dry-run`: canonical edits are mirrored under
    `{FEATURE_DIR}/.forge-dry-run/spec_merge/specs/<domain>/spec.md`; the archive
    move is reported as `would-move` and not performed.
  - `--from-forge`: skip the Step 1 Merge prompt (forge's gate is the
    confirmation) and **stop after Step 3** — write no status and do not archive;
    return the merge summary (domains, `FR-*` counts) and the computed
    `ARCHIVE_DIR`. Forge shows the gate; on `approved` it performs Step 4 (status
    + gate entry, at `FEATURE_DIR`) and then Step 5 (archive); on `revised` it
    re-runs this command, which is safe because Steps 2–3 upsert by `FR-*`.
  - Standalone, the Step 1 confirmation is the gate: **Merge** is recorded as
    `approved` in Step 4.

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

Deltas key on `FR-*` ids (minted by `bridge` / `change-request`; IDs per the
[traceability ID system](../docs/templates/traceability-matrix.md)). `REQ-*` is
the V-Model-pack / `backfill` canonical id only — the forward flow mints no `REQ-*`.

**`ARCHIVE_DIR`** ([runtime.md §12.4](../docs/runtime.md#124-reserved-namespaces-shared-by-all-strategies)):
`{features_dir}/_archived/{date}-{slug}/` under every strategy; under `ddd` it may
be context-keyed as `{features_dir}/_archived/{context}/{date}-{slug}/`. Keep
`_archived/` top-level — never inside a domain, context or workspace folder.

## Step 0: Idempotency and abort / defer guard

Run before touching any canonical spec; a re-run must be safe.

1. **Already merged** — `phases.spec_merge.status == completed`, or the slug no
   longer resolves but an `{features_dir}/_archived/**/*-{slug}/` folder exists →
   report *"already merged — nothing to do"* and exit with canonical `specs/`
   unchanged.
2. **Aborted feature** — `gates[]` holds an `aborted` decision → merge nothing;
   move the working folder to `{features_dir}/_archived/{date}-{slug}-aborted/`
   (same `ddd` rule), keeping the gate audit trail, and exit with no status write.
3. **Deferred / rejected change request** — a `DEFERRED` or `REJECTED` change
   request emits no delta. Skip any stray delta for one (leave it unfolded) and
   note it in the results.
4. Otherwise continue.

## Step 1: Validate readiness and confirm

1. `.forge-status.yml` shows the feature at or after `verify` (Phase 7) and, when
   release is gated, release-readiness complete.
2. Delta specs exist at `{FEATURE_DIR}/specs/<domain>/spec.md` in the delta
   format. A legacy feature with only a flat `spec.md` → offer to derive deltas by
   diffing against canonical `specs/` (or treat all as `ADDED` for a new domain).
3. `traceability.yml` rows are `verified`, or the exceptions are noted.

Then, on a standalone run, ask before mutating canonical specs (under
`--from-forge` skip this prompt and continue):

```
[Merge] Fold {domains} into canonical specs/ (FR +{added} ~{modified} -{removed})?

  1. Merge (recommended) — apply the deltas and archive the feature
  2. Not now — exit with no change
  (or type your own answer)
```

**Not now** → exit: no status write, no gate entry.

## Step 2: Apply the deltas

For each delta domain file:

| Section | Action on canonical `specs/{domain}/spec.md` |
|---------|----------------------------------------------|
| `## ADDED Requirements` | **Upsert by `FR-id`**: append each new `FR-*`, or update it in place when it already exists. |
| `## MODIFIED Requirements` | Replace the existing `FR-*` with the new version. |
| `## REMOVED Requirements` | Delete the named `FR-*` from the canonical spec. |

Keep `FR-*` ids stable. A domain with no canonical spec yet is created from its
`ADDED` set. Canonical specs state requirements (how it behaves now), not
implementation detail. Append to each touched canonical spec's change log: date,
slug, `FR-*` ids added / modified / removed.

## Step 3: Reconcile with code

Read the **"Suggested canonical-spec updates"** section of `verify-report.md`
(the carrier `verify-full` Layer 10 writes) plus any canonical-drift notes in
`code-review.md`. Present each suggested update as a diff and write it only
after the user approves it, so canonical specs match real behaviour without
overwriting intent. Section absent or empty → skip.

`--from-forge` stops here (see Contract deltas).

## Step 4: Status (before archiving)

Write while the folder is still at `FEATURE_DIR` — the lock and the file live
there, and the archive must carry the completed state:

```yaml
phases:
  spec_merge:
    status: completed
    completed_at: "{ISO timestamp}"
    archived_to: "{ARCHIVE_DIR}"
gates:            # standalone run only
  - phase: spec_merge
    decision: approved
    timestamp: "{ISO timestamp}"
    notes: "merged {domains}; FR +{added} ~{modified} -{removed}; archived to {ARCHIVE_DIR}"
```

## Step 5: Archive the change

After the Step 4 write completes (lock released), move the whole working folder
to `ARCHIVE_DIR`, keeping `.forge-status.yml`, the gate audit trail and
`traceability.yml`. Write nothing to the old `FEATURE_DIR` afterwards;
`enumerate()` / `resolve()` now skip it (top-level `_` skip, runtime §12.3).

## Step 6: Present results

Summary: domains touched, `FR-*` added / modified / removed, skipped stray
deltas, `ARCHIVE_DIR`.

## Done when

- Already merged → reported "already merged — nothing to do"; nothing changed.
- Aborted → folder moved to `…-aborted/`, nothing merged, no status write.
- Every delta requirement is folded into its canonical spec (ADDED upserted,
  MODIFIED replaced, REMOVED deleted) with a change-log entry per touched spec;
  every approved code-reconciliation diff is applied.
- Standalone: `phases.spec_merge` is `completed` with `archived_to`, one
  `approved` gate entry is appended, then the folder sits at `ARCHIVE_DIR`.
- `--from-forge`: Steps 0–3 done without the Merge prompt; merge summary and `ARCHIVE_DIR` returned to
  forge; no status write, no archive move.
- "Not now" → no change at all.
