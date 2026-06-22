---
name: speckit.product-forge.catalog
description: >
  Cross-cutting: build (or verify) the feature catalog — a compact, machine-readable
  index written to `_portfolio/catalog.yml` over every feature, so agents and humans read
  ONE small file first instead of re-walking every feature folder. Deterministic; wraps
  scripts/build-catalog.js. Read-only over feature folders (writes only the carrier).
  Use: "build catalog", "feature index", "refresh catalog", "/speckit.product-forge.catalog"
---

# Product Forge — Catalog (Feature Index Carrier)

You are the **Catalog Builder** for Product Forge.
Your job: regenerate the machine-readable feature index that every other command — and any
retrieval agent — reads first, then report its health. This command never mutates a
feature's own files; the only thing it writes is the carrier `_portfolio/catalog.yml`.

## User Input

```text
$ARGUMENTS
```

Parse for optional flags:
- `--check` — verify the on-disk `catalog.yml` is fresh and the sources are clean; do
  **not** write. Exits non-zero on a STALE carrier or a malformed `.forge-status.yml`.
  This is the CI / `doctor` gate form.
- `--features-dir=<path>` — override the default `features/` (from config).

---

## Step 0: Load Config

Read `.product-forge/config.yml`:
- `features_dir` (default `features`)

---

## Step 1: Run the deterministic builder

Locate the bundled script via `${PLUGIN_ROOT}`
([docs/runtime.md §1A](../docs/runtime.md#1a-locating-bundled-scripts-plugin_root)).
This is an **executable** index build, not a hand-walk:

```bash
# (re)build the carrier → writes {features_dir}/_portfolio/catalog.yml
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir {features_dir}

# verify only (CI / doctor gate) — never writes
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir {features_dir} --check
```

The builder enumerates feature roots via the Path-Resolution Contract `enumerate()`
([docs/runtime.md §12.3](../docs/runtime.md#12-path-resolution-contract)), so `flat` and
`domain-nested` layouts both work and `_`-prefixed dirs (including `_portfolio`) are skipped.
Sources per feature, best-effort with fallbacks: `.forge-status.yml`, `spec.md`,
`product-spec/product-spec.md`, `plan.md`, `README.md`.

---

## Step 2: Report

Render the script's summary line verbatim, then the headline:

```
🗂  Catalog: {feature_count} features → {features_dir}/_portfolio/catalog.yml
   {with_status} with status · {malformed} malformed · {no_summary} without summary · {dup_numbers} duplicate numbers
```

Then point the user at the consumers:
- Any agent or command should **read `_portfolio/catalog.yml` first** (one small file:
  slug → summary → status → code path → IDs) and open individual feature folders only for
  the 1–3 that actually matter.
- [`portfolio`](./portfolio.md) consumes this carrier instead of re-walking every feature.

---

## Step 3: Surface data-quality findings

The carrier records what a re-walk hides:
- `lint.malformed_status_files` — `.forge-status.yml` files with **duplicate mapping keys**
  (these silently break strict YAML tooling; last-key-wins masks the loss).
- `collisions.duplicate_feature_numbers` / `duplicate_slugs` — numbering collisions.
- `_generated.no_summary` — features with no extractable one-line summary (candidates for a
  real summary/front-matter).

If `--check` exited non-zero, tell the user **exactly which files to fix** — never report the
catalog healthy while malformed status files remain.

> **Freshness contract.** `catalog.yml` is a generated CARRIER — producer: this command via
> `scripts/build-catalog.js`; consumer: [`portfolio.md`](./portfolio.md). Regenerate it
> whenever a feature's `.forge-status.yml` changes; `--check` enforces it in CI and `doctor`.

---

## CI & pre-commit enforcement

The carrier only helps while it is fresh. In normal use the `forge` orchestrator
regenerates it at every phase transition ([docs/runtime.md §2.8](../docs/runtime.md#28-carrier-refresh-catalog-freshness));
the gate below is the backstop for status writes made outside the lifecycle.

**CI** (run on every push) — fail the build on a stale or malformed catalog:

```yaml
- name: Catalog freshness
  run: node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir features --check
```

**git pre-commit hook** — keep the committed carrier fresh:

```bash
# .git/hooks/pre-commit  (chmod +x)
node ${PLUGIN_ROOT}/scripts/build-catalog.js --features-dir features
git add features/_portfolio/catalog.yml
```

Resolve `${PLUGIN_ROOT}` per [docs/runtime.md §1A](../docs/runtime.md#1a-locating-bundled-scripts-plugin_root)
— the installed plugin path, the SpecKit extension dir, or the in-repo `scripts/` during
development. `--check` exits non-zero when `_portfolio/catalog.yml` differs from a fresh
build or any `.forge-status.yml` has duplicate keys, so a forgotten regenerate or a
malformed status file blocks the merge.
