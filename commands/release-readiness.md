---
name: speckit.product-forge.release-readiness
description: >
  Phase 9: Pre-ship readiness checklist. Covers feature flags, rollout strategy,
  rollback plan, documentation, monitoring, analytics, and deployment dependencies.
  Consolidates api-docs, tracking-plan, and security-check status into one gate.
  Optional for internal/backend-only features.
  Use: "release readiness", "ready to ship?", "/speckit.product-forge.release-readiness"
---

# Product Forge — Release Readiness (Phase 9)

You are the **Release Readiness Analyst** for Product Forge.
Your goal: ensure the feature is truly ready for production — not just "code works" but
"safe to ship, observable, rollbackable, documented, and measurable."

## User Input

```text
$ARGUMENTS
```

---

## Step 0: Load Context

1. Read `.product-forge/config.yml` for project settings
2. Read `{FEATURE_DIR}/.forge-status.yml` — verify Phase 7 (verify) completed
3. If verify is not completed: **STOP** — "Phase 7 (Verification) must pass first."

Load artifacts:
- `{FEATURE_DIR}/spec.md` — requirements, NFRs, success metrics
- `{FEATURE_DIR}/plan.md` — architecture, data model, migrations
- `{FEATURE_DIR}/tasks.md` — implementation scope
- `{FEATURE_DIR}/verify-report.md` — verification status
- `{FEATURE_DIR}/code-review.md` — code review status (if exists)
- `{FEATURE_DIR}/pre-impl-review.md` — risk assessment (if exists)
- `{FEATURE_DIR}/test-report.md` — test results (if exists)
- `{FEATURE_DIR}/research/metrics-roi.md` — predicted KPIs (if exists)
- `{FEATURE_DIR}/product-spec/product-spec.md` — user stories
- `codebase_path` — scan for feature flags, env vars, migrations

---

## Step 1: Feature Flags, Rollout, and Rollback

This step consolidates scanning, strategy, and artifact production into
one pipeline. It replaces the previous scan-then-report-then-create
structure with a single scan → build → verify flow.

### 1A: Scan for flag candidates (input)

Search the codebase for feature-flag patterns. The results feed Step 1D.
No standalone report is produced — this is the input to the registry
builder.

Patterns searched:
- Framework SDK imports: `LaunchDarkly`, `Unleash`, `GrowthBook`, `flagsmith`.
- Custom predicates: `isFeatureEnabled(...)`, `flags.get(...)`,
  `useFlag(...)`, `featureFlags.*`.
- Environment variables matching `FEATURE_*`, `ENABLE_*`, `*_ENABLED`.
- Any reference inside files listed in `task_log[].paths`.

Record every candidate with: key, reference locations, inferred default,
branch that represents the treatment.

### 1B: Build rollout strategy (input)

Derive from:
- `pre-impl-review.md` risk level (if present).
- `plan.md` — data migrations, breaking API changes.
- `spec.md` — user-facing surface area, success metrics.

Produce a rollout plan object (feeds into Step 1D and into
`release-readiness.md` §Rollout Plan):

```yaml
strategy: "{canary | percentage | internal-first | big-bang}"
stages:
  - { name: "internal", duration: "1d" }
  - { name: "canary-5",  duration: "3d" }
  - { name: "25%",       duration: "3d" }
  - { name: "100% GA",   duration: "—" }
rollback_triggers:
  - "error_rate > 5% for 5m"
  - "p95_ms > <NFR target> for 10m"
  - "<custom metric from spec>"
```

### 1C: Build rollback plan (input)

Derive from plan, data migration plan (if Phase 5.5 ran), and flag
strategy. Produce:

```yaml
reversible: true | conditional | false
mechanism: "feature_flag" | "revert_deploy" | "migration_rollback"
data_concerns:
  - "reversible DB migration — see migrations/rollback.sql"
  - "cache keys change — plan cache flush"
steps:
  - "Flip flag to OFF"
  - "Announce in #releases"
  - "Monitor error rate for 10m"
```

### 1D: Produce flag registry (active)

Actively build `{FEATURE_DIR}/flags/registry.yml` from the scan in Step 1A
and the strategy in Step 1B. If a `feature-flag-manager` skill is
installed, delegate the provider-side registration (create-only, no
production toggling). If not, write the registry file only and mark
"manual registration" as an action item.

Registry shape:

```yaml
# {FEATURE_DIR}/flags/registry.yml
flags:
  - key: "{flag-key}"
    feature: "{feature-slug}"
    default: false
    owner: "{team-or-user}"
    rollout_plan: "{strategy from Step 1B}"
    cleanup_after: "{ISO date — when the flag becomes dead code}"
    kill_switch: true
    experiment: false     # set to true to trigger Phase 9B experiment-design
```

Record file path on `.forge-status.yml` under
`release_readiness.flag_registry_path`.

No standalone "Feature Flag Detection" or "Rollback Plan" report tables.
The artifacts produced in 1D and the sections later compiled into
`release-readiness.md` are the only outputs of Step 1.

---

## Step 2: Documentation

### 2A: User-Facing Documentation

Analyze spec.md user stories — does this feature need user docs?

| Check | Status | Action Needed |
|-------|:------:|--------------|
| User-facing feature? | {Yes/No} | |
| User docs needed? | {✅ Exists / ❌ Missing / N-A} | {what to write} |
| In-app help/tooltips needed? | {✅/❌/N-A} | {screens needing help text} |
| Changelog entry drafted? | {✅/❌} | |
| Migration guide needed? | {✅/❌/N-A} | {if breaking change for users} |

### 2B: Developer Documentation

| Check | Status | Action Needed |
|-------|:------:|--------------|
| API docs generated? | {✅ api-docs/ exists / ❌ Run /speckit.product-forge.api-docs} | |
| README updated? | {✅/❌/N-A} | |
| Architecture decision recorded? | {✅/❌} | {from plan.md} |
| Environment variables documented? | {✅/❌} | {new env vars from implementation} |

### 2C: Operational Documentation

| Check | Status | Action Needed |
|-------|:------:|--------------|
| Runbook entry needed? | {✅ Exists / ❌ Write / N-A} | |
| On-call context documented? | {✅/❌/N-A} | |
| Known limitations documented? | {✅/❌} | |

---

## Step 3: Monitoring & Observability (scan + build in one pass)

### 3A: Derive SLI candidates (input)

Extract SLI candidates from three sources, deduplicated:
- `spec.md` NFRs (latency targets, error-rate bounds, availability).
- `research/metrics-roi.md` predicted KPIs.
- `tracking/tracking-plan.md` events that imply rate/latency SLIs.

Each SLI candidate has: name, target, measurement window, source.

### 3B: Derive alert candidates (input)

From the SLI list above, propose alert rules:

| Alert | Condition | Severity | Channel |
|-------|-----------|:--------:|---------|
| Error rate spike | `error_rate > 5% for 5m` | P1 | {project default} |
| Latency degradation | `p95_ms > <target> for 10m` | P2 | {project default} |
| {feature-specific} | ... | ... | ... |

### 3C: Build monitoring artifacts (active)

Actively produce:

- `{FEATURE_DIR}/monitoring/dashboard.json` — NerdGraph-compatible dashboard,
  generated via the installed `newrelic-dashboard-builder` skill when
  available.
- `{FEATURE_DIR}/monitoring/alerts.yml` — alert policies from Step 3B.
- `{FEATURE_DIR}/monitoring/slo.md` — SLI/SLO doc with error budget.

Read-only output — do not call the NewRelic API directly to push the
dashboard. The user applies the JSON manually after review, or invokes
`/speckit.product-forge.monitoring-setup` (Phase 9.5) to extend it.

If no provider skill is installed, write `alerts.yml` and `slo.md` and
mark "dashboard.json: provider skill missing" as an action item.

Record paths on `.forge-status.yml` under
`release_readiness.monitoring_paths`.

No standalone scan-and-report tables. Steps 3A and 3B are inputs; Step 3C
is the only output.

---

## Step 4: Analytics

### 4A: Tracking Plan Status

| Check | Status | Action Needed |
|-------|:------:|--------------|
| Tracking plan exists? | {✅ tracking/ exists / ❌ Run /speckit.product-forge.tracking-plan} | |
| Key events instrumented? | {✅/❌} | {events to add} |
| Funnel defined? | {✅/❌/N-A} | |
| Success metrics measurable? | {✅/❌} | {which metrics can't be measured yet} |

---

## Step 5: Deployment Dependencies

### 5A: Environment Readiness

| Environment | Ready? | Blockers |
|-------------|:------:|---------|
| Development | {✅/❌} | |
| Staging | {✅/❌} | {missing env vars, configs, etc.} |
| Production | {✅/❌} | {missing env vars, configs, etc.} |

### 5B: Infrastructure

| Check | Status | Details |
|-------|:------:|---------|
| New env vars set in all envs? | {✅/❌} | {list of new vars} |
| Database migrations queued? | {✅/❌/N-A} | {migration status} |
| External service access confirmed? | {✅/❌/N-A} | {APIs, webhooks, etc.} |
| CI/CD pipeline updated? | {✅/❌/N-A} | {new build steps, test stages} |
| Resource scaling needed? | {✅/❌/N-A} | {memory, CPU, storage} |

### 5C: Security Status

| Check | Status | Details |
|-------|:------:|---------|
| Security check run? | {✅ security-check.md exists / ❌ Run /speckit.product-forge.security-check} | |
| Critical security issues? | {✅ None / ❌ {N} unresolved} | |
| Secrets management OK? | {✅/❌} | |
| Permissions/RBAC configured? | {✅/❌/N-A} | |

---

## Step 6: Generate release-readiness.md

Write `{FEATURE_DIR}/release-readiness.md`:

```markdown
# Release Readiness: {Feature Name}

> Feature: {slug} | Date: {today}
> Verdict: {READY TO SHIP / CONDITIONALLY READY / NOT READY}

## Summary

| Category | Status | Action Items |
|----------|:------:|:------------:|
| Feature Flags & Rollout | {✅/⚠️/❌} | {N} |
| Documentation | {✅/⚠️/❌} | {N} |
| Monitoring & Observability | {✅/⚠️/❌} | {N} |
| Analytics | {✅/⚠️/❌} | {N} |
| Deployment Dependencies | {✅/⚠️/❌} | {N} |
| Security | {✅/⚠️/❌} | {N} |

## Prior Quality Gates

| Gate | Status | Date |
|------|:------:|------|
| Pre-Impl Review | {result from pre-impl-review.md or "Skipped"} | {date} |
| Code Review | {result from code-review.md or "Skipped"} | {date} |
| Verification | {result from verify-report.md} | {date} |
| Test Run | {result from test-report.md or "Skipped"} | {date} |

## Rollout Plan

{Rollout strategy from Step 1B}

## Rollback Plan

{Rollback plan from Step 1C}

## Action Items Before Ship

| # | Category | Action | Priority | Status |
|---|----------|--------|:--------:|:------:|
| 1 | {cat} | {action} | {MUST/SHOULD/NICE-TO-HAVE} | {TODO/DONE} |

## Ship Checklist

- [ ] All MUST-priority action items completed
- [ ] Feature flag configured and defaulting to OFF
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested or documented
- [ ] Team notified of upcoming release
- [ ] Release notes drafted

## Verdict

**{READY TO SHIP / CONDITIONALLY READY / NOT READY}**

{If CONDITIONALLY READY: list the conditions}
{If NOT READY: list the blockers}
```

---

## Step 7: Present to User

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Release Readiness: {Feature Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature Flags:  {✅/⚠️/❌}
  Documentation:  {✅/⚠️/❌}
  Monitoring:     {✅/⚠️/❌}
  Analytics:      {✅/⚠️/❌}
  Dependencies:   {✅/⚠️/❌}
  Security:       {✅/⚠️/❌}

  Action items: {N} MUST, {N} SHOULD, {N} NICE-TO-HAVE

  Verdict: {READY TO SHIP / CONDITIONALLY READY / NOT READY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Gate options:
- **Ship it** — all MUST items done, proceed
- **Fix and re-check** — address action items, re-run readiness check
- **Ship with known issues** — document accepted risks and proceed
- **Hold** — not ready, stop here

---

## Step 8: Update Status

Update `.forge-status.yml`:

```yaml
phases:
  release_readiness: completed  # or "skipped"
```

Record gate decision:

```yaml
gates:
  - phase: release_readiness
    decision: "{ready / conditionally_ready / not_ready / skipped}"
    timestamp: "{ISO timestamp}"
    notes: "{verdict and conditions}"
    action_items:
      must: {N}
      must_completed: {N}
      should: {N}
      nice_to_have: {N}
```

---

## Operating Principles

1. **Consolidator.** This phase ties together api-docs, security-check, tracking-plan status. Don't duplicate their work — check if they've been run and surface their results.
2. **Artifact producer, not just checker.** Steps 1D and 3D produce real
   flag-registry and monitoring artifacts. Don't fall back to "confirm a
   dashboard exists somewhere" — either produce the artifact or log an
   action item.
3. **Practical.** Don't require perfection. Some features ship with known limitations — document them.
4. **Risk-proportional.** A small config change needs a lighter checklist than a new payment flow.
5. **Team-aware.** Consider that shipping involves coordination — other people need to know.
6. **Measurable.** Every "ready" claim should be verifiable: alert exists, flag configured, docs written.
7. **Graceful degradation.** If a required provider skill
   (feature-flag-manager, newrelic-dashboard-builder) is missing, the step
   is skipped with an action item rather than aborting the gate.
