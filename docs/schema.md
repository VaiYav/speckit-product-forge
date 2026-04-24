# Product Forge — Status Schema

> **Status:** normative for v1.5.0+
> **Consumers:** every reader and writer of `.forge-status.yml`.
> **Companions:** [policy.md](./policy.md), [runtime.md](./runtime.md).

This document is the narrative companion to the machine-readable reference
[`schema/forge-status-v3.schema.yml`](./schema/forge-status-v3.schema.yml).
Prefer the reference file for exact field shapes; read this document for
rationale and migration behavior.

---

## 1. Schema v3 overview

v3 is the current schema, introduced in Product Forge v1.5.0. It is
**strictly additive** over v2 — every v2 file is a valid v3 file with
defaults.

New field groups in v3:

- **Feature mode** — `feature_mode` drives phase-map selection.
  See [policy.md §4](./policy.md#4-feature-modes-e1).
- **Phase instrumentation** — timestamps, token counts, tool-call counts,
  and a path to the phase's digest artifact (A4).
- **Skip traceability** — `skipped` and `skip_reason` on each phase and at
  each gate. See [policy.md §3](./policy.md#3-skip-reason-policy-e2).
- **Task instrumentation** — `task_log[]` with size, status, paths, and
  commit SHA for each task in `tasks.md`. (This field was named `tasks[]`
  in early v3 drafts; renamed before release to avoid collision with
  `phases.tasks`.)
- **Role approvals** — `role_approvals.solo_mode` default `true`;
  multi-role mode adds per-role approval records on gates.
- **Dependencies** — `dependencies.depends_on` / `depended_on_by` listing
  sibling feature slugs. Used by the `portfolio` command.
- **Backfill marker** — `backfilled: true` on features reverse-engineered
  from existing code by the `backfill` command.
- **Monorepo scope** — `scope.paths` lists which workspaces (from
  `codebase.paths` in project config) the feature touches.
  `scope.cross_workspace` is `true` when multiple workspaces are
  involved. `scope.primary` names the default workspace for ambiguous
  operations. Present only in monorepo mode.

The full field shape lives in
[`schema/forge-status-v3.schema.yml`](./schema/forge-status-v3.schema.yml)
and is canonical.

---

## 2. Migration from v2 to v3

See [`schema/migration-v2-to-v3.md`](./schema/migration-v2-to-v3.md) for the
rationale and rules.

Behavior in short:

1. A file with no `schema_version` OR `schema_version < 3` continues to
   work unchanged — old fields keep their v2 meaning.
2. The first time a v1.5.0-aware writer mutates the file, it stamps
   `schema_version: 3` and writes atomically.
3. New optional fields remain absent until a writer that knows about them
   populates them.

No one-time migration run is required. The helper
`scripts/migrate-status-v2-to-v3.ts` is available if a project wants to
stamp all of its existing feature files in a single pass.

---

## 3. Writer responsibilities

Any sub-skill that mutates `.forge-status.yml` MUST:

1. Acquire the state lock — see [runtime.md §2](./runtime.md#2-state-lock-protocol-a2).
2. Read the existing file. Missing file → treat as empty; create on first write.
3. Apply lazy migration if the file is older than v3 (stamp version, leave
   other fields untouched unless owned by the writer).
4. Use the temp-file + rename pattern for atomic writes.
5. Release the state lock in a `finally` / `trap` handler.

---

## 4. Reader tolerance

Readers (including older sub-skills still on the v2 shape) MUST:

1. Treat missing fields as "absent/default" rather than errors.
2. Never crash on `schema_version: 3` — new fields are additive and harmless.
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
| `feature_mode` | no | `"lite" | "standard" | "v-model"`. Defaults to `"standard"`. |
| `backfilled` | no | `true` if feature was reverse-engineered by `/backfill`. Defaults to `false`. |
| `v2_native` | no | `true` for features created by v1.5.0+ (field name is historical — retained for compat). Drives digest enforcement (runtime.md §8.3). Defaults to `false` (i.e. grandfathered). |
| `speckit_mode` | no | preserved from v2. |
| `phases.<name>.status` | yes | one of `pending | in_progress | completed | skipped | not_applicable`. The `revalidation` phase additionally accepts `approved` for v1/v2 backwards compatibility (same meaning as `completed`). See schema-yml preamble for semantics. |
| `phases.<name>.started_at` / `completed_at` | no | ISO-8601 timestamps. |
| `phases.<name>.tokens_in` / `tokens_out` / `tool_calls` | no | cost tracking. |
| `phases.<name>.digest_path` | no | path to per-phase digest. |
| `phases.<name>.skipped` / `skip_reason` | no | E2 skip policy. |
| `testing.*` | preserved from v2 | yes (same meaning). |
| `task_log[]` | no | per-task runtime log. Populated during Phase 6 implement. Renamed from initial-v3 `tasks[]` to avoid collision with `phases.tasks`. |
| `gates[]` | yes | append-only. |
| `gates[].approvals` | conditional | required when `solo_mode: false`. |
| `gates[].skip_reason` | conditional | required when `decision == "skipped"` and `require_skip_reason: true`. |
| `sync_runs` | preserved from v2 | yes. |
| `change_requests` | preserved from v2 | yes. |
| `dependencies.depends_on` / `depended_on_by` | no | default `[]`. |
| `role_approvals.solo_mode` | no | default `true`. |
| `role_approvals.required_roles_per_phase` | no | default `{}`. |
| `scope.paths` | conditional | Required in monorepo mode. Workspace names from `codebase.paths`. |
| `scope.cross_workspace` | conditional | Required in monorepo mode. `true` when `len(scope.paths) > 1`. |
| `scope.primary` | conditional | Required in monorepo mode. Default workspace for ambiguous operations. |

---

## 6. Example

See [`schema/forge-status-v3.schema.yml`](./schema/forge-status-v3.schema.yml)
for a fully annotated example. This file is intentionally kept in a separate
location so machine-readable tooling (linters, migrations) can reference it
independently of the narrative schema doc.

---

## 7. Non-goals for v3

- No JSON Schema validation is enforced at runtime. Shape conformance is
  the responsibility of writers. Drift is caught by `sync-verify`.
- No backward-incompatible changes. Users never have to migrate their
  feature folders manually.
- No server-side state. The schema is pure file content; the state lock
  (runtime.md §2) is the only concurrency primitive.
