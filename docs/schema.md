# Product Forge — Status Schema

> **Status:** normative
> **Consumers:** every reader and writer of `.forge-status.yml`.
> **Companions:** [policy.md](./policy.md), [runtime.md](./runtime.md).

The narrative companion to the machine-readable, **canonical**
[`schema/forge-status-v3.schema.yml`](./schema/forge-status-v3.schema.yml), which
holds the exact field shapes and a fully annotated example (kept separate so
linters and migrations can reference it directly). Read this document for
rationale, writer/reader rules and migration behavior.

---

## 1. Schema v3 overview

v3 is the current schema. It is **strictly additive** over v2 — every v2 file is a
valid v3 file with defaults. The field groups v3 adds (feature mode, phase
instrumentation and digests, skip traceability, `task_log[]`, role approvals,
dependencies, backfill marker, monorepo scope) are catalogued in §5.

---

## 2. Migration from v2 to v3

Rationale and rules: [`schema/migration-v2-to-v3.md`](./schema/migration-v2-to-v3.md).
In short:

1. A file with no `schema_version` OR `schema_version < 3` keeps working unchanged
   — old fields keep their v2 meaning.
2. The first time a v3-aware writer mutates the file, it stamps
   `schema_version: 3` and writes atomically.
3. New optional fields stay absent until a writer that knows them populates them.

No one-time migration run is required. To stamp every existing feature file in one
pass, run `node ${PLUGIN_ROOT}/scripts/migrate-status-v2-to-v3.js` (the `.ts`
sibling is a deprecation stub that exits 64).

---

## 3. Writer responsibilities

Any command that mutates `.forge-status.yml` follows the status-write procedure
in [runtime.md §2.9](./runtime.md#29-status-write-procedure) — lock, read,
initialize-or-migrate, merge (object-form phases, no undeclared fields),
digest before `completed`, stamp `last_updated`, atomic rename, carrier refresh.

### 3.1 Initial document (new features)

The **first** writer of a new feature — whichever command that is (`forge`
intake, `problem-discovery`, `research`, `product-spec` in express/lite,
`backfill`) — creates exactly this document, then merges its own keys:

```yaml
schema_version: 3
feature: "<slug>"
created_at: "<YYYY-MM-DD>"
last_updated: "<ISO-8601 UTC>"
feature_mode: "<resolved mode>"   # from forge triage, --mode, or default_feature_mode
v2_native: true                   # new features are always digest-enforced (runtime.md §8.3)
phases:                            # one object entry per phase in schema/phase-map.yml:
  <phase_key>:                     #   status: "pending"         — `yes`/`opt` for this mode
    status: "pending"              #   status: "not_applicable"  — `no` for this mode
gates: []
task_log: []
```

When the file already exists, a writer merges into it (runtime.md §2.9 step 4) and
**never** re-initializes it — overwriting loses `feature_mode`, the gate trail and
every other phase's state.

---

## 4. Reader tolerance

Readers (including older sub-skills still on the v2 shape) MUST:

1. Treat missing fields as "absent/default" rather than errors.
2. Accept `schema_version: 3` — new fields are additive and harmless.
3. Use the `phases.<name>.status` string as the authoritative phase state,
   even on pre-v3 files.

---

## 5. Field catalog (high level)

| Field | Required for v3 writers | Notes |
|-------|------------------------|-------|
| `schema_version` | yes | integer `3`. |
| `feature` | yes | feature slug. |
| `created_at` | yes | ISO-8601 date. |
| `last_updated` | yes | ISO-8601 timestamp; updated on every write. |
| `config_override` | no | per-feature config map — layer 4 of the config merge ([runtime.md §1](./runtime.md#1-step-0--load-config)). Same keys as `config-template.yml`. |
| `feature_mode` | no | `"express" | "lite" | "standard" | "v-model"`. Defaults to `"standard"`. `"express"` (v1.6) is the lightest track: product_spec → plan → implement → verify. Phase keys `design_system_harvest` (v1.6, UI features) and `spec_merge` (v1.6, living-spec merge) are also valid `phases.<name>` entries. Supporting/extension commands write their own phase keys too: `api_docs`, `security_check`, `tracking_plan`, `i18n_harvest`, `migration_plan`, `monitoring_setup`, `experiment_design` (all `not_applicable` when not run). |
| `backfilled` | no | `true` if the feature was reverse-engineered from existing code by `/backfill`. Defaults to `false`. |
| `v2_native` | no | `true` when the feature's initial document was written per §3.1 (always set for new features; the name is historical, kept for compat). Drives digest enforcement (runtime.md §8.3). Absent or `false` → grandfathered (files migrated from v2). |
| `speckit_mode` | no | preserved from v2. |
| `phases.<name>.status` | yes | one of `pending | in_progress | completed | skipped | completed_with_known_issues | not_applicable`. The `revalidation` phase additionally accepts `approved` for v1/v2 backwards compatibility (same meaning as `completed`). See schema-yml preamble for semantics. |
| `phases.<name>.started_at` / `completed_at` | no | ISO-8601 timestamps. |
| `phases.<name>.tokens_in` / `tokens_out` / `tool_calls` | no | cost tracking. |
| `phases.<name>.digest_path` | no | path to per-phase digest. |
| `phases.<name>.skipped` / `skip_reason` | no | skip policy ([policy.md §3](./policy.md#3-skip-reason-policy-e2)). |
| `phases.implement.red_gate` | no | test-first Red-gate record (`status`, `tests[]`, `skip_reason`); written only by `implement` (runtime.md §6.1). |
| `phases.<name>.produced_by` | conditional | Identity (email/handle) of the human who owned the artifact this phase produced. Required when `role_approvals.solo_mode: false` (distinct-approver rule: `approved_by != produced_by`, policy.md §5.3). |
| `testing.*` | preserved from v2 | yes (same meaning). |
| `task_log[]` | no | per-task runtime log (size, status, paths, commit SHA), populated during Phase 6 implement. Named `task_log` to avoid collision with `phases.tasks`. |
| `gates[]` | yes | append-only. |
| `gates[].approvals` | conditional | required when `solo_mode: false`. |
| `gates[].skip_reason` | conditional | required when `decision == "skipped"` and `require_skip_reason: true`. |
| `gates[].rolled_back_to` | conditional | required when `decision == "rolled_back"`. Phase name to rewind to. |
| `gates[].reviewed_sha` / `risk` | no | delta-review stamp and gate-risk class (policy.md §9). |
| `gates[].reviewed_by_model` / `cross_model_findings` | no | code-review `--cross-model` stamp. |
| `gates[].findings` / `risks_accepted` / `action_items` | no | phase-specific gate extras (code_review / pre_impl_review / release_readiness). |
| `gates[].mode` / `policy_version` / `signals` | no | `forge --ci` headless-gate record. |
| `api_docs_report` | no | api-docs run summary (endpoints, source, files, drift count). |
| `release_readiness.supply_chain_paths` | no | SBOM / SCA / license artifact paths. |
| `sync_runs` | preserved from v2 | yes. |
| `change_requests` | preserved from v2 | yes. |
| `dependencies.depends_on` / `depended_on_by` | no | sibling feature slugs, used by `portfolio`. Default `[]`. |
| `role_approvals.solo_mode` | no | default `true`; multi-role mode adds per-role approval records on gates. |
| `role_approvals.required_roles_per_phase` | no | default `{}`. |
| `scope.paths` | conditional | Required in monorepo mode (absent otherwise). Workspace names from `codebase.paths` that the feature touches. |
| `scope.cross_workspace` | conditional | Required in monorepo mode. `true` when `len(scope.paths) > 1`. |
| `scope.primary` | conditional | Required in monorepo mode. Default workspace for ambiguous operations. |

---

## 6. Example

The fully annotated example is in
[`schema/forge-status-v3.schema.yml`](./schema/forge-status-v3.schema.yml).

---

## 7. Non-goals for v3

- No runtime JSON Schema validation. Writers own shape conformance; `sync-verify`
  catches drift.
- No backward-incompatible changes; users never migrate feature folders manually.
- No server-side state. The schema is pure file content; the state lock
  (runtime.md §2) is the only concurrency primitive.

---

## 8. Cross-artifact ID system

The documented home of the cross-artifact ID prefixes; the traceability matrix
template ([`templates/traceability-matrix.md`](./templates/traceability-matrix.md))
links back to this table.

| Prefix | Artifact | Source phase |
|--------|----------|--------------|
| `REQ-` | Canonical requirement | V-Model pack / `backfill` / canonical `specs/` |
| `US-`  | User story | product-spec |
| `JRN-` | User journey (`STEP-`, `EDGE-` nested) | product-spec (journeys) |
| `FR-`  | Functional requirement | bridge / plan |
| `CMP-` | Design-system component | design-system-harvest / component-map |
| `API-` | Endpoint / event contract | bridge / plan (OpenAPI + AsyncAPI) |
| `TASK-`| Implementation task — canonical id form is **`T0NN`** (zero-padded, no hyphen: `T001`, `T042`), as emitted by `tasks.md` and `task_log[]`. `TASK-NNN` is an accepted alias that `validate-traceability.js` normalizes to `T<int>`; prefer `T0NN` in new artifacts. | tasks |
| `REV-` | Code-review finding *(legacy — folded into `F-` on the gate surface)* | code-review |
| `TC-`  | Test case (`TC-SMK/E2E/API/UNIT/INT/REG`) | test-plan |
| `EVT-` | Telemetry event | tracking-plan |
| `SEC-` | Security finding | security-check |
| `F-`   | Unified gate-review finding (consolidates `REV-` / `CRITICAL-`/`WARNING-` / `D-`/`A-`/`R-` into one gate surface; carries `source` + `dimension`/`layer`) | pre-impl-review / code-review / verify-full → `gate-review.md` |

IDs are stable across artifacts. Every downstream artifact references upstream IDs
rather than restating content.

`F-NNN` findings are written as `- **F-NNN**` bold bullets in `gate-review.md`;
`forge.md`'s auto-recommend pre-gate greps that exact form, so it is load-bearing.
File names and artifact-local IDs (`BUG-`, `CR-`, `DRIFT-`, `ADR-`, `D-`/`A-`/`R-`)
are listed in [file-structure.md](./file-structure.md#naming-conventions).

In the standard forward flow, delta specs / `spec-merge` key on `FR-*` (minted by
`bridge`); `REQ-*` is the canonical id only for the V-Model pack / `backfill`
reverse-engineering path. On a forward-flow row, `req` may therefore be `null`.
