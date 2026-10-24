---
name: speckit.product-forge.status
description: >
  Show the current Product Forge lifecycle status for a feature. Reads .forge-status.yml,
  displays all phases with completion state, lists available artifacts, and recommends
  the next action. Works for any feature in the features/ directory.
  Use with: "forge status", "show status", "/speckit.product-forge.status"
---

# Product Forge — Status Command

You are the **Status Reporter** for Product Forge.
Your goal: give the user a clear, at-a-glance view of where a feature stands in its
lifecycle, what artifacts exist, and exactly what to do next.

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` contains a feature name or slug, show status for that specific feature
(resolve it to `FEATURE_DIR` via the Path-Resolution Contract `resolve(slug)`,
[docs/runtime.md §12.2](../docs/runtime.md#12-path-resolution-contract) — under
`domain-nested` an ambiguous bare slug needs a `<domain>/<slug>` qualifier).
If empty, enumerate all features (`enumerate()`, §12.3) and ask which to inspect (or show all).

If `$ARGUMENTS` contains **`--cost`**, render the cost/token rollup (Step 5)
instead of the full lifecycle view — see Step 5. `--cost` combines with a feature
slug (one feature) or `all` / no slug (portfolio).

---

## Step 1: Find Features

Build the effective config ([docs/runtime.md §1](../docs/runtime.md#1-step-0--load-config)).
Keys used: `features_dir`, `storage_strategy`. `status` is read-only — it never
writes `.forge-status.yml` (and so ignores `--dry-run`, runtime §7.2).

Enumerate feature roots via the Path-Resolution Contract `enumerate()`
([docs/runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)) —
depth-tolerant over `flat` (depth 1) and `domain-nested` (depth 2), skipping
`_`-prefixed top-level dirs.

If multiple features exist and no specific feature was requested:

```
📦 Product Forge Features

Found {N} features:

  1. {feature-name}        [{current-phase}] — Last updated: {date}
  2. {feature-name}        [{current-phase}] — Last updated: {date}

Which feature to inspect? (enter number or name, or "all" for overview)
```

---

## Step 2: Read Status File

Read `{FEATURE_DIR}/.forge-status.yml`. Note `feature_mode` (absent → `standard`),
`speckit_mode` (may be unset — express/lite have no bridge), and `backfilled`.

---

## Step 3: Check Artifact Existence

Build the phase list from [`docs/schema/phase-map.yml`](../docs/schema/phase-map.yml)
— the single source for the phase set — for the feature's `feature_mode`:

- `yes` / `opt` cell → the phase is in scope; show it, in phase-map order.
- `no` cell (or `phases.<key>.status: not_applicable`, e.g. on a backfilled
  feature) → out of scope; omit it from the lifecycle view (or collapse into one
  `n/a: …` line). It is never "missing".

For each in-scope phase, check its expected artifact — the **Artifact Signal**
column of the Phase Map in [forge.md](./forge.md) (lint-pinned to `phase-map.yml`).
Mode-specific signals: in `express` / `lite` there is no `tasks.md`, so
Implement progress comes from the inline `## Tasks` list in `plan.md` plus
`task_log[]`.

Report each as ✅ (exists) / ❌ (missing) / ⏭️ (`skipped`).

---

## Step 4: Display Status

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔨 Product Forge Status: {Feature Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature:  {feature-slug}
  Created:  {created_at}
  Updated:  {last_updated}
  Mode:     {feature_mode}                      (express / lite / standard / v-model)
  SpecKit sub-flow: {speckit_mode}              (only when set — standard / v-model, written by Phase 4)
  {If backfilled: "Backfilled: yes — reverse-engineered from code (see gaps-report.md)"}

  Phase Lifecycle:   (example: standard mode — render only the Step 3 phase list)
  ─────────────────────────────────────────
  ✅ Phase 1 · Research          [COMPLETE]
     └── {N} research documents in research/
         competitors.md · ux-patterns.md · codebase-analysis.md
         {+ tech-stack.md if exists} {+ metrics-roi.md if exists}

  ✅ Phase 2 · Product Spec      [COMPLETE]
     └── {N} documents in product-spec/
         product-spec.md ({SPEC_DETAIL}) · journeys/journeys.yml ({N} journeys)
         wireframes* ({N} screens, {WIREFRAME_DETAIL})
         {+ metrics.md if exists} {+ mockups/ if exists}

  ✅ Phase 3 · Revalidation      [APPROVED]
     └── {N} revision rounds → Approved on {date}
         review.md — {N} changes logged

  ✅ Phase 4 · SpecKit Bridge    [COMPLETE]
     └── spec.md — {N} user stories, {N} requirements

  🔄 Phase 5 · Plan              [IN PROGRESS]
     └── plan.md {✅/⏳}

  ⏳ Phase 5B · Tasks             [PENDING]
     └── tasks.md {✅/⏳}
         {If exists: Progress: {N}/{N} tasks complete [{%%}]}

  ⏭️ Phase 5C · Pre-Impl Review   [SKIPPED — "{skip_reason}"]
     └── pre-impl-review.md — design + architecture + risk

  ⏳ Phase 6 · Implementation    [PENDING]
     └── Waiting for tasks approval
         {If in progress: implementation-log.md — {N} checkpoints}

  ⏳ Phase 6B · Code Review       [PENDING / SKIPPED]
     └── code-review.md — quality + security + patterns + tests

  ⏳ Phase 7 · Verification      [PENDING]
     └── Will run after Phase 6/6B

  ⏳ Phase 8A · Test Plan         [PENDING / SKIPPED]
     └── testing/ — {N} test cases across {N} test types

  ⚠️ Phase 8B · Test Run          [COMPLETE WITH KNOWN ISSUES]
     └── test-report.md — {pass rate}% pass rate, {N} bugs ({N} deferred)

  ⏳ Phase 9 · Release Readiness  [PENDING / SKIPPED]
     └── release-readiness.md — ship checklist

  ─────────────────────────────────────────
  📍 Current Phase: 5 · Plan + Tasks
  🎯 Next Action:   Approve tasks and begin implementation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Sync History:
  ─────────────────────────────────────────
  Last sync-verify: {date or "never"}
  Runs total: {N} | Last verdict: {verdict}
  Drift items: {N} (last run)

  Gate Audit Trail:
  ─────────────────────────────────────────
  {N} gate decisions recorded
  Last gate: Phase {N} — {decision} on {date}

  Change Requests:
  ─────────────────────────────────────────
  {N} change requests ({N} accepted, {N} deferred, {N} rejected)

  Quick Actions:
  • Continue full cycle:    /speckit.product-forge.forge
  • Jump to current phase:  /speckit.product-forge.{current_phase}
  • Run sync-verify:        /speckit.product-forge.sync-verify
  • Submit change request:  /speckit.product-forge.change-request
  • View research:          cat {FEATURE_DIR}/research/README.md
```

---

## Status Legend

One icon per `phases.<key>.status` value (canonical set:
[schema/forge-status-v3.schema.yml](../docs/schema/forge-status-v3.schema.yml)):

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | `completed` (legacy `approved` on `revalidation`) | Phase complete, artifacts verified |
| ⚠️ | `completed_with_known_issues` | Phase finished with documented open issues |
| 🔄 | `in_progress` | Phase in progress |
| ⏳ | `pending` | Phase not yet started |
| ⏭️ | `skipped` | Optional phase skipped by user — always show `skip_reason` (or "no reason recorded") |
| n/a | `not_applicable` | Never in scope (mode excludes it, or backfilled) — omitted by default |
| ❌ | — | Status says done but the expected artifact is missing |

---

## Special Flags

If artifact file exists but status says pending → flag inconsistency (status
reports it; it does not repair it):
```
⚠️  Status mismatch detected:
    .forge-status.yml says "Phase 2: pending"
    but product-spec/README.md exists.
    Re-run the phase (or /speckit.product-forge.forge to resume) to reconcile.
```

If `verify-report.md` exists with CRITICAL findings:
```
❌ ATTENTION: verify-report.md contains {N} CRITICAL findings.
   The feature cannot be considered done until these are resolved.
   Run: /speckit.product-forge.verify-full
```

---

## Multi-Feature Overview (if "all" requested)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔨 Product Forge — All Features Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature                    Mode       Phase          Progress   Updated
  ──────────────────────────────────────────────────────────────────────
  push-notifications         standard   7/20 Plan      ████░░░    2026-03-28
  onboarding-v2              lite       1/5 Spec       ██░░░░░    2026-03-25
  compatibility-screen       express    4/4 Complete   ███████    2026-03-20

  Progress = done / in-scope phases for the feature's mode (Step 3); `done`
  counts completed, completed_with_known_issues and skipped; not_applicable is
  excluded from both sides.

  Total: {N} features — {N} complete, {N} in progress, {N} pending
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5: Cost / Token Rollup (`--cost`)

When invoked with `--cost`, report the token + tool-call telemetry that the
orchestrator records per phase **when the host exposes per-phase usage accounting**
(`phases.<name>.{tokens_in, tokens_out, tool_calls}` — written at phase completion
per [docs/runtime.md §8.1a](../docs/runtime.md#8-phase-digest-requirement-a4)) —
turning that data into cost visibility. **This is an executable rollup**, not a
hand-count:

Run the deterministic reporter via the Path-Resolution-safe wrapper
([docs/runtime.md §1A](../docs/runtime.md#1a-locating-bundled-scripts-plugin_root)):

```bash
# one feature
node ${PLUGIN_ROOT}/scripts/cost-report.js --feature-dir {FEATURE_DIR}
# whole portfolio (no slug / "all")
node ${PLUGIN_ROOT}/scripts/cost-report.js --portfolio
```

Dollar figures are shown **only** when the user supplies their own price
(`--rate-in <$/Mtok> --rate-out <$/Mtok>`, or the `PRODUCT_FORGE_COST_RATE_IN` /
`PRODUCT_FORGE_COST_RATE_OUT` env). Product Forge never hard-codes provider
prices — tokens are always real (captured); dollars require the caller's rate.
Render the script's table to the user verbatim, then add the one-line headline:

```
💰 {feature|portfolio}: {tokens_in} in / {tokens_out} out across {N} phases
   {+ "≈ $X at your rates" when rates supplied}
```

If no phase carries token telemetry yet (older v2 features, or phases that did
not record digests), say so plainly rather than printing zeros as if measured:
*"No per-phase token telemetry recorded for this feature yet."*
