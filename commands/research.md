---
name: speckit.product-forge.research
description: >
  Researches a feature before its product spec (Phase 1): adaptive intake interview,
  then parallel competitor, UX/UI and codebase analysis, plus optional tech-stack
  and metrics/ROI. Use to start a standard or v-model feature.
---

# Product Forge — Phase 1: Research

You are the **Research Orchestrator**. You gather structured research before any
product spec is written, adapting the intake interview to how much context the user
already gave, and write it to `{FEATURE_DIR}/research/`.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `research` (Phase 1)
- **Config keys:** `project_name`, `project_domain`, `project_tech_stack`, `codebase_path`,
  `features_dir`, `default_competitors`, `default_tech_research`, `default_metrics_research`,
  `default_feature_mode` (only when this phase creates the status file)
- **Writes:** `research/` (`README.md`, `competitors.md`, `ux-patterns.md`,
  `codebase-analysis.md`, optional `tech-stack.md` / `metrics-roi.md`, `digest.md`),
  `phases.research.*`
- **Optional input:** `problem-discovery/problem-statement.md` (Step 0).
- **Contract deltas:** may create `.forge-status.yml` (Step 7). `RESEARCH_DIR` =
  `{FEATURE_DIR}/research/`.

## Step 0: Read Problem Discovery output

When `{FEATURE_DIR}/problem-discovery/problem-statement.md` exists, read its problem
statement, JTBD, user segment and the hypotheses H1–H3. Count them as input when
scoring Step 1, and pass the hypotheses to the research agents in Step 4 so each agent
checks the ones in its dimension. Absent → continue without them.

## Step 1: Assess input richness

Before asking anything, score the input on four dimensions:

| Dimension | Score 0 | Score 1 | Score 2 |
|-----------|---------|---------|---------|
| Feature description | Vague (1–5 words) | Clear (1–2 sentences) | Detailed (3+ sentences with use case) |
| Competitor knowledge | None mentioned | "There are apps like X" | Named list of 3+ specific competitors |
| Technical context | Not mentioned | Tech stack hinted | Explicit tech stack + constraints |
| Domain context | Implicit only | Domain stated | Domain + target user + market stated |

Sum → **Input Richness Score (0–8)** and pick the interview mode:

- **0–2** → `FULL_INTERVIEW` — ask all 7 questions
- **3–5** → `PARTIAL_INTERVIEW` — ask only the gaps
- **6–8** → `CONFIRM` — one confirmation message, then proceed

Result: score and mode recorded (they go into `README.md` and the digest).

## Step 2: Adaptive interview

Ask one question per prompt. Content questions are free text; research scope is the
multiSelect prompt. The research defaults **pre-fill** answers the user can still
override:

- `default_competitors` non-empty → use it as the competitor list, skip question 2,
  and show the list in the plan. Empty → ask, or auto-discover.
- `default_tech_research: true` → pre-select **Tech-stack comparison** in the scope prompt.
- `default_metrics_research: true` → pre-select **Metrics / ROI** in the scope prompt.

**FULL_INTERVIEW** (score 0–2) — the 7 questions:

1. **Feature description** — *"What does this feature do? Who uses it and why?"*
   (1–3 sentences: what it is, who benefits, what problem it solves)
2. **Competitors** — *"Any specific apps or products I should analyze?"* (blank →
   auto-discover 6–8). Skipped when `default_competitors` is set.
3. **Tech stack** — *"What technology does your project use?"* (e.g. "Node.js +
   Express + Postgres", or "use config")
4. **Domain** — *"What industry/domain is this for?"* (e.g. "consumer productivity
   app", "B2B SaaS fintech")
5. **Constraints** — *"Any hard constraints I should know?"* (technical, budget,
   timeline, legal, platform)
6. **Research scope** — the *Research scope opt-ins (multiSelect)* prompt from
   [interaction-prompts.md](../docs/templates/interaction-prompts.md#research-scope-opt-ins-multiselect):
   Competitors, UX/UI patterns, Codebase analysis (default on); Tech-stack
   comparison, Metrics / ROI (opt-in).
7. **Existing materials** — *"Any links, docs, designs, or prior art to include?"*
   (paste URLs or describe; they feed the research agents)

**PARTIAL_INTERVIEW** (score 3–5) — open with *"I have a good understanding of the
feature. A few gaps before I start:"* and ask the questions whose dimension scored 0,
plus the research-scope multiSelect (question 6) whenever the input did not already
answer it.

**CONFIRM** (score 6–8) — show the plan and ask for corrections:

```
Rich context provided. Here's my research plan:

Feature: {feature description}
Competitors to research: {list or "auto-discover"}
Domain: {domain}
Tech stack: {stack}
Dimensions: competitors ✅ · UX/UI ✅ · codebase ✅ {+ tech · metrics if opted in}

Starting research now. Any corrections before I launch?
```

Result: feature description, competitors, stack, domain, constraints, materials and
the active dimension set are known.

## Step 3: Consult prior lessons

Read the project learning log `.product-forge/lessons.md`
([lessons-format.md](../docs/lessons-format.md)) — a no-LLM step.

1. File absent → note *"No prior lessons log yet"* in the research index and go to
   Step 4. Only retrospectives create this file.
2. Extract every block's `Tags:`.
3. Derive the feature's tag set from the project domain, tech-stack elements in the
   description, and obvious domain keywords (push, payments, auth, schema, …).
4. Score each block by tag overlap; select the top N (default 5) with ≥ 1 match.
5. Pass the selected blocks to the research agents in Step 4.
6. In `README.md`, list them under *"Prior lessons that apply"* (title, date,
   one-line relevance note). No match → omit the section. Quote only lessons that
   exist in the file.

## Step 4: Launch parallel research agents

Launch every active dimension **at once** with the Agent tool. Give each agent the
feature description, `project_domain`, tech stack, user-provided links/materials, the
selected lessons and, when Step 0 found them, the Problem Discovery hypotheses. Each agent writes its report from its section of
[docs/templates/research-reports.md](../docs/templates/research-reports.md).

| Agent | Runs | Writes |
|-------|------|--------|
| 1. Competitors | always | `{RESEARCH_DIR}/competitors.md` |
| 2. UX/UI patterns | always | `{RESEARCH_DIR}/ux-patterns.md` |
| 3. Codebase integration | always | `{RESEARCH_DIR}/codebase-analysis.md` |
| 4. Tech stack | opted in | `{RESEARCH_DIR}/tech-stack.md` |
| 5. Metrics & ROI | opted in | `{RESEARCH_DIR}/metrics-roi.md` |

**Agent 1 — Competitors.** Analyze how competitors approach the feature (the user's
list, or auto-find 5–8).
1. Per competitor: feature name, description, positioning; core interaction pattern;
   key differentiators and strengths; access model (free / freemium / premium /
   paid); user sentiment from App Store, Play Store, Reddit, Twitter/X.
2. The **top 3 implementations**, with rationale.
3. Open-source or publicly described reference implementations.
4. **Gaps** no competitor handles well (our opportunity).
5. Pricing, growth signals, user-base size where available.

**Agent 2 — UX/UI patterns.** Use the stack's mobile/web implications.
1. UX best practice (Baymard, Nielsen Norman, UX Collective, Mobbin, Dribbble).
2. Primary flows, edge cases, empty / loading / error states.
3. 3–5 concrete UI pattern examples with descriptions.
4. Key micro-interactions and animations.
5. WCAG accessibility requirements specific to this feature type.
6. Anti-patterns common to this feature type.
7. Mobile considerations where relevant (touch targets, gestures, thumb zones).

**Agent 3 — Codebase integration.** Map the feature onto `{codebase_path}`.
1. Project structure: top-level dirs, architecture, key modules.
2. Relevant existing code: similar features, reusable components/services,
   overlapping data models, extendable API endpoints.
3. Integration points where new code plugs in.
4. Complexity: new module or extension; database/schema changes; breaking-change risk.
5. Current tech capabilities the feature can use.
6. **Architectural constraints** (they keep spec and plan from design mistakes):
   mandatory patterns (resilience wrappers for external calls, naming conventions,
   ID formats required by external services); the constitution or ADRs for this
   domain; existing event/message patterns with exact identifiers, payload shapes
   and delivery guarantees; shared utilities to reuse (caching helpers, retry
   decorators, GDPR handlers).

**Agent 4 — Tech stack.** Name the main technical sub-problems; for each compare 2–3
solutions on npm/pip stats (weekly downloads, GitHub stars, last release), API
stability and breaking-change history, bundle size (frontend) or memory footprint
(backend), license compatibility and ecosystem health; end with a decision matrix
and recommendation.

**Agent 5 — Metrics & ROI.** Industry benchmarks for the feature type; user impact
(retention, engagement, NPS-relevant metrics); direct or indirect revenue impact;
effort vs impact; recommended KPIs and how to measure them.

Result: one report per active dimension exists in `RESEARCH_DIR`.

## Step 5: Compile the research index

Wait until every agent has finished, then write `{RESEARCH_DIR}/README.md` from
[docs/templates/research-index.md](../docs/templates/research-index.md).

## Step 6: Phase digest

Write `{RESEARCH_DIR}/digest.md` from [phase-digest.md](../docs/templates/phase-digest.md):

- **Key decisions** — dimensions run and skipped, input-richness score and interview
  mode, top 3 findings.
- **Artifacts produced** — every file in `research/`, one line each.
- **Open risks** — unresolved questions forwarded to product-spec.
- **Handoff notes** — what product-spec needs that the file list does not show.

## Step 7: Status and gate

When `.forge-status.yml` is absent, initialize it from the v3 initial document
([schema.md §3.1](../docs/schema.md#31-initial-document-new-features)) with
`feature_mode` from `--mode` or `default_feature_mode`. When it exists (forge intake,
Problem Discovery), merge into it. Keys this phase owns:

```yaml
phases:
  research:
    digest_path: "research/digest.md"
    status: completed        # set from the gate decision
```

The dimensions run and the richness score live in `README.md` and the digest only.

Show: a summary table of completed dimensions, the top 3 findings, open questions for
Phase 2, and red flags or risks.

Gate outcome line: *"Research complete — {N} dimensions analyzed, saved to
`{RESEARCH_DIR}/`"*; `{next phase}` = Product Spec (required, so no Skip).
On Approve, end with `Next step: /speckit.product-forge.product-spec`.

## Done when

- Every active dimension has its report in `research/`, built from its template
  section; the three mandatory ones (competitors, UX/UI, codebase) always exist.
- `research/README.md` lists every report with its key insight, the richness score
  and interview mode, and the lessons section (or its absence note) per Step 3.
- `research/digest.md` is written with all four sections.
- Standalone: the gate was shown, its decision appended to `gates[]`, and
  `phases.research.status` set from it.
- `--from-forge`: only `phases.research.digest_path` was written; the summary
  (dimensions, top 3 findings, open questions, risks) was returned to forge with no
  gate prompt and no status or `gates[]` write.
