# Migration — `.forge-status.yml` v2 → v3

> **Applies to:** Product Forge v1.5.0 and later.
> **Source schema:** v2 (see the inline example in `commands/forge.md` of v1.3.0).
> **Target schema:** v3 (see [forge-status-v3.schema.yml](./forge-status-v3.schema.yml)).

## Principle

v3 is **strictly additive** over v2. Every v2 file is a valid v3 file with
defaults. No field is removed, renamed, or changed in meaning.

As a result:
- Old sub-skills keep writing v2 shape — this produces valid v3 files.
- New sub-skills write v3 shape — old sub-skills ignore unknown fields.
- Readers of v3 must tolerate missing new fields.

The only migration step is to stamp `schema_version: 3` on the file the first
time a v2-aware sub-skill touches it.

## Automatic migration on read

When the orchestrator reads `.forge-status.yml`:

1. If the file does not exist → create it with v3 shape and exit.
2. If `schema_version` is absent or `1` → apply the legacy v1→v2 migration
   documented in `commands/forge.md` (split `plan_tasks`, add missing phase
   fields, add `gates: []`, `sync_runs:`, `change_requests: []`), then continue.
3. If `schema_version` is `2` → stamp `schema_version: 3` on next write. No
   shape changes required.
4. If `schema_version` is `3` → proceed.

## New fields introduced in v3

| Field | Purpose | Default |
|-------|---------|---------|
| `feature_mode` | Selects phase map (lite/standard/v-model). See E1. | `"standard"` |
| `backfilled` | Marks reverse-engineered features. Set by B2. | `false` |
| `phases.<name>.started_at` / `completed_at` | Wall-clock timestamps. | absent |
| `phases.<name>.tokens_in` / `tokens_out` / `tool_calls` | AI cost tracking. | absent |
| `phases.<name>.digest_path` | Path to per-phase digest (A4). | absent |
| `phases.<name>.skipped` / `skip_reason` | E2 skip-reason policy. | `false` / `null` |
| `task_log[]` | Per-task runtime log: id, size, paths, status, commit_sha. (D4 + D5 + HI-4 from code review.) | `[]` |
| `gates[].approvals` | Per-role approval records (E3 foundation). | absent |
| `gates[].skip_reason` | Reason recorded at gate level. | `null` |
| `dependencies.depends_on` / `depended_on_by` | Cross-feature graph (B1). | `[]` / `[]` |
| `scope.paths` | Monorepo scope — workspace names the feature touches. Set only when project config has `codebase.paths`. | — |
| `scope.cross_workspace` | `true` when `len(scope.paths) > 1`. | — |
| `scope.primary` | Default workspace for ambiguous operations. | — |
| `role_approvals.solo_mode` | When `true`, gates require a single approval. | `true` |
| `role_approvals.required_roles_per_phase` | Consulted when `solo_mode: false`. | `{}` |

## Writer responsibilities

Any sub-skill that mutates `.forge-status.yml` MUST:

1. Acquire the state lock before reading (see A2 state lock protocol).
2. Read the existing file (or create it with v3 defaults if absent).
3. If `schema_version` is absent or `< 3`, upgrade it to `3` and leave other
   fields untouched unless the writer owns them.
4. Write the file atomically (write to `.forge-status.yml.tmp`, then rename).
5. Release the state lock.

## Validation rules (enforced by orchestrator at gate boundaries)

- When a `skipped` phase has no `skip_reason` AND `require_skip_reason: true`
  in project config → the gate is rejected with a prompt to provide a reason.
- When `feature_mode: lite` → only the lite phase subset is advanced
  (see `docs/policy.md`).
- When `role_approvals.solo_mode: false` → a gate is not counted as approved
  until every role in `required_roles_per_phase[<phase>]` has a non-null entry
  in `gates[].approvals`.

## Consequences for existing features

Every feature directory created before v1.5.0 continues to work unchanged.
The first time a v1.5.0 sub-skill writes to its `.forge-status.yml`, the file
receives `schema_version: 3` and may acquire new optional fields as sub-skills
populate them. No user intervention is required.

## Helper script

`scripts/migrate-status-v2-to-v3.js` is a zero-dependency Node.js helper.
It reads each `features/*/.forge-status.yml`, stamps `schema_version: 3`,
and writes back. Running it is optional — the orchestrator performs the
same stamping lazily on first write.

```bash
# Dry-run (prints what would change; writes nothing):
node scripts/migrate-status-v2-to-v3.js --dry-run

# Apply:
node scripts/migrate-status-v2-to-v3.js

# Custom features directory:
node scripts/migrate-status-v2-to-v3.js --features-dir=custom/features
```

No package.json, tsconfig, or external dependencies are required — the
script uses only `node:fs` and `node:path`.

The prior `migrate-status-v2-to-v3.ts` entry point is kept as a stub that
redirects to the JS version and exits non-zero.
