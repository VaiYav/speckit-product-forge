# CLAUDE.md

Guidance for Claude Code / AI agents working in this repository.

## What this repo is

**Product Forge** is a full product-lifecycle orchestrator that ships from **one
repo in two installable forms** (workflows identical):

| Form | Manifest | Install | Command syntax |
|------|----------|---------|----------------|
| SpecKit extension | `extension.yml` | `specify extension add product-forge --from <zip>` | `/speckit.product-forge.<name>` |
| Claude Code / Claude plugin | `.claude-plugin/plugin.json` + `marketplace.json` | `/plugin install speckit-product-forge@vaiyav-plugins` | `/speckit-product-forge:<name>` |

This is a **content/spec repository, not an application.** There is no app to
build or run. The deliverable is:
- **33 command files** in `commands/` (markdown prompt-skills, one per slash command),
- **normative docs** in `docs/`,
- **zero-dependency helper scripts** in `scripts/` (Node CommonJS + two bash lock helpers).

Both distribution forms reuse the *same* `commands/`, `docs/`, and `scripts/` —
plugin support was added by adding manifests only, nothing was rewritten.

**The repo IS the tool.** `features/`, `specs/`, and `.product-forge/config.yml`
are **runtime artifacts the workflows create inside a *consuming* project** — they
do not (and should not) exist here. Do not scaffold them in this repo.

## Layout

```
commands/              33 slash-command definitions (markdown + YAML frontmatter)
docs/                  normative specs + templates (see hierarchy below)
  schema/              canonical .forge-status.yml v3 schema + migration notes
  templates/           gate-review, journey-spec, traceability-matrix, domains.yml, …
  improvements/        dated design/audit notes
scripts/               zero-dependency Node helpers (CommonJS, Node ≥ 22)
extension.yml          SpecKit extension manifest (declares all commands)
.claude-plugin/        plugin.json + marketplace.json (Claude plugin manifests)
config-template.yml    shipped config defaults + authoritative config reference
CHANGELOG.md           Keep-a-Changelog; current: v1.8.0 "Venusaur"
```

## Version sync rule (do not break)

The version lives in **two** places and they MUST match on every release:
`extension.yml` (`extension.version`) and `.claude-plugin/plugin.json`
(`version`). Currently `1.8.0`. `plugin.json` wins if they ever diverge, but they
should never diverge — bump both. The marketplace entry intentionally omits
`version` (single source of truth). Update `CHANGELOG.md` in the same change.

## Command files

- Each `commands/<name>.md` has YAML frontmatter with a dotted `name:`
  (`speckit.product-forge.<name>`) — that is the SpecKit identifier. Claude Code
  ignores it and derives the slash command from the **filename**, so both forms
  coexist.
- When adding/removing a command: add/remove the `commands/<name>.md` file AND
  its entry under `provides.commands` in `extension.yml`. Keep the README command
  table and `docs/claude-plugin.md` count ("33 commands") in sync. `lint-docs` enforces the count here too.

## Helper scripts & verification

**Before and after any change, run the aggregate self-check — it is the gate:**

```bash
node scripts/doctor.js     # every --selftest + lint-docs + fixture smoke + invariants
```

`doctor` must be green (it runs in CI on every push via `.github/workflows/ci.yml`).
It wraps:

```bash
node scripts/lint-docs.js --selftest             # doc-corpus consistency linter (its own tests)
node scripts/lint-docs.js                         # run against the repo — 0 error-severity required
node scripts/lib-paths.js --selftest             # Path-Resolution Contract (runtime.md §12)
node scripts/gate-risk.js --selftest             # deterministic gate risk classifier
node scripts/validate-traceability.js --selftest # structural traceability/spec-lint
node scripts/check-links.js --selftest           # external-link probe (advisory in CI)
node scripts/cost-report.js --selftest           # status --cost token/cost roll-up
node scripts/build-catalog.js --selftest         # _portfolio/catalog.yml carrier (v1.8)
node scripts/retrieve-catalog.js --selftest      # deterministic retrieval over the catalog (v1.8)
```

`scripts/lint-docs.js` is the **consistency compiler** for this spec-as-product
repo: it blocks dangling refs, plugin-root escapes, command-count/version drift,
**enum drift** (single-sourced from `docs/schema/enums.yml`), **phase-map drift**
(single-sourced from `docs/schema/phase-map.yml` — both forge.md tables must render
it), **carrier-field contracts** (every cross-phase field has a producer + a
consumer), **gate-policy shape**, **sync-verify/verify-full layer-count parity**,
dead config switches (a documented key no command reads — no exemption list),
documented-but-undeclared config keys, stale current-version claims (install pins,
title stamps, command descriptions), and bare `node scripts/…` / `scripts/*.sh`
paths in commands and normative docs (must use `${PLUGIN_ROOT}`, see runtime.md §1A).
`doctor` also runs the fixture smokes (traceability `--strict`, gate-risk, cost-report).
`scripts/lib-yaml.js` is a **subset** YAML parser (only what Product Forge's own
`.forge-status.yml` / `traceability.yml` / `journeys.yml` need — not a general
engine); no standalone self-test, exercised inside the consumers' self-tests.
`scripts/migrate-status-v2-to-v3.js` is the lazy v2→v3 status migrator (the `.ts` file is an exit-64 stub kept for old references).
`scripts/acquire-lock.sh` / `release-lock.sh` implement the state-lock protocol (runtime.md §2).
`fixtures/features/demo/` is a known-good feature state the scripts run against
(real-file smoke). There is no package.json, no build framework — `doctor` is the
test suite.

Validate the plugin manifests (offline, no auth):

```bash
claude plugin validate .
```

## Documentation hierarchy (normative)

New here? Start with **`docs/concept.md`** — the 10-minute mental model
(spec-as-product, why the failure modes exist) plus the producer→consumer wiring
map of every artifact. Then, when command prose and docs disagree, the **docs
win**, in this precedence:

- `docs/runtime.md` — orchestration runtime: 5-layer config merge, state-lock
  protocol (`.forge-status.yml.lock`), resume logic, sync-verify integration,
  phase digests, monorepo resolution, and the **Path-Resolution Contract (§12)**
  implemented by `scripts/lib-paths.js`.
- `docs/policy.md` — gate decisions, feature modes (express/lite/standard/v-model),
  skip-reason & optional-phase governance.
- `docs/schema.md` + `docs/schema/forge-status-v3.schema.yml` — **canonical**
  `.forge-status.yml` v3 schema. The inline schema block in `file-structure.md`
  is a readable overview; the canonical schema file wins.
- `docs/file-structure.md` — feature directory layout, storage strategies, and the
  naming-convention table (kebab-case feature dirs; `REQ-NNN` canonical reqs vs
  per-feature `FR-NNN`; `US-NNN`, `JRN-NNN`, `CMP-*`, `API-*`, `EVT-*`, `TC-*`).

Schema is **v3** and **additive** — with no new config keys set, behavior is
byte-for-byte identical to prior versions. The `flat` storage strategy is the
zero-config default; never make a change that moves existing feature folders.

## Configuration

`config-template.yml` is both the shipped defaults base and the authoritative key
reference. Effective config is a deep-merge of (lowest→highest):
shipped defaults → `~/.product-forge/config.yml` (global, hand-authored, read-only)
→ `<project>/.product-forge/config.yml` → per-feature `config_override` →
`PRODUCT_FORGE_*` env (top-level scalar keys only). Maps merge recursively;
scalars/lists replace wholesale. The runtime never prompt-and-saves to the global
file — missing project identity is saved to the **project** config only.

## Plugin caching caveat (hard rule)

When installed, the plugin is copied to `~/.claude/plugins/cache`. Command files
must **never** reference paths above the plugin root — no `../../`. Intra-plugin
references (`../docs/`, `../scripts/`, `../config-template.yml`) must resolve.
Relative `./…` paths in command prose point to **runtime artifacts the workflow
generates inside a feature directory** (e.g. `./spec.md`, `./research/README.md`),
not to plugin files — that is intentional, leave them.

## Conventions

- All generated docs and repo prose are **English**.
- Runtime artifacts are gitignored and must never be committed:
  `.claude/`, `agentdb.rvf`, `agentdb.rvf.lock`, `ruvector.db`, `node_modules/`,
  test output, and `features/**/testing/env.md`.
- Don't commit, push, or tag releases unless asked. Tagging (`git tag vX.Y.Z`) is
  how users pin a plugin/extension version — treat it as a release action.
