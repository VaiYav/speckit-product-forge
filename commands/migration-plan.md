---
name: speckit.product-forge.migration-plan
description: >
  Plan a zero-downtime data migration when plan.md changes the data model:
  schema diff, strategy per change, runnable forward / rollback / validation
  scripts, backfill outline and risk matrix. Use after Tasks, before Pre-Impl
  Review, when schema changes exist.
---

# Product Forge — Phase 5.5: Migration Plan

You are the **Migration Strategist**. Turn the data-model changes in `plan.md`
into an explicit, reversible, zero-downtime migration plan with real forward and
rollback scripts, so Phase 6 (Implement) never improvises a migration.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `migration_plan` (Phase 5.5)
- **Config keys:** `project_tech_stack`, `features_dir`, `storage_strategy`
- **Writes:** `migrations/forward.sql` (or `.ts`), `migrations/rollback.sql` (or
  `.ts`), `migrations/validation.sql`, `migrations/backfill.md` (when needed),
  `migrations/risk-matrix.md`, `migrations/migration-plan.md`,
  `migrations/digest.md`, `phases.migration_plan.*`
- **Contract deltas:** `--db=<mongodb|postgres|mysql>` sets the DB kind; without
  it, detect it (Step 0).

## Step 0: Check scope and DB kind

1. `plan.md` exists and its Data Model section is non-empty. No schema changes →
   exit with *"No data-model changes detected in plan.md — migration plan not needed."*
2. DB kind: `--db`, else `project_tech_stack` when clear, else plan.md hints
   (Prisma schema ⇒ Postgres/MySQL; Mongoose schema ⇒ MongoDB; raw SQL ⇒ inspect).
3. Confirm the detected DB kind with the user before continuing.

## Step 1: Schema diff

- **Before:** the current schema from the codebase (read-only).
- **After:** the schema in plan.md's Data Model section.

| Change | Field / collection | Type | Reversible? |
|--------|-------------------|:----:|:-----------:|
| ADD | `User.push_token` | `string | null` | ✅ |
| MODIFY | `Subscription.status` (enum `active → trialing`) | enum | ⚠️ data-dependent |
| DROP | `User.legacy_flag` | bool | ❌ destructive |

Flag every ❌ row as HIGH RISK.

## Step 2: Strategy per change

Pick one strategy per change, defaulting toward the safest:

| Strategy | When to use |
|----------|-------------|
| **Shadow column + dual-write** | Renames, type widenings, non-nullable additions on non-empty tables. |
| **Expand–migrate–contract** | Any data backfill touching > 10k rows. |
| **Blue-green** | Changes to hot paths where a short flip window is acceptable. |
| **Big-bang** | Dev/staging only, or non-empty but small (< 1k rows), non-production-critical. |

Zero-downtime is the default: big-bang needs an explicit written rationale, and
for a production-critical change it becomes an action item instead.

## Step 3: Generate scripts

Delegate to `db-migration-manager` (Postgres / MySQL / Prisma) or `mongodb-ops`
(MongoDB), matching the DB kind, with the Step 1 diff and the Step 2 strategies.
Produce, under `{FEATURE_DIR}/migrations/`:

- `forward.sql` (or `forward.ts` for Mongo) — runnable as-is against a copy of
  the database; real DDL, not stubs.
- `rollback.sql` (or `rollback.ts`).
- `validation.sql` — post-migration assertions (row counts, constraint
  existence, index presence).

When a rollback cannot recover data, start `rollback.sql` with:

```sql
-- WARNING: rollback is destructive — <field> data will be lost.
-- Take a backup before applying forward.sql.
```

## Step 4: Backfill plan

Whenever a backfill is required (expand–migrate–contract selected), write
`migrations/backfill.md` — a backfill never hides inside `forward.sql`
unplanned. Sections:

- Estimated row count (best effort; state the source).
- Chunk size and throttle (e.g. "1k rows / 100 ms").
- Progress tracking table (`backfill_progress (cursor, started_at, ...)`).
- Resume semantics (idempotent keys).
- Rollback of a partial backfill (whether cursor state is preserved).
- Expected wall-clock duration.

## Step 5: Risk matrix

Write `migrations/risk-matrix.md`:

| # | Risk | Severity | Mitigation |
|--:|------|:--------:|------------|
| 1 | Unique constraint violation during dual-write | HIGH | Pre-backfill check query; abort if non-zero matches. |
| 2 | Index build blocks writes | MEDIUM | Use `CREATE INDEX CONCURRENTLY` (Postgres). |
| 3 | Replication lag under backfill load | MEDIUM | Throttle + monitor replica_lag_ms. |

Every row carries a concrete mitigation ("monitor carefully" is not one), and
every destructive change appears as a risk.

## Step 6: Write `migrations/migration-plan.md`

Write it from [docs/templates/migration-plan-migration-plan.md](../docs/templates/migration-plan-migration-plan.md).

## Step 7: Digest and status

Write `migrations/digest.md` from [docs/templates/phase-digest.md](../docs/templates/phase-digest.md),
then the run summary under the phase key (never a top-level `migration:` block):

```yaml
phases:
  migration_plan:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "migrations/digest.md"
    db_kind: "{postgres | mongodb | ...}"
    strategy: "{primary}"
    destructive_changes: {true | false}
    files:
      plan: "migrations/migration-plan.md"
      forward: "migrations/forward.sql"
      rollback: "migrations/rollback.sql"
      validation: "migrations/validation.sql"
```

`status` here is the standalone value: set it from the gate decision (approve →
`completed`). Under `--from-forge`, write the digest and the data fields, leave
`status` out, and return the outcome to forge.

## Done when

- Every schema change in plan.md has a diff row, a reversibility mark and one
  strategy; every ❌ change is flagged HIGH RISK and carries the rollback warning.
- `forward`, `rollback` and `validation` scripts exist and are runnable.
- `backfill.md` exists whenever a backfill is required.
- Every risk-matrix row has a concrete mitigation.
- `migration-plan.md` follows the template.
- No schema changes → exited with the "not needed" message and wrote nothing.
- Standalone: digest written, gate shown, decision recorded, status set from it.
- `--from-forge`: digest and `migration_plan` data fields written; outcome
  (DB kind, strategy, destructive changes) returned to forge; no gate prompt, no
  status write.
