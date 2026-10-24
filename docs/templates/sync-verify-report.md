> Template for `sync-report.md` — written by `sync-verify` Step 4.

Each finding uses the **DRIFT item** block; the report embeds every item under
`## All Drift Items`. Status markers follow the
[interaction legend](../interaction.md#4-rules).

## DRIFT item

```markdown
### DRIFT-{NNN}: {short title}

| Field | Value |
|-------|-------|
| **Layer** | {1-10}: {layer name} |
| **Direction** | Forward (earlier → later) / Backward (later → earlier) |
| **Severity** | CRITICAL / WARNING / INFO |
| **Category** | structural / cosmetic (see Step 3A) |
| **Source artifact** | {file path} |
| **Target artifact** | {file path} |
| **Evidence** | {specific text or reference from source; commit/author for orphans} |
| **Expected** | {what should exist in target} |
| **Actual** | {what actually exists (or "missing")} |

**Proposed resolution:**
{Specific change to make — which file, what to add/update/remove}

**Auto-resolvable:** {true if category is cosmetic AND auto_resolve.cosmetic is enabled}

**Approval:** [ ] Approve / [ ] Reject / [ ] Defer
```

## Report

```markdown
# Sync & Verify Report: {Feature Name}

> Feature: {slug} | Date: {today}
> Layers checked: {N}/{applicable} | Skipped: {list of skipped layers and why}
> Phase: {current phase from .forge-status.yml}

## Summary

| Severity | Count |
|----------|-------|
| ❌ CRITICAL | {N} |
| ⚠️ WARNING | {N} |
| INFO | {N} |
| ✅ CLEAN | {N} layers with no drift |

**Verdict:** {CONSISTENT / DRIFT DETECTED / CRITICAL DRIFT}

## Layer Results

### Layer 1: research/ ↔ product-spec/ — {✅ CLEAN / ⚠️ {N} findings / ❌ {N} findings}
{findings or "No drift detected"}

### Layer 2: product-spec/ ↔ spec.md — {status}
{findings or "No drift detected"}

... (Layers 3–7 the same way)

### Layer 8: FE ↔ BE Contract Drift — {✅ CLEAN / ⚠️ {N} findings / ❌ {N} findings}
{findings or "No drift detected"}

### Layer 9: Doc ↔ Code Reconciliation — {✅ CLEAN / ⚠️ {N} findings / ❌ {N} findings}
{findings or "No drift detected"}

### Layer 10: Constitution ↔ Code — {✅ CLEAN / ⚠️ {N} findings / ❌ {N} findings / N/A — no constitution}
{findings or "No drift detected"}

## All Drift Items

{DRIFT-001 through DRIFT-NNN with approval checkboxes}

## Auto-resolutions applied

{only when Step 3A auto-resolve ran: every changed path}

## Proposed Actions

1. {Action for DRIFT-001}
2. {Action for DRIFT-002}
...

## Sync History

| Run | Date | Layers | CRITICAL | WARNING | Verdict |
|-----|------|--------|----------|---------|---------|
| #{N} | {date} | {N}/{applicable} | {N} | {N} | {verdict} |
```
