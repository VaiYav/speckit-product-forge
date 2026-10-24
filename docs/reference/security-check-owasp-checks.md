# security-check — OWASP checks per category

> Reference for `security-check` Step 3. Read only the sections for categories
> the Step 2 threat model selected (A04 always). Read the actual implementation
> files for every check and cite `file:line` evidence for each finding.

## A01: Broken Access Control

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

## A02: Cryptographic Failures

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

## A03: Injection

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

## A04: Insecure Design

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

## A05: Security Misconfiguration

**Check if detected:** public endpoints, admin ops, third-party APIs

- [ ] Are debug endpoints disabled in production?
- [ ] Are stack traces hidden from API error responses?
- [ ] Are security headers set? (HSTS, X-Content-Type-Options, X-Frame-Options)
- [ ] Are default credentials changed?
- [ ] Is verbose logging disabled for sensitive operations in production?

## A06: Vulnerable and Outdated Components — dependency / supply-chain surface

**Check if detected:** new dependencies added this feature

Consume the same dep list `/speckit.product-forge.implement` produced instead of
re-deriving it: read the `dependencies:` block in `{FEATURE_DIR}/traceability.yml`
(and `dependency-log.md`). For each `pkg@version` in that list, confirm the
install-time vetting still holds and add the SCA layer the SBOM stage (release-readiness §5C-bis) will later re-run:

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

## A07: Identification and Authentication Failures

**Check if detected:** login, auth, payments, session management

- [ ] Is token expiry set appropriately? (access token short-lived, refresh token rotating)
- [ ] Is logout properly implemented? (token revocation, not just client-side delete)
- [ ] Is there multi-factor auth for high-privilege operations?
- [ ] Are password reset links time-limited and single-use?
- [ ] Is there protection against credential stuffing?

## A08: Software and Data Integrity Failures

**Check if detected:** third-party APIs, webhooks, file uploads

- [ ] Are webhook payloads verified with signatures? (Stripe/GitHub webhook secret)
- [ ] Are third-party API responses validated before use?
- [ ] Are uploaded file types validated server-side (not just client-side)?
- [ ] Are dependencies pinned? (no `*` or `latest` versions in package.json)
