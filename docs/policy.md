# Product Forge — Policy

> **Status:** normative
> **Consumers:** `commands/forge.md` and every sub-skill.
> **Companions:** [runtime.md](./runtime.md), [schema.md](./schema.md).

The single source of truth for orchestration rules, gate behavior, skip handling,
feature modes, and role approvals. Sub-skills link here instead of repeating these
rules.

---

## 1. Operating Rules

1. **One phase at a time.** Phases never run in parallel. Under the default
   `flow_mode: gated` they also run in strict order. Under `flow_mode: fluid`
   (§4.0.1) the user may choose the order among the runnable set (dependencies are
   enablers, not strict gates); `sync-verify` and the gate audit trail still apply.

   **Carve-out — intra-phase task parallelism.** Within the single `implement`
   phase, independent task groups MAY run in parallel (e.g. via Hermes
   `delegate_task`); this is not running two lifecycle phases at once. It is
   permitted ONLY when all of: (a) `implement --parallel` was explicitly requested;
   (b) the task groups are proven **path-disjoint** by the conflict matrix
   `portfolio` computes from `tasks.md` `Paths:` lines (any shared path keeps those
   groups sequential); (c) the progressive-verify checkpoints (implement Step 4) and
   the state lock still apply, and the phase still ends at one human gate.
   Test-first `red_gate` tasks and any group touching a shared path always run
   sequentially. Contract: [`commands/implement.md`](../commands/implement.md)
   Step 3.
2. **Human gate after every phase.** After each sub-skill completes, summarize the
   outcome and present the structured `Gate` prompt
   ([interaction.md](./interaction.md),
   [templates/interaction-prompts.md](./templates/interaction-prompts.md)) offering:
   - **Approve** → proceed to next phase
   - **Revise** → re-run same phase with feedback
   - **Skip** → skip the **next** phase and move on — offered only when that phase
     is optional for the mode and not made required by config (§6); may require a
     reason (§3). The computed option set is [runtime.md §6.3](./runtime.md#63-gate-prompt).
   - **Abort** → stop everything
   - **Rollback** → jump back to an earlier phase by name

   Every decision point (gates, mode/track selection, skip reasons, clarification
   rounds, the next-action choice at each handoff) MUST use the structured
   interaction convention ([interaction.md](./interaction.md)), not free-form
   "ask the user" prose.
3. **Show progress.** Use `TodoWrite` (or equivalent) to show all phases and mark current/completed.
4. **Pass full context forward.** When delegating, always include: `FEATURE_DESCRIPTION`, `FEATURE_DIR`, project config, and prior phase outputs summary.
5. **Suppress sub-agent handoffs.** When delegating, prepend: *"You are invoked by Product Forge Orchestrator. Do NOT follow handoffs or auto-forward. Return output to the orchestrator and stop."*
6. **Context budget.** If context feels heavy at a phase boundary, summarize prior phases and offer to continue in a new session (auto-resume via `.forge-status.yml`).
7. **Git checkpoints.** After Phase 6, Phase 7, and Phase 8B complete, offer a WIP commit. Always ask first; never auto-commit.
8. **Testing phases are optional.** After Phase 7, ask whether to run 8A/8B. Respect the user's choice.
9. **Release readiness is optional by default.** After testing (or after Phase 7 if testing was skipped), offer Phase 9. `release_readiness: required` in config forces it; `release_readiness: skip` never offers it — the phase is recorded `skipped` with `skip_reason: "release_readiness: skip (config)"` and no gate.
10. **Sync-verify at transitions.** Run `sync-verify --quick` between phase transitions ([runtime.md §5](./runtime.md#5-sync-verify-integration)).
11. **Record gate decisions.** Every gate decision is appended to `gates:` in `.forge-status.yml` ([runtime.md §6](./runtime.md#6-gate-audit-trail)).
12. **Respect the state lock.** Every write to `.forge-status.yml` follows the state-lock protocol ([runtime.md §2](./runtime.md#2-state-lock-protocol-a2)); one writer at a time.

---

## 2. Gate Decisions

Every gate decision is one of these literals, recorded in the `decision` field of
a `gates[]` entry:

| Decision | Meaning | Requires |
|----------|---------|----------|
| `approved` | User approved, proceed to next phase. | — |
| `approved_with_conditions` | User approved but flagged follow-ups. | `conditions: [...]` populated. |
| `revised` | User asked for re-run with feedback. | `notes` populated. |
| `skipped` | User chose to skip an optional phase. | `skip_reason` populated when `require_skip_reason: true`. See §3. |
| `rolled_back` | User rewound to an earlier phase. | `rolled_back_to: "<phase-name>"` populated. Subsequent phases' statuses reset to `pending`; their original completion is preserved in `gates[]` history. |
| `aborted` | User terminated the lifecycle for this feature. | `notes` populated. |

Rollback (§1 rule 2) maps to `rolled_back`: it preserves the feature and allows
continuation from the rewound phase. Abort maps to `aborted`: it ends the lifecycle.

---

## 3. Skip-Reason Policy (E2)

Skips stay traceable. Config: `require_skip_reason` (default `true`).

1. Only optional phases may be skipped: every `opt` cell for the feature's mode in
   [`schema/phase-map.yml`](./schema/phase-map.yml), minus any phase made required
   by config (§6).
2. When a user selects "Skip" at a gate:
   - `require_skip_reason: true` → prompt `"Reason for skipping?"` and persist the
     free-text answer in `gates[].skip_reason` AND `phases.<name>.skip_reason`.
     Set `phases.<name>.status = "skipped"`.
   - `require_skip_reason: false` → accept the skip without reason.
3. **Under `require_skip_reason: true`, an empty or whitespace-only reason rejects
   the Skip.** Re-prompt until a non-empty reason is supplied; until then, stay on
   the current phase and write no `skipped` gate entry. Under
   `require_skip_reason: false`, empty reasons are accepted and `skip_reason` is
   persisted as `null` on both the phase and the gate.
4. `sync-verify` flags features with ≥3 optional phases `skipped` without reasons
   as "insufficient traceability" (under the strict policy this arises only for
   features carried forward from earlier versions).

**`not_applicable` is NOT a skip.** `status: "not_applicable"` marks a phase that
was never in scope:

- Phases excluded by the feature's mode (every `no` cell for that mode in
  [`schema/phase-map.yml`](./schema/phase-map.yml)).
- Phases never run for a `backfilled: true` feature
  (`problem_discovery`, `research`, `revalidation`, `bridge`).

`not_applicable` phases need no `skip_reason`, do not count toward the
"insufficient traceability" threshold, and produce no gate entries.

---

## 4. Feature Modes (E1)

Each feature selects a **mode** that drives the phase map, stored as
`feature_mode` in `.forge-status.yml` (default `standard`).

### 4.0 Intake / triage (E1.5)

Before a mode is fixed, the orchestrator classifies the change from the
description plus codebase signals (files touched, modules referenced, presence of
UI, schema/contract changes) and **recommends a track** via the structured `Track`
prompt ([templates/interaction-prompts.md](./templates/interaction-prompts.md)).

| Classification | Recommended track | Rationale |
|----------------|-------------------|-----------|
| Trivial (copy/config/one-liner, no UI, no schema) | `express` | Avoid Big-Design-Up-Front overhead. |
| Bugfix / small (≤5 estimated tasks, single module) | `lite` | Light spec, fast path. A lite feature that grows to 6–10 tasks stays lite; escalation to standard starts above 10 (§4.2). |
| Standard feature | `standard` | Full research → ship lifecycle. |
| Regulated / safety-critical | `v-model` | Audit-grade traceability. |

The recommendation is a default; the user may pick any track. The choice is
written to `feature_mode` ("track" is only the intake word — there is no `track`
field). Unlike escalation (§4.2), triage may recommend a **downgrade** (e.g.
`standard → lite`) for a new feature before any artifacts exist.

### 4.0.1 Flow mode: gated vs fluid

`flow_mode` (config, default `gated`) controls sequencing independently of the
phase map:

- **`gated`** — one phase at a time, human gate after each (§1).
- **`fluid`** — any in-scope phase is runnable on demand; the orchestrator presents
  dependencies as *enablers* ("Plan is ready to run because Spec exists").
  `sync-verify` still guards drift and gate decisions are still recorded. Use fluid
  for exploratory or iterative work, gated for regulated/standard runs.

The runnable set is resolved per [runtime.md §11](./runtime.md#11-phase-prerequisites--fluid-mode-runnable-set).

### 4.1 Phase maps

Which phases run per mode (`yes` / `opt` / `no`) is
[`schema/phase-map.yml`](./schema/phase-map.yml); per-phase inputs are
[runtime.md §11.2](./runtime.md#112-per-phase-required-upstream-artifacts).

- **Express** — trivial changes (copy tweaks, config, one-liners with no UI and no
  schema/contract change): `product_spec` (minimal: 1 journey + AC) → `plan`
  (inline) → `implement` → `verify`, all required. Escalatable to `lite` or
  `standard` (§4.2) if the change turns out larger than triage estimated.
- **Lite** — bug fixes, refactors, small features (≤5 tasks, single module):
  `problem_discovery` (optional) → `product_spec` (light) → `plan` → `implement` →
  `verify`.
- **Standard** — the full lifecycle (20 phase slots: 8 always-on core + 12
  optional/conditional), documented in `commands/forge.md`.
- **V-Model** — every phase `standard` runs plus the V-Model phases V1–V13 inserted
  around them (V1–V11 between bridge and plan, V12 after Phase 8B, V13 gating
  Phase 9). Requires the external extension
  [leocamello/spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model)
  (v0.5.0 or higher); missing plugin → abort, no silent degradation. Domain
  selection lives in `v-model-config.yml`. Phase placement, detection and
  fallback: [v-model-integration.md](./v-model-integration.md).

Express and lite have no bridge and no tasks phase: `plan` reads the product spec directly and ends with an inline `## Tasks` list
(`T001`…), which `implement` executes and logs in `task_log[]`.

**`speckit_mode` vs `feature_mode`.** Two different switches:

- `feature_mode` (status file; config default `default_feature_mode`) selects the
  **Product Forge phase map** — express / lite / standard / v-model.
- `speckit_mode` (status file, written by `bridge`; config default
  `default_speckit_mode`: `ask` / `classic` / `v-model`) selects the **SpecKit
  sub-flow inside Phase 4 (bridge)** — classic `plan → tasks → implement`, or the
  V-Model SpecKit commands.

`feature_mode: v-model` forces `speckit_mode: v-model` (bridge does not ask). In
`standard`, `speckit_mode` follows `default_speckit_mode`. In `express`/`lite`
there is no bridge, so `speckit_mode` stays unset.

### 4.2 Escalation

A feature may be **escalated** up the ladder (`express → lite → standard`) when it
outgrows its track. Express escalates to lite when it gains UI, a second module,
or a schema/contract change. Lite escalates to standard when any of:

- `task_log[].size` contains `L` or `XL` entries.
- The task list (the plan's inline `## Tasks` list in lite) exceeds 10 items.
- The plan references more than 3 modules.

Escalation is append-only: previous artifacts remain, missing standard-mode
artifacts are generated on demand, and no data is deleted. A standard feature may
move to `v-model` only with explicit confirmation, after which the missing V-Model
artifacts are produced ([v-model-integration.md §3](./v-model-integration.md#3-detection-and-fallback));
a lite or express feature cannot become `v-model`.

### 4.3 Deselection

A standard-mode feature stays standard; it may **not** be demoted to lite
(demotion would orphan artifacts). If scope shrank that much, archive the feature
and start a new one.

---

## 5. Role Approvals

Gates default to single approval (solo mode); multi-role approval is opt-in:

```yaml
# .forge-status.yml
role_approvals:
  solo_mode: true                  # default
  required_roles_per_phase: {}     # used only when solo_mode: false
```

### 5.1 Solo mode

Any single "approve" from the orchestrator user counts as approval; the
`gates[].approvals` object is omitted. The §5.3 distinct-approver rule is advisory
here.

### 5.2 Multi-role mode

When `solo_mode: false`:

- Every gate entry has `approvals: { pm: ..., eng: ..., qa: ... }`.
- A gate counts as `approved` only when every role listed in
  `required_roles_per_phase[<phase>]` has a non-null entry that satisfies the §5.3
  distinct-approver rule.
- Roles not listed are ignored for that phase.

```yaml
required_roles_per_phase:
  pre_impl_review: ["pm", "eng"]
  release_readiness: ["pm", "eng", "qa"]
```

### 5.3 Distinct-approver rule

The same identity may not both author/produce a phase artifact and approve its
gate. The rule compares two fields:

| Side | Field | Value | Producer |
|------|-------|-------|----------|
| Author | `phases.<phase>.produced_by` | identity (email/handle) of the human who owned the artifact this phase produced | written by the orchestrator at phase completion when `role_approvals.solo_mode: false` |
| Approver | `gates[].approvals.<role>.approved_by` | identity that approved for that role | written at the gate (§5.2, runtime §6) |

`produced_by` is the producing **human** identity, not the orchestrator AI (every
artifact is AI-drafted). When it is unset/null, the orchestrator MUST prompt for it
before recording a multi-role `approved` gate.

**Rule by mode:**

- **`solo_mode: true` — advisory.** One developer necessarily both produces and
  approves, so the rule cannot be satisfied. The orchestrator MAY show a one-line
  reminder (`"solo mode: this artifact was authored and approved by the same identity"`)
  and continues without blocking.
- **`solo_mode: false` — enforced.** For a gate to count as `approved`, every
  required role's `approved_by` MUST be non-null **and** differ from
  `phases.<phase>.produced_by` (`approved_by != produced_by`). If any required
  role's approver equals the author, write no `approved` gate; re-prompt for a
  distinct approver for that role (a Revise/Approve loop — never auto-approve,
  §1 rule 2).

**Single-role edge case.** When `required_roles_per_phase[<phase>]` lists exactly
one role and the author holds it, a **different identity** holding the same role
must record the `approved_by`. No multi-role configuration lets the author
self-approve past the gate.


---

## 6. Optional Phase Governance

| Phase | Default state | May be made required via config key |
|-------|---------------|--------------------------------------|
| `problem_discovery` | optional | `require_problem_discovery: true` |
| `pre_impl_review` | optional | `require_pre_impl_review: true` |
| `code_review` | optional | `require_code_review: true` |
| `test_plan` / `test_run` | optional | `require_testing: true` |
| `release_readiness` | optional | `release_readiness: required` |

A phase required by config has no "Skip" option at the gate (computed by the Gate
prompt, [runtime.md §6.3](./runtime.md#63-gate-prompt)).

---

## 7. Mode vs Optional Phase Interaction

In express and lite, every phase outside the mode's map (§4.1) — whether
"required in standard" like `research` or optional like `test_run` — is written
with `status: "not_applicable"` and gets **no** `gates[]` entry (gates exist only
for phases that ran). This keeps "in scope, not yet started" (`pending`)
distinguishable from "never in scope" (`not_applicable`).

Standard and V-Model modes follow the §3 skip policy for optional phases. Their
only `not_applicable` phases are usually conditional ones that resolve
automatically (i18n-harvest when English-only, migration-plan when no schema
changes, experiment-design when no A/B flag).

---

## 8. Change Management

Every change request is governed by `/speckit.product-forge.change-request` and
results in a `change_requests[]` entry on `.forge-status.yml`. Policy:

- A change request that invalidates a completed phase rewinds status to that
  phase. Artifacts from rewound phases are archived, not deleted.
- A change request is blocked during Phase 6 (implement) until the current task is
  committed or explicitly discarded.

---

## 9. Gate review surface & risk routing (W5-A)

### 9.1 Unified gate-review artifact (A3)

`pre-impl-review`, `code-review`, and `verify-full` write their findings into a
single `<FEATURE_DIR>/gate-review.md` under one `F-NNN` namespace
(collapse-by-default, grouped by journey/contract/component/general). It is a
**consolidated view, not a replacement** — each phase still runs its own analysis.
The legacy `D-/A-/R-`, `REV-`, and `CRITICAL-/WARNING-` ids fold into `F-NNN`
(carrying `source` + `dimension`/`layer`). See
[templates/gate-review.md](./templates/gate-review.md) and the `F-` row in
[schema.md §8](./schema.md#8-cross-artifact-id-system).

### 9.2 Delta / incremental review

Each gate decision stamps `gates[].reviewed_sha` (the git SHA / artifact stamp
reviewed). On a **re-run**, the gate presents only findings whose artifact changed
since `reviewed_sha`, plus previously-approved findings whose file changed
(flagged "review may be stale"). Reuse the `phase-digest.md` "Diff since last
approved state" section + `task_log[].commit_sha` as the only change record (no
parallel hash store).

### 9.3 Risk routing (A4) — auto-recommend, never auto-approve

`node ${PLUGIN_ROOT}/scripts/gate-risk.js --feature-dir <dir>` computes a
deterministic risk class (`low | medium | high`) from existing `.forge-status.yml`
signals (XL/L task sizes, task count, cross-workspace scope, schema/migration
changes, change-request rollbacks, open CRITICAL/HIGH findings,
`v-model`/`express` mode) and records it on `gates[].risk`. Default routing:

| Risk | Routing | Human gate |
|------|---------|------------|
| low | auto-recommend (present a compact summary) | still required — the human records the decision |
| medium | require-human (present the full surface) | required |
| high | block (require explicit human approval) | required; `--ci` blocks here |

**Risk routing changes how much surface is shown and (in `--ci`) what blocks; the
human always records the gate decision — it NEVER auto-approves** (§1 rule 2 and
the `revalidate` "Never auto-approve" rule).

### 9.4 Derived artifacts — review the source, not the output

Generated artifacts (DS-grounded mockups, Playwright `.spec.ts`, OpenAPI stubs) are
marked "derived" in `gate-review.md` and **excluded from the human review
surface**; a machine gate (`${PLUGIN_ROOT}/scripts/validate-traceability.js` +
lint) confirms they match their source, and the human reviews the source spec
diff. The machine gate stays because the generators are not yet trusted blindly.
