---
name: speckit.product-forge.portfolio
description: >
  Report across every Product Forge feature: status table, file / module
  conflicts between in-flight features, dependency graph and suggested merge
  order. Use to see what is blocked, what collides, and what to merge first.
---

# Product Forge — Portfolio

You are the **Portfolio Analyst**. Scan every feature folder, surface
cross-feature conflicts and dependencies, and write one report that shows where
the product stands. Feature files (`.forge-status.yml`, `plan.md`, `tasks.md`,
digests) are only read; the report is the only file written.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none
- **Config keys:** `features_dir` (default `features`), `project_name` (report
  header), `codebase.paths` (monorepo grouping)
- **Writes:** `{features_dir}/_portfolio/portfolio.md`
- **Contract deltas:** read-only over feature folders, but not purely
  read-only: it writes `portfolio.md`. No feature slug is resolved; all features
  are scanned. There is no `FEATURE_DIR`, so `--dry-run` prints the would-be
  report to the console and writes nothing.
  Flags: `--features-dir=<path>` overrides `features_dir`; `--include-archived`
  adds archived features; `--format=markdown|html` (`markdown` default; `html`
  falls back to markdown).

## Step 1: Discover features

Walk feature roots with `enumerate()`
([runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)): descend
from `{features_dir}/`, treat the first directory holding a `.forge-status.yml`
as a feature root (stop descending into it), skip `_`-prefixed top-level dirs —
`flat` (depth 1) and `domain-nested` (depth 2) alike. Directories without a
`.forge-status.yml` are not features. Per root, read digest-first:

1. `.forge-status.yml` (lock-free read).
2. `tasks.md` when present (plain-text scan, no LLM).
3. `<phase>/digest.md` where `digest_path` is set; open full artifacts only when
   a digest cannot answer a conflict question.

`--include-archived` → run a **second, explicit pass** over
`_archived/<…>/.forge-status.yml` (outside `enumerate()`, which never returns
them) and fold those features in, flagged archived.

**Fast path — the catalog carrier.** When `{features_dir}/_portfolio/catalog.yml`
exists, take the per-feature **scalar** fields for Step 2 (slug, name, summary,
`feature_mode`, status, phase progress, code path, IDs — shape in
[docs/schema/catalog.yml](../docs/schema/catalog.yml)) from it instead of
re-reading every status file. It is the carrier [`catalog`](./catalog.md) builds
from the same walk. Confirm freshness first:

```bash
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir {features_dir} --check
```

STALE or absent → use the direct scan above and advise
`/speckit.product-forge.catalog`. Conflict detection (Step 3) and dependency
analysis (Step 4) always read the live `.forge-status.yml` / `tasks.md`.

Failure modes: no features dir → report *"No features found under
`{features_dir}`. Start one with `/speckit.product-forge.forge`."* and exit 0. A
malformed `.forge-status.yml` → record the CRITICAL action item "feature <slug>:
unreadable status file" and continue with the rest.

## Step 2: Feature table

| feature | mode | current phase | status | days in phase | backfilled | blocked_by |
|---------|------|---------------|--------|---------------|------------|-----------|

- `current phase` = first non-completed, non-skipped phase in the feature's mode map.
- `days in phase` = `now - phases[<current>].started_at`, else `now - last_updated`.
- `backfilled` = the status file's `backfilled` field.
- `blocked_by` = `dependencies.depends_on` filtered to features not yet at
  `release_readiness.completed`.

## Step 3: File conflicts

Only in-flight features take part — features whose current phase is `completed`
or `release_readiness.completed` are excluded from the pairs.

Touched-files set per feature, first available source wins, with its accuracy:

| Accuracy level | Source used |
|----------------|-------------|
| exact | `task_log[].paths` on `.forge-status.yml` (from each task's `Paths:` line, written by `implement`) |
| pre-implementation | `Paths:` lines in `tasks.md` (implement not started) |
| module-level | module names from `plan.md`'s Data Model and Architecture sections |
| unknown | no source — the feature appears without conflict rows |

For every pair `(A, B)`:

- `A ∩ B` = files or modules touched by both, as repository-relative paths. In
  monorepo mode compare `<workspace>:<path>`: `backend:src/users.ts` vs
  `backend:src/users.ts` overlaps; `backend:src/users.ts` vs
  `frontend:src/users.ts` does not.
- Severity:
  - **HIGH** — ≥3 overlapping paths, or any overlapping config/schema file
    (`*.schema.*`, `migrations/*`, `*.config.*`, `*.env*`, `docker-compose*.yml`).
  - **MEDIUM** — 1–2 overlapping paths.
  - **LOW** — no direct overlap but a shared parent module (module-level only).
  - Both features at `module-level` → cap at MEDIUM.
  - Use the LLM only when path heuristics leave the severity ambiguous; Steps
    1–5 otherwise need none.
- Record `(A, B, severity, overlapping_paths[], accuracy[A], accuracy[B], workspaces_touched)`.

In monorepo mode (`codebase.paths` set), compute the matrix per workspace, then
group it under a "By workspace" heading:

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

Single-root mode omits the grouping.

## Step 4: Dependency graph

Edges from `dependencies.depends_on`: `A depends_on B` → edge `B → A`. Topologically
sort; a cycle becomes a CRITICAL conflict row, and ordering continues best-effort
for the non-cyclic remainder.

## Step 5: Suggested merge order

From the graph, take features ready to merge (`release_readiness.completed` or
`verify.completed`) and order them so each follows all its dependencies; break
ties by `last_updated` ascending (oldest first).

## Step 6: Write the report

Create `{features_dir}/_portfolio/` when absent and write
`{features_dir}/_portfolio/portfolio.md` from
[docs/templates/portfolio-report.md](../docs/templates/portfolio-report.md),
filling every section, even when empty:

1. Header — project name, generated timestamp, feature counts.
2. Feature table (Step 2).
3. Conflict matrix (Step 3) — HIGH and MEDIUM rows.
4. Dependency graph — Mermaid `graph LR` from Step 4.
5. Suggested merge order (Step 5).
6. In-flight summary — counts per phase and per mode.
7. Open action items — CRITICAL conflicts, cycles, unreadable status files,
   stale features (no update > 14 days).

When `tasks.md` has no path annotations, say so in the report's "Conflict
detection accuracy" note instead of inventing data.

## Step 7: Present

```
Portfolio: {Project Name}

  Features:      {N total} ({N in-flight}, {N completed}, {N archived})
  Conflicts:     {N HIGH}, {N MEDIUM}
  Cycles:        {N} (see report)
  Stale (>14d):  {N}

  Report: {features_dir}/_portfolio/portfolio.md
```

Ask whether to open the report; open it only on a yes.

## Done when

- Every feature root (plus archived ones with `--include-archived`) has a
  feature-table row, or a CRITICAL "unreadable status file" action item.
- Every in-flight pair with an overlap has a conflict row with severity and both
  accuracy levels; monorepo conflicts are grouped by workspace.
- Every cycle is a CRITICAL row; the merge order lists every ready feature after
  its dependencies.
- `portfolio.md` has all seven sections and is identical on a re-run except for
  the timestamp; no feature file changed.
- The summary was shown and the open-report question asked.
