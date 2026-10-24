---
name: speckit.product-forge.status
description: >
  Show where a feature stands: every in-scope phase with its state, which
  artifacts exist, mismatches, and the next action. Use for one feature, all
  features, or with `--cost` for the token / cost rollup.
---

# Product Forge — Status

You are the **Status Reporter**. Give the user an at-a-glance view of where a
feature stands in its lifecycle, which artifacts exist, and exactly what to do
next.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — read-only (never writes `.forge-status.yml`; ignores `--dry-run`)
- **Config keys:** `features_dir`, `storage_strategy`
- **Writes:** nothing
- **Contract deltas:** under `domain-nested`, an ambiguous bare slug needs a
  `<domain>/<slug>` qualifier. `all` shows every feature. `--cost` replaces the
  lifecycle view with the cost / token rollup (Step 6) — for one feature with a
  slug, for the portfolio with `all` or no slug.

Every display below comes from [docs/templates/status-display.md](../docs/templates/status-display.md).

## Step 1: Find features

Walk feature roots with `enumerate()`
([runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)) — `flat`
(depth 1) and `domain-nested` (depth 2), skipping `_`-prefixed top-level dirs.
Several features and none requested → show the feature list and ask which to
inspect (number, name, or `all`).

## Step 2: Read the status file

Read `{FEATURE_DIR}/.forge-status.yml`. Note `feature_mode` (absent →
`standard`), `speckit_mode` (may be unset — express / lite have no bridge) and
`backfilled`.

## Step 3: Check artifacts

Build the phase list from [docs/schema/phase-map.yml](../docs/schema/phase-map.yml)
for the feature's `feature_mode`:

- `yes` / `opt` → in scope; show it, in phase-map order.
- `no`, or `phases.<key>.status: not_applicable` (e.g. a backfilled feature) →
  out of scope; omit it (or collapse into one `n/a: …` line). It is never "missing".

For each in-scope phase, check its expected artifact — the **Artifact Signal**
column of the Phase Map in [forge.md](./forge.md). In `express` / `lite` there is
no `tasks.md`: Implement progress comes from the inline `## Tasks` list in
`plan.md` plus `task_log[]`.

Mark each ✅ (exists) / ❌ (missing) / ⏭️ (`skipped`).

## Step 4: Display the feature

Print the single-feature view: header (slug, dates, mode, SpecKit sub-flow when
set, backfilled line when true), one row per in-scope phase with its artifact
detail, current phase and next action, sync history, gate audit trail, change
requests, and quick actions.

One icon per `phases.<key>.status` value (canonical set:
[schema/forge-status-v3.schema.yml](../docs/schema/forge-status-v3.schema.yml)):

| Icon | Status | Meaning |
|------|--------|---------|
| ✅ | `completed` (legacy `approved` on `revalidation`) | Phase complete, artifacts verified |
| ⚠️ | `completed_with_known_issues` | Phase finished with documented open issues |
| ⏳ `[IN PROGRESS]` | `in_progress` | Phase in progress |
| ⏳ `[PENDING]` | `pending` | Phase not yet started |
| ⏭️ | `skipped` | Optional phase skipped by user — always show `skip_reason` (or "no reason recorded") |
| n/a | `not_applicable` | Never in scope (mode excludes it, or backfilled) — omitted by default |
| ❌ | — | Status says done but the expected artifact is missing |

## Step 5: Flags and the all-features view

Report inconsistencies; repairing them is the phase's job:

```
⚠️  Status mismatch detected:
    .forge-status.yml says "Phase 2: pending"
    but product-spec/README.md exists.
    Re-run the phase (or /speckit.product-forge.forge to resume) to reconcile.
```

```
❌ ATTENTION: verify-report.md contains {N} CRITICAL findings.
   The feature cannot be considered done until these are resolved.
   Run: /speckit.product-forge.verify-full
```

With `all`, print the all-features overview. Progress = done / in-scope phases
for the feature's mode (Step 3); `done` counts `completed`,
`completed_with_known_issues` and `skipped`; `not_applicable` is excluded from
both sides.

## Step 6: Cost / token rollup (`--cost`)

Report the per-phase telemetry the orchestrator records when the host exposes
usage accounting — `phases.<name>.{tokens_in, tokens_out, tool_calls}`, written
at phase completion ([runtime.md §8.1a](../docs/runtime.md#8-phase-digest-requirement-a4)):

```bash
# one feature
node ${PLUGIN_ROOT}/scripts/cost-report.js --feature-dir {FEATURE_DIR}
# whole portfolio (no slug / "all")
node ${PLUGIN_ROOT}/scripts/cost-report.js --portfolio
```

Show dollars **only** with the user's own rate (`--rate-in <$/Mtok> --rate-out <$/Mtok>`,
or the `PRODUCT_FORGE_COST_RATE_IN` / `PRODUCT_FORGE_COST_RATE_OUT`
env); tokens are always the captured values and provider prices are never
hard-coded. Print the script's table verbatim, then:

```
{feature|portfolio}: {tokens_in} in / {tokens_out} out across {N} phases
   {+ "≈ $X at your rates" when rates supplied}
```

No phase carries telemetry → say *"No per-phase token telemetry recorded for
this feature yet."* instead of printing zeros.

## Done when

- Every in-scope phase for the feature's mode is listed in phase-map order with
  its icon and artifact check; out-of-scope phases are omitted or collapsed.
- Every `skipped` phase shows its `skip_reason` (or "no reason recorded").
- Every status / artifact mismatch and any CRITICAL verify finding is flagged.
- The current phase, next action and quick actions are shown (or, with `all`,
  one overview row per feature with mode-relative progress).
- `--cost`: the script's table and headline are shown, dollars only with a
  user rate, or the no-telemetry message.
- Nothing was written.
