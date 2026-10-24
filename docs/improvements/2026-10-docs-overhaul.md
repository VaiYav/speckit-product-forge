# Design Note — Documentation Overhaul (v1.8.0)

> **Status:** IMPLEMENTED (open items only under *Deferred*) → ships inside v1.8.0 "Venusaur" (no separate version).
> Decided in a structured design interview (2026-10-24) after three independent
> read-only audits of `docs/`, `commands/` and the entry-point files.

## Problem

`doctor` was green, but the audits found defects *below* what `lint-docs` checks:

- **Behaviour bugs hiding in prose.** `lite` / `express` could not run (plan
  required `spec.md`, implement required `tasks.md`, both `not_applicable` in those
  modes); `forge` recorded every delegated gate twice; status flipped to
  `completed` even on Revise / Rollback / Abort; the first writers of a new feature
  created a **v2** status file and `problem-discovery` overwrote the v3 file forge
  had just written.
- **Contracts nobody executes.** The state-lock helpers were documented as the
  mechanism but no command invoked them; six `default_*`/generation config keys and
  every `require_*` key had no reader (hidden behind a lint exemption list).
- **Drift the linter could not see.** CLAUDE.md (not linted) said 31 commands /
  v1.6.0; the optional-phase set was stated four different ways; verify layer
  counts disagreed (9 / 10 / 11); `file-structure.md` carried an inline schema
  contradicting the canonical `.yml`; the v1.8 catalog carrier had no schema and
  its script read fields the v3 schema does not define.
- **Duplication.** ~25 commands restated the status-write procedure, ~20 the config
  preamble, forge restated the gate prompt 18×; `how-it-works-v2.md` (579 lines)
  restated concept / phases / policy / runtime.

## Decisions

| # | Decision |
|---|----------|
| D1 | Optimise for the **LLM executor** first, contributor second, end user third. |
| D2 | Fix + dedup + restructure (no ground-up rewrite). Wording-neutral by default; every normative change below was approved explicitly. |
| D3 | New drift classes get a `lint-docs` rule with a selftest when cheap. |
| D4 | Config: wire the four `default_*` research / wireframe keys (pre-fill, ask only when unset); remove the CONFIG-READER exemption list. Owner decision (revised): **keep** `max_tokens_per_doc` and wire it into every document-authoring command via the size-budget procedure in runtime §10.1 (index + parts when over budget; parser-read files are tightened, never split); **remove** `output_language` — generated artifacts are always English. |
| D5 | README becomes a ~200-line landing page; history moves to CHANGELOG, diagrams/trees to `docs/`. |
| D6 | Implemented `docs/improvements/` notes move to `docs/improvements/archive/`; open roadmap items move to root `ROADMAP.md`. |
| D7 | Catalog: canonical `docs/schema/catalog.yml`; `build-catalog.js` reads v3 fields (legacy fallback); record field `mode` → `kind` and `retrieve --mode` → `--kind` (no tag yet, so free); `bounded_context` from `domains.yml` when present; fixture + `doctor` run `--check` (makes the v1.8 CHANGELOG claim true). |
| D8 | **Mode-keyed prerequisites** (runtime §11.2): in `lite`/`express`, plan consumes `product-spec/`, implement consumes `plan.md`, research is optional input. |
| D9 | **Gate ownership:** forge records the gate when orchestrating; a sub-skill records it only when run standalone. Status follows the decision (approved → completed, revised → in_progress, rolled_back → pending for this and later phases). `implement` alone owns `red_gate`. |
| D10 | **One status-write procedure** (runtime §2.9): lock → read-merge → object form → digest before `completed` → `last_updated` → atomic rename → catalog refresh, dry-run aware; plus a v3 init block. Missing fields added to the schema; top-level `tasks:` / `implement:` blocks move under `phases.*`. |
| D11 | The lock helpers are invoked from §2.9 via `${PLUGIN_ROOT}`, with the prose protocol as fallback. |
| D12 | `speckit_mode` ↔ `feature_mode` relationship defined in policy §4.1; nothing retired. |
| D13 | `forge.md`: fix drift in place, extract only the gate prompt and the status epilogue (a full generic transition table is deferred). |
| D14 | Wire `require_*`, `require_skip_reason`, `auto_sync_between_phases` through the shared gate template; add `require_problem_discovery` to `config-template.yml`. Skip is never offered on a required phase. |
| D15 | **v-model keeps every standard phase** (owner decision): `phase-map.yml` wins over the old "V1–V10 replace product-spec…plan" prose. V1–V11 run between bridge and plan, V12 after test-run, V13 gates release; `policy.md`, `v-model-integration.md` §4, `bridge.md`, `config.md` and `config-template.yml` aligned. |

## Sequencing

lint extensions (they turn red on existing drift → the worklist) → shared runtime
sections → schema + catalog scripts → command rewiring → normative-doc
consolidation → README / ROADMAP / archive / CHANGELOG. `doctor` green between
batches; each batch is one commit. Behaviour fixes are listed under
CHANGELOG [1.8.0] `### Fixed`.

## Deferred

- Generic forge transition table (D13).
- Issue-tracker bridge, cron nudges, messaging delivery — see `ROADMAP.md`.
