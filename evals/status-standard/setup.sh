#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$(dirname ".product-forge/config.yml")"
cat > ".product-forge/config.yml" <<'PF_EOF'
project_name: "eval-app"
project_tech_stack: "TypeScript, React, Node"
project_domain: "productivity"
codebase_path: "src"
features_dir: "features"
PF_EOF
mkdir -p "$(dirname "features/demo-save-preferences/.forge-status.yml")"
cat > "features/demo-save-preferences/.forge-status.yml" <<'PF_EOF'
# Fixture: a complete, consistent Product Forge feature state.
#
# Purpose: a known-good `.forge-status.yml` that the helper scripts run against
# in CI (scripts/doctor.js, validate-traceability.js, gate-risk.js) and that the
# QA plan's quick-smoke references (fixtures/features/demo). It is NOT a shipped
# plugin artifact — it lives under fixtures/ purely as test input.
#
# Shape conforms to docs/schema/forge-status-v3.schema.yml. Kept small but valid:
# a standard-mode feature that has completed implement + test_run cleanly, so the
# traceability validator's phase-aware checks (code present, tests present) all
# pass and gate-risk classifies it deterministically.
schema_version: 3
feature: "demo-save-preferences"
created_at: "2026-06-01"
v2_native: true
feature_mode: "standard"
flow_mode: "gated"
speckit_mode: "classic"

phases:
  problem_discovery:
    status: "completed"
  research:
    status: "completed"
    tokens_in: 14000
    tokens_out: 4200
    tool_calls: 18
  product_spec:
    status: "completed"
  design_system_harvest:
    status: "not_applicable"
  revalidation:
    status: "approved"
  bridge:
    status: "completed"
  plan:
    status: "completed"
  tasks:
    status: "completed"
  pre_impl_review:
    status: "skipped"
    skipped: true
    skip_reason: "trivial surface; risk register empty"
  implement:
    status: "completed"
    tokens_in: 32000
    tokens_out: 11000
    tool_calls: 47
    red_gate:
      status: "confirmed_failing"
      tests: ["TC-UNIT-021"]
      skip_reason: null
  code_review:
    status: "completed"
  verify:
    status: "completed"
  test_plan:
    status: "completed"
  test_run:
    status: "completed"
  release_readiness:
    status: "skipped"
    skipped: true
    skip_reason: "internal tool; no staged rollout needed"
  spec_merge:
    status: "not_applicable"
  retrospective:
    status: "pending"

testing:
  final_pass_rate: "100%"
  bugs_found: 1
  bugs_fixed: 1
  bugs_deferred: 0
  test_runs_total: 2

task_log:
  - id: "T001"
    size: "S"
    status: "completed"
    paths: ["src/prefs/handler.ts"]
    commit_sha: "abc1234"
  - id: "T002"
    size: "M"
    status: "completed"
    paths: ["src/prefs/PrefsModal.tsx"]
    commit_sha: "def5678"

gates:
  - phase: "research"
    decision: "approved"
    timestamp: "2026-06-01T10:00:00Z"
    notes: ""
    sync_result: "clean"
    reviewed_sha: "0000001"
    risk: "low"
  - phase: "verify"
    decision: "approved"
    timestamp: "2026-06-02T14:00:00Z"
    notes: ""
    sync_result: "clean"
    reviewed_sha: "def5678"
    risk: "low"

sync_runs:
  last_run: "2026-06-02T14:05:00Z"
  total_runs: 6
  last_drift_count: 0
  last_critical_count: 0
  last_verdict: "CONSISTENT"

change_requests: []
last_updated: "2026-06-02T14:05:00Z"
PF_EOF
mkdir -p "$(dirname "features/demo-save-preferences/traceability.yml")"
cat > "features/demo-save-preferences/traceability.yml" <<'PF_EOF'
# Fixture traceability matrix — consistent with .forge-status.yml (implement +
# test_run completed). Designed to pass `validate-traceability.js --strict`:
# every must_have row reaches a task + code + test, every journey + P0/P1 edge
# has a test, and there are no orphan tasks (T001/T002 both referenced).
schema_version: 1
feature: "demo-save-preferences"
last_updated: "2026-06-02T14:05:00Z"

rows:
  - req: "REQ-001"
    story: "US-001"
    journeys: ["JRN-001"]
    frs: ["FR-001"]
    must_have: true
    components: []
    contracts: ["API-savePrefs"]
    tasks: ["T001", "T002"]
    code:
      - "src/prefs/handler.ts"
      - "src/prefs/PrefsModal.tsx"
    tests: ["TC-E2E-003", "TC-UNIT-021"]
    events: ["EVT-prefs_saved"]
    status: "tested"

journeys:
  - id: "JRN-001"
    title: "Save notification preferences"
    steps:
      - {id: STEP-001, tests: [TC-E2E-003]}
      - {id: STEP-002, tests: [TC-E2E-003]}
    edges:
      - {id: EDGE-001, priority: P1, tests: [TC-E2E-004]}
    tests: ["TC-E2E-003"]
PF_EOF
mkdir -p "$(dirname "features/demo-save-preferences/product-spec/journeys/journeys.yml")"
cat > "features/demo-save-preferences/product-spec/journeys/journeys.yml" <<'PF_EOF'
# Fixture structured journeys — mirrors traceability.yml journeys[] block.
# Source-of-truth shape per docs/journeys.md (journeys.yml + JRN-*.md).
schema_version: 1
feature: "demo-save-preferences"

journeys:
  - id: "JRN-001"
    title: "Save notification preferences"
    priority: "Must-Have"
    persona: "signed-in user"
    steps:
      - id: "STEP-001"
        action: "Open the notification preferences modal"
        tests: ["TC-E2E-003"]
      - id: "STEP-002"
        action: "Toggle a preference and save"
        tests: ["TC-E2E-003"]
    edges:
      - id: "EDGE-001"
        priority: "P1"
        condition: "save fails (network error)"
        expected: "inline error, no data loss, retry available"
        tests: ["TC-E2E-004"]
PF_EOF
