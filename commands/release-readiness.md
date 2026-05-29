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

> **Interaction (normative):** the readiness gate in this phase uses the structured
> convention in [docs/interaction.md](../docs/interaction.md) (ready snippets in
> [docs/templates/interaction-prompts.md](../docs/templates/interaction-prompts.md)).
> Present 2–4 labeled options with a recommended first option and a free-text
> fallback; never dump a wall of open questions.

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

Actively produce, targeting the **configured backend** (`telemetry.dashboards`:
PostHog / Sentry; NewRelic optional):

- `{FEATURE_DIR}/monitoring/dashboard.json` — dashboard for the configured
  provider (PostHog insights / Sentry dashboard via the connected MCP, or a
  NerdGraph-compatible JSON via `newrelic-dashboard-builder` when
  `telemetry.dashboards: newrelic`).
- `{FEATURE_DIR}/monitoring/alerts.yml` — alert policies from Step 3B.
- `{FEATURE_DIR}/monitoring/slo.md` — SLI/SLO doc with error budget.

Read-only output — do not push the dashboard to the provider automatically. The
user applies it after review, or invokes
`/speckit.product-forge.monitoring-setup` (Phase 9.5) to extend it.

If the configured provider's MCP/skill is unavailable, write `alerts.yml` and
`slo.md` and mark "dashboard.json: provider unavailable" as an action item.

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

### 5C-bis: Supply chain (active) (v1.6, W5-B3)

Supply-chain readiness is **artifact-producing**, not a checkbox. Run the four
carriers below against `codebase_path`, write the outputs under
`{FEATURE_DIR}/supply-chain/`, and feed findings into the Step 6 Action Items
table. This is the same SCA tool named in [code-review.md](./code-review.md)'s
Step 1.5 machine-gate row (OSV-Scanner) — release-readiness runs it in
**PR-diff mode** so the gate blocks only on *newly introduced* high/critical
findings (delta philosophy: a feature isn't penalised for pre-existing debt).

Each carrier follows the **graceful-degradation** guard of Operating Principle
7 — a missing tool becomes a MUST action item, never an aborted gate:

**(a) SBOM — Syft (CycloneDX):**

```bash
command -v syft >/dev/null 2>&1 \
  && { mkdir -p "{FEATURE_DIR}/supply-chain"; \
       syft "{codebase_path}" -o cyclonedx-json="{FEATURE_DIR}/supply-chain/sbom.cdx.json"; } \
  || echo "ACTION ITEM (MUST): syft not installed — generate SBOM before ship (https://github.com/anchore/syft)"
```

Record the SBOM path on `.forge-status.yml` under
`release_readiness.sbom_path`.

**(b) SCA — OSV-Scanner in PR-diff mode (block only on NEW high/critical):**

Scan the merge base and HEAD, then take the *new* findings as the set
difference. Only NEW high/critical findings gate the verdict.

```bash
if command -v osv-scanner >/dev/null 2>&1; then
  BASE_REF="$(git merge-base origin/main HEAD 2>/dev/null || git rev-parse HEAD~1)"
  mkdir -p "{FEATURE_DIR}/supply-chain"
  # Baseline scan at the merge base, then HEAD scan.
  git stash -q 2>/dev/null; git checkout -q "$BASE_REF" 2>/dev/null
  osv-scanner scan --format json --recursive . > "{FEATURE_DIR}/supply-chain/osv-base.json" 2>/dev/null || true
  git checkout -q - 2>/dev/null; git stash pop -q 2>/dev/null || true
  osv-scanner scan --format json --recursive . > "{FEATURE_DIR}/supply-chain/osv-head.json"
  # NEW findings = vuln IDs in HEAD not present in base. Gate on severity HIGH|CRITICAL.
  comm -13 \
    <(jq -r '.results[].packages[].vulnerabilities[].id' "{FEATURE_DIR}/supply-chain/osv-base.json" 2>/dev/null | sort -u) \
    <(jq -r '.results[].packages[].vulnerabilities[].id' "{FEATURE_DIR}/supply-chain/osv-head.json" 2>/dev/null | sort -u) \
    > "{FEATURE_DIR}/supply-chain/osv-new-ids.txt"
else
  echo "ACTION ITEM (MUST): osv-scanner not installed — run SCA before ship (https://github.com/google/osv-scanner)"
fi
```

CI variant: where this runs in a PR pipeline, use the reusable
`google/osv-scanner-action` PR workflow, which natively reports only
PR-introduced vulnerabilities — no baseline scan needed. (`--ci` routing of
this gate is W5-B1's bundle; this phase stays a human gate at every risk per
[policy §9.3](../docs/policy.md).)

**(c) License allowlist — OSV-Scanner against an SPDX allowlist:**

Read the allowlist from `.product-forge/config.yml` key
`supply_chain.license_allowlist` (literal default below if unset). Any package
with a license outside the set is a violation.

```bash
ALLOW="${PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST:-MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD,Unlicense}"
command -v osv-scanner >/dev/null 2>&1 \
  && osv-scanner --experimental-licenses="$ALLOW" --format json --recursive . \
       > "{FEATURE_DIR}/supply-chain/osv-licenses.json" \
  || echo "ACTION ITEM (MUST): osv-scanner not installed — run license check before ship"
```

**(d) Build provenance — GitHub `actions/attest-build-provenance`:**

Provenance is produced by a CI workflow, not a local CLI. Confirm (or add) a
job step that attests the built artifact:

```yaml
# .github/workflows/release.yml (job needs: id-token: write, attestations: write, contents: read)
- name: Attest build provenance
  uses: actions/attest-build-provenance@v2
  with:
    subject-path: "dist/**"   # the shipped build artifact(s)
```

If no attestation step exists, log a SHOULD action item ("add
attest-build-provenance to the release workflow").

**Wire into the gate.** Translate the carriers into Step 6 Action Items and the
Security category verdict:

| Carrier finding | Action item priority | Verdict effect |
|-----------------|:--------------------:|----------------|
| NEW critical CVE (from `osv-new-ids.txt`) | MUST | NOT READY until resolved or accepted as a documented condition |
| NEW high CVE | MUST | CONDITIONALLY READY (record as accepted risk) or fix |
| Disallowed license | MUST | NOT READY / documented exception |
| Missing SBOM / SCA tool | MUST | action item; do not block the gate on tool absence |
| Missing provenance step | SHOULD | recorded, non-blocking |

Record paths on `.forge-status.yml` under
`release_readiness.supply_chain_paths` (sbom / sca / licenses).

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

Gate (structured — see [docs/templates/interaction-prompts.md](../docs/templates/interaction-prompts.md), recommended option first, free-text fallback):

```
[Gate] Release Readiness complete — verdict: {READY TO SHIP / CONDITIONALLY READY / NOT READY}. How do you want to proceed?

  1. Approve (recommended) — ship it: all MUST items done, proceed (or ship with documented known issues — accepted risks recorded as conditions)
  2. Revise — fix and re-check: address action items, then re-run the readiness check
  3. Skip — mark this phase skipped and move on (a reason may be required)
  4. Rollback — return to an earlier phase by name (e.g. implement, verify)
  5. Abort — hold: not ready, stop the lifecycle for this feature here
  (or type your own answer)
```

Maps to `gates[].decision` (Step 8). The readiness verdict drives the recommended
option: READY TO SHIP / CONDITIONALLY READY recommend **Approve**; NOT READY
recommends **Revise** or **Abort**.

**Next step:** on Approve, run `/speckit.product-forge.spec-merge` (Phase 10) to
fold the shipped delta back into the canonical spec.

---

## Step 8: Update Status

Update `.forge-status.yml`:

```yaml
phases:
  release_readiness: completed  # or "skipped"
```

Record the gate decision using the canonical enum
(`approved | approved_with_conditions | revised | skipped | rolled_back | aborted`).
Map the Step 7 choice onto exactly one literal:

| Step 7 choice | Verdict that recommends it | `decision` literal |
|---------------|----------------------------|--------------------|
| Approve (ship it) | READY TO SHIP | `approved` |
| Approve (ship with known issues) | CONDITIONALLY READY | `approved_with_conditions` — populate `conditions[]` |
| Revise (fix and re-check) | NOT READY | `revised` |
| Abort (hold) | NOT READY | `aborted` |
| Rollback | any | `rolled_back` — set `rolled_back_to: "<phase>"` |
| Skip (phase skipped) | n/a | `skipped` |

```yaml
gates:
  - phase: release_readiness
    decision: "approved"  # one of: approved | approved_with_conditions | revised | skipped | rolled_back | aborted
    timestamp: "{ISO timestamp}"
    notes: "{verdict summary}"
    conditions:           # required when decision == approved_with_conditions; the accepted risks
      - "{accepted risk / known issue documented at ship time}"
    rolled_back_to: "{phase}"  # required when decision == rolled_back; omit otherwise
    action_items:
      must: {N}
      must_completed: {N}
      should: {N}
      nice_to_have: {N}
```

On **Approve** / **Approve with conditions**, release-readiness MAY promote
traceability rows whose acceptance is confirmed to `status: verified` (the
canonical producers of `verified` are release-readiness and spec-merge).

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
