# Product Forge — Feature & Improvement Roadmap (2026-06)

> **Method:** triangulated three lenses against the current repo (HEAD after the
> 2026-06 hardening + gate-deepening passes):
> 1. **Ecosystem gap** — the SpecKit community catalog
>    ([speckit-community.github.io/extensions](https://speckit-community.github.io/extensions),
>    ~17 extensions) — what peers ship that Product Forge lacks, and where PF is
>    already ahead.
> 2. **Runtime leverage** — Hermes Agent capabilities
>    ([hermes-agent.nousresearch.com/docs/user-stories](https://hermes-agent.nousresearch.com/docs/user-stories),
>    262 real use cases) — the host PF runs inside; its skills/memory/cron/proactive
>    axes are almost entirely unexploited by PF today.
> 3. **Internal gaps** — things PF promises but doesn't yet close.
>
> Each item carries an honest **already-have / partial / net-new** tag and an
> effort estimate. The bar from prior waves applies: prefer surface-reducing or
> executable additions; gate every claim behind a deterministic check.

---

## Part 0 — Where Product Forge already leads the ecosystem

Stating this first so proposals don't re-invent what exists. Against the community
catalog, PF is **at or ahead** of these:

| Community extension | PF equivalent (already shipped) |
|---------------------|----------------------------------|
| **Spec Trace** (REQ→test matrix, gaps, orphans) | `traceability.yml` + `validate-traceability.js` (REQ→US→JRN→FR→…→TEST→EVT, must-have/edge/step coverage, orphan-task, JSON, `--strict`, `--selftest`) — **richer** than Spec Trace's REQ→test-only matrix. |
| **V-Model Extension Pack** | First-class `feature_mode: v-model` integration (PF delegates V1–V13, owns the bookends). |
| **Brownfield Bootstrap** | `backfill` command (reverse-engineers a feature folder + gaps report). |
| **Companion** (lifecycle capture/status/resume) | `.forge-status.yml` v3 + `status` + resume + per-phase digests. |
| **Security Review** | `security-check` (OWASP, surface-scoped). |
| **Research Harness** | Phase 1 parallel research (competitors/UX/codebase). |
| **DocGuard** (doc↔code drift, CDD) | sync-verify Layer 9 (doc↔code) + the new `lint-docs.js`/`doctor.js` consistency gate. |

So the high-value additions are **not** "another traceability tool" — they are
**integration, multi-model, and runtime-leverage** capabilities PF has no answer
for. That's where this roadmap concentrates.

---

## Part 1 — Ecosystem gaps (things peers ship, PF lacks)

### P1-A. Issue-tracker bridge (Jira / Linear / GitHub Issues) — **net-new, high ROI**
**Gap.** The catalog has `jira` (29★), `jira-sync`, and `linear` (0.5.0)
extensions. PF generates `tasks.md` (`T0NN`) and `journeys/` but has **no** way to
push them to a tracker — verified: the only "tracker" mentions in PF are prose
("create tasks in your tracker for SEC-001…"). Teams that live in Jira/Linear
must hand-copy.
**Proposal.** A `speckit.product-forge.tracker-sync` command (post-tasks /
post-release) that maps the PF artifact tree to an issue hierarchy via **MCP**
(the same pattern the Jira ext uses — `atlassian` / `linear` MCP server, no
bespoke API client):
- `spec.md`/feature → Epic; `journeys/JRN-*` or plan phases → Stories; `tasks.md
  T0NN` → Tasks; `bugs/BUG-NNN` → Bugs.
- Persist a `tracker-mapping.json` carrier (T0NN ↔ issue key) so status round-trips.
- A `--sync-status` mode mirrors `tasks.md` `[x]` ↔ tracker "Done" and stamps the
  gate trail.
- Provider-neutral via a `tracker:` config block (`provider: jira|linear|github`,
  `mcp_server`, `project_key`) — mirrors PF's existing telemetry-provider pattern.
**Why PF-shaped:** PF's IDs (`T0NN`, `JRN-*`, `BUG-NNN`, `REQ-*`) are *already* a
clean hierarchy; this just projects them outward. `lint-docs` CARRIER rule extends
to assert the mapping carrier has a producer+consumer. **Effort: M.**

### P1-B. Multi-model cross-review — **partial → make first-class**
**Gap.** `multi-model-review` ships the "spec with model A, build with B, review
with C" loop as portable on-disk handoffs. PF's `code-review` is multi-*agent*
(parallel dimensions) but **single-model** — a model reviewing output from its own
family rationalizes (the ext's core insight). PF's roadmap even lists Hermes as a
valid external reviewer.
**Proposal.** Add a `--cross-model` mode to `code-review` (and optionally
`revalidate`) that:
- Exports the existing `gate-review.md` + git diff as a **portable review package**
  (PF already has the unified `F-NNN` surface — this is 80% done).
- Documents running the reviewer in a separate CLI/Hermes session (Codex, Gemini,
  another Claude, or a local model) and ingesting the report back into `F-NNN`.
- Records `reviewed_by_model` on the gate entry for audit (extends the existing
  `gates[].reviewed_sha`/`risk` carriers).
**Why now:** PF's gate surface is already consolidated and SHA-stamped; the
cross-model loop is a thin, high-signal wrapper. **Effort: M.**

### P1-C. Architecture-drift guard as a standing check — **partial**
**Gap.** `architecture-guard` (1.8.17) and `coding-standards-drift-control`
enforce architectural/style invariants continuously. PF has `plan`'s one-shot
Constitution Compliance check, but no *standing* guard that re-asserts the
constitution's patterns (resilience, EDA rules, layering) against the code at
verify/code-review time.
**Proposal.** A sync-verify **Layer 10 (constitution↔code)** that reads
`constitution_path` and checks the implemented code against its mandated patterns
(circuit-breakers on external calls, EDA event rules, etc.), emitting `F-NNN`
findings. Deterministic where possible (grep/AST for the pattern), LLM-judged for
the rest. **Effort: M–L.**

---

## Part 2 — Runtime leverage (Hermes capabilities PF ignores)

Product Forge runs **inside Hermes** (and Claude Code). Hermes's defining features
— self-improving skills, persistent memory, cron, proactive messaging, multi-model
delegation — are almost entirely unexploited by PF. This is the **highest-leverage,
most differentiated** axis because no other SpecKit extension can do it.

### P2-A. Close the learning loop into Hermes skills — **partial → big upgrade**
**Today.** PF has a `.product-forge/lessons.md` learning loop: `retrospective`
appends lessons, `research`/`plan`/`pre-impl-review` read them. But it's a flat
file scoped to one project.
**Hermes signal.** The #1 reported Hermes value is **self-improving skills** —
"competitive briefing 20→8 min over 6 weeks, same prompt"; "~40% less task time
after 20+ skills"; "skill-cached runs ~63% cheaper". Hermes writes its own
`SKILL.md` after solving a problem.
**Proposal.** A `retrospective` option to **promote a recurring lesson into a
Hermes skill** (`skill_manage`) — e.g. after the 3rd feature in a domain hits the
same constraint, emit a reusable `SKILL.md` capturing the pattern (a domain's
codebase conventions, a recurring NFR contract, a test-setup recipe). Cross-project,
cross-session, and cheaper on every subsequent run. This is the single biggest
"PF × Hermes" multiplier. **Effort: M** (Hermes-only; degrades to lessons.md
elsewhere).

### P2-B. Proactive / scheduled lifecycle nudges via cron — **net-new**
**Hermes signal.** "Every weekday 9am, summarize my inbox"; "sent me a Telegram
message before I woke up." Cron + proactive messaging are core Hermes.
**Proposal.** Optional PF cron recipes the user can opt into:
- **Retrospective reminder:** `retrospective` is supposed to run "≥14 days after
  ship" — nobody remembers. A cron job checks `.forge-status.yml` ship dates and
  pings when a feature is due for its retro (with the predicted-vs-actual metrics
  already pulled from PostHog/Sentry MCP).
- **Drift watch:** scheduled `sync-verify --quick` on active features; message the
  owner only when CRITICAL drift appears (the watchdog pattern — silent when clean).
- **Stale-flag sweep:** scheduled `feature-flag-cleanup` that surfaces flags past
  `cleanup_after`.
**Why PF-shaped:** these are exactly the "runs ≥N days later / periodically"
phases PF already defines but can't *trigger*. **Effort: M** (Hermes cron; a
documented recipe, not new core).

### P2-C. Multi-agent parallel implementation — **net-new, advanced**
**Hermes signal.** "Main agent plans → coder implements → QA tests"; "Teknium runs
12 Hermes instances in parallel." Hermes has `delegate_task` (parallel subagents).
**Proposal.** An `implement --parallel` mode that, for a `tasks.md` with
independent task groups (no shared `Paths:`), delegates each group to a subagent
and reconciles — bounded by PF's existing progressive-verify checkpoints and the
state-lock. **Caution:** PF's policy §1.1 currently says "one phase at a time";
this needs a careful carve-out for *intra-phase task parallelism* only, and only
when the path-conflict matrix (already computed by `portfolio`) proves
independence. **Effort: L; gate behind a flag and the conflict matrix.**

### P2-D. Messaging-gateway delivery of gates/reports — **net-new, small**
**Hermes signal.** Multi-platform gateway (Telegram/Discord/Slack/…). PF's `--ci`
already emits "reviewable requests" via `gh pr comment`.
**Proposal.** Generalize the `--ci` `safe_outputs.writes_as` to also support a
`message` channel — deliver the `gate-review.md` to the configured Hermes channel
so a human approves from their phone. Tiny extension of an existing carrier.
**Effort: S.**

---

## Part 3 — Internal gaps (PF promises not yet closed)

### P3-A. `--dry-run` is a documented contract with no enforcement — **partial**
`runtime.md §7` defines dry-run semantics ("writes redirected to
`.forge-dry-run/`, status not updated, diff report") but flags it "planned for a
later wave (A3)". Worth either implementing a minimal version (most sub-skills
already know their output paths) or down-scoping the doc to match reality.
**Effort: M.** Pairs naturally with `--ci`.

### P3-B. Schema-as-source step 3 (phase-map data block) — **staged**
The `2026-06-schema-as-source-design-note.md` step 2 (enums) shipped. Step 3 —
moving the phase map into a data block both forge.md tables render from — would
kill the phase-map-drift class the same way enums was killed. Higher effort
(needs a tiny renderer) but permanently removes a whole `lint-docs` rule's reason
to exist. **Effort: L.**

### P3-C. Token-budget telemetry is captured but not surfaced — **partial**
`.forge-status.yml` records `tokens_in/out`/`tool_calls` per phase, and the Hermes
stories emphasize **cost optimization** (a whole category, 13 stories; "skill-cached
~63% cheaper"). PF never reports it. A `status --cost` view (per-phase token/cost
rollup across a feature, and across the portfolio) turns captured-but-dead data
into the cost-visibility Hermes users explicitly want. **Effort: S.**

---

## Part 4 — Recommended sequencing

Anchored to ROI × differentiation × effort:

1. **P2-A (lessons→Hermes skills)** — highest differentiation; nothing else in the
   SpecKit ecosystem can self-improve across projects. Start here.
2. **P1-A (tracker bridge)** — highest mainstream demand (Jira/Linear are the most
   starred integration extensions); clean fit to PF's ID model; MCP-based so low
   maintenance.
3. **P3-C (cost view)** + **P2-D (messaging delivery)** — both Small, both turn
   existing carriers into user-visible value.
4. **P1-B (cross-model review)** — thin wrapper over the already-consolidated gate
   surface; high review-quality payoff.
5. **P2-B (cron nudges)** — documented recipes; unlocks the "later/periodic" phases
   PF can't currently trigger.
6. **P3-A (`--dry-run`)** + **P1-C (constitution guard)** — close internal promises.
7. **P3-B (phase-map data block)** + **P2-C (parallel implement)** — larger,
   structural; do last, behind flags.

> Every addition rides the existing rule: ship it **executable** (a script /
> carrier / MCP call), wire a `lint-docs`/`doctor` check so it can't regress, and
> keep the human gate. Cross-model, tracker-mapping, and skill-promotion all add
> new carrier fields — extend the CARRIER registry in `lint-docs.js` for each.
