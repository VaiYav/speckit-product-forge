---
name: speckit.product-forge.catalog
description: >
  Build or verify the feature catalog `_portfolio/catalog.yml` — one small index
  over every feature that agents read before opening feature folders. Use after
  status changes outside forge, or with `--check` as a CI freshness gate.
---

# Product Forge — Catalog

You are the **Catalog Builder**. Regenerate the machine-readable feature index
that every command and retrieval agent reads first, then report its health. The
only file you write is the carrier `{features_dir}/_portfolio/catalog.yml`;
feature folders stay untouched.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none (`--check` is read-only)
- **Config keys:** `features_dir` (default `features`)
- **Writes:** `{features_dir}/_portfolio/catalog.yml` (not with `--check`)
- **Contract deltas:** no feature slug is resolved. Flags: `--check` — verify the
  on-disk carrier is fresh and the sources are clean, write nothing, exit non-zero
  on a STALE carrier or a malformed `.forge-status.yml` (the CI / `doctor` form);
  `--features-dir=<path>` overrides `features_dir`.

## Step 1: Run the builder

```bash
# (re)build the carrier → writes {features_dir}/_portfolio/catalog.yml
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir {features_dir}

# verify only (CI / doctor gate) — never writes
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir {features_dir} --check
```

The builder walks feature roots with `enumerate()`
([runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)) — `flat` and
`domain-nested` alike, skipping `_`-prefixed dirs such as `_portfolio`. Per
feature it reads, best-effort: `.forge-status.yml`, `spec.md`,
`product-spec/product-spec.md`, `plan.md`, `README.md`. The record shape is
canonical in [docs/schema/catalog.yml](../docs/schema/catalog.yml).

The script is the only writer of `catalog.yml`. When it is missing, report that
the catalog cannot be built without it and stop.

Result: the script's summary line and exit code.

## Step 2: Report

Print the script's summary line verbatim, then:

```
Catalog: {feature_count} features → {features_dir}/_portfolio/catalog.yml
   {with_status} with status · {malformed} malformed · {no_summary} without summary · {dup_numbers} duplicate numbers
```

Tell the user how the carrier is consumed: any agent or command reads
`_portfolio/catalog.yml` first (slug → summary → status → code path → IDs) and
opens feature folders only for the 1–3 that matter;
[`portfolio`](./portfolio.md) and [`retrieve`](./retrieve.md) read it instead of
re-walking every feature.

## Step 3: Surface data-quality findings

List what the carrier records:

- `lint.malformed_status_files` — `.forge-status.yml` files with **duplicate
  mapping keys** (they break strict YAML tooling; last-key-wins hides the loss).
- `collisions.duplicate_feature_numbers` / `duplicate_slugs` — numbering collisions.
- `_generated.no_summary` — features with no extractable one-line summary
  (candidates for a real summary / front-matter).

When `--check` exited non-zero, name **exactly which files to fix**; report the
catalog healthy only when no malformed status file remains.

## CI & pre-commit enforcement

`catalog.yml` stays useful only while fresh: regenerate it whenever a feature's
`.forge-status.yml` changes. The `forge` orchestrator does this at every phase
transition ([runtime.md §2.8](../docs/runtime.md#28-carrier-refresh-catalog-freshness));
the gates below are the backstop for status writes made outside the lifecycle.

`${PLUGIN_ROOT}` is **not set** in CI or in a git hook — those run outside the
agent host. Give the snippets a real path: a pinned checkout of Product Forge in
CI, or the SpecKit extension dir. Replace `features` with your `features_dir`.

**CI** (run on every push) — fail the build on a stale or malformed catalog:

```yaml
- uses: actions/checkout@v4
  with: { repository: VaiYav/speckit-product-forge, ref: v1.9.0, path: .product-forge-plugin }
- name: Catalog freshness
  run: node .product-forge-plugin/scripts/build-catalog.js --features-dir features --check
```

**git pre-commit hook** — keep the committed carrier fresh:

```bash
# .git/hooks/pre-commit  (chmod +x)
PF="$(specify extension path product-forge 2>/dev/null)" || exit 0   # no plugin → skip, don't block
node "$PF/scripts/build-catalog.js" --features-dir features
git add features/_portfolio/catalog.yml
```

`--check` exits non-zero when `_portfolio/catalog.yml` differs from a fresh build
or any `.forge-status.yml` has duplicate keys, so a forgotten regenerate or a
malformed status file blocks the merge.

## Done when

- Build run: `catalog.yml` was rewritten by the script (never by hand) and the
  summary line plus headline counts were shown.
- `--check` run: nothing was written; on a non-zero exit every stale carrier or
  malformed status file is named for fixing.
- Every data-quality finding in Step 3 is listed, or reported as none.
- Script missing → the "cannot be built" report was given and nothing was written.
