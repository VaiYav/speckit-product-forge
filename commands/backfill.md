---
name: speckit.product-forge.backfill
description: >
  Reverse-engineer a Product Forge feature folder from existing code: retro
  product spec, plan, tasks, initial canonical spec, a `backfilled: true` status
  file and a gaps report. Use to bring a brownfield module under Product Forge.
---

# Product Forge — Backfill

You are the **Backfill Archaeologist**. Take an existing module or directory and
produce a feature folder that looks as if the feature had gone through the
lifecycle — clearly marked as reverse-engineered, not original intent. The
source code is only read; you write to `{FEATURE_DIR}` and the canonical
`specs/`.

This is the only command that sets phases `completed` without running them. It
compensates by stamping `backfilled: true` and writing a **gaps report** of what
the real lifecycle would have required.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** none — writes the initial `.forge-status.yml`
- **Config keys:** `project_name`, `project_tech_stack`, `project_domain`,
  `codebase_path`, `features_dir`, `storage_strategy`
- **Writes:** `product-spec/README.md`, `plan.md`, `tasks.md`, the phase
  digests, `gaps-report.md`, canonical `specs/<domain>/spec.md`,
  `.forge-status.yml` (many `phases.*` keys)
- **Contract deltas:**
  - `--source=<path>` (required) — the module / directory to backfill (e.g.
    `back/src/modules/core/users`, `apps/web/src/features/checkout`).
  - `--slug=<feature-slug>` — default: the source's last path component.
  - `FEATURE_DIR` is **created** from the slug (Step 1), not resolved; there are
    no upstream prerequisites.
  - `--dry-run` writes under `{FEATURE_DIR}/.forge-dry-run/backfill/` (the 3E
    canonical spec at `{FEATURE_DIR}/.forge-dry-run/backfill/specs/<domain>/spec.md`)
    and no `.forge-status.yml`.
  - Status writes span every phase key (Step 4). No gate.

## Step 1: Validate the source

1. Resolve `--source` to an absolute path; it must exist (directory or file) and
   be non-empty — otherwise stop with a clear message.
2. Warn when it is not under `codebase_path`.
3. Slugify `--slug` (or the last path component) and place `FEATURE_DIR` with
   the CREATE rule of `resolve(slug)`
   ([runtime.md §12.2](../docs/runtime.md#12-path-resolution-contract)):
   `flat` → `{features_dir}/<slug>/`; `domain-nested` → ask for or derive
   `<domain>` and use `{features_dir}/<domain>/<slug>/`.

## Step 2: Scan the source

A short inventory — input for the retro artifacts, not an artifact itself:

- top-level files and their kinds (controller / service / component / test / config);
- framework signals (NestJS decorators, Vue SFC, React hooks, Python imports);
- public entry points (HTTP routes, exported symbols, public API);
- dependencies (other internal modules, external packages);
- tests present (count, kind);
- i18n strings referenced (if any);
- database schema references (Prisma / Mongoose / SQL migrations touched).

## Step 3: Synthesize the retro artifacts

Every generated artifact — 3A–3E, the Step 4 digests and the gaps report —
starts with:

```markdown
> ⚠ BACKFILLED ARTIFACT
> Reverse-engineered from `{source path}` on {date}.
> This is NOT the original intent of the feature; it is an inferred
> description based on code inspection. Treat as documentation, not spec.
```

Where inference is shaky, write a NEEDS-CLARIFICATION item instead of a
plausible-sounding fact.

**3A — `product-spec/README.md`:** feature summary (one paragraph, from names,
comments, route paths) · target users (best guess or `unknown — please fill in`)
· primary user stories (from route handlers / public methods) · in-scope /
out-of-scope (in-scope = what the code does; out-of-scope empty) · non-functional
reality (observed error handling, caching, auth, rate limits) · open questions
(NEEDS-CLARIFICATION items).

**3B — `plan.md`:** architecture as-is (modules, files, call graph) · data model
(schemas observed) · API contracts (route signatures, request / response shapes)
· dependencies (external services, internal modules) · known technical debt
(`TODO` / `FIXME`, commented-out blocks).

**3C — `tasks.md`:** one task per component that exists today, all shipped:

```markdown
- [x] T001 — {component name}  — {file path}
- [x] T002 — {component name}  — {file path}
```

`task_log[]` stays `[]` — there are no per-task commit SHAs or sizes; the gaps
report says so.

**3D — `verify/digest.md`:** the single paragraph *"Verification was not run
because this feature was backfilled from existing code. See gaps-report.md for
what a modern verification would check."* It provides `phases.verify.digest_path`.

**3E — canonical spec:** write the initial canonical requirements,
reverse-engineered from the code, to `specs/<domain>/spec.md` with stable
`REQ-*` ids, so later changes delta against it through [`spec-merge`](./spec-merge.md).
`<domain>` is the feature's bounded context in `{features_dir}/domains.yml` when
that registry exists, else the module / folder the source code lives in, else
the feature slug. When `specs/<domain>/spec.md` already exists, upsert: add each
new requirement under the next free `REQ-NNN` and leave every existing
requirement unchanged.

## Step 4: Digests, then `.forge-status.yml`

First write minimal `<phase>/digest.md` files for product-spec, plan, tasks,
implement and verify (verify's is 3D), each noting `backfilled: true` in its
handoff notes — the digest rule
([runtime.md §8](../docs/runtime.md#8-phase-digest-requirement-a4)) holds before
any phase is `completed`.

Then write the status file. A new feature starts from the v3 initial document in
[schema.md §3.1](../docs/schema.md#31-initial-document-new-features) with
`feature_mode: "standard"` — pinned rather than `default_feature_mode`, because
backfill produces the standard artifact set (`tasks.md` would be
`not_applicable` in express / lite). Every phase in
[schema/phase-map.yml](../docs/schema/phase-map.yml) gets an entry; merge in:

```yaml
schema_version: 3
feature: "{slug}"
created_at: "{today}"
last_updated: "{now ISO}"
feature_mode: "standard"
v2_native: true
backfilled: true
phases:
  # Never ran — not skipped by choice, simply not applicable to a
  # reverse-engineered feature (docs/policy.md §3 — no skip_reason, no gate).
  problem_discovery:     { status: "not_applicable" }
  research:              { status: "not_applicable" }
  revalidation:          { status: "not_applicable" }
  bridge:                { status: "not_applicable" }
  # Inferred from code — digests written above.
  product_spec:          { status: "completed", digest_path: "product-spec/digest.md" }
  plan:                  { status: "completed", digest_path: "plan/digest.md" }
  tasks:                 { status: "completed", digest_path: "tasks/digest.md" }
  implement:             { status: "completed", digest_path: "implement/digest.md" }
  verify:                { status: "completed", digest_path: "verify/digest.md" }
  # Every other phase-map phase stays a real (optional) phase the user may run
  # retroactively — pending, not not_applicable.
  design_system_harvest: { status: "pending" }
  i18n_harvest:          { status: "pending" }
  migration_plan:        { status: "pending" }
  pre_impl_review:       { status: "pending" }
  code_review:           { status: "pending" }
  test_plan:             { status: "pending" }
  test_run:              { status: "pending" }
  release_readiness:     { status: "pending" }
  monitoring_setup:      { status: "pending" }
  experiment_design:     { status: "pending" }
  spec_merge:            { status: "pending" }
gates: []
task_log: []     # optional population in a later run
```

`release_readiness` stays `pending`: a backfilled feature has not been through
release-readiness, and the user can run it retroactively.

An existing `{FEATURE_DIR}/.forge-status.yml` is never re-initialized: merge only
the keys above (runtime §2.9 step 4), keeping its gate trail and every phase a
real run already completed.

## Step 5: Gaps report

Write `{FEATURE_DIR}/gaps-report.md` — the user's main decision input. Sections:

1. **Summary verdict** — "Low gap" / "Medium gap" / "High gap":
   - Low: tests ≥70% coverage estimate, auth present, logging present.
   - Medium: tests <70%, some observability present.
   - High: tests absent, no tracking, no error handling evident.
2. **Missing artifacts** — everything a modern run would have produced but is
   absent: `research/` (competitor / UX / metrics), `product-spec/`
   clarifications (NEEDS-CLARIFICATION items), ADRs in `plan.md`, unit /
   integration / E2E tests below thresholds, tracking-plan entries, feature-flag
   registry entries, release-readiness evidence (monitoring dashboard, alerts),
   and the empty `task_log[]`.
3. **Inferred vs observed** — each inferred claim in the retro artifacts with its
   confidence (HIGH / MEDIUM / LOW).
4. **Recommended next actions** — ordered, each naming the Product Forge command
   that closes the gap.

## Step 6: Present

```
Backfilled: {slug}

  Source:      {source path}
  Feature dir: {FEATURE_DIR}
  Verdict:     {Low / Medium / High} gap
  Missing:     {N} artifacts

  Every file is banner-marked `BACKFILLED ARTIFACT`.
  `.forge-status.yml` is stamped `backfilled: true`.

  Next steps:
    1. Review `product-spec/README.md` — fix NEEDS-CLARIFICATION items.
    2. Read `gaps-report.md` — decide which gaps to close now.
    3. Run the commands in `gaps-report.md §4` to backfill the rest.
```

Ask whether to open the gaps report; open it only on a yes.

## Done when

- Every generated artifact (3A–3E, digests, gaps report) carries the
  `BACKFILLED ARTIFACT` banner; every shaky inference is a NEEDS-CLARIFICATION item.
- `tasks.md` lists every existing component as `[x]`; `task_log` is `[]`.
- A digest exists for product-spec, plan, tasks, implement and verify before
  their `completed` status.
- `.forge-status.yml` has `backfilled: true`, `feature_mode: "standard"` and an
  entry for every phase-map phase as in Step 4 (`release_readiness` pending); an
  existing file was merged, not replaced.
- Canonical `specs/<domain>/spec.md` holds the inferred `REQ-*` requirements
  (new ids only, existing requirements untouched).
- `gaps-report.md` has all four sections; the summary was shown and the
  open-report question asked.
- No source file changed.
