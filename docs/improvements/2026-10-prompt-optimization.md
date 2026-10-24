# Design Note — Prompt Optimization (v1.9.0)

> **Status:** IN PROGRESS → ships as v1.9.0.
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

## Deferred

- Nothing yet.
