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

> Background: [docs/improvements/2026-05-sdd-flow-improvements.md](../docs/improvements/2026-05-sdd-flow-improvements.md)
> Theme B. ID system: [docs/templates/traceability-matrix.md](../docs/templates/traceability-matrix.md).

## User Input

```text
$ARGUMENTS
```

Inputs: `FEATURE_DIR`, `features_dir`, the feature's delta specs and
`traceability.yml`.

---

## Canonical layout

```
specs/                                  ← source of truth: how the system behaves NOW
└── {domain}/                           ← organized by domain/capability (e.g. auth, billing)
    └── spec.md                         ← canonical requirements (stable REQ-* ids)

features/
└── {slug}/
    ├── spec.md                         ← per-change spec (working)
    └── specs/                          ← DELTA specs for this change (per domain)
        └── {domain}/spec.md            ← ## ADDED / ## MODIFIED / ## REMOVED Requirements
```

`specs/` is the living source of truth; `features/{slug}/` is the working area for
one change. Deltas reference canonical `REQ-*` ids.

---

## Step 1: Validate readiness

1. Read `.forge-status.yml`. The feature should be at/after `verify` (Phase 7) and,
   if release is gated, release-readiness complete.
2. Confirm the feature has delta specs (`features/{slug}/specs/<domain>/spec.md`)
   in the delta format. If it only has a flat `spec.md` (legacy), offer to derive
   deltas by diffing against canonical `specs/` (or treat all as `ADDED` for a new
   domain).
3. Confirm `traceability.yml` rows are `verified` (or note exceptions).

Present a structured confirmation prompt (see
[docs/interaction.md](../docs/interaction.md)) before mutating canonical specs.

---

## Step 2: Apply the deltas

For each delta domain file, apply per the OpenSpec rules:

| Section | Action on canonical `specs/{domain}/spec.md` |
|---------|----------------------------------------------|
| `## ADDED Requirements` | Append the new `REQ-*` requirements. |
| `## MODIFIED Requirements` | Replace the existing `REQ-*` with the new version. |
| `## REMOVED Requirements` | Delete the named `REQ-*` from the canonical spec. |

Preserve stable `REQ-*` ids. If a domain has no canonical spec yet, create it from
the `ADDED` set. Keep canonical specs requirement-oriented (the "how it behaves
now"), not implementation detail.

---

## Step 3: Archive the change

1. Move the change working folder to `features/_archived/{date}-{slug}/` (or set
   `archived: true` + `archived_at` on `.forge-status.yml` if you keep it in place),
   preserving the gate audit trail and `traceability.yml` for history.
2. Record the merge in the canonical spec's change log (date, slug, REQ ids
   added/modified/removed) so canonical history is auditable.

---

## Step 4: Reconcile with code (Theme G)

If `verify-full` Layer 10 (doc↔code) flagged drift, present the suggested canonical
updates (spec changed from what code actually does) as a diff and ask the user to
approve before writing — keeping canonical specs honest about real behavior without
silently overwriting intent.

---

## Step 5: Present results

Structured summary: domains touched, `REQ-*` added/modified/removed, archive
location, and a `Next step` prompt. Update `.forge-status.yml`:
`phases.spec_merge.status = completed`.

---

## When to run

- At feature completion (wired into / after Phase 9 release-readiness).
- After a `change-request` that altered canonical behavior.
- `backfill` writes initial canonical specs for brownfield features so they stay
  alive across future changes.
