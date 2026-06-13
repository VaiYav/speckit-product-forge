# Product Forge — Deep Review (2026-06-13)

> Method: full read of the 31 command files' contracts, all normative docs
> (runtime, policy, schema, schema.yml, file-structure, phases, how-it-works,
> config, journeys, interaction, testing-strategy, v-model), the 4 Node helper
> scripts, both manifests, and the two prior self-audits. Every claim below was
> re-verified against current HEAD bytes (commit 5cfe422), NOT against the audit
> docs — so this distinguishes findings already fixed by `f251b44` from those
> still live. Findings are tagged [LIVE] (present in HEAD) or [NEW] (not caught
> by either prior audit).

---

## Part 0 — Concept: what this is and why it exists

**Product Forge is not an application. It is a "process-as-prompts" package** —
a dual-distribution SpecKit extension + Claude Code plugin whose entire payload
is 31 markdown command files, ~7.4k lines of normative docs, and 4 small
zero-dependency Node helpers. There is no app to build or run; the deliverable
is the documented process itself.

**The problem it solves.** Vanilla SpecKit starts from a written `spec.md` and
goes spec → plan → tasks → implement. Product Forge wraps a full **product
lifecycle** around that core: it forces problem-validation, parallel research
(competitors/UX/codebase), an approved product spec, and a revalidation loop
*before* SpecKit's spec.md, then adds pre-impl review, progressive-verify
implementation, multi-agent code review, full traceability verification,
auto-generated Playwright E2E, release-readiness, and a post-launch
retrospective *after*. The thesis is a single unbroken **traceability chain**:
problem → research → product-spec → spec.md → plan → tasks → code → tests →
metrics, with a human gate at every transition.

**Architecture in one breath.** `forge.md` is an LLM-driven orchestrator that
delegates to phase sub-skills, persisting all state in a per-feature
`.forge-status.yml` (schema v3). Behaviour is governed by four normative docs
(policy = rules, runtime = orchestration, schema = state shape, file-structure
= layout) that the command prose defers to. v1.6 ("Bulbasaur") added a
deterministic enforcement spine — `validate-traceability.js`, `gate-risk.js`,
a unified `gate-review.md`, structured journeys, FE↔BE contracts, a 9-layer
sync-verify, and a first-class `express` track.

**The defining design tension** (and the source of most defects): the product
is **specification, not code**. Its correctness is *internal consistency across
~140 documents* that an LLM must parse and execute faithfully. There is no
compiler, no type-checker, no test runner that proves the spec coheres — so
contradictions between two docs are silent runtime bugs (the LLM picks one and
acts on it). The two prior audits named this the **"callout-deep, not
procedure-deep"** failure mode: a prose callout announces a capability while the
step/field/producer that makes it execute was never built.

**Maturity read.** This is a genuinely sophisticated, self-aware project: it
ran two multi-agent self-audits (56-finding system audit + Wave-5 roadmap),
landed a 56-fix consistency pass (`f251b44`), and unified to v1.6.0. The bones
are excellent. What remains is a *class* of residue the doc-pass missed:
behaviour-vs-doc contracts (not doc-vs-doc), and the brand-new runtime
portability gap that only shows once the plugin is actually installed.

---

## Part 1 — Health context (what's ALREADY fixed — do not re-report)

Commit `f251b44` ("56 verified findings") + the v1.6.0 finalization genuinely
closed the large majority of the 2026-05 system audit. Verified fixed in HEAD:

- Code-fence class A-05…A-10 — all 6 templates now use 4-backtick wrappers. CLEAN.
- A-03 / extension.yml:131 — "7-layer" purged; everything says 9-layer. CLEAN.
- A-04/A-12 — `completed_with_known_issues` now in schema.yml + schema.md. CLEAN.
- A-18/A-31/A-32/A-33/A-43 — `express` added to config.md, migration, phases.md,
  forge frontmatter. CLEAN.
- A-19 — 14-vs-18 phase contradiction gone (now consistently "20 phase slots"). CLEAN.
- A-24 — extension.yml description rewritten to v1.6 narrative. CLEAN.
- A-30/A-36 — supporting + extension phase keys (api_docs, security_check,
  tracking_plan, i18n_harvest, migration_plan, monitoring_setup,
  experiment_design) now in canonical schema.yml. CLEAN.
- A-38 — `produced_by` added to schema.yml phase object. CLEAN.
- A-40 — `mv -n` doc claim corrected to `ln`. CLEAN.
- A-41/A-54/A-55 — gate-risk open-finding filter + validate-traceability
  journey/orphan-task logic all rewritten correctly. CLEAN.
- A-56 — acquire-lock.sh now validates session_id against `^[A-Za-z0-9._-]+$`. CLEAN.
- A-13 — PF_LICENSE_ALLOWLIST env var gone. CLEAN.
- A-20/A-21/A-45 — "29 commands" claims corrected to 31. CLEAN (see 2.X for the
  one stale spot the pass missed).
- Command inventory: 31 files == 31 extension.yml entries == 31 frontmatter
  names, all matching. CLEAN.
- README "New in v1.6.0", CHANGELOG [1.6.0], plugin.json==extension.yml==1.6.0. CLEAN.

So this review is deliberately NOT a re-run of those. Everything below is either
still-live-after-the-pass or never-caught.

---

## Part 2 — Findings catalog (verified against HEAD)

Severity: P1 = breaks a real runtime path / data contract; P2 = misleads the
executing LLM or a user; P3 = polish/consistency.

### P1 — Runtime / contract breakers

**F-01 [NEW] Node helper scripts are invoked by bare relative path — they will
not resolve once the plugin is installed.**
`commands/forge.md` (L103, L200, L235) and `commands/verify-full.md` (L36)
invoke `node scripts/gate-risk.js …` and `node scripts/validate-traceability.js
…` with a repo-relative path. `docs/claude-plugin.md` itself states the plugin
is copied to `~/.claude/plugins/cache` and that command files must resolve their
own assets — and `runtime.md:22` already knows the correct mechanism
(`specify extension path product-forge`) but applies it ONLY to locating
config-template.yml. When a user runs `/speckit-product-forge:forge` from their
own project, cwd is the project root, `scripts/` is in the plugin cache, and the
bare `node scripts/…` invocation fails. **This silently disables the entire
proudest v1.6 capability** — deterministic risk routing and the traceability
pre-gate (the "callout-deep" antidote) — degrading them back to "script absent".
test-run.md:301 has the same issue with `require('./scripts/lib-yaml.js')`.
*Fix:* define a documented resolution rule (a `${PLUGIN_ROOT}` / `specify
extension path` lookup, or `CLAUDE_PLUGIN_ROOT` for the plugin form) and route
every script invocation through it; add a "scripts not found → skip with
WARNING, do not fail the gate" fallback so the LLM path still works.

**F-02 [LIVE, = audit A-01] `a11y_gate` is documented as a behaviour switch but
no command reads it; the axe floor is unconditional.**
config.md:613/630 and config-template.yml say `a11y_gate: none` "suppresses
generation of the automated floor" and that Phase 8A emits / Phase 8B runs the
axe check based on this key. But `grep a11y_gate commands/` = 0 hits:
test-plan.md §4 emits the `@axe-core/playwright` test unconditionally and
test-run.md §4.7 runs it unconditionally. Setting `a11y_gate: none` has zero
effect. The system audit flagged this as HIGH; the fix pass corrected the
*counts/enums* but never wired this *behaviour*. *Fix:* either gate
generation/execution on the config key in both commands, or delete the false
"none suppresses it" claim from config.md + config-template.yml.

**F-03 [NEW] `contract_differ: oasdiff` has the same unread-key shape as F-02
(needs confirmation, likely live).** config-template.yml documents
`sync_verify.contract_differ` + `contract_regen.cmd` driving a deterministic
OpenAPI diff in sync-verify L8 / verify-full L9. Given F-02's pattern (config
key with no command-side reader survived the doc pass), the oasdiff branch
should be verified to actually be read and shelled out by sync-verify.md /
verify-full.md, not just announced. *Fix:* confirm the read; if absent, wire it
or downgrade the doc claim to "planned".

### P2 — Misleads the executing LLM or the user

**F-04 [NEW] `docs/how-it-works-v2.md §1` still says "v1.5 adds …".**
The file header is "How Product Forge Works (v1.6)" and §4/§5 are fully v1.6,
but the one-paragraph summary (L19) still reads "v1.5 adds: a portfolio view …
and a learning loop" with no v1.6 mention — the exact A-24 defect the pass fixed
in extension.yml but missed here. *Fix:* update the summary to the v1.6 narrative.

**F-05 [NEW] `docs/how-it-works-v2.md` file-tree references `docs/adr/` and
`docs/reviews/` — neither directory exists.**
L52-53 of the annotated layout list `docs/adr/   # architecture decision
records` and `docs/reviews/   # self-review artifacts`. `test -d` confirms both
are MISSING. A maintainer/LLM reading the architecture doc is pointed at
phantom dirs. *Fix:* remove the two lines, or create the dirs if they're
intended (ADRs are referenced aspirationally elsewhere too — see F-13).

**F-06 [LIVE, = audit A-14] `default_track_hint` — verify it's now consumed.**
The audit flagged it as orphaned. HEAD shows forge.md:144 now reads it ("…
default_track_hint from config … as the pre-selected default") and runtime.md:74
lists it in the Step-0 extract — so this one appears **fixed**. Listed here only
to record it was checked and is NOT a finding. (A-17 flow_mode-in-extract: also
verify; runtime.md §1 extract should include flow_mode.)

**F-07 [LIVE, = audit A-27/A-29/A-49/A-50] naming-convention registry gaps.**
Re-verify against HEAD — several ID families used by commands still lack a
registry row in file-structure.md: confirmed candidates from the audit were
TC-UNIT/TC-INT, REQ-, SEC-, F-. The fix pass added an "ID-system home in
schema.md §8" (per wave5 roadmap §3.5), so part of this migrated. *Fix:* diff
the actual emitted ID families (REQ/US/FR/JRN/STEP/EDGE/CMP/API/EVT/TC-*/T*/
SEC/F/R/D/A/REV) against whichever doc is now canonical (schema.md §8) and close
any remaining gap; ensure file-structure.md points to it rather than carrying a
divergent partial copy.

**F-08 [NEW] Two competing task-ID forms still coexist (audit A-28 partially
open).** validate-traceability.js was hardened to normalize `TASK-/T/-0` →
canonical `T<int>` (good, A-28's runtime risk is closed), but the *human-facing*
docs still disagree: tasks.md + schema.yml use `T001`; traceability-matrix.md +
verify-full.md examples use `TASK-012`. The script tolerates both, but authors
reading the templates get conflicting conventions. *Fix:* pick `T001` as
canonical in the templates too (or document `TASK-NNN` as an explicit alias).

**F-09 [LIVE, = audit A-37/A-39] sibling-collision + uncodified gate fields.**
api-docs/security-check/tracking-plan write BOTH `phases.<x>` and a top-level
`<x>:` block (the same collision the schema solved for tasks→task_log by
renaming). The schema now recognizes the phase keys (A-30 fixed) and at least
api_docs uses `api_docs_report` for the metrics block — verify security/tracking
did the same rename. Also re-verify release-readiness's `gates[].action_items`
and `release_readiness.supply_chain_paths` (A-39) are now in schema.yml; if not,
they're writes against an undocumented shape. *Fix:* finish the rename for all
three supporting commands; add any still-missing gate/release fields to schema.yml.

**F-10 [NEW] QA test plan (`docs/qa/plugin-test-plan.md`) is internally
self-contradictory on the phase-map count.** L247 correctly asserts "Phase Map =
20 rows, Mode Resolution = 20 non-V rows" (matches forge.md, verified by count),
but L354 instructs the tester to "confirm the Phase Map has 18 rows" and L300
hard-codes the abort message "Expected one of lite, standard, v-model" (omits
express). The QA doc is also stamped v1.5.0 in its title and still lists "29
commands / 4 scripts" (should be 31 / 6, including gate-risk/validate-traceability/
lib-yaml). A QA agent following it would file false failures and under-test 3
commands + 3 scripts. *Fix:* re-stamp to v1.6.0; replace hard counts with the
dynamic `ls … | wc -l` checks the same doc already prescribes (L243); fix the
18→20 and the abort-message express omission.

### P3 — Polish / consistency

**F-11 [NEW] `.serena/` is tracked (2 files) and ships in the plugin.**
`git ls-files .serena` returns `.serena/.gitignore` + `.serena/project.yml`.
`.gitignore` excludes `.claude/`, `*.rvf`, `ruvector.db` but not `.serena/`.
Since the plugin source is the repo root (`"source": "./"`), this Serena
agent-runtime config gets copied into every install. *Fix:* `git rm -r --cached
.serena` and add `.serena/` to `.gitignore` (same treatment as `.claude/`).

**F-12 [NEW] No CI and no smoke/lint harness, despite shipping 4 self-testing
scripts + a written QA plan.** There is no `.github/` directory. The 4 script
self-tests (lib-paths 13/13, lib-yaml via consumers, gate-risk 10/10,
validate-traceability 16/16) all pass locally but nothing runs them on push;
`claude plugin validate .` and the version-sync invariant (extension.yml ==
plugin.json) are likewise unenforced. For a project whose correctness IS
cross-document consistency, the absence of an automated consistency gate is the
single biggest structural risk — it's precisely why the v1.6 doc pass missed
F-02/F-04/F-10. *Fix:* see Proposal 2, item A.

**F-13 [NEW] "ADR" is referenced as a concept (backfill gaps-report "no ADRs",
how-it-works file-tree) but there is no ADR producer, template, or directory.**
Same class as the CF-1 "REQ-* has no forward producer" the roadmap flagged. Low
impact today, but it's a dangling concept. *Fix:* either add a minimal ADR
template + a place to write them, or stop referencing ADRs as a tracked artifact.

**F-14 [NEW] Dual command syntax is a persistent UX trap in the docs.** Every
command exists as `/speckit.product-forge.X` (extension) AND
`/speckit-product-forge:X` (plugin). The README documents both, but the 31
command files' own prose, all cross-links, and every doc example use only the
dotted extension form. A plugin-form user copy-pasting an in-command example
hits a command that doesn't exist under their syntax. *Fix:* add a one-line
"command syntax" note at the top of forge.md and the README command table, and
prefer syntax-neutral references ("the research command") in prose.

---

## Part 3 — Proposal 1: improve current documentation & flows

Ordered by leverage. These harden what exists; no new surface.

**1A. Make the deterministic scripts actually reachable at runtime (closes
F-01).** This is the highest-leverage doc/flow fix: a single normative
"Locating bundled scripts" section in runtime.md defining `PLUGIN_ROOT`
resolution (extension: `specify extension path product-forge`; plugin:
`${CLAUDE_PLUGIN_ROOT}` or cache path), referenced by every `node scripts/…`
call site, plus a "missing → WARN + continue on the LLM path" rule. Without
this, v1.6's whole enforcement spine is dead on installed copies.

**1B. Add a "behaviour contract" layer to the existing self-audit.** The prior
audits were doc-vs-doc and script-in-isolation; F-02/F-03 are *config-key-vs-
command-reader* contracts. Add a recurring check: for every documented config
key, assert ≥1 command actually greps/reads it (a 30-line node script over
config-template.yml × commands/). This would have caught a11y_gate and would
catch the next orphaned switch.

**1C. Reconcile the QA plan with reality and make it executable (closes F-10,
F-12 partial).** Re-stamp v1.6.0; swap every hard count for the dynamic check
the doc already knows; add the 3 missing commands + 3 scripts; turn its "static
mode" section into an actual runnable checklist (script self-tests + `claude
plugin validate` + the version-sync grep). A test plan that lies is worse than
none.

**1D. Sweep the residual version/narrative drift the pass missed (F-04, F-05,
F-14, and the QA title).** Mechanical, low-risk: how-it-works §1 "v1.5 adds",
the two phantom `docs/adr|reviews` tree lines, a command-syntax note. Bundle into
one "post-1.6 doc reconciliation" commit.

**1E. Single-source the ID system and task-ID form (F-07, F-08).** Make
schema.md §8 the one canonical ID registry; reduce file-structure.md's table to
a pointer; align the templates on `T001`. Note next to the `F-` row that
forge.md greps the exact `**F-NNN**` bullet format so it must not be reformatted.

**1F. Add a one-page "Concept & mental model" doc for new contributors.** The
project is hard to onboard to precisely because it's process-as-prompts with 4
normative docs. A short "read these 4 docs in this order; here's the
producer→consumer map of every artifact" page (the wiring scorecard from the
wave5 roadmap is 80% of it) would cut ramp time dramatically and is where I'd
point the CLAUDE.md "documentation hierarchy" section.

---

## Part 4 — Proposal 2: extensions / changes to the project

Ordered by ROI. The high bar from the wave5 roadmap applies: prefer
surface-reducing or executable additions over prose.

**2A. Ship a CI workflow + a `forge doctor` self-check (addresses F-12, the root
cause of recurring drift).** A `.github/workflows/ci.yml` that on every push
runs: all 4 script `--selftest`s, `claude plugin validate .`, the version-sync
invariant (`extension.yml` version == `plugin.json` version), the command-count
invariant (`ls commands/*.md` == extension.yml entries == frontmatter names),
the no-escape-above-root check, and a new "every documented config key has a
reader" check (1B). Optionally expose the same bundle as a
`scripts/doctor.js --selftest`-style aggregate so contributors run it locally.
This is the single change that prevents the whole *class* of defect this review
found. Effort: M. Surface: neutral (CI only, doesn't ship in the plugin).

**2B. A deterministic "consistency-lint" script over the doc corpus itself
(productize this review).** Extend the validate-traceability pattern to a
`scripts/lint-docs.js`: cross-reference resolver (every `../docs/x.md`,
`commands/x.md`, anchor link resolves and stays inside plugin root), phase-map
parity (forge.md Phase Map rows == execution-map rows == phases.md Appendix C ==
how-it-works §5), enum parity (feature_mode / gate decision / phase status
identical across schema.yml, schema.md, runtime, forge, config, migration), and
count parity. This is the missing compiler for a spec-as-product. It's also
dogfooding — Product Forge preaches deterministic structural validation; it
should validate *itself* that way. Effort: M. Surface: reducing (replaces manual
multi-agent audits).

**2C. Close the F-01 portability gap structurally with a tiny shared resolver
doc + lint rule.** Beyond the doc fix (1A), add to 2B a check that NO command
invokes `node scripts/…` or `require('./scripts/…')` without going through the
documented `PLUGIN_ROOT` indirection — so the regression can't return.

**2D. Make the a11y_gate / contract_differ keys real or remove them (F-02/F-03),
and add the "config-key has a reader" lint (1B) so dead switches can't ship.**
Pick per key: wire it (a11y_gate is cheap — one conditional in test-plan +
test-run) or delete the false claim. Then enforce with the lint.

**2E. Provide a runnable example/fixture feature.** Today there's no
`features/` in the repo (correct — it's runtime), but that means nothing
exercises the end-to-end flow except a live LLM session. A committed
`examples/sample-feature/` fixture (a fully-populated `.forge-status.yml` +
traceability.yml + journeys.yml) would (a) give the scripts real input to run
against in CI, (b) serve as executable documentation of the artifact tree, and
(c) catch schema drift the moment a field is renamed. Effort: M. Surface: small
add, high test value.

**2F. Resolve the still-open wave5 forks that gate Theme B (living spec).** The
roadmap claims Track-1/2 shipped, but F-01 and F-02 show "shipped" sometimes
meant "doc-written, not wired". Specifically re-verify the CF-1 REQ-*/FR-*
producer decision actually has a forward producer in bridge (the roadmap chose
"FR-* keying"), and that spec-merge's idempotency guard exists in code, not just
prose — these are the contracts most likely to be callout-deep. Effort: varies.

**2G. (Strategic) Consider extracting the 4 normative docs' invariants into the
schema.yml as the single machine-readable source.** Long-term, the deepest fix
for "spec-as-product has no compiler" is to make schema.yml (already canonical
for state) also carry the enum/phase-map/ID-family definitions, and have docs +
the lint (2B) derive from it. That inverts the current "docs are truth, schema
mirrors" into "schema is truth, docs render" — eliminating the entire enum-drift
class permanently. High effort, highest long-term leverage; stage it after 2A/2B
prove the invariants.

---

## Appendix — what I verified but is NOT a finding (already fixed)

A-03, A-04, A-05–A-10, A-11, A-12, A-13, A-18, A-19, A-21, A-24, A-30, A-33,
A-36, A-38, A-40, A-41, A-43, A-45, A-54, A-55, A-56, and the command-inventory
/ version-sync / README-v1.6 / CHANGELOG-1.6 items are all CLEAN in HEAD. The
`f251b44` pass + v1.6.0 finalization did real, thorough work; this review is the
*next* layer (behaviour-vs-doc + runtime-portability + process), not a re-audit.
