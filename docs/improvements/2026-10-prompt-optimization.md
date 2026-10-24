# Design Note — Prompt Optimization (v1.9.0)

> **Status:** IMPLEMENTED (open items only under *Deferred*) → ships as v1.9.0 "Charmander".
> Decided 2026-10-24 (owner accepted Q1–Q12). Builds on the v1.8.0 documentation
> overhaul ([2026-10-docs-overhaul.md](./2026-10-docs-overhaul.md)).

## Problem

The 33 command files are prompts an LLM executes. After v1.8.0 they were
consistent, but not lean:

| Measure (before) | Value |
|------------------|-------|
| Frontmatter `description` (always in context in Claude Code) | 1746 words, 63–92 per command |
| Command bodies | ~75k words; forge 7.5k, test-run 5.2k, test-plan 4.9k |
| Fenced output templates in big commands | 27–53 % of the body |
| Version / wave tags (`(v1.6, W5-D1)`, `Theme F`) | 87 |
| Prohibitions (`NEVER`, `do not`, `MUST NOT`) | 167 |
| Lines with emoji / `━━━` rules | 464 / 32 |
| Shared preamble (config, dry-run, status write, size, gate) | restated in 6–12 commands, 2–3 wordings each |

## Decisions

| # | Decision |
|---|----------|
| P1 | Optimise for executor predictability first, tokens second, human reading third. Cut tokens only where predictability does not drop. |
| P2 | Each `description` is a context pointer: ≤ 40 words, leading word first, one trigger per branch, no restated steps or synonym lists. Lint-enforced. |
| P3 | Output templates longer than ~20 lines move to `docs/templates/<command>-<artifact>.md`, read at the step that writes the artifact. Announcement banners are removed. |
| P4 | Version / wave / theme tags and "Background" history lines leave `commands/` (history lives in CHANGELOG and `docs/improvements/`). Lint-enforced. |
| P5 | One **command contract** ([runtime.md §0](../runtime.md#0-command-contract)) carries config loading, feature resolution, prerequisites, dry-run, document size, status writes, digests, gates, `--from-forge`, interaction and script location. Each command links it with one identical line and states only its deltas. Lint-enforced. |
| P6 | Prohibitions become positive instructions; a hard guardrail keeps its "never" only when paired with the positive target. Emoji limited to the status legend (✅ ⚠️ ❌); decorative emoji and rule lines removed. |
| P7 | A glossary in `concept.md` defines the shared vocabulary once; commands use the terms without re-defining them. |
| P8 | Every command ends with a checkable `## Done when` section; loops (test-run, implement, sync-verify) get explicit stop criteria. Lint-enforced. |
| P9 | `forge.md` gets one generic phase-transition procedure plus a per-phase table (the deferred D13). test-run / test-plan per-type sections move to a disclosed reference. |
| P10 | Normative docs are pruned for no-ops and restatements of `config-template.yml` / `phase-map.yml` (target −20–25 %, nothing normative lost). |
| P11 | Behaviour is checked with a small `claude plugin eval` suite on the fixture, run before and after the rewrite. |
| P12 | Separate branch and release (v1.9.0); v1.8.0 stays reviewable as is. |

## Rewrite rules for command bodies

1. Keep every behaviour: inputs, outputs, file paths, status fields, gate options,
   stop conditions, IDs. Shorter wording, same contract.
2. Role line + one-paragraph job, then numbered steps, each ending in a checkable
   result, then `## Done when`.
3. Reference that only some branches need (per-type test procedures, long report
   templates) moves behind a pointer.
4. Use the glossary terms (gate, carrier, digest, drift, index, single-file
   document, `--from-forge`) instead of re-explaining them.

## Result

| Measure | Before | After |
|---------|--------|-------|
| Frontmatter `description` | 1746 words | ~1.2k words, all ≤ 40 |
| Command bodies | ~75.5k words | ~49.6k words (forge 7554 → ~3.9k) |
| Version / wave tags in `commands/` | 87 | 0 (lint-enforced) |
| Prohibitions in `commands/` | 167 | 4 hard guardrails |
| Decorative emoji / rule lines | 464 / 32 | 0 (lint-enforced) |
| Shared preamble | 6–12 restatements | runtime.md §0, one link per command |
| Normative docs (11 pruned files) | 20.4k words | 17.0k words (−16 %) |

New homes: 40 files in `docs/templates/` (output templates) and 10 in
`docs/reference/` (branch-only procedures). Every command was rewritten from a
behaviour inventory and checked by an independent reviewer against the old text;
the defects those reviews found (several pre-existing) are listed in CHANGELOG
[1.9.0] `### Fixed`.

## Deferred

- **P11 eval comparison.** The suite (`evals/`, 3 cases) is committed, but the
  before/after runs were blocked by the CLI account's weekly usage limit. To run
  it, check out the pre-rewrite tree (commit `4875929`) in a worktree, copy
  `evals/` into it, and run the same command in both trees outside the sandbox:
  `claude plugin eval . --scaffold --trust-plugin --ablation none --no-publish --allow-tools Write Edit --max-cost-usd 5`.
  `Bash` cannot be granted on the author's machine, so the cases exercise only
  behaviour that needs no `node` helper.
- Normative docs reached −16 %, short of the −20–25 % target: the remaining text
  was normative.
