---
name: speckit.product-forge.experiment-design
description: >
  Design a pre-registered A/B experiment for a flag-gated feature: hypothesis,
  primary / secondary / guardrail metrics, sample size, exposure rules and
  decision thresholds. Use after Monitoring Setup, before deploy, when the
  feature will be A/B tested.
---

# Product Forge — Phase 9B: Experiment Design

You are the **Experimentation Analyst**. Write an honest, pre-registered A/B
plan before the feature ships, so its results cannot be re-interpreted to fit a
desired outcome. The analysis plan and decision rule are locked before ship; a
mid-experiment edit needs a written rationale.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `experiment_design` (Phase 9B)
- **Config keys:** `telemetry.product_analytics`, `features_dir`, `storage_strategy`
- **Writes:** `experiment/experiment-design.md`, `experiment/experiment.yml`,
  `experiment/digest.md`, `phases.experiment_design.*`; optionally a live
  PostHog flag + experiment (Step 8, after approval)
- **Contract deltas:** `--flag=<key>` — the exposure flag, cross-checked against
  `flags/registry.yml`; `--variants=<list>` — comma-separated, default
  `control,treatment`. `--dry-run` creates no flag or experiment via MCP.

## Step 0: Check inputs

1. `phases.release_readiness.status` is `completed`.
2. `flags/registry.yml` exists and contains the flag.
3. `research/metrics-roi.md` exists (primary-metric expectations). Missing → ask
   the user for the primary metric; never invent one.
4. The analytics provider is decided (project config or tracking-plan).

## Step 1: Hypothesis

One sentence in this shape:

> **Because** {user insight from research},
> **if** {we ship the treatment variant},
> **then** {primary metric} will move by **at least** {MDE} in the
> **direction** {up / down}
> within {measurement window}.

Example:
> Because new users abandon before activation when the onboarding asks for
> too much up front, if we defer the avatar selection to after first
> chat, then Day-1 activation rate will move up by at least 3 percentage
> points within 14 days.

Direction and MDE are numbers, not adjectives ("X will improve engagement" is
rejected). If the user cannot commit to a direction and a number, stop and flag
the gap.

## Step 2: Metrics

- **Primary (exactly one)** — directly attributable to the treatment, already
  instrumented (cross-check `tracking/tracking-plan.md`), with a known baseline
  (analytics or research).
- **Secondary (2–5)** — supporting signals; informative, not decision-making.
- **Guardrails (2–4)** — must not degrade, e.g. error rate, P95 latency, crash
  rate, revenue per user (if not primary), support-ticket rate. A guardrail
  breach kills the treatment regardless of the primary result.

## Step 3: Sample size

Compute the minimum sample size per variant from baseline `p0` (research /
analytics), the hypothesis `MDE`, power `1 - β` (default 0.8) and significance
`α` (default 0.05, two-sided), with the formula for the primary metric's type in
[docs/reference/experiment-design-sample-size.md](../docs/reference/experiment-design-sample-size.md):
two-proportion z-test for rates, Welch t-test for continuous metrics.

| Parameter | Value | Source |
|-----------|-------|--------|
| Metric type | `{proportion \| continuous}` | hypothesis |
| Formula | `{two-proportion z-test \| Welch t-test}` | reference (a) / (b) |
| Baseline | 12% | analytics 30-day |
| MDE | +3pp (absolute) | hypothesis |
| Power | 0.8 | default |
| Alpha | 0.05 | default |
| Sample size per variant | ~4,200 | computed |
| Expected daily traffic | 400 | analytics 7-day |
| Expected runtime | ~22 days | sample / traffic |

Runtime over 30 days → flag *"underpowered at current traffic — consider raising
MDE or narrowing audience"* and wait for the user's choice. Keep α and the
audience as planned unless the user changes them openly.

## Step 4: Exposure rules

Document randomization unit (user / session / organization), eligibility filters
(locale, platform, tenure), holdout group (if any), assignment persistence
(sticky / non-sticky) and ramp schedule (e.g. 5% → 25% → 50% per variant).
Cross-check them against `flags/registry.yml`.

## Step 5: Analysis plan

Pre-register:

- Analysis window: [start, end] dates.
- Metrics computed: primary, secondary, guardrails (Step 2).
- Segments: at most 3 (e.g. new vs returning, mobile vs web).
- Stopping rules: stop early only for harm (guardrail breach > threshold for >
  window); positive results run to the end of the window.
- Decision rule:

```
If primary result is statistically significant (p < {α})
 AND movement is in hypothesized direction
 AND no guardrail breach:
   → Ship to 100%.
Otherwise:
   → Kill and revert flag.
If result is inconclusive at end of window:
   → Extend by fixed {N} days OR kill. No mid-window re-analysis.
```

## Step 6: Write the plan

Delegate to `feature-flag-ab-testing` (or an equivalent skill) with the flag key,
variants, exposure rules, sample size and metrics; without one, write the files
directly:

- `{FEATURE_DIR}/experiment/experiment-design.md` — the full plan from Steps 1–5.
- `{FEATURE_DIR}/experiment/experiment.yml`:

```yaml
flag: "{flag-key}"
variants:
  - name: "control"
    weight: 50
  - name: "treatment"
    weight: 50
randomization_unit: "user"
primary_metric:
  name: "day1_activation_rate"
  direction: up
  mde_absolute: 0.03
power: 0.8
alpha: 0.05
sample_size_per_variant: 4200
expected_runtime_days: 22
guardrails:
  - name: "error_rate"
    max_relative_increase: 0.05
```

## Step 7: Digest and status

Write `experiment/digest.md` from [docs/templates/phase-digest.md](../docs/templates/phase-digest.md),
then the run summary under the phase key (never a top-level `experiment:` block):

```yaml
phases:
  experiment_design:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "experiment/digest.md"
    flag: "{flag-key}"
    primary_metric: "{metric}"
    sample_size_per_variant: {N}
    expected_runtime_days: {N}
    files:
      design: "experiment/experiment-design.md"
      spec:   "experiment/experiment.yml"
```

`status` here is the standalone value: set it from the gate decision (approve →
`completed`). Under `--from-forge`, write the digest and the data fields, leave
`status` out, and return the outcome to forge.

## Step 8: Live experiment (optional, after approval)

When `telemetry.product_analytics` is `posthog` and its MCP is connected, the
actual flag and experiment can be created via the PostHog MCP with the
pre-registered primary and guardrail metrics; the retrospective later reads its
real results. Creation always follows approval of the plan:

- **Standalone** — after an approving gate, offer to create it and do so on a yes.
- **`--from-forge`** — create nothing; return "create live experiment" as an
  offer in the gate extras, for forge to act on after its gate.

Without a connected MCP the plan files are the whole output.

## Done when

- The hypothesis states direction, MDE and window as numbers (or the gap was
  flagged and the run stopped).
- Exactly one primary, 2–5 secondary and 2–4 guardrail metrics are defined; the
  primary is instrumented and has a baseline.
- Sample size and runtime are computed with the matching formula; a runtime over
  30 days is flagged as underpowered.
- Exposure rules match `flags/registry.yml`; the analysis plan has window,
  segments (≤ 3), harm-only stopping and the decision rule.
- `experiment-design.md` and `experiment.yml` are written; no live flag or
  experiment exists before an approving gate.
- Standalone: digest written, gate shown, decision recorded, status set from it.
- `--from-forge`: digest and `experiment_design` data fields written; outcome
  (flag, primary metric, sample size, runtime) and, when the PostHog MCP is
  connected, the "create live experiment" offer returned to forge; no gate
  prompt, no status write.
