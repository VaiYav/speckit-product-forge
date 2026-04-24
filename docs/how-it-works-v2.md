# How Product Forge Works (v1.5)

> **Note:** filename retains the `-v2` suffix for existing deep-links;
> it will be consolidated in a later release.

> **Scope:** end-to-end walkthrough of the plugin as it stands after the
> v1.5.0 update. Written for maintainers and contributors, not end users.
> For end-user docs see [README.md](../README.md) and [docs/phases.md](./phases.md).

---

## 1. One-paragraph summary

Product Forge is a SpecKit extension that drives a feature from idea to
shipped code through a gated lifecycle. The user interacts through slash
commands (`/speckit.product-forge.*`). Every command is a markdown file
in `commands/` that instructs an LLM to do one phase of the job. State
between phases lives in `.forge-status.yml` inside each feature's
folder. v1.5 adds: a portfolio view across features, a lite mode for
small work, brown-field backfill from existing code, extension phases
for monitoring / migrations / i18n / experiments / flag cleanup, and a
learning loop.

---

## 2. File layout

```
speckit-product-forge/
├── commands/                    # 29 slash-command definitions
│   ├── forge.md                 # the orchestrator (invokes all phase sub-skills)
│   ├── {phase}.md               # one file per phase (research, plan, implement…)
│   ├── portfolio.md             # cross-feature view
│   ├── backfill.md              # brown-field entry
│   ├── monitoring-setup.md      # Phase 9.5
│   ├── migration-plan.md        # Phase 5.5
│   ├── i18n-harvest.md          # Phase 4.5
│   ├── experiment-design.md     # Phase 9B
│   └── feature-flag-cleanup.md  # cross-cutting stale-flag audit
│
├── docs/                        # normative reference docs (read by commands)
│   ├── policy.md                # gates, skip policy, feature modes, role approvals
│   ├── runtime.md               # orchestration flow, state lock, sync-verify, digests
│   ├── schema.md                # .forge-status.yml shape (narrative)
│   ├── schema/
│   │   ├── forge-status-v3.schema.yml   # canonical schema reference
│   │   └── migration-v2-to-v3.md        # migration rules
│   ├── templates/
│   │   ├── phase-digest.md       # required section template
│   │   └── portfolio-report.md   # portfolio output template
│   ├── lessons-format.md        # .product-forge/lessons.md format
│   ├── adr/                     # architecture decision records
│   ├── reviews/                 # self-review artifacts
│   └── phases.md / file-structure.md / config.md  # user-facing docs
│
├── scripts/                     # zero-dependency helpers
│   ├── migrate-status-v2-to-v3.js   # stamps schema_version:3 lazily
│   ├── migrate-status-v2-to-v3.ts   # redirect stub (exits 64)
│   ├── acquire-lock.sh          # atomic state-lock acquire
│   └── release-lock.sh          # state-lock release with session-id guard
│
├── extension.yml                # registers all 29 commands + config keys + tags
├── config-template.yml          # user copies to .product-forge/config.yml
├── README.md                    # user-facing entry doc
└── CHANGELOG.md                 # history
```

Most commands delegate work to docs. `commands/forge.md` shrank from ~560 to
~640 LOC (more phases, less inline policy) by moving policy, runtime logic,
and schema definitions into the three `docs/*.md` companions.

---

## 3. Two entry points

### 3.1 Greenfield — `/speckit.product-forge.forge`

Used for a brand-new feature. Creates `features/<slug>/` and runs the
phase map selected by `feature_mode` (see §5).

### 3.2 Brown-field — `/speckit.product-forge.backfill`

Used to pull an existing module into the process retroactively. Reads
the code, writes a retro product-spec / plan / tasks, marks every
"would-have-been" phase as `not_applicable` on `.forge-status.yml`, and
produces a `gaps-report.md` listing what a modern greenfield run would
have required but is absent (tests below threshold, missing tracking
plan, no ADRs, etc.).

Backfilled features are tagged `backfilled: true` on the status file
and every generated artifact starts with a `⚠ BACKFILLED ARTIFACT`
banner so nobody mistakes inference for original intent.

---

## 4. Feature modes

`feature_mode` on `.forge-status.yml` selects which phases run.

| Mode | Phase count | Use case |
|------|:----------:|----------|
| `lite` | 5 | Bug fixes, small refactors, trivial features |
| `standard` | 14 (+ 4 opt) | Default — full lifecycle |
| `v-model` | standard + IEEE artifacts | Safety-critical / regulated |

The lite map is:

```
problem-discovery (opt) → product-spec → plan → implement → verify
```

Phases outside the chosen mode are written to the status file with
`status: "not_applicable"` — explicit and auditable, not "absence as a
signal". This matters for later sync-verify passes: they skip
`not_applicable` phases instead of flagging them as "missed".

### Escalation

A lite-mode feature can be promoted to standard mid-stream by the
orchestrator when:

- any task has `size: L` or `XL`, OR
- `len(tasks) > 10`, OR
- plan.md references more than 3 modules.

Escalation is append-only — no artifacts are deleted; missing
standard-mode artifacts are generated on the next loop.

---

## 5. The phase map (standard mode)

Full 18-phase flow. Opt = optional; Cond = conditional (auto-triggered
or auto-skipped).

```
0  problem-discovery (opt)
1  research
2  product-spec
3  revalidation
4  bridge → SpecKit spec.md
4.5 i18n-harvest    (opt, cond: multi-locale project)
5  plan
5B tasks
5.5 migration-plan  (opt, cond: plan.md has schema changes)
5C pre-impl-review  (opt)
6  implement
6B code-review      (opt)
7  verify-full
8A test-plan        (opt)
8B test-run         (opt)
9  release-readiness (opt)
9.5 monitoring-setup (opt)
9B experiment-design (opt, cond: flag marked experiment: true)
```

Plus cross-cutting commands runnable at any time:

- `/sync-verify` — 7-layer drift check
- `/change-request` — formal scope change
- `/portfolio` — multi-feature view
- `/feature-flag-cleanup` — stale-flag audit
- `/status` — single-feature summary

### Conditional phases

Conditional phases don't need explicit user-facing skip; they auto-resolve:

- Phase 4.5 → `not_applicable` on English-only projects.
- Phase 5.5 → `not_applicable` when plan.md has no Data Model section.
- Phase 9B → `not_applicable` when no flag has `experiment: true`.

---

## 6. How a gate works

At every phase boundary:

1. Sub-skill finishes, writes its artifacts, appends a `<phase>/digest.md`.
2. Orchestrator runs `sync-verify --quick` on the layers relevant to
   this transition. If CRITICAL drift → pause and present.
3. Orchestrator summarises the phase for the user and offers:
   Approve / Revise / Skip / Rollback / Abort.
4. Decision is recorded as an append-only entry on `gates[]` in
   `.forge-status.yml`:

```yaml
gates:
  - phase: pre_impl_review
    decision: approved            # approved | approved_with_conditions
                                  # | revised | skipped | rolled_back | aborted
    timestamp: 2026-04-24T10:15Z
    notes: "design looks good"
    conditions: []
    sync_result: clean
    skip_reason: null             # required if decision == skipped
    rolled_back_to: null          # required if decision == rolled_back
    approvals: null               # present only if role_approvals.solo_mode = false
```

Skip policy (E2): if `require_skip_reason: true` (default) and the user
picks Skip on an optional phase, a free-text reason is mandatory.
Empty/whitespace reasons are rejected. `sync-verify` flags features with
≥3 unexplained skips as "insufficient traceability".

Role approvals (E3 foundation): default is `solo_mode: true` — any
single approval passes the gate. Teams can opt in to multi-role by
setting `required_roles_per_phase` and flipping `solo_mode: false`; then
each gate needs explicit per-role records.

Rollback is distinct from Abort: rolled_back preserves the feature and
rewinds status to an earlier phase, recording `rolled_back_to: <phase>`.
Aborted ends the lifecycle.

---

## 7. Concurrency and state lock

`.forge-status.yml` is the single mutable file. All writers use
`.forge-status.yml.lock` (file-based mutex with TTL takeover).

Shell helpers:

```bash
# In any sub-skill that writes status
trap 'scripts/release-lock.sh "$FEATURE_DIR" "$SESSION_ID"' EXIT INT TERM
scripts/acquire-lock.sh "$FEATURE_DIR" 1800 "$SESSION_ID"
# … write status atomically: temp-file + rename …
```

- `acquire-lock.sh` uses `mv -n` with an `ln` fallback (both atomic on
  POSIX). Exit 75 if a fresh lock is held.
- Stale locks (age > TTL) are auto-taken-over with a warning.
- `release-lock.sh` refuses to delete a lock held by a different
  `session_id` — prevents takeover-race foot-guns. Exits 1 on mismatch.
- Smoke-tested: second writer refused, release-with-wrong-session
  refused, release-with-right-session succeeds.

Caveat (documented in runtime.md §2.7): because sub-skills are LLM
instructions, the protocol is **best-effort**. A non-compliant sub-skill
could still race. The shell helpers make compliance atomic for sub-skills
that use them.

---

## 8. Phase digests (A4)

After every major phase the sub-skill writes `<phase>/digest.md` with a
fixed 4-section template:

1. **Key decisions** (3–5 bullets)
2. **Artifacts produced** (paths)
3. **Open risks**
4. **Handoff notes** for next phase

Hard limit 600 words, soft target 300.

Enforcement is **mode-scoped and v2-native-scoped**:

- A phase in scope for the current mode MUST have a `digest_path` before
  it can be marked `completed`.
- `not_applicable` phases are exempt.
- Features created on v1.3 / v1.4 (`v2_native: false` or absent) get
  WARNING + a synthesised stub digest rather than a hard block —
  explicit grandfathering with a visible banner "legacy migration —
  digest stub, no original capture".

Downstream readers (`verify-full`, `code-review`, `portfolio`,
`retrospective`) read digests first to keep context budgets small; they
pull full artifacts only when a specific check needs them.

---

## 9. Task instrumentation (task_log[])

`phases.tasks.status` is the Phase 5B gate. Separate from that,
`task_log[]` is a top-level array on `.forge-status.yml` populated by
the `implement` phase as each task runs:

```yaml
task_log:
  - id: T001
    size: M                     # XS | S | M | L | XL  (D4 sizing)
    status: completed           # pending | in_progress | completed | failed | skipped
    paths: ["back/src/modules/users/users.service.ts"]  # from tasks.md Paths: line
    commit_sha: abc1234
    started_at: 2026-04-19T10:00Z
    completed_at: 2026-04-19T11:15Z
    failure_log_path: null      # points to failures/<id>.md if failed
```

Renamed from initial-v3 `tasks[]` to avoid collision with
`phases.tasks`. Populating `paths` — copied verbatim from each task's
`Paths:` line in `tasks.md` — is what makes `portfolio` file-conflict
detection precise.

---

## 10. Portfolio view (B1)

`/speckit.product-forge.portfolio` is read-only. It scans every
`features/*/.forge-status.yml` and produces
`features/_portfolio/portfolio.md`:

1. **Feature table** — slug, mode, current phase, status, days-in-phase,
   backfilled, blocked_by.
2. **File-conflict matrix** — pairs of in-flight features whose
   `task_log[].paths` overlap. Severity (HIGH / MEDIUM / LOW) depends on
   overlap size and whether overlapping paths are config/schema files.
3. **Dependency graph** (Mermaid) — from `dependencies.depends_on`
   fields.
4. **Suggested merge order** — topological sort over the graph.

Accuracy is level-tagged per feature:

- `exact` when `task_log[].paths` is populated.
- `pre-implementation` when only `tasks.md` `Paths:` lines exist.
- `module-level` when falling back to plan.md module names.
- `unknown` when nothing is available — feature listed but skipped from
  conflict detection.

---

## 11. Schema migration (additive only)

v3 is additive over v2. Every v2 file is a valid v3 file with defaults.
New fields include: `feature_mode`, `backfilled`, `v2_native`, per-phase
timestamps / tokens / digest_path / skip_reason, `task_log[]`,
`gates[].approvals`, `dependencies`, `role_approvals`. New `status`
enum value `not_applicable`.

Migration is **lazy**: on the first v2-aware write to a status file,
`schema_version: 3` is stamped and everything else is left untouched.
Optional helper `scripts/migrate-status-v2-to-v3.js` (zero
dependencies, only `node:fs` + `node:path`) can pre-stamp all files in
one pass. Smoke-tested against three cases: v2 → upgraded, no-version →
stamped, v3 → skipped.

The deprecated `.ts` entry exits with code 64 and a redirect message —
kept only so legacy CI callers get a clear failure instead of
module-not-found noise.

---

## 12. Sync-verify with drift budget (D11)

Seven-layer consistency check between artifact pairs:

```
research ↔ product-spec ↔ spec.md ↔ plan.md ↔ tasks.md ↔ code
```

Each drift item is categorized:

- **structural** — missing requirement, renamed field, removed user
  story, changed API contract, **markdown heading-level shift**,
  **renamed section heading**. Always human-in-the-loop. Never
  auto-resolved.
- **cosmetic** — trailing whitespace, bullet indentation drift, stale
  `last_updated` timestamp, line-ending differences. Auto-resolvable
  only when `sync_verify.auto_resolve.cosmetic: true` is explicitly
  opted in.

Link anchors are explicitly classified as structural (renames break
cross-references).

Drift budget:

```yaml
sync_verify:
  drift_budget:
    cosmetic: 20        # WARNING when exceeded
    structural: 0       # always gates
  auto_resolve:
    cosmetic: false     # opt-in; structural is never auto-resolved
```

Budget exceedance produces a WARNING; it does not silently accept
drift.

---

## 13. Learning loop (D1)

One append-only log per project: `.product-forge/lessons.md`. Written
by `retrospective` at feature close, read by `research` as an extra
dimension on every new feature.

Each lesson block carries tags from a controlled taxonomy
(`external-provider`, `data`, `auth`, `payments`, `performance`,
`observability`, `process`, `channel`, `rate-limit`). Research at Step
2.5 reads the log, scores blocks by tag overlap with the new feature's
implied tags, and surfaces matches in a "Prior lessons that apply"
section of `research/README.md`.

`lessons.md` grows without bound by design. Consolidation (merging
related blocks) is a human operation, not automated.

---

## 14. Release-readiness as an artifact producer (D9)

Old behaviour: scan-and-report. New behaviour: scan-as-inputs, then
**actively produce** artifacts.

Step 1 (flags): scans codebase → builds rollout strategy → builds
rollback plan → **writes `flags/registry.yml`** via the installed
`feature-flag-manager` skill (or a stub if the skill is absent).

Step 3 (monitoring): derives SLIs → derives alerts → **writes
`monitoring/dashboard.json`, `alerts.yml`, `slo.md`** via the installed
`newrelic-dashboard-builder` skill (or stub with TODOs).

Graceful degradation: missing provider skills do not block the gate;
they become action items in `release-readiness.md`.

---

## 15. Configuration

`config-template.yml` → `.product-forge/config.yml`. New v1.5 keys:

```yaml
default_feature_mode: standard       # lite | standard | v-model
require_skip_reason: true            # forces free-text reason for gate Skip
sync_verify:
  drift_budget:
    cosmetic: 20
    structural: 0
  auto_resolve:
    cosmetic: false
```

Plus existing keys from v1.3: `project_name`, `project_tech_stack`,
`project_domain`, `codebase_path`, `features_dir`,
`default_speckit_mode`, `progressive_verify_interval`,
`auto_sync_between_phases`, `release_readiness`, `max_tokens_per_doc`,
`output_language`.

`v2_native` is set by writers automatically, not user-configured.

---

## 16. End-to-end walkthrough

Greenfield standard-mode feature, happy path:

1. User: `/speckit.product-forge.forge Build push-notification preferences`
2. `forge.md` resolves `feature_mode` from config (default `standard`),
   creates `features/push-notification-preferences/`, writes initial
   `.forge-status.yml` v3 with `v2_native: true`, selects the standard
   phase map, offers Phase 0.
3. Phase 0 (optional) runs problem-discovery. User approves →
   `gates[]` gains an entry, `phases.problem_discovery.status =
   completed`, `digest_path = problem-discovery/digest.md`.
4. Phase 1 runs research. Step 2.5 pulls matching lessons from
   `.product-forge/lessons.md` and includes them. Digest written.
5. Phase 2 product-spec. Sync-verify Layer 1 runs at the transition.
6. Phases 3–5 revalidation, bridge, plan. Each with digest and gate.
7. Phase 5B tasks. Each task in `tasks.md` now carries a `Paths:` line.
8. Phase 5.5 migration-plan (conditional): triggered because plan.md
   has a Data Model section. Produces `migrations/forward.sql`,
   `rollback.sql`, `validation.sql`, `risk-matrix.md`.
9. Phase 5C pre-impl-review (optional). Skipped if user explicitly chose
   Skip with reason.
10. Phase 6 implement. For each task: acquire state lock, write code,
    commit, update `task_log[]` with size / paths / commit_sha /
    timestamps, release lock. Progressive verify every N tasks.
11. Phases 6B → 7 → 8A → 8B with gates.
12. Phase 9 release-readiness: builds `flags/registry.yml` and
    `monitoring/dashboard.json` for real.
13. Phase 9.5 monitoring-setup extends with `alerts.yml` and `slo.md`.
14. Phase 9B experiment-design (conditional): triggered because one of
    the flags in the registry has `experiment: true`.
15. Retrospective (later, recommended ≥14 days post-launch): reads
    `research/metrics-roi.md`, compares to actual, appends lesson
    blocks to `.product-forge/lessons.md`.

At any point the user can run `/portfolio` to see where this feature
sits relative to others, or `/sync-verify` to check drift.

---

## 17. What Product Forge does NOT do (honest limits)

- **No runtime enforcement.** Every rule is instructions to an LLM.
  The state lock and digest enforcement are best-effort — a
  non-compliant sub-skill can still violate them. The shell helpers
  close part of that gap when sub-skills use them.
- **No automated validation of the plugin itself.** There is no test
  suite for sub-skills. The only regression signal is a human
  running a feature and noticing something wrong.
- **No monorepo support.** `codebase_path` is a single path. GitHub
  issue #1 remains open. Schema reserves room (`dependencies`,
  per-feature path annotations) but the command layer is single-repo.
- **No API-level push to providers.** `monitoring-setup` produces
  `dashboard.json` but does not call NewRelic to create the
  dashboard. Applying generated artifacts is a manual step.
- **No auto-translate in i18n-harvest.** Only stubs go to non-primary
  locales. Real translation is handled by the project's `i18n-workflow`
  skill or human translators.
- **No portfolio mutations.** `portfolio` and `feature-flag-cleanup`
  are read-only; `--apply` is a future wave.

---

## 18. Quality posture (after three review passes)

- 16 original findings from first self-review — resolved.
- 8 regressions introduced by those fixes — resolved.
- 4 residual issues found on third pass — resolved.
- 28 total findings across three passes.
- Convergence trend 16 → 8 → 4 suggests the work has stabilised.

Known caveat: every review pass was a self-review by the same author.
External review would almost certainly turn up more — particularly in
the "what does this actually do when an LLM runs it" dimension, which
self-review can only simulate.

---

## 19. Document map

| File | Read when |
|------|-----------|
| [README.md](../README.md) | first time, user-facing overview |
| [docs/phases.md](./phases.md) | understanding each phase's artifacts and gates |
| [docs/file-structure.md](./file-structure.md) | browsing the on-disk layout |
| [docs/config.md](./config.md) | configuring a project |
| [docs/policy.md](./policy.md) | writing a sub-skill; understanding gate rules |
| [docs/runtime.md](./runtime.md) | implementing/modifying a sub-skill that mutates status |
| [docs/schema.md](./schema.md) | reading or writing `.forge-status.yml` |
| [docs/lessons-format.md](./lessons-format.md) | writing retrospective lessons |
| [docs/qa/plugin-test-plan.md](./qa/plugin-test-plan.md) | validating the plugin itself |
| [CHANGELOG.md](../CHANGELOG.md) | what changed between versions |
