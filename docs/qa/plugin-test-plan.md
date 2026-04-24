# Product Forge — Plugin Test Plan (v1.5.0)

> **Audience:** reviewer / QA engineer / AI agent asked to validate this plugin.
> **Scope:** testing the plugin itself, not features built with it.
> **Plugin type:** SpecKit extension composed of markdown slash-command
> definitions + a handful of shell / node helper scripts.

---

## 1. What this plugin is

A SpecKit extension (`speckit-product-forge`, v1.5.0) that orchestrates
a full product lifecycle — from problem discovery through shipped and
measured code — as a sequence of human-gated phases. Users drive it
through `/speckit.product-forge.*` slash commands. State between phases
is a YAML file inside each feature directory.

**The plugin is not runnable software in the traditional sense.** It
ships ~50 files total. 29 of them are slash-command definitions in
`commands/*.md` — markdown instructions to an LLM, not code. The rest
are reference docs under `docs/`, manifests at the root, and 4
executable helpers. Only those 4 files are directly executable:

- `scripts/migrate-status-v2-to-v3.js` (Node, zero-dep)
- `scripts/acquire-lock.sh`, `scripts/release-lock.sh` (bash)
- `scripts/migrate-status-v2-to-v3.ts` (deprecation stub)

Everything else describes intent. Its correctness is tested in two
distinct modes: **static / structural** (mechanical checks that the
instructions are internally consistent) and **behavioral** (running a
real agent against the instructions and observing outcomes).

---

## 2. How it should work

**Configuration.** Project copies `config-template.yml` to
`.product-forge/config.yml`. Supports single-root (`codebase_path`) or
monorepo (`codebase.paths` + `workspace_type`). Sets feature-mode
default, skip-reason policy, drift budget.

**Feature lifecycle.** User invokes `/speckit.product-forge.forge
"feature description"`. The orchestrator:

1. Resolves `feature_mode` (lite / standard / v-model) from config +
   CLI flag. In v-model mode, detects the optional
   `leocamello/spec-kit-v-model` extension; aborts if missing.
2. Creates `features/<slug>/` with a v3-shape `.forge-status.yml`.
3. Runs phases in the mode-specific map, each one:
   - Delegates to a sub-skill command.
   - The sub-skill writes its artifact(s) and a `<phase>/digest.md`.
   - Orchestrator runs `sync-verify --quick` on transition layers.
   - Presents a gate to the user: Approve / Revise / Skip / Rollback /
     Abort.
   - Appends a gate entry to `.forge-status.yml` `gates[]`.
4. Moves through the full 14/18 phases (standard) or the 5-phase
   lite map, or delegates V1–V13 to the V-Model plugin.
5. Implementation populates `task_log[]` with sizes, paths (workspace-
   prefixed in monorepo), commit SHAs, timestamps.
6. After release, a retrospective appends lessons to
   `.product-forge/lessons.md` that research consumes on next feature.

**Cross-cutting.** `/portfolio` reads every `.forge-status.yml` and
produces a multi-feature view. `/sync-verify` checks 7 artifact layers
for drift. `/change-request` handles formal scope changes with
impact propagation. `/feature-flag-cleanup` audits stale flags.
`/backfill` reverse-engineers a feature folder from existing code.

**Concurrency.** A file-based state lock (`.forge-status.yml.lock`)
with TTL takeover prevents concurrent-writer corruption. Enforced by
the two shell helpers.

---

## 3. What's in it (inventory)

- **29 slash commands** in `commands/*.md` covering problem-discovery,
  research, product-spec, revalidation, bridge, plan, tasks,
  pre-impl-review, implement, code-review, verify-full, test-plan,
  test-run, release-readiness, retrospective, api-docs, security-check,
  tracking-plan, sync-verify, change-request, portfolio, backfill,
  monitoring-setup, migration-plan, i18n-harvest, experiment-design,
  feature-flag-cleanup, status, forge (orchestrator).
- **Reference docs in `docs/`:** policy (gates, modes, skip, roles),
  runtime (state lock, resume, sync, digests, monorepo), schema
  (narrative), schema/forge-status-v3.schema.yml (canonical YAML),
  schema/migration-v2-to-v3.md, templates (phase-digest,
  portfolio-report), lessons-format, v-model-integration,
  testing-strategy, phases, file-structure, config, how-it-works-v2,
  qa/plugin-test-plan.md (this file).
- **Helpers in `scripts/`:** migrate-status-v2-to-v3.js + .ts stub,
  acquire-lock.sh, release-lock.sh.
- **`extension.yml`** registers all commands, declares
  `leocamello/spec-kit-v-model` as an optional extension, lists tags.
- **`config-template.yml`** documents every config key.
- **Historical design artifacts** — earlier versions of this plugin
  carried internal-only ADRs, brainstorms, and self-review reports
  under `docs/adr/`, `docs/brainstorms/`, and `docs/reviews/`. These
  directories have been removed from the current tree. Any surviving
  cross-references to them from `README.md`, `CHANGELOG.md`, or
  `docs/how-it-works-v2.md` point to files that no longer exist and
  should be treated as known broken links until resolved (see §6.2
  Layer B for the check).

---

## 4. Complexity hotspots (where to focus)

Each item below is an area where a plausible-looking change can
silently break the plugin. Test these deliberately.

1. **Schema v3 migration.** Additive-only contract. Writers stamp
   `schema_version: 3` lazily on first write. v2 files without the
   field must keep working. Test: take a v2 file, run any sub-skill,
   verify stamp appears without other field changes.
2. **State lock protocol.** Shell helpers must refuse concurrent
   writers and allow stale takeover. Wrong-session release must fail
   closed (exit 1). Test: two processes race acquire; kill one holding
   the lock; third process must take over after TTL.
3. **Digest enforcement grandfathering.** v2-native features
   (`v2_native: true`, `created_at >= v1.5 release`) are hard-enforced.
   Older features get WARNING + stub digest. Test: run against a
   pre-v1.5 feature, verify it doesn't block the gate.
4. **Mode resolution + lite escalation.** Lite mode runs 5 phases;
   standard runs 14+4; v-model delegates V1–V13 to external plugin.
   Lite auto-escalates when tasks hit size `L|XL` or count > 10 or
   plan touches > 3 modules. Test each trigger.
5. **V-Model detection and fallback.** Missing plugin → abort with
   install command. Version < 0.5.0 → abort with upgrade command.
   **No silent fallback to standard.** Test by setting mode v-model
   without installing the plugin.
6. **Monorepo path handling.** `Paths:` lines in tasks.md use
   workspace prefix (`backend:src/...`). `task_log[].paths` preserves
   prefix. Portfolio conflict detection groups per workspace. Cross-
   workspace changes widen `scope.paths` automatically. Test with a
   multi-workspace feature.
7. **Skip vs not_applicable.** `skipped` requires reason (if config
   enforces), counts toward "insufficient traceability". 
   `not_applicable` does neither. Lite-mode excluded phases and
   backfill-retro phases are `not_applicable`. Test by skipping
   optional phases and verifying reason persistence + sync-verify
   behavior.
8. **Drift budget + auto-resolve.** Structural drift never
   auto-resolved. Cosmetic drift auto-resolved only when config
   `sync_verify.auto_resolve.cosmetic: true` AND `--fix` passed. Test
   by introducing heading-level shift (structural) vs whitespace
   (cosmetic).
9. **Gate decision enum.** `approved | approved_with_conditions |
   revised | skipped | rolled_back | aborted`. `rolled_back` requires
   `rolled_back_to: <phase>`. `skipped` requires `skip_reason` if
   policy active. Test each decision and verify required fields.
10. **Release-readiness artifact production.** Must invoke
    `feature-flag-manager` and `newrelic-dashboard-builder` when
    installed, produce real `flags/registry.yml` and
    `monitoring/dashboard.json`. If missing, degrades to action-item
    without blocking gate.
11. **Backfill banners.** Every generated artifact under a
    `backfilled: true` feature must carry a "⚠ BACKFILLED ARTIFACT"
    banner. Status file sets the marker. Test by running backfill on
    a module and grep for banner on each produced file.
12. **Learning loop.** Retrospective appends blocks to
    `.product-forge/lessons.md`. Research reads lessons at Step 2.5 and
    surfaces tag-matching ones. Test: add a lesson; run research on a
    feature with matching tags; verify mention.

13. **Historical naming quirk — `v2_native` field.** The field is
    called `v2_native` but the shipped plugin is v1.5. The name
    originated when v1.5 was briefly planned as v2.0.0. The field
    semantic is "created by a v1.5+ writer" despite the `v2_` prefix.
    Test: a v1.5-native writer must set this to `true`; readers must
    treat the absence or `false` as "grandfathered pre-v1.5 feature".
    Do NOT rename without a schema v4 migration.

14. **`release_readiness` config override.** Config key can be
    `required | optional | skip`. When `required`, the gate cannot
    show "Skip". Test by flipping the config and attempting skip.

15. **V-Model domain pass-through.** `v-model-config.yml` at project
    root carries `domain: iec_62304 | iso_26262 | do_178c | generic`.
    Forge must read it and forward to every delegated `speckit.v-model.*`
    call. Test: set domain, run v-model requirements, verify the
    delegated command received the domain hint.

---

## 5. Testing approach (three layers)

### Layer A — Directly executable

Applies to: `scripts/*.js`, `scripts/*.sh`, YAML validity of
manifests, markdown link integrity, frontmatter validity.

This layer is 100% automatable. A CI job could run these without any
agent.

### Layer B — Static / structural

Applies to: cross-references between commands and docs, consistency
of phase names across Phase Map / Mode Resolution / delegation
sections / extension.yml, schema field catalog completeness,
universality invariants (no project-specific names, no Cyrillic in
non-historical files), version consistency.

Automatable via grep / YAML parser / markdown link walker. Does not
require an agent.

### Layer C — Behavioral (LLM agent)

Applies to: whether a real sub-skill run produces the claimed
artifact, whether gates actually pause, whether the orchestrator picks
up at the right resume phase, whether sync-verify finds actual drift,
whether portfolio's conflict matrix matches a hand-computed one.

Requires an agent. Cannot be run in CI without an LLM harness.
Recommended via scripted scenarios where a dummy feature is driven
through phases with known expected outputs.

---

## 6. Detailed test plan

### 6.1 Layer A — Executable tests

| Test | Input | Expected |
|------|-------|----------|
| migrate stamps v2 file | `.forge-status.yml` with `schema_version: 2` | stamped to `3`, all other lines identical |
| migrate stamps no-version file | status file without `schema_version` key, with `---` header | `schema_version: 3` inserted after header |
| migrate is idempotent | status file with `schema_version: 3` | reported as "already at v3", no modification |
| migrate on malformed YAML | status file with broken YAML body (e.g. `}{invalid`) on later lines | **current behavior:** exit 0, `schema_version: 3` stamped regardless. The script is line-oriented and YAML-unaware. This is intentional (survives any YAML style / comments) but means a broken file stays broken, just with a stamp. Test confirms this behavior. If strict validation is desired later, it must be a separate `validate-status` script, not a change to `migrate`. |
| acquire-lock atomic | two parallel processes call acquire on same feature | exactly one gets lock (exit 0), other exits 75 |
| acquire-lock stale takeover | pre-existing lock older than TTL | takeover with warning on stderr, exit 0. **Simulation:** either (a) run `acquire-lock.sh <dir> 2 <sid>` to set TTL=2s, wait 3s, acquire with a second session id; or (b) hand-edit the lock JSON to backdate `acquired_at` before the takeover attempt. Do not wait the full 1800s default. |
| release-lock idempotent | call release twice | first removes lock exit 0; second no-op exit 0 |
| release-lock session-id guard | release with wrong session_id | exit 1, lock preserved |
| release-lock missing lock | call when no lock exists | exit 0 (no-op) |
| YAML validity | parse every `.yml` in the plugin | all parse without errors |
| markdown frontmatter | parse every `commands/*.md` | frontmatter present, has `name`, `description` |
| markdown links | walk every relative `[text](path)` link | target file + anchor exists |

### 6.2 Layer B — Structural tests

| Test | How to run | Expected |
|------|-----------|----------|
| commands/*.md files ↔ extension.yml entries | `diff <(ls commands/*.md \| xargs -n1 basename \| sed 's/\.md$//' \| sort) <(grep -oE 'speckit\.product-forge\.[a-z0-9-]+' extension.yml \| sort -u \| sed 's/speckit\.product-forge\.//')` | empty diff (exact set-equality) |
| phase names consistent across forge.md Phase Map / Mode Resolution / `## Phase N:` sections | grep `^## Phase ` in commands/forge.md + count rows in Phase Map table + count non-V rows in Mode Resolution | all three show 18 phases |
| schema field catalog in schema.md ↔ fields in schema YAML | parse both and compare key sets | no field missing from either side |
| no `v2.0`, `v2.0.0`, `v2 Evolution` in shipped files | `grep -rn 'v2\.0\|2\.0\.0' . --include='*.md' --include='*.yml' \| grep -v 'docs/qa/plugin-test-plan.md'` | 0 matches. The test plan itself mentions these literals when describing what to check for — excluded via `grep -v` above. |
| no leaked authoring-context names | grep for identifiers from the environment the plugin was originally authored in (product names, internal codenames, specific tech-stack strings). Reviewers should adapt the pattern to their own context; the shipped check is: `grep -rniE 'authoring-project-name-1\|authoring-project-name-2' . --include='*.md' --include='*.yml'` | 0 matches in any shipped file |
| no Cyrillic in shipped files | `rg -l '[\u0400-\u04FF]' --glob '*.{md,yml}'` (or PCRE: `find . -type f \( -name '*.md' -o -name '*.yml' \) -exec grep -l -P '[\x{0400}-\x{04FF}]' {} \;`) | empty output |
| extension.yml version == "1.5.0" | `grep '^  version:' extension.yml` | `version: "1.5.0"` |
| extension.yml optional_extensions block well-formed | parse YAML and assert `optional_extensions[0].id == "v-model"`, `.version`, `.install`, `.detection_command` all present | all fields non-empty |
| `task_log[]` not called `tasks[]` in normative files | `grep -rn '\btasks\[\]' . --include='*.md' --include='*.yml' \| grep -v schema.md \| grep -v 'docs/adr\|docs/brainstorms\|docs/reviews'` | matches only in comments explaining the historical rename |
| all internal markdown links resolve | walk every `[text](relative/path.md#anchor)`, confirm target file exists and anchor matches a heading | 0 broken links |
| no references to removed historical directories | `grep -rn 'docs/adr\|docs/brainstorms\|docs/reviews' . --include='*.md' \| grep -v 'docs/qa/plugin-test-plan.md'` | 0 matches. The test plan itself names these directories in the "resolved" log and the grep examples — excluded above. |
| markdown frontmatter well-formed on every command | parse `commands/*.md`, assert `name` and `description` keys exist | all 29 parse cleanly |
| YAML validity | parse every `.yml`, assert no errors | all parse |

### 6.3 Layer C — Behavioral scenarios

For each scenario: spin up a dummy project, run the scripted command
sequence, assert the artifact state.

| Scenario | Setup | Command sequence | Expected end state |
|----------|-------|-------------------|--------------------|
| Greenfield standard mode happy path | empty project, `default_feature_mode: standard` | `/forge "demo feature"` → approve every gate | features/demo-feature/ with all phase digests, task_log populated, all gates `approved` |
| Lite mode skips correctly | config `default_feature_mode: lite` | `/forge "small fix"` | phases outside the lite map all marked `not_applicable` — specifically: `research`, `revalidation`, `bridge`, `i18n_harvest` (4.5), `tasks` (5B), `migration_plan` (5.5), `pre_impl_review` (5C), `code_review` (6B), `test_plan` (8A), `test_run` (8B), `release_readiness` (9), `monitoring_setup` (9.5), `experiment_design` (9B). Only `problem_discovery`, `product_spec`, `plan`, `implement`, `verify` produce `gates[]` entries. |
| Lite escalation trigger | running lite feature, add task with `Size: XL` | continue orchestrator | orchestrator offers promotion to standard; on accept, mode flips, missing artifacts generated, existing preserved |
| Skip with reason required | `require_skip_reason: true`, optional phase gate, user picks Skip | orchestrator prompts reason | non-empty reason persisted on both `gates[].skip_reason` and `phases.<name>.skip_reason`. Under the strict policy, empty or whitespace-only reasons MUST cause the orchestrator to re-prompt; no `skipped` gate entry may be written until a non-empty reason is supplied. See [docs/policy.md §3 rule 3](../policy.md#3-skip-reason-policy-e2). |
| Skip without policy | `require_skip_reason: false` | Skip at optional phase | accepted without reason; phase marked skipped; `skip_reason: null` on both gate and phase |
| Required phase cannot be skipped | config `release_readiness: required`, reach Phase 9 gate | user looks for "Skip" option | "Skip" not offered. Only Approve / Revise / Abort / Rollback available. Attempting to force skip via direct status edit is a spec violation — orchestrator should reset to `pending`. |
| Revalidation legacy `approved` status | pre-existing feature with `phases.revalidation.status: "approved"` (v1/v2 literal) | forge reads status | treated as equivalent to `completed` — phase not re-run, sync-verify does not flag. Documented in `docs/schema.md` field catalog. |
| Rollback records correctly | mid-feature, user picks Rollback to phase 2 | gate entry `decision: rolled_back`, `rolled_back_to: product_spec` | subsequent phases reset to pending; originals preserved in gates[] |
| Concurrent writer blocked | two agents race on same feature | one acquires lock | second aborts with "lock held" message |
| Digest enforcement on v2 feature | feature created pre-v1.5, `v2_native: false` | try to mark phase complete without digest | WARNING issued, stub digest synthesized, gate proceeds |
| Digest enforcement on v1.5-native feature | new feature with `v2_native: true` | same | gate blocked until real digest file exists |
| V-Model mode without plugin | `/forge --mode=v-model` in project without v-model extension | | abort with install command printed; no phase started |
| V-Model mode with plugin | install v-model ≥0.5.0 first | `/forge --mode=v-model` | delegates V1 requirements; our plugin does NOT run product-spec |
| V-Model domain pass-through | install v-model plugin + create `v-model-config.yml` with `domain: iec_62304` | `/forge --mode=v-model`, observe the delegation call to `speckit.v-model.requirements` | call receives `domain=iec_62304` parameter and template picks the IEC 62304 regulatory vocabulary |
| V-Model domain missing | same setup, no `v-model-config.yml` | same | delegation proceeds with `domain: generic`; orchestrator warns that no domain file was found but does not abort |
| Phase digest template consumed | every feature reaches Phase 7 | inspect every `<phase>/digest.md` produced | all six digests follow `docs/templates/phase-digest.md` section shape (Key decisions / Artifacts produced / Open risks / Handoff notes); none exceeds 600 words |
| Portfolio report template consumed | run `/portfolio` on a project with ≥2 features | inspect `features/_portfolio/portfolio.md` | structure matches `docs/templates/portfolio-report.md` (all 7 sections present even when empty) |
| Monorepo conflict detection | two features, each touching `backend:src/users.ts` | `/portfolio` | feature pair listed HIGH severity under "backend" workspace |
| Monorepo no-conflict across workspaces | feature A on `backend:src/users.ts`, feature B on `frontend:src/users.ts` | `/portfolio` | no conflict reported (different workspaces) |
| Backfill produces banners | `/backfill --source=src/legacy/module` | every generated `.md` under `features/<slug>/` | "⚠ BACKFILLED ARTIFACT" on line 1 |
| Backfill status shape | same | `.forge-status.yml` | `backfilled: true`, irrelevant phases `status: not_applicable`, task_log empty |
| Sync-verify drift: structural | introduce renamed heading in spec.md | `/sync-verify` | CRITICAL reported, NOT auto-resolved even with `--fix` |
| Sync-verify drift: cosmetic opt-in | config `auto_resolve.cosmetic: true`, introduce trailing whitespace in plan.md | `/sync-verify --fix` | whitespace normalized, cosmetic count in report |
| Sync-verify drift: cosmetic opt-out | default config, same whitespace | `/sync-verify --fix` | reported, NOT auto-fixed |
| Change request widens scope in monorepo | feature originally `scope.paths: [backend]`; CR touches frontend code | `/change-request` | scope widens to `[backend, frontend]`, gate condition recorded |
| Feature flag cleanup | stale flag with `cleanup_after` in past, used in code | `/feature-flag-cleanup` | flag listed under "Stale ready to remove" with code refs count |
| Learning loop | retrospective runs with 2 lesson blocks; research on new feature with matching tags | `/research` on new feature | "Prior lessons that apply" section in research/README.md lists matches |
| i18n-harvest auto-skip English-only | project has no multi-locale markers | orchestrator reaches Phase 4.5 | phase auto-set `not_applicable`, no gate presented |

### 6.4 Negative / adversarial tests

| Test | Input | Expected |
|------|-------|----------|
| Malformed feature_mode | `feature_mode: "full-spectrum"` (not a valid value) | orchestrator aborts at Mode Resolution step 4 with "Invalid feature_mode: 'full-spectrum'. Expected one of lite, standard, v-model." No phases run; no silent fallthrough. See [commands/forge.md §Mode Resolution](../../commands/forge.md). |
| Phase name typo in status file | `phases.research: { status: "done" }` (not a valid enum) | orchestrator aborts at Pre-flight step 2 with "Invalid phases.research.status: 'done' in .forge-status.yml. Expected one of …". No auto-coercion, no silent re-run. See [docs/runtime.md §4](../runtime.md#4-step-2--pre-flight-check). |
| Missing v-model-config.yml but v-model mode selected | v-model mode, no config file | orchestrator warns that no domain file was found; proceeds with domain `generic`; does not abort |
| Lock file corrupted (non-JSON) | write garbage to `.forge-status.yml.lock` | acquire-lock's JSON parser is tolerant (greps for `"acquired_at"`); if the grep fails, it treats the lock as unreadable and takes over with warning. Exit 0. |
| Tasks.md without `Paths:` in monorepo | task has no `Paths:` line | Step 4.1 aborts with "Missing workspace prefix on task {id} — monorepo mode requires '<workspace>:<path>' format." User fixes and regenerates. (Single-root mode accepts absence silently; portfolio then reports accuracy `pre-implementation`.) |
| Duplicate task IDs | two tasks both `T007` | Step 4.1 in tasks.md aborts with "Duplicate task ID T007 on lines …". No `task_log[]` entry is written with ambiguous IDs. |
| Monorepo-prefixed path without matching workspace | `Paths: nonexistent-workspace:foo.ts` | Step 4.1 aborts with "Unknown workspace 'nonexistent-workspace'. Known workspaces: {list}. Fix the Paths: line or add the workspace to .product-forge/config.yml." |

---

## 7. Known limits — what the plan does NOT cover

- **The plugin is markdown to an LLM.** Behavioral tests depend on the
  LLM interpretation being faithful. A scenario that "passes" with one
  model may not with another. Layer C results are probabilistic.
- **No built-in test harness.** The plugin does not ship a runner for
  Layer C. A separate harness (scripted agent driver with fixture
  projects) is needed and out of scope for this document.
- **Regulated domain correctness.** V-Model compliance (IEC 62304,
  ISO 26262, DO-178C) is owned by the external plugin, not this one.
  Product Forge delegates and does not second-guess.
- **Provider API correctness.** Release-readiness produces
  `dashboard.json` and `flags/registry.yml` but does not push to
  NewRelic / LaunchDarkly / equivalents. Correctness of the pushed
  artifact against the provider's API is out of scope.
- **Cross-session consistency.** The plugin has no server component;
  two separate agent sessions against the same repository should be
  equivalent, but this is not empirically verified.

---

## 8. Suggested execution order (if running the full plan)

1. Layer A (executable) — cheapest, catches regressions on scripts and
   YAML validity. Run first, fail fast.
2. Layer B (structural) — mechanical, runs in seconds, catches
   cross-file drift. Run before any Layer C.
3. Layer C (behavioral) — slow, probabilistic, model-dependent. Run
   last, in priority order: complexity hotspots (§4) first, then
   happy paths, then adversarial.
4. Spot-check historical docs for unintended changes (grep `docs/adr/`,
   `docs/brainstorms/`, `docs/reviews/` should show no modifications
   compared to pre-v1.5 git history).

---

## 9. Quick smoke (if time is short)

Minimal sanity run — ~15 minutes of manual work:

1. `node scripts/migrate-status-v2-to-v3.js --dry-run --features-dir=fixtures/features` — confirm it reports correctly.
2. `bash scripts/acquire-lock.sh fixtures/features/demo 1800 s1 && bash scripts/release-lock.sh fixtures/features/demo s1` — confirm acquire+release.
3. `grep '^  version:' extension.yml` — must print `version: "1.5.0"`.
4. `grep 'optional_extensions:' extension.yml` — must match exactly one line; block underneath must contain `id: "v-model"` and `install:` command.
5. Open `commands/forge.md`, confirm the Phase Map has 18 rows including 4.5 / 5.5 / 9.5 / 9B, and the Mode Resolution table has all 13 V-Model rows.
6. Verify all new v1.5 docs are present: `docs/v-model-integration.md`, `docs/testing-strategy.md`, `docs/qa/plugin-test-plan.md` (this file), `docs/runtime.md §9 Monorepo-Aware Operations`, `docs/schema/forge-status-v3.schema.yml`.
7. `grep -rn 'v2\.0\|2\.0\.0' . --include='*.md' --include='*.yml' | grep -v 'docs/qa/plugin-test-plan.md'` — must return 0 matches in any shipped file.
8. Grep the tree for any identifiers specific to the authoring environment (product names, internal codenames, app-specific tech stack strings). Reviewers should add their own patterns — the shipped check is a placeholder: `grep -rniE 'authoring-project-name-1\|authoring-project-name-2' . --include='*.md' --include='*.yml'` — must return 0 matches in any shipped file.
9. `rg -l '[\u0400-\u04FF]' --glob '*.{md,yml}'` — must return no files in the shipped tree. (Unicode range U+0400–U+04FF covers the Cyrillic block.)
10. `grep -rn 'docs/adr\|docs/brainstorms\|docs/reviews' . --include='*.md' | grep -v 'docs/qa/plugin-test-plan.md'` — must return 0 matches. If non-test-plan files reference the removed historical directories, those are broken links that need to be cleaned up before release.

If all ten pass, the plugin has no gross regressions. Deeper validation
still requires Layers B and C.

## 10. Known open issues

Remaining at time of the v1.5.0 release:

- **Historical field name `v2_native`** on the v1.5.0 schema. The field
  is named `v2_native` but the shipped release is v1.5.0 — the name
  originated when v1.5 was briefly scoped as v2.0. Kept for backwards
  compatibility; flagged to avoid silent renames. Rename requires a
  schema v4 migration.
- **Layer B link walker is not code-span-aware.** The naive regex used
  in §6.2 "all internal markdown links resolve" matches `[x](y)` inside
  backticks and fenced code blocks. Reviewers running this check should
  either exclude `commands/*.md` (which contain per-feature template
  paths, not plugin-internal links) and `docs/qa/plugin-test-plan.md`
  (which contains regex examples), or run a CommonMark-aware walker
  that respects code spans.
- **No built-in LLM test harness for Layer C.** Behavioral scenarios
  (§6.3) require a scripted agent driver with fixture projects. One is
  not shipped with the plugin.

### Resolved in v1.5.0 release candidate

- Broken cross-references to `docs/adr/`, `docs/brainstorms/`,
  `docs/reviews/` in `CHANGELOG.md`, `README.md`,
  `docs/how-it-works-v2.md` — references removed.
- Spec ambiguity in `docs/policy.md §3` on empty skip reasons — rule 3
  now explicitly rejects the gate under `require_skip_reason: true`.
- Enum validation for `feature_mode` and every `phases.<name>.status`
  value — added to `commands/forge.md` Mode Resolution step 4 and
  `docs/runtime.md §4` pre-flight step 2.
- Task ID uniqueness and monorepo workspace-prefix validation — added
  to `commands/tasks.md` Step 4.1 as hard checks.
