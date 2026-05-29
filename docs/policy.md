# Product Forge — Policy

> **Status:** normative for v1.5.0+
> **Consumers:** `commands/forge.md` and every sub-skill.
> **Companions:** [runtime.md](./runtime.md), [schema.md](./schema.md).

This document is the single source of truth for orchestration rules, gate
behavior, skip handling, feature modes, and role approvals. Sub-skills defer
to it instead of repeating rules in their own files.

---

## 1. Operating Rules

1. **One phase at a time.** Never run phases in parallel. Under the default
   `flow_mode: gated` they also run in strict order. Under `flow_mode: fluid`
   (§4.0.1) phases still run one at a time but the user may choose the order among
   the currently-runnable phases (dependencies are enablers, not strict gates);
   `sync-verify` and the gate audit trail still apply.
2. **Human gate after every phase.** After each sub-skill completes, summarize the outcome and present a **structured gate prompt** (see [interaction.md](./interaction.md) and the `Gate` template in [templates/interaction-prompts.md](./templates/interaction-prompts.md)) offering:
   - **Approve** → proceed to next phase
   - **Revise** → re-run same phase with feedback
   - **Skip** → mark skipped and move on (requires confirmation; may also require a reason, see §3)
   - **Abort** → stop everything
   - **Rollback** → jump back to an earlier phase by name

   Every decision point (gates, mode/track selection, skip reasons, clarification
   rounds, and the next-action choice at each handoff) MUST use the structured
   interaction convention rather than free-form "ask the user" prose. This is
   normative across all sub-skills — see [interaction.md](./interaction.md).
3. **Show progress.** Use `TodoWrite` (or equivalent) to show all phases and mark current/completed.
4. **Pass full context forward.** When delegating, always include: `FEATURE_DESCRIPTION`, `FEATURE_DIR`, project config, and prior phase outputs summary.
5. **Suppress sub-agent handoffs.** When delegating, prepend: *"You are invoked by Product Forge Orchestrator. Do NOT follow handoffs or auto-forward. Return output to the orchestrator and stop."*
6. **Context budget awareness.** If context feels heavy at phase boundaries, summarize prior phases and offer to continue in a new session with auto-resume via `.forge-status.yml`.
7. **Git checkpoints.** After Phase 6, Phase 7, and Phase 8B complete, offer a WIP commit. Never auto-commit — always ask first.
8. **Testing phases are optional.** After Phase 7, ask whether to run 8A/8B. Respect the user's choice.
9. **Release readiness is optional by default.** After testing (or after Phase 7 if testing was skipped), offer Phase 9. Projects may set `release_readiness: required` in config to force it.
10. **Sync-verify at transitions.** Run `sync-verify --quick` between phase transitions. See [runtime.md §5](./runtime.md#5-sync-verify-integration).
11. **Record gate decisions.** Every gate decision is appended to the `gates:` array of `.forge-status.yml`. See [runtime.md §6](./runtime.md#6-gate-audit-trail).
12. **Respect the state lock.** Before any write to `.forge-status.yml`, follow the state-lock protocol in [runtime.md §2](./runtime.md#2-state-lock-protocol-a2). Two concurrent writers must never be allowed.

---

## 2. Gate Decisions

Every gate decision is one of the following literals, recorded in the `decision`
field of a `gates[]` entry:

| Decision | Meaning | Requires |
|----------|---------|----------|
| `approved` | User approved, proceed to next phase. | — |
| `approved_with_conditions` | User approved but flagged follow-ups. | `conditions: [...]` populated. |
| `revised` | User asked for re-run with feedback. | `notes` populated. |
| `skipped` | User chose to skip an optional phase. | `skip_reason` populated when `require_skip_reason: true`. See §3. |
| `rolled_back` | User rewound to an earlier phase. | `rolled_back_to: "<phase-name>"` field populated. Subsequent phases' statuses reset to `pending`; their original completion is preserved in `gates[]` history. |
| `aborted` | User terminated the lifecycle for this feature. | `notes` populated. |

The user-facing Rollback action in §1.2 maps to a `rolled_back` gate entry.
Abort (stop everything) maps to `aborted`. The two are distinct: rollback
preserves the feature and allows continuation from the rewound phase;
abort ends the lifecycle.

---

## 3. Skip-Reason Policy (E2)

Skipping an optional phase may hide a real risk. The policy balances speed with
traceability.

**Config:**

```yaml
# .product-forge/config.yml
require_skip_reason: true   # default
```

**Rules:**

1. Only optional phases may be skipped. Current optional phases:
   `problem_discovery`, `pre_impl_review`, `code_review`, `test_plan`,
   `test_run`, `release_readiness`.
2. When a user selects "Skip" at a gate:
   - If `require_skip_reason: true` → prompt `"Reason for skipping?"` and
     persist the free-text answer in `gates[].skip_reason` AND in
     `phases.<name>.skip_reason`. Set `phases.<name>.status = "skipped"`.
   - If `require_skip_reason: false` → accept the skip without reason.
3. **Empty or whitespace-only reasons under `require_skip_reason: true`
   reject the Skip.** The orchestrator MUST re-prompt for a non-empty
   reason; it MUST NOT advance to the next phase and MUST NOT write a
   `skipped` gate entry until a non-empty reason is supplied. Under
   `require_skip_reason: false`, empty reasons are accepted and
   `skip_reason` is persisted as `null` on both the phase and the gate.
4. The `sync-verify` cross-cutting command flags features with ≥3 optional
   phases `skipped` without reasons as "insufficient traceability".
   Under a correctly-configured `require_skip_reason: true` policy this
   should only arise for features carried forward from earlier versions;
   new `skipped` gates under the strict policy always have a reason.

**`not_applicable` is NOT a skip.** Phases set to `status: "not_applicable"`
are outside the scope of this policy:

- Phases excluded by the feature's mode (for example, everything except
  the 5 lite-mode phases in a `feature_mode: lite` feature).
- Phases never run for a `backfilled: true` feature
  (`problem_discovery`, `research`, `revalidation`, `bridge`).

`not_applicable` phases do NOT require a `skip_reason`, do NOT count
toward the "insufficient traceability" threshold, and do NOT produce
gate entries. They are modelled as "never was in scope", not "we chose
to skip".

---

## 4. Feature Modes (E1)

Each feature selects a **mode** that drives the phase map. The mode is stored
in `.forge-status.yml` under `feature_mode` and defaults to `standard`.

### 4.0 Intake / triage (E1.5)

Before a mode is fixed, the orchestrator runs an **intake/triage** step: it
classifies the change from the description plus codebase signals (files touched,
modules referenced, presence of UI, schema/contract changes) and **recommends a
track** via a structured `Track` prompt (see
[templates/interaction-prompts.md](./templates/interaction-prompts.md)).

| Classification | Recommended track | Rationale |
|----------------|-------------------|-----------|
| Trivial (copy/config/one-liner, no UI, no schema) | `express` | Avoid Big-Design-Up-Front overhead. |
| Bugfix / small (≤5 tasks, single module) | `lite` | Light spec, fast path. |
| Standard feature | `standard` | Full research → ship lifecycle. |
| Regulated / safety-critical | `v-model` | Audit-grade traceability. |

The recommendation is a default, not a mandate — the user may pick any track. The
chosen value is written to `feature_mode` (express is a first-class mode value;
"track" is only the user-facing word at intake — there is no separate `track` field).
Unlike escalation (§4.2), triage may recommend a **downgrade** (e.g.
`standard → lite`) for a new feature before any artifacts exist.

### 4.0.1 Flow mode: gated vs fluid

`flow_mode` (config, default `gated`) controls sequencing independently of the
phase map:

- **`gated`** — classic: one phase at a time, human gate after each (§1).
- **`fluid`** — "actions, not phases" (OpenSpec model): any in-scope phase is
  runnable on demand; the orchestrator presents dependencies as *enablers*
  ("Plan is ready to run because Spec exists") rather than forcing strict order.
  `sync-verify` still guards drift, and gate decisions are still recorded. Use
  fluid for exploratory or iterative work; use gated for regulated/standard runs.

See [runtime.md](./runtime.md) for how fluid mode resolves the next runnable set.

### 4.1 Phase maps

**Express track** — for trivial changes (copy tweaks, config, one-liners with no
UI and no schema/contract change). A single combined pass:

| # | Phase | Required? |
|---|-------|-----------|
| 2 | `product_spec` (minimal: 1 journey + AC) | required |
| 5 | `plan` (inline) | required |
| 6 | `implement` | required |
| 7 | `verify` | required |

Express is append-only escalatable to `lite` or `standard` (§4.2) if the change
turns out larger than triage estimated. All non-express phases are
`status: "not_applicable"`.

**Lite mode** — for bug fixes, refactors, and small features (≤5 tasks, single module):

| # | Phase | Required? |
|---|-------|-----------|
| 0 | `problem_discovery` | optional |
| 2 | `product_spec` (light) | required |
| 5 | `plan` | required |
| 6 | `implement` | required |
| 7 | `verify` | required |

**Standard mode** — the full standard lifecycle (20 phase slots: 8 always-on core + 12 optional/conditional) documented in `commands/forge.md`.

**V-Model mode** — replaces the middle of the standard lifecycle with the
formal V-Model artifact progression for regulated / safety-critical work.
Requires the external optional extension
[leocamello/spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model)
(v0.5.0 or higher). See [v-model-integration.md](./v-model-integration.md)
for the full phase map, detection logic, and fallback rules.

Key properties:

- The V-Model plugin owns Phases V1–V13: requirements, acceptance, system /
  architecture / module design paired with system / integration / unit test
  plans, trace checkpoints, peer review, test results ingestion, and audit
  report.
- Product Forge owns the bookends: problem-discovery, research, tasks,
  implement, verify-full, test-plan / test-run (browser E2E), release-
  readiness.
- Missing plugin → abort, no silent degradation. Regulated work must not
  ship without the formal artifacts.
- Domain selection (IEC 62304 / ISO 26262 / DO-178C / generic) lives in
  `v-model-config.yml` at project root, read by the delegated commands.

### 4.2 Escalation

A feature may be **escalated** up the ladder (`express → lite → standard`) when it
grows beyond the current track's expectations. Express escalates to lite when it
gains UI, a second module, or a schema/contract change. Lite escalates to standard
when any of:

- `task_log[].size` contains `L` or `XL` entries.
- The tasks array exceeds 10 items.
- The plan references more than 3 modules.

Escalation is append-only — previous artifacts remain, missing standard-mode
artifacts are generated on demand. No data is ever deleted.

### 4.3 Deselection

A standard-mode feature may **not** be demoted to lite mode. Moving backwards
would orphan artifacts; instead, archive the feature and start a new one if
scope shrank that dramatically.

---

## 5. Role Approvals (E3 foundation)

Gates default to single-approval (solo mode). Projects may opt in to multi-role
approval.

```yaml
# .forge-status.yml
role_approvals:
  solo_mode: true                  # default
  required_roles_per_phase: {}     # used only when solo_mode: false
```

### 5.1 Solo mode

Any single "approve" from the orchestrator user counts as approval. The
`gates[].approvals` object is omitted. This is the legacy v2 behavior.

The §5.3 distinct-approver rule is **advisory** in solo mode: a single developer
necessarily both produces and approves the artifact, so the rule cannot be
satisfied. The orchestrator MAY surface a one-line reminder
(`"solo mode: this artifact was authored and approved by the same identity"`)
but MUST NOT block. *(v1.6, W5-C3)*

### 5.2 Multi-role mode

When `solo_mode: false`:

- Every gate entry has `approvals: { pm: ..., eng: ..., qa: ... }`.
- A gate is counted as `approved` only when every role listed in
  `required_roles_per_phase[<phase>]` has a non-null entry **whose
  `approved_by` identity differs from the phase artifact's author
  (`phases.<phase>.produced_by`)** — the §5.3 distinct-approver rule, which is
  **enforced** in multi-role mode.
- Roles not listed are ignored for that phase.

Example:

```yaml
required_roles_per_phase:
  pre_impl_review: ["pm", "eng"]
  release_readiness: ["pm", "eng", "qa"]
```

Multi-role mode is **opt-in** and is not forced on solo users.

### 5.3 Distinct-approver rule (v1.6, W5-C3)

The same identity may not both author/produce a phase artifact and approve its
gate. This is a real structured rule on the role model above, not a floating
note: it compares two carrier fields that already exist on `.forge-status.yml`
(or are defined here for that purpose).

**Carrier fields (the comparison anchors):**

| Side | Field | Value | Producer |
|------|-------|-------|----------|
| Author | `phases.<phase>.produced_by` | identity (email/handle) of the human who owned the artifact this phase produced | written by the orchestrator at phase completion when `role_approvals.solo_mode: false` |
| Approver | `gates[].approvals.<role>.approved_by` | identity that approved for that role | already written at the gate (§5.2, runtime §6) |

> `produced_by` is the producing **human** identity, not the orchestrator AI
> (every artifact is AI-drafted, so comparing against the AI would make the rule
> vacuously always-true). When unset/null the rule cannot be evaluated and the
> orchestrator MUST prompt for the producing identity before recording a
> multi-role `approved` gate.

**Rule by mode:**

- **`solo_mode: true` — advisory.** See §5.1: warn-only, never blocks.
- **`solo_mode: false` — enforced.** For a gate to count as `approved`, every
  required role's `approved_by` MUST be non-null **and** MUST NOT equal
  `phases.<phase>.produced_by`. If any required role's approver equals the
  author, the orchestrator MUST NOT write an `approved` gate; it re-prompts for
  a distinct approver for that role (a Revise/Approve loop, never an
  auto-approve — Operating Rule §1.2).

**Single-role edge case (no deadlock).** When
`required_roles_per_phase[<phase>]` lists exactly one role and the author holds
that role, the author's own approval does **not** satisfy the gate: a
**different identity** holding the same role must record the `approved_by`.
This makes the rule total — there is no multi-role configuration in which the
author can self-approve their way past the gate.

This rule is additive: it never relaxes the §5.2 "every required role non-null"
condition, it only adds the `approved_by != produced_by` constraint on top.

---

## 6. Optional Phase Governance

| Phase | Default state | May be made required via config key |
|-------|---------------|--------------------------------------|
| `problem_discovery` | optional | `require_problem_discovery: true` |
| `pre_impl_review` | optional | `require_pre_impl_review: true` |
| `code_review` | optional | `require_code_review: true` |
| `test_plan` / `test_run` | optional | `require_testing: true` |
| `release_readiness` | optional | `release_readiness: required` |

When a phase is required by config, the "Skip" option is hidden at the gate.

---

## 7. Mode vs Optional Phase Interaction

In lite mode, every phase that is not in the lite phase map (see §4.1) is
written to `.forge-status.yml` with `status: "not_applicable"`. This
includes both "required in standard mode" phases like `research` and
optional phases like `test_run`. The `gates[]` entries for these phases
are **not** written — gates only exist for phases that actually ran.

`not_applicable` is explicit and auditable — a later inspection of the
status file can tell the difference between "phase was in scope but not
yet started" (`pending`) and "phase was never in scope for this feature"
(`not_applicable`).

Standard and V-Model modes follow §3 skip policy for optional phases.
Their non-applicable phases are rare — typically only
conditionally-triggered ones (i18n-harvest when English-only,
migration-plan when no schema changes, experiment-design when no
A/B flag) resolve to `not_applicable` automatically.

---

## 8. Change Management

Every change request is governed by `/speckit.product-forge.change-request`
and results in a `change_requests[]` entry on `.forge-status.yml`. Policy:

- A change request that invalidates a completed phase rewinds status to that
  phase. Artifacts from rewound phases are archived, not deleted.
- A change request is blocked during Phase 6 (implement) until the current
  task is committed or explicitly discarded.

---

## 9. Gate review surface & risk routing (W5-A)

The review phases share **one** surface and a single finding id, and each gate
is **risk-routed** so the amount of review presented matches the change's risk.

### 9.1 Unified gate-review artifact (A3)

`pre-impl-review`, `code-review`, and `verify-full` write their findings into a
single `<FEATURE_DIR>/gate-review.md` under one `F-NNN` namespace (collapse-by-
default, grouped by journey/contract/component/general). This is a **consolidated
view, not a replacement** — each phase still runs its own analysis. The legacy
`D-/A-/R-`, `REV-`, and `CRITICAL-/WARNING-` ids fold into `F-NNN` (carrying
`source` + `dimension`/`layer`). See
[templates/gate-review.md](./templates/gate-review.md) and the `F-` row in
[schema.md §8](./schema.md#8-cross-artifact-id-system).

### 9.2 Delta / incremental review (A2)

Each gate decision stamps `gates[].reviewed_sha` (the git SHA / artifact stamp
reviewed). On a **re-run**, the gate presents only findings whose artifact
changed since `reviewed_sha`, plus previously-approved findings whose file
changed (flagged "review may be stale"). Reuse the `phase-digest.md`
"Diff since last approved state" section + `task_log[].commit_sha`; do not add a
parallel hash store.

### 9.3 Risk routing (A4) — auto-recommend, never auto-approve

`node scripts/gate-risk.js --feature-dir <dir>` computes a deterministic risk
class (`low | medium | high`) from existing `.forge-status.yml` signals (XL/L
task sizes, task count, cross-workspace scope, schema/migration changes,
change-request rollbacks, open CRITICAL/HIGH findings, `v-model`/`express` mode)
and records it on `gates[].risk`. Default routing:

| Risk | Routing | Human gate |
|------|---------|------------|
| low | auto-recommend (present a compact summary) | still required — the human records the decision |
| medium | require-human (present the full surface) | required |
| high | block (require explicit human approval) | required; `--ci` blocks here |

**Risk routing changes how much surface is shown and (in `--ci`) what blocks —
it NEVER auto-approves a human gate.** This preserves Operating Rule §1.2
("human gate after every phase") and the `revalidate` "Never auto-approve" rule.

### 9.4 Derived artifacts — review the source, not the output (A5)

Generated artifacts (DS-grounded mockups, Playwright `.spec.ts`, OpenAPI stubs)
are marked "derived" in `gate-review.md` and **excluded from the human review
surface**; a machine gate (the two-layer review:
`scripts/validate-traceability.js` + lint) confirms they match their source. The
human reviews the source spec diff, not the generated file. This is LITE — the
machine gate stays (Product Forge's generators are not yet trusted blindly).
