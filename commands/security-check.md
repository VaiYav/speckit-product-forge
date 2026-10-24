---
name: speckit.product-forge.security-check
description: >
  Feature-scoped OWASP audit after implement, before ship: derive the threat model from
  the plan and code, check only the attack surfaces present, and write a prioritized fix
  list with code-level evidence.
---

# Product Forge — Security Check

You are the **Feature Security Auditor**. Run a threat-model-driven OWASP review of this
feature's implementation — only the attack vectors its surfaces expose — and write
`security-check.md` with prioritized, evidenced findings.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `security_check` (optional, outside the phase map)
- **Config keys:** `codebase_path` (or monorepo `codebase.paths`),
  `security.dependency_vetting.denylist`
- **Writes:** `security-check.md`, `phases.security_check.*`
- **Contract deltas:** no gate — the command sets `phases.security_check.status`
  itself and writes no digest.

## Step 1: Check inputs

1. `phases.implement.status` is `completed`.
2. Read `plan.md` (what the feature does) and `product-spec/product-spec.md` (its scope).

## Step 2: Build the threat model

From `plan.md`, `spec.md` and the code, mark each surface present or absent:

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

**New dependencies** is `yes` when `phases.implement.dependencies.added > 0` in
`.forge-status.yml`, or when `traceability.yml` carries a `dependencies:` block (the dep
list `/speckit.product-forge.implement` produced).

Result: every surface is marked; checks run only for surfaces marked **yes**.

## Step 3: Run the targeted checks

Run the checks for each selected category from
[security-check-owasp-checks.md](../docs/reference/security-check-owasp-checks.md),
reading the actual implementation files and citing `file:line` for every finding:

| Category | Run when |
|----------|----------|
| A01 Broken Access Control | auth, authorization, admin ops, file access |
| A02 Cryptographic Failures | payments, sensitive data, tokens, passwords (includes the hardcoded-secret scan) |
| A03 Injection | user input, database queries, file uploads |
| A04 Insecure Design | always |
| A05 Security Misconfiguration | public endpoints, admin ops, third-party APIs |
| A06 Vulnerable and Outdated Components | new dependencies added this feature |
| A07 Identification and Authentication Failures | login, auth, payments, session management |
| A08 Software and Data Integrity Failures | third-party APIs, webhooks, file uploads |

A06 severity: any **MISSING** (does-not-exist) or **denylisted** dependency that reached
the lockfile is a **CRITICAL** finding (slopsquatting / hallucinated package); known CVEs
map to HIGH or MEDIUM per the advisory severity.

Result: every check of every selected category is marked pass or turned into a finding.

## Step 4: Write the report

Write `{FEATURE_DIR}/security-check.md` from
[security-check-report.md](../docs/templates/security-check-report.md): findings as
`SEC-NNN` grouped CRITICAL (must fix before ship) / HIGH (fix before release) / MEDIUM
(fix soon, document workaround) / LOW (fix in maintenance), each with category, file and
line, evidence, risk and fix; then passed checks, the summary and ship readiness.

## Step 5: Update status and report

Counters live under the phase key (there is no top-level `security:` block).
`ship_ready` is `true` when ship readiness is ✅ Ready:

```yaml
phases:
  security_check:
    status: completed
    critical: {N}
    high: {N}
    medium: {N}
    low: {N}
    passed: {N}
    ship_ready: {true/false}
```

Show `Security Check Complete: {Feature Name}`: surfaces audited; skipped (not
applicable); findings — Critical {N} (must fix before ship), High {N} (fix before
release), Medium {N} (fix soon), Low {N} (maintenance backlog); passed {N} checks ✅;
ship readiness; `Full report: {FEATURE_DIR}/security-check.md`.

- Critical findings → *"❌ {N} critical security issue(s) found. Fix required before
  shipping. Create tasks in your tracker for: SEC-001, SEC-002, …"*
- No critical or high findings → *"✅ No critical or high issues found. Feature is
  security-ready to ship."*

## Done when

- All 13 surfaces are marked, and every category triggered by a `yes` surface (plus A04)
  was checked against the implementation files.
- Every finding has a `SEC-NNN` id, a severity, `file:line` evidence, a risk and a fix;
  every missing or denylisted added dependency is CRITICAL.
- `security-check.md` exists with findings, passed checks, summary and ship readiness.
- `phases.security_check` has `status: completed` and counters equal to the report's
  counts, and the closing message matches the critical / clean outcome.
