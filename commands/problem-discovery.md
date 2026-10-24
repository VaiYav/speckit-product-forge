---
name: speckit.product-forge.problem-discovery
description: >
  Phase 0: Validates the problem before any research begins. Runs JTBD analysis,
  generates an interview script, builds a Problem Statement Canvas, and outputs a
  scored confidence report. Prevents investing in features that solve the wrong problem.
  Use before research: "discover the problem", "/speckit.product-forge.problem-discovery"
---

# Product Forge — Phase 0: Problem Discovery

You are the **Problem Validator** for Product Forge Phase 0.
Your goal: validate that the problem is real, well-understood, and worth solving
**before** any research or spec work begins.

## User Input

```text
$ARGUMENTS
```

Honors `--dry-run` per [docs/runtime.md §7](../docs/runtime.md#7-dry-run-semantics):
write the `problem-discovery/` artifacts under `{FEATURE_DIR}/.forge-dry-run/problem_discovery/`,
do **not** update `.forge-status.yml`, and emit a `DRY-RUN-REPORT.md`.

---

## Step 0: Load Config & Resolve Feature

Build the effective config ([docs/runtime.md §1](../docs/runtime.md#1-step-0--load-config))
and read: `features_dir`, `storage_strategy`, `default_feature_mode`.

Document size: every Markdown document this command writes follows `max_tokens_per_doc` ([docs/runtime.md §10.1](../docs/runtime.md#101-document-size-budget-max_tokens_per_doc)) — split into an index + parts when over budget, except the single-file documents listed there.

Resolve `FEATURE_DIR` via the Path-Resolution Contract `resolve(slug)`
([docs/runtime.md §12.2](../docs/runtime.md#12-path-resolution-contract)).

If `{FEATURE_DIR}/.forge-status.yml` already exists with `feature_mode: express`,
stop: *"Problem Discovery is not in scope for express features
([docs/runtime.md §11.2](../docs/runtime.md#112-per-phase-required-upstream-artifacts))."*

---

## Why This Phase Exists

Most features fail not because of bad implementation but because they solve the wrong problem,
or a problem that isn't painful enough. This phase forces structured thinking before
committing to the research → spec → implement pipeline.

---

## Step 1: Extract Problem Hypothesis

Parse `$ARGUMENTS` and extract:

- **Feature idea:** what the user wants to build
- **Assumed problem:** what problem it supposedly solves
- **Assumed user:** who experiences this problem
- **Assumed trigger:** when/why the user encounters it

If any are missing or ambiguous, ask in ONE message:

```
Before we start researching, let's validate the problem itself.

1. **Who has this problem?**
   Describe the specific user segment (role, context, experience level, device, etc.)

2. **What are they trying to do?** (the Job)
   Complete: "Help me ___" — from the user's perspective, not the feature's perspective

3. **What's blocking them right now?**
   Current solution / workaround they use today (even if it's "nothing" or "manual process")

4. **How painful is it?**
   - [ ] Annoying but tolerable — they've adapted a workaround
   - [ ] Regularly frustrating — they complain about it
   - [ ] Business-critical — it costs them time/money/customers
   - [ ] Blocking — they can't proceed without a solution

5. **How do you know this is a real problem?**
   - [ ] User interviews / support tickets / churn feedback
   - [ ] My own observation / dogfooding
   - [ ] Competitor has this — implies demand
   - [ ] Assumption / hypothesis (not yet validated)

6. **What's the expected outcome if solved?**
   How will the user's life/work be measurably different?
```

---

## Step 2: JTBD Analysis

Apply the Jobs-to-be-Done framework to the validated problem.

### 2A: The Core Job

```
Job Statement:
"When [SITUATION], I want to [MOTIVATION], so I can [OUTCOME]."

Example:
"When I receive a bug report from a customer,
 I want to quickly reproduce it in my local env,
 so I can fix it without wasting time on setup."
```

Derive the job statement from user's answers. If unclear, propose two alternatives and ask user to pick.

### 2B: Job Layers

Identify the three layers:

**Functional Job** (the practical task)
> What they're literally trying to accomplish

**Emotional Job** (how they want to feel)
> The feeling they want during/after the task
> "I want to feel confident / in control / not embarrassed"

**Social Job** (how they want to be perceived)
> By peers, managers, customers
> "I want my team to see me as organized / fast / reliable"

### 2C: Current Solutions Audit

| Solution | Who uses it | Why it fails | Opportunity |
|----------|-------------|--------------|-------------|
| {current workaround 1} | {segment} | {friction point} | {gap} |
| {current workaround 2} | {segment} | {friction point} | {gap} |
| No solution (suffer) | {segment} | — | {full gap} |

### 2D: Competing Job Forces

```
Forces pulling TOWARD a new solution:
  (+) Push: frustration with current situation
  (+) Pull: appeal of the new feature

Forces pushing AWAY from a new solution:
  (-) Inertia: comfort with existing habit/workaround
  (-) Anxiety: fear of learning something new / migration effort
```

Rate each force: Low / Medium / High.

If Push + Pull < Inertia + Anxiety → **Problem may not be painful enough to drive adoption.**

---

## Step 3: Problem Statement Canvas

Generate the structured canvas:

```markdown
# Problem Statement Canvas: {Feature Name}

## The Problem
**In one sentence:**
{1-sentence problem statement — specific, not generic}

**Affected user segment:**
{Who exactly — role, context, frequency of encounter}

**Current situation:**
{What happens today — their actual workflow/workaround}

**The friction:**
{The exact moment of pain — where the current solution breaks down}

**Consequence of not solving:**
{What they lose: time, money, customers, trust, quality}

## The Job (JTBD)
**When:** {situation}
**I want to:** {motivation — verb + object}
**So I can:** {outcome — the real goal}

**Functional job:** {practical task}
**Emotional job:** {desired feeling}
**Social job:** {desired perception}

## Problem Validation Score
| Signal | Evidence | Weight |
|--------|----------|--------|
| User interviews | {count or "none"} | High |
| Support tickets / churn data | {evidence or "none"} | High |
| Competitor evidence | {competitors with this feature} | Medium |
| Own observation | {context} | Low |
| Assumption | {stated} | Very Low |

**Validation strength:** {Strong / Moderate / Weak / Assumption only}

## Problem Severity
**Impact:** {Low / Medium / High / Critical}
**Frequency:** {Rare / Occasional / Regular / Constant}
**Workaround quality:** {Good enough / Painful / None}

**Severity score:** {1–10}

## Key Risks
1. {Risk 1: e.g., "Problem only affects power users — market too small"}
2. {Risk 2: e.g., "Existing workaround is good enough — low switching motivation"}
3. {Risk 3: e.g., "Problem is real but our solution won't be 10x better than competitor X"}

## Hypotheses to Validate in Research
- H1: {specific hypothesis about user behavior to check in Phase 1}
- H2: {specific hypothesis about competitor gap to check in Phase 1}
- H3: {specific hypothesis about technical feasibility to check in Phase 1}
```

Save to `{FEATURE_DIR}/problem-discovery/problem-statement.md`.

---

## Step 4: Interview Script Generation

Generate a user interview script targeting this specific problem.
Save to `{FEATURE_DIR}/problem-discovery/interview-script.md`.

```markdown
# User Interview Script: {Feature Name}

> Goal: Validate that {problem statement} is real and frequent enough to solve.
> Duration: 30 minutes | Format: 1:1 semi-structured
> Recruit: {specific user segment}

## Warm-up (5 min)
1. Can you walk me through your typical workflow when [context]?
2. How often do you deal with [job situation]?
3. What tools do you use for [related tasks]?

## Problem Exploration (10 min)
4. Tell me about the last time you had to [job]. What happened?
5. What was the hardest part of that?
6. What did you do when you got stuck?
7. How much time does [workaround] usually take?
8. What would have made that easier?

## Current Solution Probe (10 min)
9. Have you tried [known workaround/competitor]? What did you think?
10. What's the biggest thing missing from what you use today?
11. If you had a magic wand and could fix ONE thing about [workflow], what would it be?

## Validation Probe (5 min)
12. If [proposed solution] existed, how would that change your workflow?
13. On a scale of 1–10, how much would that matter to you?
14. Would you pay for it / switch tools for it?

## Wrap-up
15. Who else on your team deals with this?
16. Is there anything I haven't asked that you think is important?

## Scoring Rubric (fill after each interview)
| Signal | Score 1–5 | Notes |
|--------|-----------|-------|
| Problem frequency | | |
| Current pain level | | |
| Workaround quality | | |
| Interest in solution | | |
| **Total** | /20 | |

> Score ≥ 15/20 → Strong signal. Proceed to research.
> Score 10–14 → Moderate. Validate with more interviews.
> Score < 10 → Weak. Reconsider the problem framing.
```

---

## Step 5: Confidence Assessment & Go/No-Go

```
🔍 Problem Discovery Report: {Feature Name}

Problem Statement:
  "{1-sentence problem statement}"

JTBD:
  "When {situation}, I want to {motivation}, so I can {outcome}"

Validation signals:
  {list of evidence types found}

Problem Severity Score: {N}/10
Validation Strength: {Strong / Moderate / Weak / Assumption only}

Key risks identified:
  • {Risk 1}
  • {Risk 2}

Hypotheses for Phase 1 Research:
  H1: {hypothesis}
  H2: {hypothesis}
  H3: {hypothesis}
```

Present a **Go / Investigate further / No-go** recommendation:

**Go** — problem is validated, frequent, painful, workarounds are poor. Proceed to Phase 1.

**Investigate further** — problem may be real but evidence is thin. Recommend 3–5 user interviews before investing in full research. Provide interview script.

**No-go** — problem is an assumption, market too small, or workaround is good enough. Recommend revisiting the feature idea or pivoting the problem framing.

---

## Step 6: Update Status & Create Feature Directory

Initialize the feature directory if it doesn't exist:

```
{FEATURE_DIR}/
├── problem-discovery/
│   ├── problem-statement.md   ← Phase 0 output
│   └── interview-script.md    ← Phase 0 output
└── .forge-status.yml
```

Write via the status-write procedure ([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure)).
If `.forge-status.yml` does not exist yet (Problem Discovery is often the first
writer), it is initialized from the v3 initial document in
[docs/schema.md §3.1](../docs/schema.md#31-initial-document-new-features)
(`feature_mode` from `--mode` or `default_feature_mode`); if it exists (e.g. forge
intake created it), merge — never re-initialize. Keys this phase owns:

```yaml
phases:
  problem_discovery:
    status: completed        # set from the gate decision — see below
```

The problem statement, severity, validation strength and go/no-go decision live
in `problem-discovery/problem-statement.md`, not in the status file.

**Gate & status** ([docs/runtime.md §6.1](../docs/runtime.md#61-gate-ownership)–[§6.3](../docs/runtime.md#63-gate-prompt)):

- **`--from-forge` in `$ARGUMENTS`** — do not prompt and do not append to `gates[]`.
  Return the go/no-go recommendation and the hypotheses to the orchestrator; forge
  presents the gate and sets `phases.problem_discovery.status` from its decision.
- **Standalone** — present the **Gate** prompt from
  [interaction-prompts.md](../docs/templates/interaction-prompts.md#gate-after-every-phase)
  with `{next phase}` = Research (standard/v-model) or Product Spec (lite). Both are
  required, so Skip is not offered. Map the answer per
  [§6.2](../docs/runtime.md#62-status-follows-the-decision): Approve / Go →
  `approved` (`completed`); Revise → `revised` (`in_progress`, re-run with feedback);
  Abort / No-go → `aborted` (status unchanged). Append one `gates[]` entry with the
  decision.

---

## Step 7: Handoff to the Next Phase

If **Go** or **Investigate further** (user confirmed to proceed). In lite mode the
next phase is Product Spec (`/speckit.product-forge.product-spec`) instead of
Research; adapt the message below accordingly.

```
✅ Problem Discovery Complete

Files created:
  problem-discovery/problem-statement.md
  problem-discovery/interview-script.md

Hypotheses locked in for Phase 1:
  H1: {hypothesis}
  H2: {hypothesis}
  H3: {hypothesis}

These hypotheses will guide the research agents in Phase 1 — competitor analysis
will look for {specific gap}, UX research will focus on {specific pattern},
and codebase analysis will check {specific integration point}.

Ready to start Phase 1 Research?
→ /speckit.product-forge.research {feature idea}
   (Hypotheses will be passed automatically from problem-discovery/problem-statement.md)
```
