# Changelog

All notable changes to Product Forge are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.2.0] — 2026-03-30

### Added

- **`speckit.product-forge.problem-discovery`** (Phase 0) — validate the problem before any research begins:
  - JTBD analysis (functional / emotional / social job layers)
  - Competing Forces model (Push + Pull vs Inertia + Anxiety)
  - Problem Statement Canvas saved to `problem-discovery/problem-statement.md`
  - User interview script with scoring rubric saved to `problem-discovery/interview-script.md`
  - Go / Investigate further / No-go decision with confidence score
  - Hypotheses H1–HN passed forward to Phase 1 research agents

- **`speckit.product-forge.api-docs`** — generate production-ready API documentation from `plan.md` contracts:
  - Auto-detects API framework (NestJS, Express, FastAPI, etc.) and existing OpenAPI setup
  - Generates OpenAPI 3.1 `openapi.yml` with full request/response schemas and examples
  - Generates `postman-collection.json` with auto-token-save login request
  - Consistency check: plan.md contracts vs actual implementation (reports drift)
  - Outputs: `api-docs/openapi.yml`, `api-docs/postman-collection.json`, `api-docs/consistency-report.md`

- **`speckit.product-forge.security-check`** — feature-scoped OWASP security audit:
  - Builds a threat model from `plan.md` — only checks surfaces present in this feature
  - Covers: A01 Broken Access Control, A02 Crypto Failures, A03 Injection, A04 Insecure Design, A05 Misconfiguration, A07 Auth Failures, A08 Integrity Failures
  - Scans for hardcoded secrets, missing ownership checks, mass assignment, missing rate limiting
  - Outputs prioritized findings (Critical / High / Medium / Low) with code evidence and fix patterns
  - Ship-readiness decision: ✅ Ready / ⚠️ Fix critical first / 🔴 Not ready

- **`speckit.product-forge.tracking-plan`** — analytics tracking plan from user journeys:
  - Auto-detects analytics SDK (Mixpanel, Amplitude, PostHog, Firebase, Segment)
  - Generates event taxonomy with property schemas, required/optional flags, and examples
  - Defines conversion funnels and abandonment funnels mapped to product-spec success metrics
  - Coverage matrix: each user story → key event → success metric
  - Generates ready-to-paste typed SDK snippets for the detected framework
  - Outputs: `tracking/tracking-plan.md`, `tracking/snippets.md`

- **`speckit.product-forge.retrospective`** — post-launch retrospective (run ≥14 days after ship):
  - Loads predicted KPIs from `research/metrics-roi.md` as the baseline
  - Queries NewRelic (via MCP) for real performance data since launch date
  - Compares predicted vs actual: adoption, completion rate, latency, error rate, business metrics
  - Research accuracy audit: were Phase 1 predictions correct?
  - Lessons learned, open issues table, and next-step recommendations
  - Closes the full lifecycle loop: Idea → Ship → Measure → Learn

### Changed

- `extension.yml`: description updated to reflect full 15-command lifecycle
- `extension.yml`: added tags `analytics`, `security`, `api-docs`, `jtbd`
- `README.md`: commands table expanded to 15 commands
- `README.md`: lifecycle diagram now includes Phase 0 (Problem Discovery) and post-implementation block (api-docs, security-check, tracking-plan, retrospective)
- `README.md`: file structure updated with `problem-discovery/`, `api-docs/`, `tracking/`, `security-check.md`, `retrospective.md`
- `README.md`: Why section updated to reflect the full 9-step value proposition

---

## [1.1.3] — 2026-03-28

### Changed

- `README.md` Installation section rewritten with proper `specify extension add/update` commands:
  - Install latest: `specify extension add product-forge --from .../archive/refs/heads/main.zip`
  - Install pinned version: `specify extension add product-forge --from .../archive/refs/tags/v1.1.3.zip`
  - Update: `specify extension update product-forge --from ...`
  - Added post-install config setup instructions with `specify extension path product-forge`

---

## [1.1.2] — 2026-03-28

### Added

- **`playwright-cli` as execution engine for Phase 8B** (`speckit.product-forge.test-run`): agent now drives the browser interactively using `playwright-cli open`, `playwright-cli click/fill/snapshot/screenshot`, `playwright-cli tracing-start/stop`, and `playwright-cli -s=pf-auth state-save/load` for auth session reuse
- **Dual execution model** documented in `commands/test-plan.md`: `test-cases.md` (primary, agent-driven via `playwright-cli`) vs `.spec.ts` files (CI/CD companion, run with `npx playwright test`)
- **`test-cases.md` format specification**: each test case now uses a playwright-cli action table (`# | Action | playwright-cli equivalent`) so Phase 8B can translate steps mechanically without ambiguity
- **`playwright-cli` dependency section** in `README.md` Requirements with install instructions and link to [github.com/microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)
- **"How to Run Tests"** section in generated `test-plan.md` now documents both execution paths: agent-driven (`/speckit.product-forge.test-run`) and CI/CD (`npx playwright test`)

---

## [1.1.1] — 2026-03-28

### Fixed

- Command names updated to required `speckit.{extension}.{command}` pattern (was `product-forge.*`)
- All 10 commands renamed: `speckit.product-forge.forge`, `speckit.product-forge.research`, etc.
- All internal cross-references in command files updated accordingly

---

## [1.1.0] — 2026-03-28

### Added

- **`speckit.product-forge.test-plan`** — Phase 8A: Auto-detects test framework, ports, and env vars; generates smoke/E2E/API/regression test cases with `TC-*-NNN` IDs; writes runnable Playwright `.spec.ts` files with story traceability comments; initializes `bugs/README.md` dashboard
- **`speckit.product-forge.test-run`** — Phase 8B: Executes tests in priority order (smoke → E2E → API → regression); creates `bugs/BUG-NNN.md` per failed test with evidence, gap analysis, and fix log; auto-fix loop for P0/P1 bugs with single-test retest and smoke regression check; generates `test-report.md` with full coverage matrix and traceability chain
- **Adaptive research depth** in `speckit.product-forge.research`: input richness scoring (0–8 across 4 dimensions) selects FULL_INTERVIEW / PARTIAL_INTERVIEW / CONFIRM mode; avoids redundant questions when context is already rich

### Changed

- `speckit.product-forge.forge` orchestrator updated to 9-phase pipeline (8A and 8B added as optional after Phase 7)
- `forge.md` Phase Map table updated; Phase 8A/8B offer shown after every successful Phase 7 completion
- `extension.yml` version bumped to `1.1.0`; tags updated to include `testing`
- `docs/phases.md` updated with full Phase 8A and 8B documentation
- `docs/file-structure.md` updated with `testing/`, `bugs/`, and `test-report.md` in directory layout; `.forge-status.yml` schema updated with `test_plan`, `test_run`, and `testing:` block; `BUG-NNN.md` and `test-report.md` schemas added; naming conventions updated with TC-* and BUG-NNN IDs
- `README.md` updated with 9-phase lifecycle diagram, 10-command table, and expanded file structure

### Bug Fixes

- `forge.md` Phase 5 and 6 previously referenced SpecKit directly; corrected to delegate via `speckit.product-forge.implement` as intended

---

## [1.0.0] — 2026-03-28

### Added

- **`speckit.product-forge.forge`** — Full lifecycle orchestrator with 7-phase pipeline and human-in-the-loop gates
- **`speckit.product-forge.research`** — Phase 1: Parallel research across competitors, UX/UI patterns, codebase analysis (mandatory), tech stack and metrics/ROI (optional)
- **`speckit.product-forge.product-spec`** — Phase 2: Interactive product spec creation with configurable detail levels (concise/standard/exhaustive) and auto-decomposition for large features
- **`speckit.product-forge.revalidate`** — Phase 3: Iterative review loop with structured change tracking in review.md; exits only on explicit user approval
- **`speckit.product-forge.bridge`** — Phase 4: Converts approved product-spec into SpecKit spec.md; supports Classic and V-Model SpecKit modes
- **`speckit.product-forge.implement`** — Phase 5-6: Wraps SpecKit plan + tasks + implement with product-spec cross-validation at each sub-phase
- **`speckit.product-forge.verify-full`** — Phase 7: Full traceability verification across 6 layers (code ↔ tasks ↔ plan ↔ spec ↔ product-spec ↔ research)
- **`speckit.product-forge.status`** — Status reporter showing all phases, artifact inventory, and next recommended action

### Feature File Structure

Introduced the `features/<name>/` directory convention with:
- `research/` — all research artifacts + README index
- `product-spec/` — all product spec artifacts + README index
- `.forge-status.yml` — phase tracker
- `review.md` — revalidation changelog
- `verify-report.md` — verification report

### Decomposition & Cross-linking

- Auto-detects large features and suggests file decomposition for user journeys and wireframes
- All documents cross-linked via feature root README.md and product-spec/README.md
- Token budget awareness with `max_tokens_per_doc` config setting

### Configuration

- `config-template.yml` with full project configuration options
- `.product-forge/config.yml` project-level config support
- Per-feature config override support

---

[1.2.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.3...v1.2.0
[1.1.3]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/VaiYav/speckit-product-forge/releases/tag/v1.0.0
