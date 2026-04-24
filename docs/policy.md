# Product Forge — Policy

> **Status:** normative for v1.5.0+
> **Consumers:** `commands/forge.md` and every sub-skill.
> **Companions:** [runtime.md](./runtime.md), [schema.md](./schema.md).

This document is the single source of truth for orchestration rules, gate
behavior, skip handling, feature modes, and role approvals. Sub-skills defer
to it instead of repeating rules in their own files.

---

## 1. Operating Rules

1. **One phase at a time.** Never skip ahead or run phases in parallel.
2. **Human gate after every phase.** After each sub-skill completes, summarize the outcome and ask the user to:
   - **Approve** → proceed to next phase
   - **Revise** → re-run same phase with feedback
   - **Skip** → mark skipped and move on (requires confirmation; may also require a reason, see §3)
   - **Abort** → stop everything
   - **Rollback** → jump back to an earlier phase by name
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

### 4.1 Phase maps

**Lite mode** — for bug fixes, refactors, and small features (≤5 tasks, single module):

| # | Phase | Required? |
|---|-------|-----------|
| 0 | `problem_discovery` | optional |
| 2 | `product_spec` (light) | required |
| 5 | `plan` | required |
| 6 | `implement` | required |
| 7 | `verify` | required |

**Standard mode** — the full 14-phase lifecycle documented in `commands/forge.md`.

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

A feature may be **escalated** from lite to standard when it grows beyond
lite-mode expectations. The orchestrator proposes escalation when any of:

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

### 5.2 Multi-role mode

When `solo_mode: false`:

- Every gate entry has `approvals: { pm: ..., eng: ..., qa: ... }`.
- A gate is counted as `approved` only when every role listed in
  `required_roles_per_phase[<phase>]` has a non-null entry.
- Roles not listed are ignored for that phase.

Example:

```yaml
required_roles_per_phase:
  pre_impl_review: ["pm", "eng"]
  release_readiness: ["pm", "eng", "qa"]
```

Multi-role mode is **opt-in** and is not forced on solo users.

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
