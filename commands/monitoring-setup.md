---
name: speckit.product-forge.monitoring-setup
description: >
  Phase 9.5 (optional): produce real monitoring artifacts for a feature — a
  NewRelic-compatible dashboard JSON, alert rules, and SLI/SLO definitions
  derived from plan NFRs and tracking-plan events. Wraps the installed
  `newrelic-dashboard-builder` skill (or equivalent). Runs after
  release-readiness, before deploy.
  Use: "monitoring setup", "build dashboard", "/speckit.product-forge.monitoring-setup"
---

# Product Forge — Monitoring Setup (Phase 9.5)

You are the **Observability Architect** for Product Forge.
Your job: turn the NFRs in `plan.md`, the success metrics in `spec.md`, and
the events in `tracking/tracking-plan.md` into concrete monitoring artifacts
that can be applied to the project's monitoring system.

This phase is **opt-in**. It produces artifacts; it does not push them to
the provider. Pushing is a manual step the user performs with the
generated JSON in hand.

## User Input

```text
$ARGUMENTS
```

Parse for:
- Feature slug (required) — which `{features_dir}/<slug>` to operate on.
- `--provider=<name>` — `newrelic` (default), `grafana`, `datadog`. Only
  `newrelic` is wired to an installed skill in this extension; others
  produce a templated stub with TODOs.

---

## Step 0: Prerequisites

1. `.forge-status.yml` exists and `phases.release_readiness.status` is
   `completed` or `skipped` (the user has at least decided on Phase 9).
2. `plan.md` exists.
3. `spec.md` exists (for NFRs and success metrics).
4. `tracking/tracking-plan.md` may or may not exist — if missing, work
   with plan NFRs only and note the gap.

If any required artifact is missing, abort with a clear error rather
than inventing metrics.

---

## Step 1: Extract SLI Candidates

Build the SLI list from three sources, in priority order:

1. **NFRs in plan.md** — explicit latency/error-rate/availability targets.
2. **Success metrics in spec.md** — user-facing metrics that imply technical SLIs.
3. **Events in tracking-plan.md** — business metrics that can be turned
   into rate/latency SLIs.

Produce a table:

| SLI | Source | Target (SLO) | Measurement window |
|-----|--------|--------------|--------------------|
| p95 API latency | plan.md NFR | ≤ 300 ms | 5-minute rolling |
| error rate | plan.md NFR | ≤ 0.5 % | 5-minute rolling |
| session start → first event | tracking-plan | ≤ 2 s | 1-hour rolling |

If a candidate lacks a numeric target, mark it `UNDEFINED` and include
it as an action item instead of inventing a number.

---

## Step 2: Build Dashboard

Delegate to `newrelic-dashboard-builder` (if provider is `newrelic` and the
skill is installed). Pass:

- The SLI table from Step 1.
- Panels proposed in `release-readiness.md` Step 3C.
- Project-specific context (NewRelic app ID, account ID from project
  config if available).

Produce `{FEATURE_DIR}/monitoring/dashboard.json` — NerdGraph-compatible.

If the provider skill is not installed, fall back to a templated JSON
with TODOs and note: *"Provider skill missing — dashboard is a stub."*

---

## Step 3: Build Alerts

Generate `{FEATURE_DIR}/monitoring/alerts.yml`:

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

Each alert references a runbook path; if the runbook does not exist,
flag it as an action item (do not invent a runbook).

---

## Step 4: Build SLI/SLO Doc

Write `{FEATURE_DIR}/monitoring/slo.md`:

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

---

## Step 5: Update Status

Update `.forge-status.yml`:

```yaml
phases:
  monitoring_setup:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "monitoring/digest.md"
monitoring:
  dashboard_path: "monitoring/dashboard.json"
  alerts_path: "monitoring/alerts.yml"
  slo_path: "monitoring/slo.md"
  provider: "{newrelic | ...}"
```

Also produce a short `monitoring/digest.md` following the phase-digest
template to remain consistent with the digest rule in
[`docs/runtime.md §8`](../docs/runtime.md#8-phase-digest-requirement-a4).

---

## Step 6: Present to User

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈 Monitoring Setup: {slug}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Provider:    {name}
  SLIs:        {N} defined, {N} undefined (see action items)
  Alerts:      {N} generated
  Dashboard:   monitoring/dashboard.json
  SLO doc:     monitoring/slo.md

  Next: apply dashboard.json and alerts.yml to the provider manually.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Operating Principles

1. **Artifact producer, not applier.** This command writes files; humans
   apply them. Applying monitoring from an automated flow is a
   separate capability outside Product Forge's scope.
2. **No invented numbers.** SLIs without explicit targets are flagged
   rather than filled with defaults.
3. **Skill delegation, graceful fallback.** If `newrelic-dashboard-builder`
   is not installed, produce stubs and note the gap; do not abort.
4. **Idempotent.** Re-running overwrites only `monitoring/*` files; never
   touches tracking-plan, spec, or plan.
