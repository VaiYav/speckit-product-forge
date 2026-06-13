# Product Forge — Concept & Mental Model

> **Audience:** new contributors and any agent/maintainer touching this repo.
> **Goal:** the 10-minute mental model — what Product Forge *is*, why it's
> shaped the way it is, and the producer→consumer map that makes the whole thing
> hang together. For the deep walkthrough see
> [how-it-works-v2.md](./how-it-works-v2.md); for the rules see the normative
> four (below).

---

## 1. The one thing to understand

**Product Forge is "spec-as-product".** It is not an application — there is
nothing to compile or run. The deliverable is a **process expressed as prompts**:
31 markdown command files that instruct an LLM to perform one phase each, plus
normative docs they defer to, plus a few zero-dependency Node helpers that make
the load-bearing checks deterministic.

It ships from **one repo in two forms** (identical workflows):

| Form | Manifest | Command syntax |
|------|----------|----------------|
| SpecKit extension | `extension.yml` | `/speckit.product-forge.<name>` |
| Claude Code / Claude plugin | `.claude-plugin/plugin.json` | `/speckit-product-forge:<name>` |

**Why it exists.** Vanilla SpecKit starts from a written `spec.md`
(spec → plan → tasks → implement). Product Forge wraps a full **product
lifecycle** around that core — problem validation, research, an approved product
spec, and a revalidation loop *before* `spec.md`; pre-impl review, progressive
verification, code review, full traceability verification, Playwright E2E,
release-readiness, and a retrospective *after*. The payoff is one unbroken
**traceability chain**:

```
problem → research → product-spec → spec.md → plan → tasks → code → tests → metrics
```

with a human gate at every transition.

---

## 2. Why the codebase looks the way it does

**The product's correctness IS the internal consistency of ~140 documents.**
There is no type-checker proving the spec coheres, so a contradiction between two
docs is a *silent runtime bug*: the LLM reading them picks one interpretation and
acts on it. Two recurring failure modes follow directly from this:

1. **"Callout-deep, not procedure-deep."** A prose callout announces a capability
   ("the a11y gate is configurable", "the risk script routes the gate") while the
   step / carrier field / producer that actually *executes* it was never wired.
   The happy path *reads* like it works; it doesn't *run* end-to-end.
2. **Drift.** A count, enum, version, or phase-map row is updated in one doc and
   not the other six that restate it.

Both are why this repo invests in **deterministic self-checks** rather than
trusting prose review:

| Script | Guards against |
|--------|----------------|
| [`scripts/lint-docs.js`](../scripts/lint-docs.js) | drift + callout-deep: dangling refs, plugin-root escapes, command-count / version / phase-map / enum parity, dead config switches, bare script paths |
| [`scripts/validate-traceability.js`](../scripts/validate-traceability.js) | the structural half of the traceability chain (every must-have row reaches a task/code/test, no orphan task, P0/P1 edge coverage) |
| [`scripts/gate-risk.js`](../scripts/gate-risk.js) | deterministic gate risk class (so routing isn't an LLM vibe) |
| [`scripts/doctor.js`](../scripts/doctor.js) | the aggregate gate — runs every `--selftest` + lint-docs + the release-blocking invariants. **Run this first.** |

> Honesty line: deterministic = structural. "Is this acceptance criterion truly
> measurable?" stays LLM-judged. The scripts front the LLM layers; they don't
> replace them.

---

## 3. Read these four, in this order

The command files are thin; the rules live in the **normative four**. When command
prose and a normative doc disagree, the doc wins.

1. **[policy.md](./policy.md)** — the rules: gate decisions, feature modes
   (express / lite / standard / v-model), skip policy, role approvals, the
   gate-review surface.
2. **[runtime.md](./runtime.md)** — orchestration: the 5-layer config merge,
   `${PLUGIN_ROOT}` script resolution (§1A), the state-lock protocol, resume
   logic, sync-verify integration, phase digests, the Path-Resolution Contract
   (§12).
3. **[schema.md](./schema.md)** + **[schema/forge-status-v3.schema.yml](./schema/forge-status-v3.schema.yml)**
   — the canonical `.forge-status.yml` v3 shape and the cross-artifact **ID
   system** (§8). The `.yml` file is authoritative when the narrative differs.
4. **[file-structure.md](./file-structure.md)** — the per-feature artifact tree,
   storage strategies, and naming conventions.

State for every feature lives in one file: `<FEATURE_DIR>/.forge-status.yml`.

---

## 4. The producer → consumer map

The single most useful thing to internalize: **who writes each artifact, and who
reads it.** Most bugs in this repo are a consumer reading something no producer
writes (or a producer writing to a shape no consumer expects). Phases below use
their `forge.md` numbers.

| Artifact | Produced by | Consumed by |
|----------|-------------|-------------|
| `problem-discovery/` (hypotheses H1–HN) | 0 problem-discovery | 1 research |
| `research/` (competitors, ux-patterns, codebase-analysis, …) | 1 research | 2 product-spec; verify-full (Layer: research alignment) |
| `.product-forge/lessons.md` (read-back) | retrospective (append) | research, plan, pre-impl-review ("Prior lessons that apply") |
| `product-spec/` + `journeys/` (`US-*`, `JRN-*`/`STEP-*`/`EDGE-*`) | 2 product-spec | 3 revalidate; 4 bridge; test-plan; tracking-plan |
| `design-system/manifest.yml` (`CMP-*` + tokens, read-only) | 2H design-system-harvest | product-spec mockups; test-run §4.7 conformance |
| `review.md` (Decision Log) | 3 revalidate | audit trail |
| `spec.md` + delta `specs/<domain>/spec.md` (`FR-*`) + `contracts/*` (`API-*`) | 4 bridge | 5 plan; api-docs; verify-full; spec-merge |
| `traceability.yml` (`REQ→US→JRN→FR→CMP→API→T→TEST→EVT`) | seeded by bridge/product-spec, rows filled by tasks + implement | verify-full + validate-traceability.js (read by field, not re-derived) |
| `plan.md` | 5 plan | 5B tasks; migration-plan (if schema changes); pre-impl-review |
| `tasks.md` (`T0NN`, `Test-first: true` markers) | 5B tasks | 6 implement; validate-traceability.js (orphan check) |
| `task_log[]` + `phases.implement.red_gate` on status | 6 implement | gate-risk.js; verify-full; retrospective |
| `gate-review.md` (`F-NNN`, one namespace) | pre-impl-review + code-review + verify-full | forge.md gate routing; gate-risk.js (open-finding count) |
| `verify-report.md` (+ "Suggested canonical-spec updates") | 7 verify-full | spec-merge (Theme-G loop) |
| `testing/playwright-tests/*.spec.ts` (axe gate iff `a11y_gate: axe`) | 8A test-plan | 8B test-run |
| `bugs/BUG-NNN.md` (`Journey:/Step|Edge:` field) | 8B test-run | test-report; verify-full |
| `gate-policy.yml` ({phase × risk} routing) | project (copied from template) | `forge --ci` headless gates |
| canonical `specs/` + `_archived/` | 10 spec-merge (upsert by `FR-id`, idempotent) | next feature's bridge (delta base) |

Cross-cutting (run any time): `sync-verify` (10-layer drift), `change-request`
(`CR-NNN`), `portfolio`, `feature-flag-cleanup`.

---

## 5. How to make a change without breaking the spec

1. **Run `node scripts/doctor.js`** — establish a green baseline.
2. Make the edit. If it touches a count, enum, version, phase-map row, config
   key, or a bundled-script invocation, expect `lint-docs` to have an opinion.
3. **Run `node scripts/doctor.js` again** — it must stay green. `lint-docs` must
   report **0 error-severity** findings.
4. If you added a config key, a command must *read* it (CONFIG-READER rule) — a
   documented-but-unread key is the `a11y_gate` dead-switch class.
5. If you added a script call in a command, route it through `${PLUGIN_ROOT}`
   (runtime.md §1A), never a bare `node scripts/...` (SCRIPT-PATH rule).
6. Bump the version in **both** `extension.yml` and `.claude-plugin/plugin.json`
   together, and add a `CHANGELOG.md` entry.

CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs `doctor` on
every push and PR — it is the automated version of step 3.
