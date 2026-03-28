# Changelog

All notable changes to Product Forge are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

[1.1.1]: https://github.com/VaiYav/speckit-product-forge/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/VaiYav/speckit-product-forge/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/VaiYav/speckit-product-forge/releases/tag/v1.0.0
