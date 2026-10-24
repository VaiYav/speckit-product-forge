> Template for `security-check.md` — written by `security-check` Step 4.

Number findings `SEC-001`, `SEC-002`, … across all severities, most severe first. Omit a
severity section that has no findings. *Ship readiness* is ✅ Ready (no critical or high
findings), ⚠️ Fix critical issues first, or ❌ Not ready.

````markdown
# Security Audit: {Feature Name}

> Audited: {date} | Phase: post-implement
> Feature: `{feature-slug}`
> Auditor: Product Forge Security Check

## Threat Model Summary

Detected surfaces: {list of detected surfaces}
Skipped (not applicable): {list of skipped OWASP categories}

## Findings

### CRITICAL (must fix before ship)

#### SEC-001: {Title}
**Category:** {OWASP A0X — name}
**File:** `{path/to/file.ts}:{line}`
**Evidence:**
```typescript
{vulnerable code snippet}
```
**Risk:** {what an attacker can do}
**Fix:**
```typescript
{safe code pattern}
```

---

### HIGH (fix before release)

#### SEC-002: {Title}
...

---

### MEDIUM (fix soon, document workaround)

#### SEC-003: {Title}
...

---

### LOW (fix in maintenance)

#### SEC-004: {Title}
...

---

## Passed Checks ✅

| Check | Category | Result |
|-------|----------|--------|
| Auth guard on all protected endpoints | A01 | ✅ Pass |
| No hardcoded secrets found | A02 | ✅ Pass |
| ORM queries only (no string concat) | A03 | ✅ Pass |
| Rate limiting on login endpoint | A04 | ✅ Pass |
| All added deps registry-verified, none denylisted/missing | A06 | ✅ Pass |
| ... | ... | ... |

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | {N} | {must fix} |
| High | {N} | {fix before release} |
| Medium | {N} | {fix soon} |
| Low | {N} | {maintenance} |
| Passed ✅ | {N} | — |

**Ship readiness:** {✅ Ready / ⚠️ Fix critical issues first / ❌ Not ready}
````
