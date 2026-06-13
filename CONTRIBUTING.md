# Contributing to Product Forge

Thanks for improving Product Forge. This repo is **"spec-as-product"** — its
deliverable is a process expressed as prompts (31 command files + normative docs
+ a few zero-dependency Node helpers), not an application. Its correctness is the
**internal consistency** of ~140 documents, so the contribution workflow is built
around a deterministic consistency gate.

## Before you start

Read **[docs/concept.md](docs/concept.md)** — the 10-minute mental model and the
producer→consumer wiring map of every artifact. It explains the two failure modes
this project guards against ("callout-deep" + drift) and why the checks below
exist.

When command prose and a normative doc disagree, the **docs win**. The normative
four: [docs/policy.md](docs/policy.md), [docs/runtime.md](docs/runtime.md),
[docs/schema.md](docs/schema.md) (+ [schema/forge-status-v3.schema.yml](docs/schema/forge-status-v3.schema.yml)),
[docs/file-structure.md](docs/file-structure.md).

## The gate: run `doctor` before and after every change

```bash
node scripts/doctor.js
```

It must be **green** (it runs in CI on every push/PR via
[.github/workflows/ci.yml](.github/workflows/ci.yml)). `doctor` bundles:

- every helper script's `--selftest` (lib-paths, gate-risk, validate-traceability, lint-docs, check-links),
- a live smoke against `fixtures/features/demo/`,
- the doc-corpus linter `scripts/lint-docs.js` (must have **0 error-severity** findings),
- the release-blocking invariants (version sync, command-count parity, no-escape-above-plugin-root).

Run the linter on its own for the full report (warnings included):

```bash
node scripts/lint-docs.js          # XREF, CMD-COUNT, VERSION, ENUM, GATE-POLICY,
                                    # CARRIER, PHASEMAP, CONFIG-READER, SCRIPT-PATH, ID-FORMAT
```

## Rules the linter enforces (so you don't get surprised)

- **Adding a command:** create `commands/<name>.md` AND its `provides.commands`
  entry in `extension.yml`; the frontmatter `name:` must be
  `speckit.product-forge.<name>`. Keep README / how-it-works / QA counts in sync
  (CMD-COUNT checks this).
- **Adding a config key:** a command or an orchestrator doc (policy/runtime) must
  actually *read* it — a documented-but-unread key is a dead switch (CONFIG-READER).
- **Calling a bundled script from a command:** route through `${PLUGIN_ROOT}`
  (see [runtime.md §1A](docs/runtime.md)), never a bare `node scripts/...`
  (SCRIPT-PATH) — bare paths don't resolve from the installed plugin cache.
- **Changing an enum** (feature_mode / gate decision / phase status / gate-policy
  action): edit it in **[docs/schema/enums.yml](docs/schema/enums.yml)** (the
  single source), then update the prose enumeration sites; ENUM fails until they
  agree.
- **Carrier fields** (a field one phase writes and another reads, e.g. `red_gate`,
  `reviewed_sha`, `commit_sha`): both the producer and consumer doc must name it
  (CARRIER) — this is the antidote to "callout-deep" contracts.
- **Bumping the version:** change it in **both** `extension.yml` and
  `.claude-plugin/plugin.json` (VERSION invariant) and add a `CHANGELOG.md` entry.
- **Relative links:** must resolve and must not escape the plugin root (`../..`);
  feature-runtime paths (`./spec.md`, `./research/`) are intentionally exempt.

## Conventions

- All shipped docs and command prose are in **English**.
- Don't commit agent-runtime artifacts (`.claude/`, `.serena/`, `*.rvf`,
  `ruvector.db`) — they're gitignored.
- Don't commit/push/tag releases unless asked; tagging is how users pin a
  plugin/extension version.
- There is no package.json / build — `doctor` is the test suite.

## Pull requests

1. `node scripts/doctor.js` is green.
2. CHANGELOG `[Unreleased]` updated for any behavioural or doc-contract change.
3. If you touched a script, its `--selftest` covers the new behaviour.
