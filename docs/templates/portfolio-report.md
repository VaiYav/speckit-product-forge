# Portfolio Report Template

> **Purpose:** canonical layout of `{features_dir}/_portfolio/portfolio.md`
> produced by `/speckit.product-forge.portfolio`. Keep every section,
> even when empty, so downstream tooling can key off headings.

---

```markdown
# {Project Name} — Portfolio

> Generated: {ISO-8601 timestamp}
> Feature count: {total} ({in-flight}, {completed}, {archived})

## 1. Feature table

| Feature | Mode | Current phase | Status | Days in phase | Backfilled | Blocked by |
|---------|------|---------------|--------|---------------|:----------:|------------|
| {slug}  | {lite|standard|v-model} | {phase} | {pending|in_progress|completed|skipped} | {N} | {✓/✗} | {slug, slug, ...} |

## 2. Conflicts

Conflict detection scope: in-flight features only. Severity legend:
HIGH = ≥3 path overlaps or any overlap in config/schema/migrations;
MEDIUM = 1–2 path overlaps; LOW = shared parent module only (not listed).

| Severity | Feature A | Feature B | Overlapping paths |
|:--------:|-----------|-----------|-------------------|
| HIGH     | {slug}    | {slug}    | `{path}`, `{path}`, ... |
| MEDIUM   | {slug}    | {slug}    | `{path}` |

If no conflicts: **"No conflicts detected."**

### Conflict detection accuracy

- Features with `tasks.md` path annotations: {N}
- Features using module-name fallback (coarser): {N}
- Features skipped (no `tasks.md`): {N}

## 3. Dependency graph

```mermaid
graph LR
  %% Directed edges: depends_on flows from dependency to dependent
  {slug_B}-->{slug_A}
  {slug_C}-->{slug_A}
  {slug_C}-->{slug_D}
```

Legend: `A-->B` means `B depends_on A` (A must ship or stabilize before B).

## 4. Suggested merge order

1. {slug} — {reason: no dependencies, ready since {date}}
2. {slug} — {reason: depends on (1); ready since {date}}
3. ...

If no ready features: **"No features ready to merge."**

## 5. In-flight summary

### By phase

| Phase | Count |
|-------|------:|
| research | {N} |
| product_spec | {N} |
| plan | {N} |
| tasks | {N} |
| implement | {N} |
| verify | {N} |
| test_run | {N} |
| release_readiness | {N} |

### By mode

| Mode | Count |
|------|------:|
| lite | {N} |
| standard | {N} |
| v-model | {N} |

## 6. Action items

| # | Severity | Item |
|--:|:--------:|------|
| 1 | CRITICAL | {dependency cycle: slug → slug → slug} |
| 2 | CRITICAL | {feature <slug>: unreadable status file} |
| 3 | WARNING  | {feature <slug>: no update in {N} days} |
| 4 | INFO     | {feature <slug>: all tasks complete but verify not run} |

If no action items: **"Portfolio is healthy."**

## 7. Methodology notes

- Digest-first scan: feature phases are read from `<phase>/digest.md`
  when present; full artifacts are pulled only for tasks that need file
  paths.
- Idempotency: re-running this command produces byte-identical output
  up to the `Generated` timestamp.
- Archived features are excluded by default. Re-run with
  `--include-archived` to see them.
```
