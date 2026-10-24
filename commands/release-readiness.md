---
name: speckit.product-forge.release-readiness
description: >
  Checks a verified feature is safe to ship (Phase 9): flags, rollout and rollback,
  docs, monitoring, analytics, deployment and supply chain, consolidating api-docs,
  tracking-plan and security-check status into one gate. Optional for
  internal/backend-only features.
---

# Product Forge — Phase 9: Release Readiness

You are the **Release Readiness Analyst**. You establish that the feature is safe to
ship, observable, rollbackable, documented and measurable — producing the flag
registry, monitoring and supply-chain artifacts rather than only checking for them —
and write `release-readiness.md` with a verdict.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `release_readiness` (Phase 9)
- **Config keys:** `codebase_path`, `telemetry.dashboards`,
  `supply_chain.license_allowlist`, `require_skip_reason`
- **Writes:** `release-readiness.md`, `flags/registry.yml`,
  `monitoring/` (`dashboard.json`, `alerts.yml`, `slo.md`), `supply-chain/`,
  `phases.release_readiness.status`, `release_readiness.supply_chain_paths`,
  `traceability.yml` (`status: verified` on approval)
- **Contract deltas:**
  - `--dry-run` also skips provider-side flag registration.
  - Gate extras: `conditions`, `action_items` (Step 8).
  - A missing tool, skill or provider becomes an action item; it never aborts the gate.

## Step 0: Load context

Require `phases.verify.status: completed`; otherwise stop with
*"Phase 7 (Verification) must pass first."*

Read from `{FEATURE_DIR}`: `spec.md` (requirements, NFRs, success metrics), `plan.md`
(architecture, data model, migrations), `tasks.md`, `verify-report.md`,
`product-spec/product-spec.md`, and when present `code-review.md`,
`pre-impl-review.md`, `test-report.md`, `research/metrics-roi.md`. Scan
`codebase_path` for feature flags, env vars and migrations.

This phase consolidates the status of `api-docs`, `tracking-plan` and
`security-check`: check whether each ran and surface its result; re-run none of them.

## Step 1: Feature flags, rollout and rollback

One scan → build flow. Its only outputs are `flags/registry.yml` and the Rollout /
Rollback sections of `release-readiness.md`.

**1A: Scan for flag candidates.** Search the codebase for:

- SDK imports: `LaunchDarkly`, `Unleash`, `GrowthBook`, `flagsmith`
- predicates: `isFeatureEnabled(...)`, `flags.get(...)`, `useFlag(...)`, `featureFlags.*`
- env vars matching `FEATURE_*`, `ENABLE_*`, `*_ENABLED`
- any reference inside the files in `task_log[].paths`

Record each candidate's key, reference locations, inferred default and the branch
that is the treatment.

**1B: Rollout strategy.** Derive from the `pre-impl-review.md` risk level (if
present), `plan.md` (data migrations, breaking API changes) and `spec.md`
(user-facing surface, success metrics):

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

**1C: Rollback plan.** Derive from the plan, the data migration plan (if Phase 5.5
ran) and the flag strategy:

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

**1D: Flag registry.** Build `{FEATURE_DIR}/flags/registry.yml` from 1A and 1B. When
a `feature-flag-manager` skill is installed, delegate provider-side registration to
it (create-only, never toggling production); otherwise write the registry only and
add a "manual registration" action item.

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
    experiment: false     # true triggers Phase 9B experiment-design
```

The registry lives at the fixed path `flags/registry.yml` (read there by
`experiment-design` and `feature-flag-cleanup`); it is not recorded in the status file.

## Step 2: Documentation

| Area | Check | Status / action |
|------|-------|-----------------|
| User-facing | Feature user-facing? | {Yes/No} |
| | User docs | {✅ Exists / ❌ Missing / N-A} — what to write |
| | In-app help / tooltips | {✅/❌/N-A} — screens needing help text |
| | Changelog entry drafted | {✅/❌} |
| | Migration guide (breaking change for users) | {✅/❌/N-A} |
| Developer | API docs | {✅ api-docs/ exists / ❌ Run /speckit.product-forge.api-docs} |
| | README updated | {✅/❌/N-A} |
| | Architecture decision recorded | {✅/❌} — from plan.md |
| | Environment variables documented | {✅/❌} — new env vars from implementation |
| Operational | Runbook entry | {✅ Exists / ❌ Write / N-A} |
| | On-call context documented | {✅/❌/N-A} |
| | Known limitations documented | {✅/❌} |

## Step 3: Monitoring and observability

**3A: SLI candidates** — deduplicated from `spec.md` NFRs (latency, error rate,
availability), `research/metrics-roi.md` predicted KPIs and
`tracking/tracking-plan.md` events that imply rate / latency SLIs. Each has a name,
target, measurement window and source.

**3B: Alert candidates** from the SLIs:

| Alert | Condition | Severity | Channel |
|-------|-----------|:--------:|---------|
| Error rate spike | `error_rate > 5% for 5m` | P1 | {project default} |
| Latency degradation | `p95_ms > <target> for 10m` | P2 | {project default} |
| {feature-specific} | ... | ... | ... |

**3C: Monitoring artifacts** for the configured backend (`telemetry.dashboards`:
PostHog / Sentry; NewRelic optional):

- `{FEATURE_DIR}/monitoring/dashboard.json` — PostHog insights / Sentry dashboard via
  the connected MCP, or NerdGraph-compatible JSON via `newrelic-dashboard-builder`
  when `telemetry.dashboards: newrelic`.
- `{FEATURE_DIR}/monitoring/alerts.yml` — alert policies from 3B.
- `{FEATURE_DIR}/monitoring/slo.md` — SLI/SLO doc with error budget.

These are files for review: the user applies the dashboard, or runs
`/speckit.product-forge.monitoring-setup` (Phase 9.5) to extend it. When the
provider's MCP / skill is unavailable, write `alerts.yml` and `slo.md` and add the
action item "dashboard.json: provider unavailable". The fixed `monitoring/` paths are
not recorded in the status file. 3A and 3B are inputs; 3C is the only output.

## Step 4: Analytics

| Check | Status | Action needed |
|-------|:------:|---------------|
| Tracking plan exists? | {✅ tracking/ exists / ❌ Run /speckit.product-forge.tracking-plan} | |
| Key events instrumented? | {✅/❌} | {events to add} |
| Funnel defined? | {✅/❌/N-A} | |
| Success metrics measurable? | {✅/❌} | {metrics not yet measurable} |

## Step 5: Deployment dependencies

### 5A: Environment readiness

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

### 5C: Security status

| Check | Status | Details |
|-------|:------:|---------|
| Security check run? | {✅ security-check.md exists / ❌ Run /speckit.product-forge.security-check} | |
| Critical security issues? | {✅ None / ❌ {N} unresolved} | |
| Secrets management OK? | {✅/❌} | |
| Permissions/RBAC configured? | {✅/❌/N-A} | |

### 5C-bis: Supply chain

Run the four carriers against `codebase_path`, write their outputs under
`{FEATURE_DIR}/supply-chain/`, and feed the findings into the Step 6 action items.
The SCA tool is the OSV-Scanner of the [code-review](./code-review.md) Step 1.5
machine gate, here in **PR-diff mode**: only findings *new* in this change gate the
verdict. A missing tool becomes a MUST action item.

**(a) SBOM — Syft (CycloneDX):**

```bash
command -v syft >/dev/null 2>&1 \
  && { mkdir -p "{FEATURE_DIR}/supply-chain"; \
       syft "{codebase_path}" -o cyclonedx-json="{FEATURE_DIR}/supply-chain/sbom.cdx.json"; } \
  || echo "ACTION ITEM (MUST): syft not installed — generate SBOM before ship (https://github.com/anchore/syft)"
```

**(b) SCA — OSV-Scanner, new high/critical only.** Scan the merge base and HEAD; the
new findings are the set difference.

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

In a PR pipeline, the reusable `google/osv-scanner-action` PR workflow reports only
PR-introduced vulnerabilities, so no baseline scan is needed. This phase stays a
human gate at every risk level
([policy.md §9.3](../docs/policy.md#93-risk-routing-a4--auto-recommend-never-auto-approve)).

**(c) License allowlist** — `supply_chain.license_allowlist` from the effective
config (default below). Any package licensed outside the set is a violation.

```bash
ALLOW="${PRODUCT_FORGE_SUPPLY_CHAIN_LICENSE_ALLOWLIST:-MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD,Unlicense}"
command -v osv-scanner >/dev/null 2>&1 \
  && osv-scanner --experimental-licenses="$ALLOW" --format json --recursive . \
       > "{FEATURE_DIR}/supply-chain/osv-licenses.json" \
  || echo "ACTION ITEM (MUST): osv-scanner not installed — run license check before ship"
```

**(d) Build provenance** — produced in CI. Confirm (or propose) a release-workflow
step:

```yaml
# .github/workflows/release.yml (job needs: id-token: write, attestations: write, contents: read)
- name: Attest build provenance
  uses: actions/attest-build-provenance@v2
  with:
    subject-path: "dist/**"   # the shipped build artifact(s)
```

Without it, add the SHOULD action item "add attest-build-provenance to the release
workflow".

**Wire into the verdict:**

| Carrier finding | Action item | Verdict effect |
|-----------------|:-----------:|----------------|
| NEW critical CVE (`osv-new-ids.txt`) | MUST | NOT READY until resolved or accepted as a documented condition |
| NEW high CVE | MUST | CONDITIONALLY READY (accepted risk) or fix |
| Disallowed license | MUST | NOT READY / documented exception |
| Missing SBOM / SCA tool | MUST | action item only; the gate is not blocked |
| Missing provenance step | SHOULD | recorded, non-blocking |

## Step 6: Write `release-readiness.md`

Write `{FEATURE_DIR}/release-readiness.md` from
[docs/templates/release-readiness-report.md](../docs/templates/release-readiness-report.md).
Every "ready" claim names its evidence (alert exists, flag configured, docs written);
known limitations are documented rather than blocking; the checklist depth matches
the risk (a config change needs less than a new payment flow), and the release
coordination items (team notified, release notes) are listed.

## Step 7: Present and gate

Show the six category statuses, the action-item counts (MUST / SHOULD /
NICE-TO-HAVE) and the verdict. Standalone, show the gate:

```
[Gate] Release Readiness complete — verdict: {READY TO SHIP / CONDITIONALLY READY / NOT READY}. How do you want to proceed?

  1. Approve (recommended) — ship it: all MUST items done, proceed (or ship with documented known issues — accepted risks recorded as conditions)
  2. Revise — fix and re-check: address action items, then re-run the readiness check
  3. Skip Monitoring Setup — accept this phase and skip Phase 9.5 (a reason may be required)
  4. Rollback — return to an earlier, completed phase by name (e.g. implement, verify)
  5. Abort — hold: not ready, stop the lifecycle for this feature here
  (or type your own answer)
```

- The verdict picks the recommended option: READY TO SHIP / CONDITIONALLY READY →
  **Approve**; NOT READY → **Revise** or **Abort**.
- Option 3 follows the computed Skip rule
  ([runtime.md §6.3](../docs/runtime.md#63-gate-prompt)): it names the next phase,
  9.5 Monitoring Setup (`opt`). Release readiness itself is skipped only at the
  test-run gate.

## Step 8: Status and gate entry

| Step 7 choice | Verdict that recommends it | `decision` | Status |
|---------------|----------------------------|------------|--------|
| Approve (ship it) | READY TO SHIP | `approved` | `phases.release_readiness.status: completed` |
| Approve (ship with known issues) | CONDITIONALLY READY | `approved_with_conditions` — populate `conditions[]` | `phases.release_readiness.status: completed` |
| Skip Monitoring Setup | READY / CONDITIONALLY READY | `skipped` + `skip_reason` (ask when `require_skip_reason: true`) | `phases.release_readiness.status: completed`; `phases.monitoring_setup.status: skipped` + `skip_reason` |
| Revise (fix and re-check) | NOT READY | `revised` | `phases.release_readiness.status: in_progress` |
| Rollback | any | `rolled_back` + `rolled_back_to: "<phase>"` | that phase and every later one → `pending`; rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management) |
| Abort (hold) | NOT READY | `aborted` | unchanged |

Write on every run (standalone sets `status`; `--from-forge` leaves it to forge):

```yaml
phases:
  release_readiness:
    status: completed      # per the table above
release_readiness:         # top-level block declared in the canonical schema
  supply_chain_paths:
    sbom: "supply-chain/sbom.cdx.json"
    sca: "supply-chain/osv-head.json"
    licenses: "supply-chain/osv-licenses.json"
```

Standalone, append:

```yaml
gates:
  - phase: release_readiness
    decision: "approved"  # one of: approved | approved_with_conditions | revised | skipped | rolled_back | aborted
    timestamp: "{ISO timestamp}"
    notes: "{verdict summary}"
    conditions:           # required when decision == approved_with_conditions; the accepted risks
      - "{accepted risk / known issue documented at ship time}"
    rolled_back_to: "{phase}"  # required when decision == rolled_back; omit otherwise
    skip_reason: "{reason}"    # required when decision == skipped; omit otherwise
    action_items:              # must/should/nice tally
      must: {N}
      must_completed: {N}
      should: {N}
      nice_to_have: {N}
```

With `--from-forge`, return the findings summary, `conditions` and `action_items` to
forge.

On **Approve** / **Approve with conditions**, release-readiness may promote
`traceability.yml` rows whose acceptance is confirmed to `status: verified` (the
canonical producers of `verified` are release-readiness and spec-merge).

Hand-off on Approve — the post-ship phases follow
[phase-map](../docs/schema/phase-map.yml) order, each optional and offered in turn:

1. **9.5 Monitoring Setup** — `/speckit.product-forge.monitoring-setup` (extends `monitoring/`)
2. **9B Experiment Design** — `/speckit.product-forge.experiment-design` (offered when
   `flags/registry.yml` has a flag with `experiment: true`)
3. **10 Spec Merge** — `/speckit.product-forge.spec-merge` (folds the shipped delta
   back into canonical `specs/`)

## Done when

- `flags/registry.yml` lists every flag candidate from the scan with its rollout
  plan; provider registration was delegated or a "manual registration" action item
  exists.
- `monitoring/alerts.yml` and `monitoring/slo.md` exist, plus `dashboard.json` or the
  "provider unavailable" action item.
- Every supply-chain carrier produced its file under `supply-chain/`, or a missing
  tool produced its MUST (provenance: SHOULD) action item; NEW critical / high CVEs
  and disallowed licenses are reflected in the verdict.
- `release-readiness.md` is written from the template with all six categories, the
  prior-gate statuses (api-docs, tracking-plan and security-check surfaced), rollout
  and rollback plans, every action item, and a verdict.
- `release_readiness.supply_chain_paths` is recorded.
- Standalone: the gate was shown with the verdict-driven recommendation, its decision
  appended to `gates[]` with `action_items` (and `conditions` / `skip_reason` /
  `rolled_back_to` as required), and the statuses set per the Step 8 table.
- `--from-forge`: the findings summary, `conditions` and `action_items` were returned
  to forge with no gate prompt and no `phases.release_readiness.status` or `gates[]`
  write.
- On Approve, the next step offered is 9.5 → 9B → 10, in that order.
