> Template for `migrations/migration-plan.md` — written by `migration-plan` Step 6.

```markdown
# Migration Plan — {Feature Name}

> Generated: {ISO}
> DB: {kind}
> Strategy: {primary strategy}

## Schema diff
{table from Step 1}

## Strategy per change
{list mapping change → strategy with rationale}

## Files produced
- `migrations/forward.sql`
- `migrations/rollback.sql`
- `migrations/validation.sql`
- `migrations/backfill.md` (if backfill needed)
- `migrations/risk-matrix.md`

## Pre-migration checklist
- [ ] Take backup of affected tables
- [ ] Announce migration window (if required)
- [ ] Verify monitoring and alerts are active
- [ ] Dry-run on staging with production-shaped data

## Rollback trigger criteria
- Validation query fails
- Error rate exceeds baseline by {threshold}
- Replication lag > {threshold}

## Owner
{person or team}
```
