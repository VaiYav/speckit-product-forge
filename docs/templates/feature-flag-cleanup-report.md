> Template for `{features_dir}/_portfolio/flag-cleanup-{date}.md` — written by `feature-flag-cleanup` Step 5 (recipes from Step 4).

## Report

```markdown
# Feature Flag Cleanup — {YYYY-MM-DD}

## Summary

| Class | Count |
|-------|------:|
| Stale | {N} |
| Approaching | {N} |
| Active | {N} |
| Orphan | {N} |

## Stale flags ready to remove
{per-flag recipes from Step 4}

## Approaching (14 days)
{light reminders}

## Orphans
{orphan sections}

## Next steps
1. Review Stale flags with their owners.
2. For approved removals, apply the removal diffs manually or via `feature-flag-manager` (`--apply` is reserved and not available yet).
3. For Orphans: either register retroactively or schedule cleanup.
```

## Stale flag — removal recipe

```markdown
### {flag-key}

- **Owner:** @alice
- **Rolled out since:** 2026-02-14
- **Cleanup plan:**
  1. Inline the `treatment` branch at {path}:{line}.
  2. Remove the `control` branch and the flag check.
  3. Delete flag definition at {flag-config-path}.
  4. Update `{FEATURE_DIR}/flags/registry.yml` (the feature root `enumerate()` returned) — mark `removed_at: {today}`.
  5. Delete the flag in the provider dashboard (manual step).
- **Expected diff size:** ~{N} lines.
- **Risk:** {LOW | MEDIUM | HIGH — e.g. HIGH if branch is deeply nested}.
- **Test impact:** {N} test files reference the flag.
```

## Approaching flag — reminder

```markdown
### {flag-key}

- `cleanup_after` in {N} days. Owner @alice, consider scheduling removal.
```

## Orphan flag (with `--include-non-registry`)

```markdown
### {flag-key} (orphan)

Not tracked in any registry. First reference at {path}:{line}. Ask:
- When was this flag added?
- Is it still experimental or was it intended to ship?
- Should it be retroactively registered?
```
