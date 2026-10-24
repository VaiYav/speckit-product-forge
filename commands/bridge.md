---
name: speckit.product-forge.bridge
description: >
  Converts the approved product spec into a research-backed SpecKit spec.md (Phase 4),
  with FE↔BE contracts and delta specs, then hands off to the classic or V-Model flow.
  Use after revalidation approves the product spec.
---

# Product Forge — Phase 4: SpecKit Bridge

You are the **SpecKit Bridge Agent**. You synthesize the research and product-spec
artifacts into one `spec.md` that SpecKit agents can work from, plus contract files and
delta specs, then hand off to the chosen SpecKit flow.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `bridge` (Phase 4)
- **Config keys:** `features_dir`, `default_speckit_mode`
- **Writes:** `spec.md`, `contracts/openapi.yaml`, `contracts/asyncapi.yaml`,
  `specs/<domain>/spec.md` (delta specs), `{FEATURE_DIR}/README.md`,
  `phases.bridge.*`, top-level `speckit_mode`
- **Contract deltas:** prerequisites are stricter than the §11.2 row (Step 1). With
  `--dry-run`, SpecKit is not launched (Step 11).

## Step 1: Validate prerequisites

1. `phases.revalidation.status` in `.forge-status.yml` is `completed` (canonical) or the
   legacy literal `approved`.
2. `{FEATURE_DIR}/product-spec/product-spec.md` exists.
3. `{FEATURE_DIR}/review.md` contains "APPROVED".

When any check fails, stop with:
*"⚠️ Product spec has not been approved yet. Please complete Phase 3 first:
`/speckit.product-forge.revalidate`"*

## Step 2: Load source artifacts

Read in this order (each one enriches `spec.md`):

1. `product-spec/product-spec.md` — user stories, requirements, personas, risks
2. `product-spec/journeys/journeys.yml` — structured journeys (JRN / STEP / EDGE), the E2E source of truth
3. `product-spec/metrics.md` — success criteria, KPIs
4. `product-spec/wireframes*` — screen descriptions
5. `research/README.md` — research summary
6. `research/competitors.md` — key competitive patterns
7. `research/ux-patterns.md` — UX recommendations
8. `research/codebase-analysis.md` — integration points and technical constraints

Then set `FEATURE_TYPE`:

- `shared_infrastructure` — the feature exposes a reusable service, library or API
  other features consume (signals: "platform", "service", "SDK", "provider",
  "engine", "shared", "foundation", or named as a dependency by other features).
- `end_user` — everything else.

Result: sources read; `FEATURE_TYPE` set (it decides the Consumer Contract section).

## Step 3: Dependency discovery

1. Enumerate feature roots with `enumerate()`
   ([runtime.md §12](../docs/runtime.md#12-path-resolution-contract)) and read each
   `.forge-status.yml` for phase status. When `{features_dir}/` is empty or missing,
   go to Step 4.
2. For each feature sharing a domain keyword or module with this one, classify the
   relationship: **blocks** / **complements** / **replaces** / **unrelated**.
3. Related features found → fill the `## Prerequisites` section of `spec.md`. None →
   omit that section.

## Step 4: Choose the SpecKit mode

Resolve `SPECKIT_MODE` per [policy.md §4.1](../docs/policy.md#41-phase-maps)
("`speckit_mode` vs `feature_mode`"):

- `feature_mode: v-model` → `v-model`, without asking.
- Otherwise (`standard`): `default_speckit_mode: classic` or `v-model` → use it without
  asking; `ask` → structured prompt *"How would you like to proceed with SpecKit after
  the spec is created?"*:
  - **Classic** — `plan → tasks → implement → verify`. Best for well-scoped features,
    clear requirements, time-constrained work.
  - **V-Model** — full traceability: V1 requirements → V3 acceptance → V4/V5 system
    design + test → V6/V7 architecture design + integration test → V8/V9 module design
    + unit test, with V10 trace checkpoints, then Product Forge plan → tasks → implement
    ([v-model-integration.md §4](../docs/v-model-integration.md#4-phase-map-in-v-model-mode)).
    Best for complex features, safety-critical flows, regulated domains, or when full
    test-coverage traceability is required.

## Step 5: Generate `spec.md`

Write `{FEATURE_DIR}/spec.md` — the canonical SpecKit specification — from
[docs/templates/bridge-spec.md](../docs/templates/bridge-spec.md). It is richer than a
plain SpecKit spec: it links `product-spec/` and `research/` for depth, carries every
user story with acceptance criteria and the codebase integration notes, and is
self-contained enough for SpecKit agents to work without reading every source.

| Conditional section | Include when |
|---------------------|--------------|
| `## Prerequisites` | Step 3 found related features |
| `## EDA Events` | `research/codebase-analysis.md` shows event-driven patterns |
| `## Consumer Contract` | `FEATURE_TYPE = shared_infrastructure` |

## Step 6: Verify EDA events

When the *Event / Message Patterns* section of `research/codebase-analysis.md` shows no
EDA patterns, remove `## EDA Events` from `spec.md` and go to Step 7. Otherwise, for
each event in that table:

1. Search the codebase for the exact identifier (enum value, constant or string literal).
2. Locate its payload interface or schema definition.
3. Confirm the payload carries a correlation / trace ID when the project convention
   requires one.
4. Set Status: `exists` (fill the source file path) or `to create` (it must
   become the tasks.md task "Define event [name] + payload interface").

Result: every EDA row has a source path or the to-create status.

## Step 7: Contract-first artifacts and delta specs

**Contracts.** Define the FE↔BE contracts up front so frontend and backend tasks share
one source:
- Write or update `contracts/openapi.yaml` (OpenAPI 3.1) for HTTP endpoints and
  `contracts/asyncapi.yaml` (AsyncAPI) for events, derived from the EDA Events and
  data-model sections. Give each operation a stable `API-*` id.
- Reference those `API-*` ids from journey steps (`journeys.yml`) and the `contracts:`
  column of `traceability.yml`. `api-docs` later validates them against the
  implementation.

**Delta specs.** Express the change against the canonical `specs/` source of truth
([spec-merge](./spec-merge.md)): write one `{FEATURE_DIR}/specs/<domain>/spec.md` per
touched domain, using the same `FR-*` ids minted in the Functional Requirements table.
`spec-merge` folds them into canonical `specs/` on completion. Omit empty sections; for
a brand-new domain every requirement is `ADDED`.

```markdown
# Delta spec: {domain} — {feature-slug}

> Delta against canonical `specs/{domain}/spec.md`. Keys: `FR-*` (minted in
> spec.md § Functional Requirements). Folded by `spec-merge`.

## ADDED Requirements
- **FR-001** {requirement} — Priority: Must — Source: US-001
- **FR-002** {requirement} — Priority: Should — Source: US-005

## MODIFIED Requirements
- **FR-014** {new wording of an existing canonical requirement}

## REMOVED Requirements
- **FR-009** {requirement being retired, with one-line reason}
```

## Step 8: Self-check `spec.md`

Check, and fix every failure before presenting:

1. Every Must Have user story has ≥ 1 acceptance criterion.
2. Every `FR-NNN` traces to ≥ 1 user story.
3. Integration Points cite real paths from `codebase-analysis.md`.
4. No placeholder text remains (no "TODO", no "{}").
5. Links to `product-spec/` and `research/` are valid relative paths.
6. `## EDA Events` present → every event has a status (exists / to create); no blank cells.
7. `## NFR Measurement Contract` present → every NFR row has a Signal / Query.
8. `## Testing Specification` present → ≥ 3 TC entries and ≥ 1 E2E scenario.
9. `## Prerequisites` present → every row has Relationship and What's Needed.
10. `## Consumer Contract` present → the Public API block is filled and Fallback
    Behaviour has ≥ 1 row.
11. A delta spec `specs/<domain>/spec.md` exists with ≥ 1 ADDED / MODIFIED / REMOVED
    Requirements section and `FR-*` ids matching the Functional Requirements table.

## Step 9: Present and gate

Show:

```
spec.md created: {FEATURE_DIR}/spec.md
- {N} Must Have stories + acceptance criteria
- {N} Should Have stories
- {N} functional requirements
- {N} non-functional requirements + NFR Measurement Contract
- {N} EDA events verified   [or: EDA not applicable — section omitted]
- {N} dependencies discovered   [or: no prerequisite features found]
- Consumer Contract: included   [or: end-user feature — section omitted]
- {N} test cases + {N} E2E scenarios (Testing Specification)
- {N} identified risks
- links to {N} source documents
SpecKit mode: {SPECKIT_MODE}
```

Gate: `{Phase}` = Bridge, `{next phase}` = Plan.

| Answer | Decision | Next |
|--------|----------|------|
| Approve | `approved` | Step 10 (`phases.bridge.status: completed`), then Step 11 |
| Revise | `revised` | Adjust `spec.md` / delta specs with the feedback and return to Step 8; the phase stays `in_progress` |
| Rollback | `rolled_back` | Offer only `completed` phases; that phase and every later one → `pending`, rewound artifacts archived per [policy.md §8](../docs/policy.md#8-change-management); stop |
| Abort | `aborted` | Statuses unchanged; stop |

## Step 10: Update status

Standalone, after Approve, write both keys below. Under `--from-forge`, write only the
data field `speckit_mode` — no `phases.bridge.status` and no `gates[]` entry (forge
writes them from its gate).

```yaml
phases:
  bridge:
    status: completed
speckit_mode: "{SPECKIT_MODE}"
```

Delta specs are not listed in the status file — `spec-merge` finds them under
`{FEATURE_DIR}/specs/`. Mark Phase 4 ✅ Complete in `{FEATURE_DIR}/README.md`.

## Step 11: Hand off to SpecKit

Runs after Approve and the status write, standalone only (under `--from-forge` the
orchestrator runs the next phase).

Context note for the delegated command: *"This spec was generated by Product Forge
from a fully researched and user-approved product spec. The product-spec/ folder
contains detailed user journeys, wireframes, and mockups. The research/ folder
contains competitor analysis, UX patterns, and codebase integration analysis. Use all
of this context to create the most informed technical plan possible."*

**`SPECKIT_MODE = classic`** — tell the user the sequence, then delegate to
`speckit.product-forge.plan` with the context note:

1. `/speckit.product-forge.plan` — technical plan with product-spec cross-validation
2. `/speckit.product-forge.tasks` — task breakdown with coverage validation
3. `/speckit.product-forge.pre-impl-review` — design + architecture + risk review (optional)
4. `/speckit.product-forge.implement` — implementation with progressive verification
5. `/speckit.product-forge.code-review` — multi-agent code review (optional)
6. `/speckit.product-forge.verify-full` — full traceability verification

**`SPECKIT_MODE = v-model`** — tell the user the sequence (order per
[v-model-integration.md §4](../docs/v-model-integration.md#4-phase-map-in-v-model-mode)),
then delegate to `speckit.v-model.requirements` with the context note and `spec.md` as
its primary input:

1. `/speckit.v-model.requirements` — V1, `REQ-NNN` from `spec.md` + `product-spec/`
2. `/speckit.v-model.acceptance` — V3 acceptance test plan (V2 hazard analysis first when the domain requires it)
3. `/speckit.v-model.system-design` + `system-test` — V4 / V5
4. `/speckit.v-model.architecture-design` + `integration-test` — V6 / V7
5. `/speckit.v-model.module-design` + `unit-test` — V8 / V9
   (`/speckit.v-model.trace` — V10 checkpoint after each pair)
6. `/speckit.product-forge.plan` — Phase 5, consistent with SYS / ARCH / MOD
7. `/speckit.product-forge.tasks` — Phase 5B, derived from `MOD-NNN`
8. `/speckit.product-forge.implement` → verify-full → test-plan / test-run → V12 → V13 → release-readiness

## Done when

- `spec.md` follows the template, contains exactly the conditional sections whose
  conditions hold, and passes all 11 Step 8 checks.
- Every EDA event (when the section exists) is exists-with-path or to create.
- `contracts/openapi.yaml` / `contracts/asyncapi.yaml` give each operation an `API-*`
  id, and one delta spec exists per touched domain with matching `FR-*` ids.
- `SPECKIT_MODE` resolved: `v-model` whenever `feature_mode` is `v-model`; otherwise
  from `default_speckit_mode` or the user's answer.
- Standalone: the gate was shown and its decision appended to `gates[]`; on Approve,
  `phases.bridge.status: completed` and `speckit_mode` are written, the feature
  README marks Phase 4 complete, and the flow for `SPECKIT_MODE` was handed off.
- `--from-forge`: `speckit_mode` was written (a data field) and the Step 9 summary
  returned to forge, with no gate prompt, no `phases.bridge.status` or `gates[]`
  write, and no SpecKit hand-off.
