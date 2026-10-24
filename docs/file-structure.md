# Product Forge — File Structure Reference

Every feature lives in a self-contained `FEATURE_DIR` under the project's
`features_dir` (default `features/`). The storage strategy
([below](#storage-strategies-feature-root-placement)) decides where `FEATURE_DIR`
sits; the tree **inside** it is the same for every strategy. Documents within a
feature are cross-linked via README.md index files.

This document owns the **layout**. The `.forge-status.yml` field shape is canonical
in [schema/forge-status-v3.schema.yml](./schema/forge-status-v3.schema.yml) (narrative:
[schema.md](./schema.md)).

---

## Feature Directory Layout

Which files exist depends on the feature mode and on which optional phases ran
(see [schema/phase-map.yml](./schema/phase-map.yml)). Phase numbers are `forge.md`'s.

```
{features_dir}/
└── {feature-slug}/                          ← FEATURE_DIR (kebab-case)
    │
    ├── README.md                            ← Feature root index (all phases + links)
    ├── .forge-status.yml                    ← Phase tracker (read by all commands)
    ├── .forge-status.yml.lock               ← transient state lock (runtime.md §2)
    ├── .forge-dry-run/<phase>/              ← transient --dry-run output (runtime.md §7; gitignore it)
    │
    ├── problem-discovery/                   ← Phase 0 [OPTIONAL] (+ digest.md)
    ├── research/                            ← Phase 1 (standard / v-model)
    │   ├── README.md                        ← Research index + executive summary
    │   ├── competitors.md                   ← [MANDATORY] Competitor analysis
    │   ├── ux-patterns.md                   ← [MANDATORY] UX/UI best practices
    │   ├── codebase-analysis.md             ← [MANDATORY] Integration points
    │   ├── tech-stack.md                    ← [OPTIONAL] Library recommendations
    │   ├── metrics-roi.md                   ← [OPTIONAL] Business impact
    │   └── digest.md                        ← phase digest (runtime.md §8)
    │
    ├── product-spec/                        ← Phase 2
    │   ├── README.md                        ← Spec index + document map
    │   ├── product-spec.md                  ← Main PRD document
    │   ├── journeys/                        ← structured journeys (E2E source of truth)
    │   │   ├── journeys.yml                 ← authoritative machine-readable index
    │   │   └── JRN-NNN-{slug}.md            ← one file per journey (JRN/STEP/EDGE)
    │   ├── wireframes.md                    ← text wireframes, OR
    │   ├── wireframes/                      ←   one HTML file per screen + index.html
    │   ├── mockups/                         ← [IF UI] clickable design-system prototype
    │   │   ├── index.html                   ← clickable hub (links all screens)
    │   │   ├── mockup-{screen}.html         ← uses real CMP-* components + tokens
    │   │   └── component-map.yml            ← region → CMP-* → code path
    │   ├── metrics.md                       ← [OPTIONAL] KPIs and success criteria
    │   └── digest.md
    │
    ├── design-system/                       ← Phase 2H [IF UI] harvested, read-only
    │   ├── manifest.yml                     ← components (CMP-*) + tokens + selectors
    │   └── manifest.md                      ← human-readable companion
    │
    ├── review.md                            ← Phase 3: Revalidation log (Decision Log)
    ├── spec.md                              ← Phase 4: SpecKit specification (FR-*)
    ├── specs/<domain>/spec.md               ← Phase 4: delta spec (ADDED/MODIFIED/REMOVED)
    ├── contracts/                           ← Phase 4/5: contract-first, validated by api-docs
    │   ├── openapi.yaml                     ← HTTP endpoints (API-* ids)
    │   └── asyncapi.yaml                    ← events (API-* ids)
    ├── traceability.yml                     ← live matrix (REQ→US→JRN→FR→CMP→API→T→TEST→EVT)
    ├── i18n/                                ← Phase 4.5 [OPTIONAL] keys.yml + report.md
    │
    ├── plan.md                              ← Phase 5 (express/lite: ends with inline `## Tasks`)
    ├── plan/digest.md
    ├── tasks.md                             ← Phase 5B (standard / v-model)
    ├── tasks/digest.md
    ├── migrations/                          ← Phase 5.5 [CONDITIONAL] data/schema migration
    │   ├── migration-plan.md
    │   ├── forward.sql / rollback.sql / validation.sql
    │   ├── backfill.md                      ← only for expand–migrate–contract
    │   └── risk-matrix.md
    ├── pre-impl-review.md                   ← Phase 5C [OPTIONAL]
    ├── gate-review.md                       ← unified F-NNN findings (5C, 6B, 7 — policy.md §9.1)
    │
    ├── implementation-log.md                ← Phase 6: progressive verification log
    ├── dependency-log.md                    ← Phase 6: install-time dependency vetting
    ├── failures/T0NN.md                     ← Phase 6: one log per failed task
    ├── implement/digest.md
    ├── code-review.md                       ← Phase 6B [OPTIONAL]
    ├── verify-report.md                     ← Phase 7: verification report
    ├── verify/digest.md
    │
    ├── testing/                             ← Phase 8A [OPTIONAL]
    │   ├── test-plan.md                     ← Master test plan (entry/exit criteria, run commands)
    │   ├── test-cases.md                    ← All test cases (TC-SMK/E2E/API/REG/UNIT/INT-NNN)
    │   ├── env.md                           ← Test credentials (gitignored — never commit)
    │   ├── playwright-results/              ← Screenshots + traces (gitignored)
    │   └── playwright-tests/
    │       ├── playwright.config.ts
    │       ├── {slug}-smoke.spec.ts         ← TC-SMK-NNN cases
    │       ├── {slug}-{journey}.spec.ts × N ← one per JRN (TC-E2E-NNN cases)
    │       ├── {slug}-api.spec.ts           ← TC-API-NNN cases (if API tested)
    │       └── {slug}-regression.spec.ts    ← TC-REG-NNN cases
    ├── bugs/                                ← Phase 8B [OPTIONAL]
    │   ├── README.md                        ← Bug dashboard (P0–P4 counts, open/fixed/deferred)
    │   └── BUG-NNN.md × N                   ← One file per bug found during the test run
    ├── test-report.md                       ← Phase 8B: final test report
    │
    ├── release-readiness.md                 ← Phase 9 [OPTIONAL]
    ├── flags/registry.yml                   ← Phase 9: feature-flag registry
    ├── monitoring/                          ← Phase 9 + 9.5: dashboard.json, alerts.yml, slo.md
    ├── experiment/                          ← Phase 9B [CONDITIONAL]: experiment-design.md, experiment.yml
    ├── retrospective.md                     ← post-launch retrospective
    │
    ├── api-docs/                            ← supporting: api-docs (openapi.yml, asyncapi.yml, postman)
    ├── security-check.md                    ← supporting: security-check
    ├── tracking/tracking-plan.md            ← supporting: tracking-plan (EVT-*)
    ├── gaps-report.md                       ← backfilled features only
    ├── sync-report.md / sync-report.json    ← cross-cutting: latest sync-verify report
    ├── change-log.md                        ← cross-cutting: change-request history
    ├── _rewound/<date>-CR-NNN/              ← artifacts archived by a rollback (policy.md §8); skipped by scans
    └── backlog.md                           ← cross-cutting: changes deferred by change requests
```

Every artifact written by `/backfill` carries a `BACKFILLED ARTIFACT` banner at the
top of the file.

### Project-level files

```
.product-forge/
├── config.yml                               ← project config layer (runtime.md §1)
├── lessons.md                               ← append-only learning log (lessons-format.md)
└── gate-policy.yml                          ← {phase × risk} routing for forge --ci (template: templates/gate-policy.yml)

{features_dir}/
├── _portfolio/                              ← reserved: cross-feature output
│   ├── catalog.yml                          ← feature catalog carrier (schema/catalog.yml)
│   ├── portfolio.md                         ← /portfolio report
│   └── flag-cleanup-YYYY-MM-DD.md           ← /feature-flag-cleanup reports
├── _archived/<date>-<slug>/                 ← reserved: features archived by spec-merge
└── domains.yml                              ← ddd strategy only: slug → context registry

specs/<domain>/spec.md                       ← canonical living spec, merged by spec-merge
```

Product Forge's helper scripts are **not** copied into your project — they run from
the installed plugin via `${PLUGIN_ROOT}` ([runtime.md §1A](./runtime.md#1a-locating-bundled-scripts-plugin_root)).

---

## Storage strategies (feature-root placement)

The `storage_strategy` config key decides only **how a single `FEATURE_DIR` is
placed under `features_dir`**. The internal artifact tree above (`research/`,
`product-spec/journeys/`, `contracts/`, `.forge-status.yml`, `testing/`, …) is
**invariant** — byte-for-byte identical wherever the feature root sits. The key is
additive: an absent key resolves to `flat`, and no existing feature ever has to
move.

| Strategy | Status | Feature root | Notes |
|----------|--------|--------------|-------|
| `flat` | **default** | `features/<slug>/` | Every feature is an immediate child of `features_dir`; the filesystem enforces global slug uniqueness. Resolve is a direct join with no scan. |
| `domain-nested` | first-class (opt-in) | `features/<domain>/<slug>/` | One extra grouping level by area/team/surface. A single depth-tolerant discovery rule subsumes flat (depth 1) and `_archived/<date-slug>` (depth 2); mixed flat + nested layouts coexist. Same slug in two domains is referenced as `<domain>/<slug>`. |
| `ddd` | active (opt-in) | `features/<context>/<slug>/` | Groups by bounded context mirroring `specs/<domain>/`, backed by a `features/domains.yml` registry (`slug: context`, healed on resolve/create) for O(1) resolution. `_archived/` may be context-keyed: `_archived/<context>/<date>-<slug>/`. |
| `workspace` | active (opt-in, monorepo) | `features/<workspace>/<slug>/` | Each feature lives under its primary monorepo workspace (`scope.primary`); requires a `codebase.paths` block. Same on-disk depth as `domain-nested`. |

**`flat` layout** (default):

```
features/
├── _portfolio/                 ← reserved namespace (cross-feature output)
├── _archived/                  ← reserved namespace (spec-merge archives, depth 2)
├── push-notification-prefs/    ← FEATURE_DIR (immediate child)
│   ├── .forge-status.yml       ← marks the feature root
│   └── …                       ← invariant internal tree
└── dark-mode-toggle/
    ├── .forge-status.yml
    └── …
```

**`domain-nested` layout** (`ddd` and `workspace` have the same shape, with a
bounded context or monorepo workspace as the grouping folder; `ddd` adds the
top-level `domains.yml` registry file):

```
features/
├── _portfolio/                 ← reserved namespace (stays top-level)
├── _archived/                  ← reserved namespace (stays top-level)
├── notifications/              ← <domain> grouping folder
│   ├── push-notification-prefs/   ← FEATURE_DIR (depth 2)
│   │   ├── .forge-status.yml      ← marks the feature root
│   │   └── …                      ← invariant internal tree (unchanged)
│   └── digest-emails/
│       ├── .forge-status.yml
│       └── …
└── legacy-feature/             ← a pre-existing flat feature still resolves
    ├── .forge-status.yml          (legacy depth-1 fallback)
    └── …
```

The reserved `_`-prefixed namespaces (`_portfolio/`, `_archived/`) stay top-level
under every strategy and are excluded from feature enumeration, as is the
`domains.yml` registry file (ddd). Normative resolution:
[runtime.md §12](./runtime.md#12-path-resolution-contract) (Path-Resolution
Contract). Starter registry: [`docs/templates/domains.yml`](./templates/domains.yml).

---

## Decomposition Rules

The size budget (`max_tokens_per_doc`, default 4000 tokens ≈ 3000 words) and the
general split-or-tighten procedure are
[runtime.md §10.1](./runtime.md#101-document-size-budget-max_tokens_per_doc). These
fixed per-type layouts apply first:

| Document | When to Decompose | How |
|----------|------------------|-----|
| `journeys/` | always structured | `journeys.yml` (authoritative) + one `JRN-NNN-{slug}.md` per journey |
| `wireframes.md` | > 3 screens, or HTML detail requested | One `.html` file per screen in `wireframes/` |
| `mockups/` | Always decomposed when > 1 screen | One `.html` per screen + `index.html` |
| `product-spec.md` | Almost never — keep as single source of truth | Use sections/headers instead |

---

## Cross-linking Convention

All documents use **relative links**, and every generated document starts with a navigation header:

```markdown
> Related: [Product Spec](./product-spec.md) | [Journeys](./journeys/) | [Research →](../research/README.md)
```

HTML files include an in-page navigation bar linking sibling screens.

---

## Artifact schemas

Markdown artifact shapes live in the templates their writing command reads (the
`.forge-status.yml` shape is the canonical schema linked above):

| Artifact | Template | Writer |
|----------|----------|--------|
| `review.md` | [templates/revalidate-review.md](./templates/revalidate-review.md) | `revalidate` |
| `verify-report.md` | [templates/verify-full-report.md](./templates/verify-full-report.md) — one section per layer (11 layers, owned by [verify-full](../commands/verify-full.md)) plus `## Suggested canonical-spec updates`, consumed by spec-merge | `verify-full` |
| `bugs/BUG-NNN.md` | [templates/test-run-bug.md](./templates/test-run-bug.md) | `test-run` |
| `test-report.md` | [templates/test-run-test-report.md](./templates/test-run-test-report.md) | `test-run` |

---

## Naming Conventions

Traceability-chain IDs (`REQ`, `US`, `JRN`/`STEP`/`EDGE`, `FR`, `CMP`, `API`,
`T0NN`, `TC-*`, `EVT`, `SEC`, `F`) are defined in
[schema.md §8](./schema.md#8-cross-artifact-id-system). This table covers file
names and artifact-local IDs.

| What | Convention | Example |
|------|-----------|---------|
| Feature directory / slug | `kebab-case` | `push-notification-preferences` |
| Journey files | `JRN-NNN-{slug}.md` | `JRN-001-save-prefs.md` |
| Wireframe files | `wireframe-{screen}.html` | `wireframe-home-screen.html` |
| Mockup files | `mockup-{screen}.html` | `mockup-settings-panel.html` |
| Digest files | `<phase-dir>/digest.md` (the phase's artifact folder, else the kebab-case phase key — runtime.md §8.1) | `product-spec/digest.md`, `plan/digest.md` |
| Failed-task logs | `failures/<task-id>.md` | `failures/T007.md` |
| Bug IDs | `BUG-NNN` | `BUG-001` |
| Change request IDs | `CR-NNN` | `CR-003` |
| Drift finding IDs | `DRIFT-NNN` (sync-verify) | `DRIFT-015` |
| Pre-impl-review IDs | `D-NNN` design · `A-NNN` architecture · `R-NNN` risk (folded into `F-NNN` on `gate-review.md`) | `D-001`, `A-003`, `R-008` |
| Code-review finding IDs | `REV-NNN` (legacy; folded into `F-NNN`) | `REV-042` |
| Architecture Decision Records | `ADR-NNN` | `ADR-005` |
