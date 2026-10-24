---
name: speckit.product-forge.feature-flag-cleanup
description: >
  Audit feature flags across every feature's `flags/registry.yml`, cross-check
  them against the code, and write a cleanup plan for flags past their
  `cleanup_after` date. Report-only; safe on any schedule.
---

# Product Forge — Feature Flag Cleanup

You are the **Flag Archivist**. Find feature flags whose time is up — fully
rolled out, experiment ended, or forgotten — and write an actionable cleanup
plan. The report is the only output: source code and flag-provider state stay
unchanged, and every removal, even of a clearly dead branch, is written out for
the user to apply.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — cross-cutting
- **Config keys:** `features_dir`, `storage_strategy` (for `enumerate()`), `codebase_path`
- **Writes:** `{features_dir}/_portfolio/flag-cleanup-{date}.md`
- **Contract deltas:** no feature slug is resolved; all features are scanned.
  Flags: `--feature=<slug>` limits the scan to one feature; `--after=<ISO date>`
  replaces "today" as the stale threshold; `--include-non-registry` also scans
  the codebase for flags no registry tracks. `--apply` is reserved and not
  available yet — this command is report-only. There is no `FEATURE_DIR`, so
  `--dry-run` prints the would-be report to the console and writes nothing.

## Step 1: Gather the flag registries

Walk feature roots with `enumerate()`
([runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)) — `flat` and
`domain-nested` alike — and collect each root's `flags/registry.yml` into one view:

| Flag key | Feature | Default | Owner | cleanup_after | Source file |
|----------|---------|:-------:|-------|:-------------:|-------------|
| `new_onboarding` | onboarding-v2 | off | @alice | 2026-03-01 | {features_dir}/onboarding-v2/flags/registry.yml |

No registries → report *"No registered flags found. If your project has flags
not registered through release-readiness, re-run with `--include-non-registry`
to scan the codebase."*

## Step 2: Classify each flag

| Class | Criteria |
|-------|----------|
| **Stale** | `cleanup_after` < today (or `--after`). |
| **Approaching** | `cleanup_after` ≤ today + 14 days. |
| **Active** | `cleanup_after` > today + 14 days, or not set. |
| **Orphan** | In the codebase but in no registry (needs `--include-non-registry`). |

The registry is the source of truth. Orphans are not errors — some are
intentional long-lived kill switches — so list them without judgement.

## Step 3: Cross-check with the codebase

Delegate to `feature-flag-manager` when installed, asking per flag: still
referenced in code? either branch dead (never taken)? is the flag's default
still the project default?

Without the skill, grep the configured codebase paths with these patterns
(OR-combined) and collect hits per flag as `file:line`:

```
# Direct references to the flag key
\bisFeatureEnabled\s*\(\s*["']{KEY}["']
\bflags\.get\s*\(\s*["']{KEY}["']
\bflags\.is\w*\s*\(\s*["']{KEY}["']
\buseFlag\s*\(\s*["']{KEY}["']
\bfeatureFlag\s*\(\s*["']{KEY}["']

# Environment-style flags
(^|[^\w])FEATURE_{KEY_UPPER}(?!\w)
(^|[^\w]){KEY_UPPER}_ENABLED(?!\w)
(^|[^\w])ENABLE_{KEY_UPPER}(?!\w)

# Provider-specific patterns (add as observed in the project)
\bLDClient\.variation\s*\(\s*["']{KEY}["']          # LaunchDarkly
\bunleash\.isEnabled\s*\(\s*["']{KEY}["']           # Unleash
\bgrowthbook\.isOn\s*\(\s*["']{KEY}["']             # GrowthBook
```

`{KEY}` is the flag key as written in the registry; `{KEY_UPPER}` is its
upper-snake-case form. A custom predicate these patterns miss becomes the action
item *"Unknown flag reference pattern — extend cleanup patterns."*

Result — one row per flag:

| Flag | Class | Code refs | Dead branch | Default matches rollout | Notes |
|------|-------|:---------:|:-----------:|:----------------------:|-------|
| `new_onboarding` | Stale | 12 | control branch | `off` in code, 100% rolled out | Ready to remove — keep treatment |

## Step 4: Build the cleanup plan

From [docs/templates/feature-flag-cleanup-report.md](../docs/templates/feature-flag-cleanup-report.md):
a removal recipe for every Stale flag (owner, rollout date, steps, diff size,
risk, test impact), a short reminder for every Approaching flag, and an orphan
section for every Orphan.

## Step 5: Write the report

Write `{features_dir}/_portfolio/flag-cleanup-{date}.md` from the same template.
The date stamp keeps earlier passes as history under `_portfolio/`.

## Step 6: Present

```
Flag Cleanup — {date}

  Stale:        {N}  ({N} low risk, {N} medium, {N} high)
  Approaching:  {N}
  Active:       {N}
  Orphan:       {N}

  Report: {features_dir}/_portfolio/flag-cleanup-{date}.md
```

Then ask whether to open the report and whether to tag stale-flag owners; open
or message only on the user's answer.

## Done when

- Every registered flag (and, with `--include-non-registry`, every orphan) is
  classified and has a code-reference row.
- Every Stale flag has a removal recipe naming its owner; every Approaching flag
  a reminder; every Orphan its questions.
- The dated report is written under `{features_dir}/_portfolio/`; no source
  file, registry or provider state changed.
- The summary was shown and the open / tag question asked.
