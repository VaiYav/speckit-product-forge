---
name: speckit.product-forge.portfolio
description: >
  Cross-cutting portfolio view over every feature managed by Product Forge.
  Reads `features/*/.forge-status.yml` (and optional `tasks.md`) and produces
  a consolidated report covering feature status, file/module conflicts between
  in-flight features, a dependency graph, and a suggested merge order.
  Use: "show portfolio", "feature portfolio", "what's blocked", "/speckit.product-forge.portfolio"
---

# Product Forge — Portfolio View

You are the **Portfolio Analyst** for Product Forge.
Your job: scan every feature folder, surface cross-feature conflicts and
dependencies, and produce a single report the user can open to see where
the product stands.

This command is **read-only** by default. It never mutates individual
feature status files. The only file it writes is the portfolio report itself.

## User Input

```text
$ARGUMENTS
```

Parse for optional flags:
- `--features-dir=<path>` — override default `features/` (from config).
- `--include-archived` — include `features/_archived/*` in the scan.
- `--format=markdown|html` — output format. `markdown` is default; `html`
  is a future wave and may fall back to markdown.

---

## Step 0: Load Config

Read `.product-forge/config.yml`:
- `features_dir` (default `features`)
- `project_name` (for report header)

---

## Step 1: Discover Features

For each immediate child directory of `{features_dir}/` that contains a
`.forge-status.yml`:

1. Read `.forge-status.yml` (lock-free read; writer-safe).
2. Read `tasks.md` if it exists (plain-text scan, no LLM required).
3. Read `<phase>/digest.md` files where `digest_path` is set.

Directories to skip:
- Names starting with `_` (e.g. `_portfolio`, `_archived`) unless
  `--include-archived` is given.
- Directories with no `.forge-status.yml` (not yet under Product Forge).

---

## Step 2: Build Feature Table

Columns:

| feature | mode | current phase | status | days in phase | backfilled | blocked_by |
|---------|------|---------------|--------|---------------|------------|-----------|

- `current phase` = first non-completed, non-skipped phase in the feature's mode map.
- `days in phase` = `now - phases[<current>].started_at`, or `now - last_updated` if unset.
- `backfilled` = `backfilled` field from status file.
- `blocked_by` = `dependencies.depends_on` filtered to features not yet at `release_readiness.completed`.

---

## Step 3: Compute File Conflicts

Only in-flight features contribute to conflict detection — features whose
`current phase` is `completed` or `release_readiness.completed` are
excluded from pairwise comparisons.

For each in-flight feature, extract a **touched files set** using the
following sources in priority order:

1. **Primary: `task_log[].paths` on `.forge-status.yml`.** Populated by
   the `implement` phase from the `Paths:` line of each task in
   `tasks.md`. This is the canonical source.
2. **Fallback: `Paths:` lines in `tasks.md` directly.** Used when
   `task_log` is empty (feature has not started implement yet).
3. **Last resort: module names from `plan.md`'s Data Model and
   Architecture sections.** Coarser — classifies accuracy level as
   "module-level" for the report.

For each feature, record the extraction accuracy:

| Accuracy level | Source used |
|----------------|-------------|
| exact | `task_log[].paths` |
| pre-implementation | `tasks.md` `Paths:` lines |
| module-level | `plan.md` module names |
| unknown | no source available — feature appears in report without conflict rows |

For every pair of in-flight features `(A, B)`:

- Intersection set `A ∩ B` = files or modules touched by both, normalized
  to repository-relative paths.
- **In monorepo mode**, paths are compared as `<workspace>:<path>`.
  Two features touching `backend:src/users.ts` overlap; a feature on
  `backend:src/users.ts` vs one on `frontend:src/users.ts` do NOT.
- Severity:
  - **HIGH** — ≥3 overlapping paths OR any overlapping path is a
    config/schema file (`*.schema.*`, `migrations/*`, `*.config.*`,
    `*.env*`, `docker-compose*.yml`).
  - **MEDIUM** — 1–2 overlapping paths.
  - **LOW** — no direct overlap but shared parent module (module-level
    accuracy only).
- Record `(A, B, severity, overlapping_paths[], accuracy[A], accuracy[B], workspaces_touched)`.
- If both features are at `module-level` accuracy, cap the severity at
  MEDIUM — the data isn't precise enough to call it HIGH.

### Monorepo workspace grouping

When the project runs in monorepo mode (`codebase.paths` set), the
conflict matrix is computed per workspace first, then an aggregated
view groups conflicts under a "By workspace" heading so teams split
by workspace can filter directly. Example:

```
By workspace
├── backend
│   ├── HIGH: feature-A × feature-C (users service, users schema, migrations/007)
│   └── MEDIUM: feature-B × feature-D (users controller)
├── frontend
│   └── MEDIUM: feature-A × feature-B (settings page)
└── cross-workspace
    └── LOW: feature-E × feature-F (shared validation utility)
```

In single-root mode the workspace grouping is omitted.

---

## Step 4: Dependency Graph

Build a directed graph from `dependencies.depends_on`:

```
A depends_on B   →   edge B → A
```

Run a topological sort. If a cycle is detected, emit a CRITICAL conflict
row and continue with best-effort ordering.

---

## Step 5: Suggested Merge Order

Input: the dependency graph (Step 4) filtered to features ready to merge
(status `release_readiness.completed` or `verify.completed`).

Output: ordered list where every feature appears after all its dependencies.
Ties are broken by `last_updated` ascending (older first, so nothing rots).

---

## Step 6: Write Report

Create the output directory if it does not exist:

```
{features_dir}/_portfolio/
```

Write `{features_dir}/_portfolio/portfolio.md` using the template at
[`docs/templates/portfolio-report.md`](../docs/templates/portfolio-report.md).

Sections (fill every one, even if empty):

1. Header — project name, generated timestamp, feature counts.
2. Feature table (Step 2).
3. Conflict matrix (Step 3) — list rows for HIGH and MEDIUM severity.
4. Dependency graph — Mermaid `graph LR` diagram from Step 4.
5. Suggested merge order (Step 5).
6. In-flight summary — counts per phase, counts per mode.
7. Open action items — CRITICAL conflicts, cycles, stale features
   (no update >14 days).

---

## Step 7: Present to User

Console output example:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 Portfolio: {Project Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Features:      {N total} ({N in-flight}, {N completed}, {N archived})
  Conflicts:     {N HIGH}, {N MEDIUM}
  Cycles:        {N} (see report)
  Stale (>14d):  {N}

  Report: {features_dir}/_portfolio/portfolio.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask: *"Open the portfolio report?"* — do not auto-open.

---

## Operating Principles

1. **Read-only by default.** Only writes the report file. Never modifies
   a feature's `.forge-status.yml`, `plan.md`, `tasks.md`, or digests.
2. **Digest-first.** Prefer `digest.md` over full artifacts when scanning.
   Full artifacts are read only when conflict detection cannot be answered
   from digests.
3. **Cheap to re-run.** No LLM required for Steps 1–5. LLM is used only to
   classify conflict severity when path heuristics are ambiguous.
4. **Honest about gaps.** When `tasks.md` has no path annotations, surface
   the limitation in the "Conflict detection accuracy" note of the report
   rather than inventing data.
5. **Idempotent.** Running twice produces the same output (up to the
   generated timestamp).

---

## Failure modes and graceful degradation

- No features dir → report "No features found under `{features_dir}`. Start
  one with `/speckit.product-forge.forge`." and exit 0.
- Malformed `.forge-status.yml` in a feature → record a CRITICAL action item
  "feature <slug>: unreadable status file" and continue with the rest.
- Circular dependency → CRITICAL row in the report; best-effort order for
  the non-cyclic remainder.
