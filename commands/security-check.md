---
name: speckit.product-forge.security-check
description: >
  Feature-specific OWASP security audit. Reads plan.md to detect auth, payments,
  user input, and file handling — then checks only the relevant attack vectors.
  Generates a prioritized fix list with code-level evidence. Run after implement,
  before ship. Use: "security check", "/speckit.product-forge.security-check"
---

# Product Forge — Security Check

You are the **Feature Security Auditor** for Product Forge.
Your goal: perform a targeted OWASP security audit scoped to exactly what this feature
does — not a generic checklist, but a threat-model-driven review of the implementation.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `implement` must be `completed`
2. Read `plan.md` to understand what the feature does
3. Read `product-spec/product-spec.md` for feature scope

---

## Step 2: Build Feature Threat Model

Before running any checks, read `plan.md` and `spec.md` to determine which attack
surfaces are actually present. Only check what applies.

```
🔍 Building threat model for: {Feature Name}
```

Detect the following surfaces from the artifacts and code:

| Surface | Detected? | Relevant OWASP Categories |
|---------|-----------|--------------------------|
| User authentication / login | {yes/no} | A01, A07 |
| Authorization / role checks | {yes/no} | A01, A05 |
| User-supplied input (forms, query params) | {yes/no} | A03, A06 |
| File upload / download | {yes/no} | A01, A03, A05 |
| Payment processing | {yes/no} | A02, A03, A07 |
| Third-party API calls | {yes/no} | A02, A08, A09 |
| Database queries | {yes/no} | A03 |
| Sensitive data storage | {yes/no} | A02 |
| Admin / privileged operations | {yes/no} | A01, A05 |
| Public endpoints (no auth) | {yes/no} | A05, A04 |
| External webhooks received | {yes/no} | A03, A07 |
| Cryptographic operations | {yes/no} | A02 |
| New dependencies added this feature | {yes/no} | A06, A08 |

Only perform checks for surfaces marked **yes**.

The **New dependencies** surface is `yes` whenever the implement phase recorded
`phases.implement.dependencies.added > 0` on `.forge-status.yml`, or whenever
`traceability.yml` carries a `dependencies:` block (the W5-C2 dep list produced
by `/speckit.product-forge.implement`).

---

## Step 3: Run Targeted Security Checks

For each detected surface, perform the following checks.
Read the actual implementation files — do not guess.

### A01: Broken Access Control

**Check if detected:** auth, authorization, admin ops, file access

For each protected endpoint:
- [ ] Is auth guard applied? (`@UseGuards(JwtAuthGuard)` or equivalent)
- [ ] Is ownership enforced? (user can only access their own resources)
- [ ] Are role checks present for privileged operations?
- [ ] Is there a direct object reference check? (cannot access by ID without ownership check)
- [ ] Is CORS configured correctly? (not `*` in production)

**Look for these patterns in code:**

```typescript
// ❌ Missing ownership check
async getFeature(id: string) {
  return this.repo.findById(id); // anyone can access any ID
}

// ✅ Correct ownership check
async getFeature(id: string, userId: string) {
  return this.repo.findOne({ id, userId }); // scoped to owner
}
```

### A02: Cryptographic Failures

**Check if detected:** payments, sensitive data, tokens, passwords

- [ ] Are passwords hashed with bcrypt/argon2 (not MD5/SHA1)?
- [ ] Are sensitive fields encrypted at rest? (PII, payment data)
- [ ] Are API keys / secrets in environment variables (not hardcoded)?
- [ ] Is HTTPS enforced? (no HTTP fallback in production config)
- [ ] Are JWTs signed with strong secret (≥256-bit)?
- [ ] Is sensitive data excluded from logs?

**Scan for hardcoded secrets:**

```bash
# Look for patterns like:
grep -r "apiKey\s*=\s*['\"]" src/
grep -r "password\s*=\s*['\"]" src/
grep -r "secret\s*=\s*['\"]" src/
grep -r "BEGIN.*PRIVATE KEY" src/
```

Report any found with file + line number.

### A03: Injection

**Check if detected:** user input, database queries, file uploads

- [ ] Are all database queries using parameterized queries / ORM (no string concatenation)?
- [ ] Is user input sanitized before use in queries?
- [ ] Are file uploads validated for type, size, and content?
- [ ] Is user input sanitized before rendering (XSS prevention)?
- [ ] Are RegExp patterns safe? (no ReDoS with unbounded quantifiers on user input)

**Look for these anti-patterns:**

```typescript
// ❌ SQL injection via string concatenation
db.query(`SELECT * FROM users WHERE name = '${userInput}'`);

// ❌ NoSQL injection
Model.findOne({ email: req.body.email }); // if email is an object {$gt: ""}

// ✅ Safe parameterized query
Model.findOne({ email: String(req.body.email) });
```

### A04: Insecure Design

**Check always:**

- [ ] Is there rate limiting on sensitive endpoints (login, password reset, OTP)?
- [ ] Is there account lockout or brute-force protection?
- [ ] Are error messages generic (not leaking internal details)?
- [ ] Is there a mass assignment vulnerability? (accepting all body fields)

**Look for:**

```typescript
// ❌ Mass assignment
const user = Object.assign(existingUser, req.body); // attacker can set isAdmin: true

// ✅ Whitelist fields explicitly
const { name, email } = req.body;
const user = Object.assign(existingUser, { name, email });
```

### A05: Security Misconfiguration

**Check if detected:** public endpoints, admin ops, third-party APIs

- [ ] Are debug endpoints disabled in production?
- [ ] Are stack traces hidden from API error responses?
- [ ] Are security headers set? (HSTS, X-Content-Type-Options, X-Frame-Options)
- [ ] Are default credentials changed?
- [ ] Is verbose logging disabled for sensitive operations in production?

### A06: Vulnerable and Outdated Components — Dependency / supply-chain surface (v1.6, W5-C2)

**Check if detected:** new dependencies added this feature

Consume the SAME dep list `/speckit.product-forge.implement` produced — do not
re-derive it: read the `dependencies:` block in `{FEATURE_DIR}/traceability.yml`
(and `dependency-log.md`). For each `pkg@version` in that list, confirm the
install-time vetting still holds and add the SCA layer the SBOM stage (W5-B3,
release-readiness §5C) will later re-run:

- [ ] Every added dep has `registry_exists: true` and a `verdict` of `pass`/`warn` (no `block` slipped into the lockfile).
- [ ] No added dep is on the project `denylist` (re-check `security.dependency_vetting.denylist`).
- [ ] Any `warn` dep (brand-new / low-popularity) carries `confirmed_by_user: true`.
- [ ] Lockfile is pinned for every added dep (no `*` / `latest`).
- [ ] Re-confirm existence + run a known-vulnerability scan on the added deps only:

```bash
# Re-confirm each added package still resolves (catches a dep that was
# block-flagged at implement time but committed anyway):
npm view "<pkg>@<version>" version        # npm:  E404 / non-zero => MISSING → CRITICAL
pip index versions "<pkg>"                 # pip:  "No matching distribution" => MISSING → CRITICAL

# Known-vulnerability scan, scoped to the change (PR-diff mode), via osv-scanner:
osv-scanner --lockfile=package-lock.json   # node; or poetry.lock / requirements.txt for pip
# (osv-scanner reports CVE/GHSA ids; map each to a SEC-* finding by severity)
```

Any **MISSING** (does-not-exist) or **denylisted** dep that reached the lockfile is a
**CRITICAL** SEC finding (slopsquatting / hallucinated package). Known CVEs map to
HIGH/MEDIUM per the advisory severity.

### A07: Identification and Authentication Failures

**Check if detected:** login, auth, payments, session management

- [ ] Is token expiry set appropriately? (access token short-lived, refresh token rotating)
- [ ] Is logout properly implemented? (token revocation, not just client-side delete)
- [ ] Is there multi-factor auth for high-privilege operations?
- [ ] Are password reset links time-limited and single-use?
- [ ] Is there protection against credential stuffing?

### A08: Software and Data Integrity Failures

**Check if detected:** third-party APIs, webhooks, file uploads

- [ ] Are webhook payloads verified with signatures? (Stripe/GitHub webhook secret)
- [ ] Are third-party API responses validated before use?
- [ ] Are uploaded file types validated server-side (not just client-side)?
- [ ] Are dependencies pinned? (no `*` or `latest` versions in package.json)

---

## Step 4: Generate Security Report

Create `{FEATURE_DIR}/security-check.md`:

```markdown
# Security Audit: {Feature Name}

> Audited: {date} | Phase: post-implement
> Feature: `{feature-slug}`
> Auditor: Product Forge Security Check

## Threat Model Summary

Detected surfaces: {list of detected surfaces}
Skipped (not applicable): {list of skipped OWASP categories}

## Findings

### 🔴 CRITICAL (must fix before ship)

#### SEC-001: {Title}
**Category:** {OWASP A0X — name}
**File:** `{path/to/file.ts}:{line}`
**Evidence:**
\`\`\`typescript
{vulnerable code snippet}
\`\`\`
**Risk:** {what an attacker can do}
**Fix:**
\`\`\`typescript
{safe code pattern}
\`\`\`

---

### 🟠 HIGH (fix before release)

#### SEC-002: {Title}
...

---

### 🟡 MEDIUM (fix soon, document workaround)

#### SEC-003: {Title}
...

---

### 🟢 LOW (fix in maintenance)

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
| 🔴 Critical | {N} | {must fix} |
| 🟠 High | {N} | {fix before release} |
| 🟡 Medium | {N} | {fix soon} |
| 🟢 Low | {N} | {maintenance} |
| ✅ Passed | {N} | — |

**Ship readiness:** {✅ Ready / ⚠️ Fix critical issues first / 🔴 Not ready}
```

---

## Step 5: Update Status & Present Results

Update `.forge-status.yml`:

```yaml
phases:
  security_check: completed
security:
  critical: {N}
  high: {N}
  medium: {N}
  low: {N}
  passed: {N}
  ship_ready: {true/false}
last_updated: "{ISO timestamp}"
```

```
🔒 Security Check Complete: {Feature Name}

Surfaces audited: {list}
Skipped: {list — not applicable}

Findings:
  🔴 Critical: {N}   ← must fix before ship
  🟠 High:     {N}   ← fix before release
  🟡 Medium:   {N}   ← fix soon
  🟢 Low:      {N}   ← maintenance backlog

Passed:        {N} checks ✅

Ship readiness: {status}

Full report: features/{slug}/security-check.md
```

If critical issues found:
> 🔴 {N} critical security issue(s) found. Fix required before shipping.
> Create tasks in your tracker for: SEC-001, SEC-002, ...

If clean:
> ✅ No critical or high issues found. Feature is security-ready to ship.
