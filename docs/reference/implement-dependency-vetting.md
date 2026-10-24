> Reference for install-time dependency vetting — run by `implement` Step 4 (check 6) only when the just-completed tasks added or proposed a new dependency.

# Install-time dependency vetting

LLM agents hallucinate plausible package names, and attackers pre-register those
names ("slopsquatting"). A release SBOM cannot catch a dependency that was
hallucinated and installed mid-build, so each new package is vetted at the moment
it is added: query the registry's real resolver first, install only after it passes.

A **new dependency** is a package not in the lockfile before this phase.

## Thresholds

Read the optional `security.dependency_vetting` config block. When it is absent,
use the defaults:

| Key | Default |
|-----|---------|
| `allowlist[]` | `[]` |
| `denylist[]` | `[]` |
| `min_age_days` | `30` |
| `min_downloads` | `1000` |

## Probes

Pick the ecosystem (`npm` | `pip`) from config / the codebase. For each new package
`<pkg>` at intended version `<ver>`:

```bash
# --- npm / node ---
npm view "<pkg>" version                         # EXISTS? non-zero exit / "E404" => does not exist → BLOCK
npm view "<pkg>" dist-tags --json                 # sanity: is the intended <ver> published?
# brand-new? compute age in days from registry create time → exit 8 if < 30
npm view "<pkg>" time.created | \
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const days=(Date.now()-Date.parse(s.trim()))/864e5;console.log(Math.round(days));process.exit(days<30?8:0)})'
# popularity (low-download heuristic): query the downloads API → exit 9 if < 1000
curl -fsSL "https://api.npmjs.org/downloads/point/last-month/<pkg>" | \
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const n=(JSON.parse(s).downloads)||0;console.log(n);process.exit(n<1000?9:0)})'

# --- pip / python ---
pip index versions "<pkg>"                         # EXISTS + lists <ver>? "No matching distribution" → BLOCK
# brand-new? compute age from first upload → exit 8 if < 30 days
curl -fsSL "https://pypi.org/pypi/<pkg>/json" | \
  python3 -c 'import sys,json,datetime as d; j=json.load(sys.stdin); rels=j["releases"]; first=min((u["upload_time_iso_8601"] for v in rels.values() for u in v), default=None); print(first); sys.exit(8 if first and (d.datetime.now(d.timezone.utc)-d.datetime.fromisoformat(first)).days<30 else 0)'
# Note: pip popularity is omitted (no simple core-registry downloads endpoint;
# pypistats.org can be added later if parity with npm is wanted).
```

Substitute the configured `min_age_days` / `min_downloads` for the literal `30` /
`1000` when the config sets them.

## Verdict

| Condition | Verdict | Action |
|-----------|---------|--------|
| Not found on the registry | `block` | Leave it out; CRITICAL drift (hallucinated / slopsquat) |
| On `denylist` | `block` | Leave it out; CRITICAL drift |
| On `allowlist` | `pass` | Skip the heuristics (trusted) |
| Age < `min_age_days` **or** downloads < `min_downloads` | `warn` | Ask the user to confirm (structured prompt); record the answer. Declined → CRITICAL drift |
| Otherwise | `pass` | Keep it |

## Records

Log every new dependency (verdict + evidence) to `{FEATURE_DIR}/dependency-log.md`,
and append a row to `traceability.yml` under a top-level `dependencies:` block so the
chain and `/speckit.product-forge.security-check` can read it:

```yaml
dependencies:
  - pkg: "<pkg>"
    version: "<ver>"
    ecosystem: npm            # npm | pip
    added_by_task: "<task-id>"
    registry_exists: true
    age_days: 412
    downloads_last_month: 84210
    list: none                # allowlist | denylist | none
    verdict: pass             # pass | warn | block
    confirmed_by_user: false  # true when a WARN dep was explicitly accepted
```

The per-phase tallies go to `phases.implement.dependencies` (`added`, `vetted`,
`warned`, `blocked`, `log_path`) in the `implement` status write.
