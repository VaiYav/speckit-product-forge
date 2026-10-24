# Product Forge — SpecKit Extension & Claude Plugin

> **Full product lifecycle around SpecKit:** problem → research → product spec →
> spec.md → plan → tasks → code → tests → release → metrics, with a human gate at
> every transition.

Product Forge is a [SpecKit](https://github.com/github/spec-kit) extension that adds
a complete **product discovery, specification, and quality pipeline** before and
after SpecKit's own spec → plan → tasks → implement core. You research competitors,
UX patterns and your codebase, craft and approve a product spec, review the design
and risks, implement with progressive verification, review the code, verify full
traceability, and generate and run Playwright tests with a bug-fix loop — then
ship, measure, and feed the lessons back into the next feature.

It installs **two ways from this one repo** — as a SpecKit extension or as a
Claude Code / Claude plugin — and the workflows are identical.

---

## Quickstart

```text
/plugin marketplace add VaiYav/speckit-product-forge
/plugin install speckit-product-forge@vaiyav-plugins
/speckit-product-forge:forge Build a push notification preferences screen
```

`forge` triages the change, recommends a track (express / lite / standard /
v-model), and walks you through each phase with a gate. Any phase can also be run
on its own. Add `--dry-run` to preview what a phase would change without writing.

---

## What's new in 1.8 ("Venusaur")

- **Feature catalog** — `catalog` builds `_portfolio/catalog.yml`, one small,
  deterministic index over every feature, refreshed after every status write and
  checked with `--check` in CI. Shape: [docs/schema/catalog.yml](./docs/schema/catalog.yml).
- **Retrieve** — `retrieve` turns a question into the 1–3 matching features and the
  exact files to open (one index scan, no embeddings).
- **One status-write procedure, one gate writer** — every command writes
  `.forge-status.yml` the same way (lock helpers, v3 initial document, object-form
  phases, digest before `completed`), and each gate is recorded exactly once, with
  the phase status following the decision.
- **Express and lite run end to end** — plan reads the product spec directly and
  carries an inline task list that implement executes.

Earlier releases: [CHANGELOG.md](./CHANGELOG.md).

---

## How it works

| Mode | Phases | Use for |
|------|--------|---------|
| `express` | product spec (minimal) → plan (inline) → implement → verify | copy, config, one-liners |
| `lite` | (problem discovery) → product spec → plan → implement → verify | bug fixes, small features |
| `standard` | problem discovery → research → product spec → revalidate → bridge → plan → tasks → implement → verify, plus optional review, test, release, monitoring, experiment and spec-merge phases | regular features |
| `v-model` | standard, with the formal V-Model artifacts from the V-Model pack | regulated / safety-critical work |

The exact phase set per mode lives in
[docs/schema/phase-map.yml](./docs/schema/phase-map.yml); what each phase produces
is in [docs/phases.md](./docs/phases.md). State for every feature is one file,
`<feature>/.forge-status.yml`; every gate decision is appended to its audit trail.

---

## Commands

33 commands. As a SpecKit extension they are `/speckit.product-forge.<name>`; as a
Claude plugin, `/speckit-product-forge:<name>`.

| Command | Phase | Description |
|---------|-------|-------------|
| `forge` | All | **Main command.** Full lifecycle orchestrator with human gates |
| `problem-discovery` | 0 | Validate the problem: JTBD analysis, interview script, Go/No-go |
| `research` | 1 | Parallel research: competitors, UX, codebase, optional tech stack and metrics |
| `product-spec` | 2 | Interactive product spec: journeys, wireframes, mockups, metrics |
| `design-system-harvest` | 2H | Read-only manifest of the project's in-code design system |
| `revalidate` | 3 | Review loop with Decision Log until the spec is approved |
| `bridge` | 4 | Product spec → SpecKit `spec.md`, contracts, delta specs |
| `i18n-harvest` | 4.5 | Extract strings, stub every locale |
| `plan` | 5 | Technical plan with constitution check and cross-validation |
| `tasks` | 5B | Task breakdown from plan.md |
| `migration-plan` | 5.5 | Zero-downtime migration plan when the plan changes the schema |
| `pre-impl-review` | 5C | Design, architecture and risk review before coding |
| `implement` | 6 | Implementation with progressive verification checkpoints |
| `code-review` | 6B | Multi-agent code review (optional cross-model review) |
| `verify-full` | 7 | Full traceability verification across 11 layers |
| `test-plan` | 8A | Test cases and Playwright specs generated from journeys |
| `test-run` | 8B | Run tests with playwright-cli, auto-fix P0/P1 bugs, loop until done |
| `release-readiness` | 9 | Pre-ship checklist: flags, rollout, docs, monitoring, security |
| `monitoring-setup` | 9.5 | Dashboard JSON, alerts and SLO doc for your backend |
| `experiment-design` | 9B | Pre-registered A/B plan: hypothesis, MDE, sample size, decision rule |
| `spec-merge` | 10 | Merge delta specs into canonical `specs/` and archive the feature |
| `retrospective` | post-launch | Predicted vs actual metrics, lessons appended to `.product-forge/lessons.md` |
| `sync-verify` | any time | 10-layer artifact consistency check between phases |
| `change-request` | any time | Formal scope change with impact analysis and propagation |
| `status` | any time | Lifecycle status, gate audit trail, sync history, `--cost` roll-up |
| `portfolio` | any time | Multi-feature table, file-conflict matrix, dependency graph |
| `catalog` | any time | Build / verify the feature catalog carrier |
| `retrieve` | any time | Query → matching features + the files to open |
| `backfill` | entry | Reverse-engineer an existing module into a feature folder |
| `feature-flag-cleanup` | any time | Find stale flags and produce removal recipes |
| `api-docs` | post-impl | OpenAPI 3.1 + Postman collection, reconciled with contracts |
| `security-check` | post-impl | OWASP audit scoped to the detected surfaces |
| `tracking-plan` | post-spec | Analytics events, funnels, property schemas, SDK snippets |

---

## Installation

### Option A — Claude Code plugin

This repo is a single-plugin marketplace named **`vaiyav-plugins`**
([`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json)).

```bash
claude plugin marketplace add VaiYav/speckit-product-forge
claude plugin install speckit-product-forge@vaiyav-plugins
```

Pin a release with `@ref`, update with `marketplace update`:

```bash
claude plugin marketplace add VaiYav/speckit-product-forge@v1.8.0
claude plugin marketplace update vaiyav-plugins
```

Packaging details and the command-name mapping: [docs/claude-plugin.md](./docs/claude-plugin.md).

### Option B — SpecKit extension

```bash
specify extension add product-forge --from https://github.com/VaiYav/speckit-product-forge/archive/refs/tags/v1.8.0.zip
specify extension list   # product-forge  v1.8.0  enabled
```

Use `.../archive/refs/heads/main.zip` for the latest commit, and
`specify extension update product-forge --from <zip>` to upgrade.

### Configure your project

```bash
mkdir -p .product-forge
# SpecKit extension:
cp "$(specify extension path product-forge)/config-template.yml" .product-forge/config.yml
# Claude plugin:
curl -fsSL https://raw.githubusercontent.com/VaiYav/speckit-product-forge/v1.8.0/config-template.yml -o .product-forge/config.yml
```

Set at least `project_name`, `project_tech_stack`, `project_domain` and
`codebase_path`. Commonly changed: `default_feature_mode`, `flow_mode`
(`gated` / `fluid`), `storage_strategy` (how feature folders are grouped) and the
`require_*` keys that make optional phases mandatory. Every key is documented in
[docs/config.md](./docs/config.md); a personal `~/.product-forge/config.yml` can hold
cross-project defaults.

---

## Requirements

- **SpecKit** ≥ 0.1.0 (extension form) or Claude Code (plugin form).
- An agent with **web search** (research) and **file-system access**.
- **Node.js ≥ 22** for the bundled helper scripts (catalog, retrieve, gate risk,
  traceability validation, `status --cost`). Without Node the workflows still run;
  each script call falls back to the documented LLM path with a warning.
- **Testing phases (8A/8B, optional):** [`playwright-cli`](https://github.com/microsoft/playwright-cli)
  (`npm install -g playwright-cli`) and Playwright browsers (`npx playwright install`).
- **V-Model mode only:** [`leocamello/spec-kit-v-model`](https://github.com/leocamello/spec-kit-v-model)
  ≥ 0.5.0. Without it, `--mode=v-model` aborts with the install command instead of
  silently falling back. See [docs/v-model-integration.md](./docs/v-model-integration.md).

---

## Documentation

| Read | For |
|------|-----|
| [docs/concept.md](./docs/concept.md) | the 10-minute mental model, producer → consumer map, a worked run |
| [docs/phases.md](./docs/phases.md) | what every phase produces and gates on |
| [docs/file-structure.md](./docs/file-structure.md) | the on-disk layout of a feature |
| [docs/config.md](./docs/config.md) | every config key |
| [docs/runtime.md](./docs/runtime.md) · [docs/policy.md](./docs/policy.md) · [docs/schema.md](./docs/schema.md) | the normative rules (in that precedence) |
| [ROADMAP.md](./ROADMAP.md) | open ideas not yet scheduled |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | changing Product Forge itself (`node scripts/doctor.js` is the gate) |

---

## License

MIT — see [LICENSE](./LICENSE).

## Author

Valentin Yakovlev — [github.com/VaiYav](https://github.com/VaiYav). Contributions welcome.
