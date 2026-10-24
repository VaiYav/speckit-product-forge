---
name: speckit.product-forge.retrieve
description: >
  Retrieve the best-matching features (default 5, `--limit N`) for a query, slug,
  bounded context, status or kind, plus the exact files to open, from the
  feature catalog. Use to answer "what touches X?" without walking every
  feature folder.
---

# Product Forge — Retrieve

You are the **Retriever**. Turn a developer's question into the smallest correct
set of files to read: scan the catalog, return the features that matter and their
key artifacts, and open only those.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — read-only
- **Config keys:** `features_dir` (default `features`)
- **Writes:** nothing
- **Contract deltas:** no feature slug is resolved. Arguments are a free-text
  **query** (default; matches slug / name / summary / bounded context) or one of
  `--slug <slug>`, `--context <bounded_context>`, `--status <status>`,
  `--kind <build|documentation-only>`; plus `--limit N` (default 5) and `--json`
  (machine output).

## Step 1: Run the retriever

```bash
node ${PLUGIN_ROOT}/scripts/retrieve-catalog.js --query "{query}" --features-dir {features_dir}
# or: --slug {slug} | --context {bounded_context} | --status {status} | --kind {kind}
```

The script builds the catalog in memory (fresh even when
`_portfolio/catalog.yml` is stale — the same carrier [`catalog`](./catalog.md)
writes and [`portfolio`](./portfolio.md) reads) and filters it deterministically:
no LLM, no network, no embeddings. The old `--mode` flag exits 2 with
"`--mode` was renamed `--kind`"; rerun with `--kind`.

Fallback when the script is missing: read `{features_dir}/_portfolio/catalog.yml`
directly, warn that it may be stale, and filter it by hand.

Result: a ranked match list.

## Step 2: Present the minimal slice

For each match show `slug`, status / kind / `feature_mode`, the one-line summary,
the `code:` path and the `open:` file list. Then open **only** those files to
answer the question; every other feature folder stays unread.

- **Zero matches** → say so and suggest a broader query or
  `/speckit.product-forge.catalog` to rebuild the index.
- **Weak top match** (only a summary substring matched) → say the match is
  approximate and show the next candidates so the user can pick.

## Done when

- The ranked matches (at most `--limit`) are shown with slug, status / kind /
  mode, summary, code path and open list — or the zero-match message with its
  suggestion.
- Only the listed `open:` files were read to answer the question.
- A weak match is labelled approximate, with the next candidates shown.
