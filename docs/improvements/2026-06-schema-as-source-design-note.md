# Design Note — Schema-as-Single-Source for Invariants (staged)

> **Status:** SHIPPED (steps 2 + 3). Step 2 (enum single-source via
> `docs/schema/enums.yml`) and step 3 (phase-map single-source via
> `docs/schema/phase-map.yml`) are both implemented and enforced by
> `scripts/lint-docs.js` (ENUM + PHASEMAP rules). This note is retained as the
> design rationale. Authored alongside the 2026-06 deep-review hardening
> (see [2026-06-deep-review.md](./2026-06-deep-review.md)).

## Problem

Product Forge is "spec-as-product": correctness = consistency across ~140 docs.
The recurring defect class is **drift** — an enum, a count, a phase-map row, or a
version is updated in one doc and not the six others that restate it. The
2026-05 system audit found a dozen instances (14-vs-18 phases, 29-vs-31 commands,
3-vs-4 feature modes, 7-vs-9 sync layers); the 2026-06 pass found more
(`a11y_gate` dead switch, `TASK-` vs `T0NN`).

The current model is **"docs are truth, schema mirrors"**: each fact is restated
in prose in several places, and `scripts/lint-docs.js` polices that they agree.
Linting is a *detective* control — it catches drift after it lands. The deeper
fix is a *preventive* control: a single machine-readable source the docs derive
from, so the facts **cannot** disagree.

## Proposal

Invert to **"schema is truth, docs render"**. Promote the invariants that today
live as prose into structured data, with `lint-docs` (or a small generator)
deriving/asserting the prose against it.

Candidate single-sourced invariants and their home:

| Invariant | Today (restated in…) | Proposed canonical home |
|-----------|----------------------|--------------------------|
| `feature_mode` enum | schema.yml, schema.md, runtime, forge, config, migration, phases | a `enums.feature_mode` block in `forge-status-v3.schema.yml` |
| gate-decision enum | policy, runtime, schema.yml, schema.md, file-structure | `enums.gate_decision` |
| phase-status enum | schema.yml, schema.md, runtime, file-structure | `enums.phase_status` |
| phase map (rows + per-mode applicability) | forge.md (2 tables), policy, phases, how-it-works, QA | a `phase_map:` data block (the two forge.md tables render from it) |
| command catalog (31) | extension.yml, README, how-it-works, claude-plugin, QA | `extension.yml provides.commands` is already the source — make every count a `lint-docs` assertion (done) |
| cross-artifact ID prefixes | schema.md §8, file-structure, traceability-matrix | `ids:` block in schema.yml; §8 + the two tables render from it |
| config keys + readers | config-template.yml, config.md | config-template.yml is the source; CONFIG-READER lint enforces a reader exists (done) |

## Why staged, not done now

- It is a **larger, structural** change (touches the canonical schema shape and
  several docs at once) — exactly the kind of edit that should land on its own
  wave with its own review, not bundled into a hardening pass.
- The **detective** layer now exists and is cheap: `lint-docs.js` already blocks
  drift in CI for counts, version, phase-map rows, and enum-omission. That buys
  time — drift can't silently ship today — so the preventive rewrite is an
  optimization, not an emergency.
- Doing it well wants a tiny **renderer** (schema block → the prose tables) so
  the docs stay human-readable; that renderer is the real new surface and
  deserves its own design.

## Suggested first step (when picked up)

1. Add an `enums:` block to `forge-status-v3.schema.yml` for the three enums.
2. Extend `lint-docs.js` ENUM rule to read those enum lists from the schema
   (instead of the hard-coded arrays it carries today) and assert every doc's
   enumeration is a subset/superset match — turning ENUM from a spot-check into a
   true single-source assertion.
3. Only then consider the phase-map data block + renderer (largest piece).

This sequences the value: step 2 alone removes the enum-drift class permanently
with no new rendered artifacts.
