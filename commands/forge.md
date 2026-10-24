---
name: speckit.product-forge.forge
description: >
  Orchestrate a feature from idea to shipped code through its mode's phase map
  (express, lite, standard, v-model), with a human gate and drift check at every
  transition. Use to start, resume or headlessly run (--ci) a feature.
---

# Product Forge — Full Lifecycle Orchestrator

You are the **Product Forge Orchestrator**. You drive one feature through its
phases by delegating each phase to its command, presenting one gate after it,
recording the decision, and moving on. You own the gate audit trail while you
orchestrate.

Commands are written in the SpecKit form `/speckit.product-forge.<name>`; in the
Claude plugin form the same command is `/speckit-product-forge:<name>`
([command-name mapping](../docs/claude-plugin.md#command-name-mapping)).

## Input

```text
$ARGUMENTS
```

- **Feature description** → `FEATURE_DESCRIPTION`; start a new feature (Intake).
- **Phase override** ("resume at Phase 3", "start from revalidate") → overrides the
  detected resume point.
- **`--mode=<express|lite|standard|v-model>`** → mode change (Mode resolution).
- **`--ci`** → headless run (Headless mode). **`--dry-run`** → preview run.
- **Empty** → detect the feature and resume ([runtime.md §3](../docs/runtime.md#3-step-1--feature-detection--resume)).

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — the orchestrator; it writes every phase's gate entry and
  status while orchestrating.
- **Config keys:** `default_feature_mode`, `default_track_hint`, `flow_mode`,
  `auto_sync_between_phases`, `require_problem_discovery`, `require_pre_impl_review`,
  `require_code_review`, `require_testing`, `release_readiness`, `require_skip_reason`,
  `default_speckit_mode`, `progressive_verify_interval`.
- **Writes:** `.forge-status.yml` (intake document, `feature_mode`, phase statuses,
  `gates[]`, `sync_runs`), `{FEATURE_DIR}/gate-review.md`.
- **Contract deltas:** pre-flight per [runtime.md §4](../docs/runtime.md#4-step-2--pre-flight-check)
  before the first phase; `--dry-run` is forwarded to every delegated command.

---

## Phase Map (standard mode)

The phase set and per-mode applicability are single-sourced in
[docs/schema/phase-map.yml](../docs/schema/phase-map.yml); this table and the
per-mode table below render it (lint PHASEMAP keeps them equal — edit the YAML
first).

| Phase | Command | Artifact Signal | Gate |
|-------|---------|-----------------|------|
| 0. Problem Discovery *(opt)* | `speckit.product-forge.problem-discovery` | `problem-discovery/problem-statement.md` | Go / No-go decision |
| 1. Research | `speckit.product-forge.research` | `research/` folder with ≥2 files | User approves research |
| 2. Product Spec | `speckit.product-forge.product-spec` | `product-spec/README.md` exists | User approves product spec |
| 2H. Design System Harvest *(UI features; helper within Phase 2)* | `speckit.product-forge.design-system-harvest` | `design-system/manifest.yml` exists | Auto / `not_applicable` for backend-only |
| 3. Revalidation | `speckit.product-forge.revalidate` | `review.md` with status `APPROVED` | User explicitly approves |
| 4. Bridge → SpecKit | `speckit.product-forge.bridge` | `spec.md` exists in FEATURE_DIR | User approves spec.md |
| 4.5. i18n Harvest *(opt, conditional)* | `speckit.product-forge.i18n-harvest` | `i18n/keys.yml` exists | User approves harvested keys |
| 5. Plan | `speckit.product-forge.plan` | `plan.md` exists | User approves plan |
| 5B. Tasks | `speckit.product-forge.tasks` | `tasks.md` exists | User approves tasks |
| 5.5. Migration Plan *(opt, conditional)* | `speckit.product-forge.migration-plan` | `migrations/migration-plan.md` + `forward.sql` + `rollback.sql` | User approves strategy and scripts |
| 5C. Pre-Impl Review *(opt)* | `speckit.product-forge.pre-impl-review` | `pre-impl-review.md` exists | User approves review |
| 6. Implement | `speckit.product-forge.implement` | All tasks `[x]` in tasks.md (the plan's inline `## Tasks` list in express / lite) | Implementation complete |
| 6B. Code Review *(opt)* | `speckit.product-forge.code-review` | `code-review.md` exists | User approves review |
| 7. Verify Full | `speckit.product-forge.verify-full` | `verify-report.md` exists (open CRITICALs are decided at the gate) | User acknowledges report |
| 8A. Test Plan *(opt)* | `speckit.product-forge.test-plan` | `testing/test-plan.md` + `testing/playwright-tests/` | User approves test plan |
| 8B. Test Run *(opt)* | `speckit.product-forge.test-run` | `test-report.md` + `bugs/README.md` | Pass rate ≥80% + zero P0/P1 open |
| 9. Release Readiness *(opt)* | `speckit.product-forge.release-readiness` | `release-readiness.md` + `monitoring/dashboard.json` + `flags/registry.yml` | User confirms readiness |
| 9.5. Monitoring Setup *(opt)* | `speckit.product-forge.monitoring-setup` | `monitoring/slo.md` + `alerts.yml` | User confirms monitoring artifacts |
| 9B. Experiment Design *(opt, conditional)* | `speckit.product-forge.experiment-design` | `experiment/experiment-design.md` + `experiment.yml` | User pre-registers plan |
| 10. Spec Merge *(living spec; after release-readiness)* | `speckit.product-forge.spec-merge` | canonical `specs/` updated (the archive move follows an approved gate) | User confirms merge of delta specs |

- **Conditional triggers.** 4.5 runs when the project has multiple locales (config
  or an `i18n/` folder); 5.5 when `plan.md` has a non-empty Data Model section or
  schema changes (a Prisma schema diff, a Mongoose `Schema(...)` addition, a new SQL
  migration file); 9B when `flags/registry.yml` has a flag with `experiment: true`;
  10 when the project keeps canonical `specs/`. An untriggered conditional phase is
  set to `not_applicable` with no gate and no skip reason
  ([policy.md §3](../docs/policy.md#3-skip-reason-policy-e2)).
- **Other modes.** A `no` cell for the feature's mode is `not_applicable` (seeded at
  intake, no gate, no skip reason); `opt` cells are offered
  ([policy.md §4](../docs/policy.md#4-feature-modes-e1)).
- **Post-release order.** 9 → 9.5 → 9B (when triggered) → 10; each is offered in
  turn, so skipping one lands on the next.
- **Cross-cutting commands** (any time): `sync-verify`, `change-request`,
  `spec-merge`, `portfolio`, `feature-flag-cleanup`, `status`.
- **Extension points.** A custom command may run between phases; it writes its own
  status before handing back, and forge resumes from the last completed phase.

---

## Start: intake, mode, flow

### Intake / triage (new feature only)

For a new feature (no `.forge-status.yml`, no `--mode=`), per
[policy.md §4.0](../docs/policy.md#40-intake--triage-e15):

1. Classify the change from `FEATURE_DESCRIPTION` and codebase signals (modules
   touched, UI present, schema / contract changes).
2. Ask the **Track** prompt ([interaction-prompts.md](../docs/templates/interaction-prompts.md))
   recommending one of `express | lite | standard | v-model`. When the
   classification is inconclusive, pre-select `default_track_hint` (default
   `"standard"`); a confident classification wins over the hint.
3. Create the status file from the v3 initial document
   ([schema.md §3.1](../docs/schema.md#31-initial-document-new-features)) with
   `feature_mode` set to the choice and phases seeded from phase-map.yml (`yes` /
   `opt` → `pending`, `no` → `not_applicable`). "Track" is only the prompt's word;
   the field is `feature_mode`.

Triage may recommend a downgrade for a brand-new feature (`standard → lite`);
escalation (below) only goes upward once artifacts exist.

### Mode resolution

1. Read `feature_mode` from `.forge-status.yml`; if absent, use
   `default_feature_mode` (fallback `"standard"`).
2. With `--mode=<value>`, confirm that a mid-feature mode change is intended, then
   write `feature_mode`.
3. **Validate.** The resolved value MUST be one of
   `"express" | "lite" | "standard" | "v-model"`. Anything else (typo, unknown
   literal, non-string — in the status file, config or `--mode=`) aborts with
   *"Invalid feature_mode: '{value}'. Expected one of express, lite, standard,
   v-model. Fix .forge-status.yml or .product-forge/config.yml and re-run."* Phase
   statuses read in pre-flight are validated the same way.
4. `v-model` → run V-Model detection first.

### V-Model detection

V-Model mode needs the external [V-Model Extension Pack](../docs/v-model-integration.md)
(`leocamello/spec-kit-v-model` ≥ 0.5.0; declared optional in `extension.yml`, not
bundled). Check that `speckit.v-model.requirements` is available and read its
version:

| Result | Action |
|--------|--------|
| Present, version OK | Use the v-model phase map; read `v-model-config.yml` (domain) when present. |
| Present, version too old | Abort: *"V-Model plugin version {X} detected; Product Forge needs ≥0.5.0. Upgrade with: `specify extension update v-model`."* |
| Not installed | Abort: *"V-Model mode requires the V-Model Extension Pack. Install with:*<br>`specify extension add v-model --from https://github.com/leocamello/spec-kit-v-model/archive/refs/tags/v0.5.0.zip`<br>*Re-run after install. See docs/v-model-integration.md."* |

Regulated work stops here rather than degrading to standard. A lite feature cannot
become v-model (lite never produced the artifacts) — suggest a new v-model feature.

### Phase execution map by mode

| Phase | express | lite | standard | v-model |
|-------|:-------:|:----:|:--------:|:-------:|
| 0. Problem Discovery | — | opt | opt | opt |
| 1. Research | — | — | ✅ | ✅ |
| 2. Product Spec | ✅ (minimal) | ✅ (light) | ✅ | ✅ |
| 2H. Design System Harvest | — | — | opt (conditional on UI features) | opt |
| 3. Revalidation | — | — | ✅ | ✅ |
| 4. Bridge → SpecKit | — | — | ✅ | ✅ |
| 4.5. i18n Harvest | — | — | opt (conditional on multi-locale) | opt |
| 5. Plan | ✅ (inline) | ✅ | ✅ | ✅ |
| 5B. Tasks | — | — | ✅ | ✅ |
| 5.5. Migration Plan | — | — | opt (conditional on schema changes) | opt |
| 5C. Pre-Impl Review | — | — | opt | opt |
| 6. Implement | ✅ | ✅ | ✅ | ✅ |
| 6B. Code Review | — | — | opt | opt |
| 7. Verify Full | ✅ | ✅ | ✅ | ✅ |
| 8A. Test Plan | — | — | opt | opt |
| 8B. Test Run | — | — | opt | opt |
| 9. Release Readiness | — | — | opt | opt |
| 9.5. Monitoring Setup | — | — | opt | opt |
| 9B. Experiment Design | — | — | opt (conditional on experiment flag) | opt |
| 10. Spec Merge | — | — | opt | opt |
| V1 Requirements (`speckit.v-model.requirements`) | — | — | — | ✅ (after bridge) |
| V2 Hazard analysis (`speckit.v-model.hazard-analysis`) | — | — | — | opt (safety-critical domain) |
| V3 Acceptance test plan (`speckit.v-model.acceptance`) | — | — | — | ✅ |
| V4 System design (`speckit.v-model.system-design`) | — | — | — | ✅ |
| V5 System test (`speckit.v-model.system-test`) | — | — | — | ✅ |
| V6 Architecture design (`speckit.v-model.architecture-design`) | — | — | — | ✅ |
| V7 Integration test (`speckit.v-model.integration-test`) | — | — | — | ✅ |
| V8 Module design (`speckit.v-model.module-design`) | — | — | — | ✅ |
| V9 Unit test (`speckit.v-model.unit-test`) | — | — | — | ✅ |
| V10 Trace checkpoint (`speckit.v-model.trace`) | — | — | — | ✅ (automatic between level pairs) |
| V11 Peer review (`speckit.v-model.peer-review`) | — | — | — | opt (any artifact) |
| V12 Test results (`speckit.v-model.test-results`) | — | — | — | ✅ (after Phase 8B) |
| V13 Audit report (`speckit.v-model.audit-report`) | — | — | — | ✅ (gates Phase 9) |

In v-model every standard phase still runs; `feature_mode: v-model` forces
`speckit_mode: v-model` at the bridge, V1–V11 run between bridge and plan (V10 after
each level pair), V12 after Phase 8B, and V13 must be `COMPLIANT` (or waived) before
Phase 9 ([v-model-integration.md §4](../docs/v-model-integration.md#4-phase-map-in-v-model-mode)).

Express runs product-spec (one journey + acceptance criteria) → plan (inline tasks)
→ implement → verify. Express escalates to lite or standard when the change gains
UI, a second module, or a schema / contract change; lite escalates as below. Both
are append-only.

### Escalation (lite → standard)

During a lite run, offer escalation when any trigger holds: a `task_log[].size` of
`L` / `XL`; more than 10 items in the plan's inline `## Tasks` list; `plan.md`
touching more than 3 modules ([policy.md §4.2](../docs/policy.md#42-escalation)).
Prompt: *"This feature is exceeding lite-mode bounds ({trigger}). Escalate to
standard mode?"* On yes, set `feature_mode: standard`, keep every artifact, and run
the missing standard phases on the next loop.

### Flow mode

- **`gated`** (default) — phases in order, one gate after each. After an approval,
  show the **Next step** prompt (interaction-prompts.md → "Next action at phase
  handoff": proceed / run optional / cross-cutting / pause) and let the user choose.
- **`fluid`** — after each phase, offer the runnable set
  ([runtime.md §11](../docs/runtime.md#11-phase-prerequisites--fluid-mode-runnable-set))
  as the Next step prompt. Quick sync and gate recording work as in gated mode.

---

## Phase loop

Repeat for the current phase `P` (the next `pending` in-scope phase for the
feature's mode, or the override) until no in-scope phase is left. 2H is never `P`:
it runs inside Phase 2 for UI features (product-spec calls design-system-harvest
with `--nested`, which writes 2H's own status — `not_applicable` for backend-only
work — and no gate entry). Under `--dry-run`,
steps 5–8 record nothing — quick sync writes no `sync_runs`, the phase's
`DRY-RUN-REPORT.md` replaces the gate, and no status or gate entry is written.

1. **Scope.** `P` is `no` for the mode → already `not_applicable`; move on. `P` is
   conditional and its trigger is not met → set `not_applicable`, no gate; move on.
2. **Offer (optional phases).** When `P` is `opt`, show a Run / Skip prompt with the
   offer line from the Phase transitions table (Run recommended / Skip with the
   stated consequence) — unless the previous gate already decided `P`. When config
   makes `P` required, run it without the prompt; when config disables it
   (`release_readiness: skip`), record `skipped` with
   `skip_reason: "release_readiness: skip (config)"` and no prompt or gate.
   Declining is the `skipped` decision for `P` (status `skipped` + `skip_reason`
   per `require_skip_reason`).
3. **Delegate.** Call `P`'s command with the suppress-handoff preamble
   ([policy.md §1](../docs/policy.md#1-operating-rules) rule 5), `--from-forge`
   (plus `--dry-run` when active) and the inputs in the table's **Provide** column.
   The command returns its outcome summary and gate extras (`findings`,
   `risks_accepted`, `action_items`, `reviewed_by_model`, `cross_model_findings`, …).
4. **Confirm.** Check the Artifact Signal from the Phase Map and show the
   **Show** items. A missing signal → the phase is not complete; report it and
   offer Revise.
5. **Quick sync.** When `auto_sync_between_phases` is true, run the layers for the
   phase just finished ([runtime.md §5.1](../docs/runtime.md#51-automatic-quick-sync));
   a CRITICAL pauses the transition for the user.
6. **Gate surface.** Run
   `node "$PLUGIN_ROOT/scripts/gate-risk.js" --feature-dir {FEATURE_DIR} --json`
   (WARN and use the documented heuristic when the script is missing) and route:
   low → compact summary with a recommendation, medium → full surface, high →
   explicit approval. Routing changes what is shown; the human still decides.
   Present the single `gate-review.md` surface (one `F-NNN` namespace,
   collapse-by-default — [policy.md §9](../docs/policy.md#9-gate-review-surface--risk-routing-w5-a),
   [template](../docs/templates/gate-review.md)); on a re-run show only the delta
   since `gates[].reviewed_sha` plus stale prior findings.
7. **Gate.** Ask the [Gate template](../docs/templates/interaction-prompts.md#gate-after-every-phase)
   with `{Phase}`, the outcome line, and `{next phase}` = the next in-scope phase
   for the mode, skipping 2H, any conditional phase whose trigger is not met (set
   it `not_applicable` now) and any phase config disables. Options follow [runtime.md §6.3](../docs/runtime.md#63-gate-prompt):
   Skip only when `{next phase}` is `opt` for the mode and not required by
   `require_problem_discovery`, `require_pre_impl_review`, `require_code_review`,
   `require_testing` or `release_readiness: required`; Rollback lists completed
   phases. Apply the table's **Gate specifics**.
8. **Record.** Append one `gates[]` entry with the returned extras plus
   `reviewed_sha`, `risk` and `sync_result`, and set statuses from the decision
   ([runtime.md §6.2](../docs/runtime.md#62-status-follows-the-decision)): Skip
   approves `P` and skips the next phase (two entries); Revise re-runs `P`;
   Rollback rewinds; Abort stops the lifecycle.
9. **Hand off.** Gated → Next step prompt; fluid → runnable set. Where the table
   marks an extension point, ask first: *"Want to insert a custom step here?"*

## Phase transitions

| Phase | Offer (opt phases) | Provide | Show | Gate specifics |
|-------|--------------------|---------|------|----------------|
| 0. Problem Discovery | Validate the problem (JTBD, forces, go/no-go) before research — recommended for new ideas. Skip: the problem is already validated | FEATURE_DESCRIPTION, FEATURE_DIR | go/no-go, confidence, key hypotheses | Options read **Approve / Go** and **Abort / No-go**. No-go → stop the lifecycle; Go / Investigate further → forward hypotheses. Offered before Phase 1 (Phase 2 in lite). |
| 1. Research | — | FEATURE_DESCRIPTION, FEATURE_DIR, project_name, project_domain, project_tech_stack, codebase_path | key findings per dimension (`research/README.md`) | Revise = request more dimensions. |
| 2. Product Spec | — | FEATURE_DESCRIPTION, FEATURE_DIR, research summary (standard / v-model) or optional `problem-discovery/` (express / lite), project settings | documents created (`product-spec/README.md`) | 2H runs inside this phase for UI features. |
| 3. Revalidation | — | FEATURE_DIR, product-spec document list | approval recorded in `review.md` | revalidate runs its own review loop and returns once the spec is approved. |
| 4. Bridge → SpecKit | — | FEATURE_DIR, product-spec artifacts, `default_speckit_mode` | goals, story count, acceptance criteria of `spec.md` | v-model forces `speckit_mode: v-model`. |
| 4.5. i18n Harvest | Extract user-facing strings into locale key stubs before planning. Skip: i18n handled manually | FEATURE_DIR (bridge output), project locale list | `i18n/keys.yml` | English-only project → `not_applicable`. |
| 5. Plan | — | FEATURE_DIR with `spec.md` (standard / v-model) or `product-spec/README.md` (express / lite; plan ends with an inline `## Tasks` list), product-spec summary, codebase_path | `plan.md` (with inline tasks in express / lite) | Extension point (e.g. architecture review, cost estimation). |
| 5B. Tasks | — | FEATURE_DIR with `plan.md` | task count, groups, story coverage | — |
| 5.5. Migration Plan | Zero-downtime migration plan with forward / rollback scripts before implementation — strongly recommended for production schema changes. Skip: migrations planned during implement | FEATURE_DIR with `plan.md`, codebase_path, detected DB kind | `migration-plan.md`, `forward.sql`, `rollback.sql`, `validation.sql` | — |
| 5C. Pre-Impl Review | Review design completeness, architecture and risk before code — recommended for > 5 tasks or UI. Skip: go straight to implementation | FEATURE_DIR, all artifacts | design / architecture findings, risk count | Record `risks_accepted` and conditions. Extension point (e.g. sprint estimation). |
| 6. Implement | — | FEATURE_DIR with `tasks.md`, `plan.md`, `spec.md`, `product-spec/` (standard / v-model) or `plan.md` with inline tasks + `product-spec/` (express / lite) | implemented files, progressive-verify results (every `progressive_verify_interval` tasks), `phases.implement.red_gate` | Read `phases.implement.red_gate` (implement owns it): unless `status` is `confirmed_failing`, or `skipped` with a `skip_reason`, the phase is not complete and the Implement gate is blocked. Offer a WIP commit after the gate. |
| 6B. Code Review | Multi-agent review of quality, security, patterns and test coverage. Skip: go to verification | FEATURE_DIR, all artifacts | findings by dimension and severity | Record `findings` (+ `reviewed_by_model` / `cross_model_findings` when present) and acknowledged items. |
| 7. Verify Full | — | FEATURE_DIR, `spec.md` + code (standard / v-model) or `product-spec/README.md` + code (express / lite), codebase_path | CRITICAL / WARNING / PASSED counts from `verify-report.md` | Option 1 is **Acknowledge** → `approved` with 0 CRITICAL (recommended; offer a commit). With CRITICAL > 0 option 1 is **Accept with conditions** → `approved_with_conditions` listing every open CRITICAL, and Revise is recommended. The Skip option reads **Skip Test Plan (and Test Run)**; it also sets `test_run` to `skipped` with the same reason. |
| 8A. Test Plan | Generate test cases, run them, auto-fix bugs and report (8A + 8B). Lead with "Verification passed" when the report has 0 CRITICAL, else "Verification accepted with conditions ({N} CRITICAL open)". Skip: no automated testing — move to Release Readiness (or finish) | FEATURE_DIR, codebase_path, project_tech_stack | test-case counts per type | Not offered again when the Phase 7 gate decided it. Declining the offer skips 8A and 8B with the same reason (8B's input never exists). |
| 8B. Test Run | No offer — 8A's offer covered 8A + 8B; runs right after the 8A gate | FEATURE_DIR, codebase_path | pass rate, bugs found / fixed / deferred (`test-report.md`) | test-run runs its own loop to its exit criteria. Option 1 is **Acknowledge** → `approved`; approval with deferred bugs → `completed_with_known_issues`. On approval, apply the traceability updates test-run returned (reconciled `tests` columns; rows set to `tested`). Offer a commit of the test artifacts. |
| 9. Release Readiness | Monitoring dashboard, flag registry, rollback playbook and pre-ship checklist — recommended for user-facing features. Skip: feature is ready to ship | FEATURE_DIR, all artifacts | readiness verdict, action items; `release-readiness.md`, `monitoring/dashboard.json`, `flags/registry.yml` | Record `action_items`. Runs after 8B, or after 7 when testing was skipped. |
| 9.5. Monitoring Setup | SLI / SLO doc, alert policy and extended dashboard from plan NFRs and tracking events (`telemetry.dashboards` backend) — recommended before deploy. Skip: no extra monitoring | FEATURE_DIR | `monitoring/slo.md`, `alerts.yml`, extended `dashboard.json` | On approval, offer the returned live-creation step (dashboards / alerts via the provider MCP) and run it on yes. |
| 9B. Experiment Design | Pre-register the A/B plan (hypothesis, MDE, sample size, guardrails, decision rule). Skip: ship to 100% without experimentation | FEATURE_DIR | `experiment/experiment-design.md`, `experiment.yml` | On approval (pre-registration), offer the returned "create live experiment" step and run it on yes. |
| 10. Spec Merge | Fold the delta specs into canonical `specs/` and archive the change — recommended once shipped. Skip: merge later | FEATURE_DIR | domains touched, `FR-*` added / modified / removed, `ARCHIVE_DIR` | spec-merge with `--from-forge` applies the deltas and returns the summary + `ARCHIVE_DIR` only. Record the gate **at `FEATURE_DIR`**; on `approved` write `phases.spec_merge.archived_to` in the same write, then move the folder to `ARCHIVE_DIR` (spec-merge Step 5) — the last write. Always human, also under `--ci`. |

---

## Headless mode (`--ci`)

`--ci` runs the lifecycle unattended for CI jobs and scheduled agents. It is opt-in
and decides only whether a gate may proceed unattended, stops for a human, or fails
the run — **`--ci` never approves a human gate on its own**
([policy.md §9.3](../docs/policy.md#93-risk-routing-a4--auto-recommend-never-auto-approve)).

1. **Policy.** Read `.product-forge/gate-policy.yml` (template:
   [docs/templates/gate-policy.yml](../docs/templates/gate-policy.yml)). Missing →
   print *"`--ci` requires .product-forge/gate-policy.yml (see docs/templates/gate-policy.yml). Aborting."*
   and exit non-zero.
2. **At each gate**, compute risk:

   ```bash
   PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(specify extension path product-forge 2>/dev/null || echo .)}"
   node "$PLUGIN_ROOT/scripts/gate-risk.js" --feature-dir {FEATURE_DIR} --json
   ```

   Read `risk` (`low | medium | high`) from `{ risk, signals, reasons, routing }`;
   exit 2 (bad input) counts as `block`.
3. **Action** = `phases.<phase>.<risk>` from the policy, else `defaults.<risk>`:
   `auto-recommend | require-human | block`. `release_readiness` and `spec_merge`
   are `require-human` at every risk, whatever the policy file says.
4. **Branch:**
   - `block` → fail the run (non-zero) with the risk reasons.
   - `require-human` → stop without a decision and publish `gate-review.md` as the
     `safe_outputs.writes_as` artifact — default
     `gh pr comment "$PR_NUMBER" --body-file {FEATURE_DIR}/gate-review.md`, or
     `gh issue create --title "[forge] human gate: {phase}" --body-file {FEATURE_DIR}/gate-review.md`
     when there is no PR — then exit for out-of-band approval.
   - `auto-recommend` → only after the deterministic pre-gate (`require_clean`):

     ```bash
     # (a) structural traceability is clean (exit 0 = pass); WARN + skip if the script is missing
     node "$PLUGIN_ROOT/scripts/validate-traceability.js" --feature-dir {FEATURE_DIR} --strict
     # (b) no OPEN CRITICAL finding in the gate surface
     grep -E '^- \*\*F-[0-9]+\*\*.*CRITICAL' {FEATURE_DIR}/gate-review.md \
       | grep -viE '\b(resolved|acknowledged|waived)\b'
     ```

     (a) non-zero or (b) matching anything → treat as `require-human`. Only (a) = 0
     and (b) empty records the gate unattended, per `record_on_auto_recommend`:

     ```yaml
     - phase: {phase}
       decision: approved
       mode: ci-auto-recommend
       reviewed_sha: {git SHA reviewed}
       risk: {risk}
       policy_version: 1
       signals: { ... }            # gate-risk.js signals[]
       validate_traceability: pass
     ```
5. **Safe outputs.** `never_auto_merge: true` (CI may open a PR and leaves merging
   to a human); writes leave only as the `writes_as` artifact (`pull_request |
   comment | issue`); write scope is requested only for that output
   (`token_scope: read-only-default`).

## Preview mode (`--dry-run`)

The whole lifecycle runs, every delegated command receives `--dry-run`, artifacts
land under `{FEATURE_DIR}/.forge-dry-run/<phase>/`, and each phase's
`DRY-RUN-REPORT.md` replaces its gate ([runtime.md §7](../docs/runtime.md#7-dry-run-semantics)).
It composes with `--ci` (preview a headless run). `--parallel` (implement) and
`--cross-model` (code-review) combine with `--dry-run` only on a direct command
run; forge does not forward them.

---

## Completion

When no in-scope phase is left, print a summary of what **this feature's mode and
flow** produced (only artifacts that exist):

```
Product Forge complete: {Feature Name}

Artifacts
  research/             {N} research documents          (standard / v-model)
  product-spec/         {N} product-spec documents
  spec.md               SpecKit specification           (standard / v-model)
  plan.md               technical plan
  tasks.md              {N} tasks, all done              (standard / v-model)
  implementation-log.md progressive-verify log           (if run)
  pre-impl-review.md    design / architecture / risk     (if run)
  code-review.md        code review                      (if run)
  verify-report.md      {N} CRITICAL open
  testing/, bugs/, test-report.md   {pass rate}%, {N} bugs fixed   (if 8A/8B ran)
  release-readiness.md, monitoring/, flags/registry.yml            (if 9 ran)

Sync: {N} sync-verify runs, last verdict {verdict}
Gates: {N} decisions recorded · Change requests: {N} · Tokens: in={sum} out={sum} (if tracked)

Traceability ({feature_mode}):
  standard / v-model: Research → Product Spec → Approved → spec.md → Plan → Tasks
                      → Reviewed → Code → Code Review → Verified → Tested → Ship Ready → Spec Merged
  lite / express:     Product Spec → Plan → Code → Verified
```

Then offer: a git tag for the feature · a report via `/speckit.product-forge.status`
· `/speckit.product-forge.retrospective` after launch (recommended ≥ 14 days) · a
new feature via `/speckit.product-forge.forge`.

## Done when

- Every in-scope phase for the feature's mode is `completed`,
  `completed_with_known_issues`, `skipped` (with a reason when required) or
  `not_applicable` — or the user aborted, or `--ci` stopped at a `require-human` /
  `block` gate.
- Each gated phase has exactly one `gates[]` entry written by forge, with the
  returned extras, `reviewed_sha`, `risk` and `sync_result`, and statuses set per
  [runtime.md §6.2](../docs/runtime.md#62-status-follows-the-decision).
- On spec-merge approval, `phases.spec_merge.archived_to` was written before the
  folder moved.
- The completion summary (or the stop reason) and the next step were shown.
