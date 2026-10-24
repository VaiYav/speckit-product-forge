---
name: speckit.product-forge.monitoring-setup
description: >
  Produce a feature's monitoring artifacts — dashboard, alert rules, SLI/SLO
  doc — from plan NFRs and tracking-plan events, creating them live when the
  PostHog or Sentry MCP is connected. Use after Release Readiness, before deploy.
---

# Product Forge — Phase 9.5: Monitoring Setup

You are the **Observability Architect**. Turn the NFRs in `plan.md`, the success
metrics in `spec.md` and the events in `tracking/tracking-plan.md` into concrete
monitoring artifacts for the project's monitoring system. You write files under
`{FEATURE_DIR}/monitoring/`; applying them to the provider is a manual step,
except what a connected PostHog / Sentry MCP creates live.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `monitoring_setup` (Phase 9.5)
- **Config keys:** `telemetry.dashboards`, `features_dir`, `storage_strategy`
- **Writes:** `monitoring/dashboard.json`, `monitoring/alerts.yml`,
  `monitoring/slo.md`, `monitoring/digest.md`, `phases.monitoring_setup.*`;
  live dashboards / alerts via a connected MCP after approval (Step 7). A re-run overwrites only
  `monitoring/*`; tracking-plan, spec and plan stay untouched.
- **Contract deltas:**
  - `--provider=<name>` overrides `telemetry.dashboards` (`posthog` / `sentry` /
    `newrelic`; `grafana`, `datadog` also accepted).
  - With `telemetry.dashboards` `none` or unset and no `--provider`, there is no
    default backend: write provider-neutral templated stubs and note the gap
    (never assume NewRelic).
  - `--dry-run` creates no dashboard or alert via MCP.

## Step 0: Check inputs

1. `phases.release_readiness.status` is `completed` or `skipped` (Phase 9 decided).
2. `plan.md` and `spec.md` exist.
3. `tracking/tracking-plan.md` is optional — when missing, work from plan NFRs
   and note the gap.

A required artifact missing → stop with a clear error; metrics come only from
these inputs.

## Step 1: Extract SLI candidates

Sources, in priority order:

1. **NFRs in plan.md** — explicit latency / error-rate / availability targets.
2. **Success metrics in spec.md** — user-facing metrics that imply technical SLIs.
3. **Events in tracking-plan.md** — business metrics that become rate / latency SLIs.

| SLI | Source | Target (SLO) | Measurement window |
|-----|--------|--------------|--------------------|
| p95 API latency | plan.md NFR | ≤ 300 ms | 5-minute rolling |
| error rate | plan.md NFR | ≤ 0.5 % | 5-minute rolling |
| session start → first event | tracking-plan | ≤ 2 s | 1-hour rolling |

A candidate without a numeric target is marked `UNDEFINED` and becomes an action
item; never fill in a default number.

## Step 2: Build the dashboard

Every branch writes `{FEATURE_DIR}/monitoring/dashboard.json`; the MCP branches
prepare the live dashboard, which Step 7 creates after approval. A missing MCP
or skill degrades to a stub with a note — the phase continues.

- **`posthog`** — with the PostHog MCP connected: map the Step 1 SLIs and the
  tracking plan's `EVT-*` events to real PostHog event / insight names
  (discover them; never guess), define one insight per SLI / funnel / trend
  (rate, latency, adoption funnel across `JRN` / `STEP` events) grouped into a
  PostHog dashboard, and write the definitions into `dashboard.json`. MCP not
  connected → stub, note the gap.
- **`sentry`** — with the Sentry MCP connected: resolve the Sentry project, define
  error-rate / regression / latency widgets scoped to the feature's release and
  code paths, and write them into `dashboard.json`. MCP not connected → stub,
  note the gap.
- **`newrelic`** — delegate to `newrelic-dashboard-builder` with the SLI table,
  the panels proposed in `release-readiness.md` Step 3C, and the NewRelic app /
  account IDs from project config when available; `dashboard.json` is
  NerdGraph-compatible. Skill not installed → templated JSON with TODOs and the
  note *"Provider skill missing — dashboard is a stub."*
- **Unresolved / other** — provider-neutral templated `dashboard.json` with TODOs
  and the note *"No monitoring backend resolved — dashboard is a stub."*

## Step 3: Build alerts

Always write `{FEATURE_DIR}/monitoring/alerts.yml`:

```yaml
# Alert policies derived from plan NFRs and tracking-plan thresholds.
# Apply to the monitoring provider manually after review.
policies:
  - name: "{feature-slug} — error rate"
    condition: "error_rate > 5% for 5 min"
    severity: "P1"
    notification_channels: ["{project default}"]
    runbook: "docs/runbooks/{feature-slug}.md"
  - name: "{feature-slug} — p95 latency"
    condition: "p95_ms > {target}ms for 10 min"
    severity: "P2"
    notification_channels: ["{project default}"]
```

Live alerts (created in Step 7, after approval) when the provider's MCP is connected:

- **PostHog** — insight / threshold alerts on the Step 2 insights (error-rate and
  latency conditions).
- **Sentry** — issue / metric alert rules scoped to the feature's release and
  code paths.
- **NewRelic** — policies are applied manually from `alerts.yml` (or via
  `newrelic-dashboard-builder` when it supports policy creation).
- **Unresolved / other** — `alerts.yml` only, with a note that policies are
  applied manually.

Each alert names a runbook path; a runbook that does not exist becomes an action
item (write none).

## Step 4: Write `monitoring/slo.md`

```markdown
# SLO for {Feature Name}

## SLIs
{table from Step 1}

## Error budget
- Target availability: {99.9 | 99.95 | custom} over {window}
- Error budget: {1 - target} of total minutes in window
- Budget burn policy:
  - 2x burn rate for 1h → page on-call
  - 1x burn rate for 6h → ticket

## Out of scope
{SLIs intentionally excluded and why}
```

## Step 5: Digest and status

Write `monitoring/digest.md` from [docs/templates/phase-digest.md](../docs/templates/phase-digest.md),
then the run summary under the phase key (never a top-level `monitoring:` block):

```yaml
phases:
  monitoring_setup:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "monitoring/digest.md"
    dashboard_path: "monitoring/dashboard.json"
    alerts_path: "monitoring/alerts.yml"
    slo_path: "monitoring/slo.md"
    provider: "{resolved telemetry.dashboards — posthog | sentry | newrelic | none}"
```

`status` here is the standalone value: set it from the gate decision (approve →
`completed`). Under `--from-forge`, write the digest and the data fields, leave
`status` out, and return the outcome to forge.

## Step 6: Present

```
Monitoring Setup: {slug}

  Provider:    {name}
  SLIs:        {N} defined, {N} undefined (see action items)
  Alerts:      {N} generated
  Dashboard:   monitoring/dashboard.json
  SLO doc:     monitoring/slo.md

  Next: apply dashboard.json and alerts.yml to the provider manually.
```

## Step 7: Live dashboard and alerts (after approval)

With the PostHog or Sentry MCP connected, create the Step 2 dashboard and the
Step 3 live alerts through that MCP only after the plan is approved:

- **Standalone** — after an approving gate, offer to create them and do so on a yes.
- **`--from-forge`** — create nothing; return "create live dashboard / alerts" as
  an offer in the gate extras, for forge to act on after its gate.

## Done when

- Every SLI candidate from the three sources is in the table with a target, or
  marked `UNDEFINED` as an action item.
- `dashboard.json`, `alerts.yml` and `slo.md` exist; every alert names a runbook
  (missing runbooks listed as action items).
- Live dashboard / alerts were created only after an approving gate, when the
  PostHog or Sentry MCP was connected (never under `--dry-run`); otherwise the
  stub note for the provider was given.
- Standalone: digest written, gate shown, decision recorded, status set from it.
- `--from-forge`: digest and `monitoring_setup` data fields written; outcome
  (provider, SLIs defined / undefined, alerts, live or stub) and, with a
  connected MCP, the "create live dashboard / alerts" offer returned to forge;
  no gate prompt, no status write, nothing created live.
