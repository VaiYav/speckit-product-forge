# Changelog

All notable changes to Product Forge are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-03-28

### Added

- **`product-forge.forge`** — Full lifecycle orchestrator with 7-phase pipeline and human-in-the-loop gates
- **`product-forge.research`** — Phase 1: Parallel research across competitors, UX/UI patterns, codebase analysis (mandatory), tech stack and metrics/ROI (optional)
- **`product-forge.product-spec`** — Phase 2: Interactive product spec creation with configurable detail levels (concise/standard/exhaustive) and auto-decomposition for large features
- **`product-forge.revalidate`** — Phase 3: Iterative review loop with structured change tracking in review.md; exits only on explicit user approval
- **`product-forge.bridge`** — Phase 4: Converts approved product-spec into SpecKit spec.md; supports Classic and V-Model SpecKit modes
- **`product-forge.implement`** — Phase 5-6: Wraps SpecKit plan + tasks + implement with product-spec cross-validation at each sub-phase
- **`product-forge.verify-full`** — Phase 7: Full traceability verification across 6 layers (code ↔ tasks ↔ plan ↔ spec ↔ product-spec ↔ research)
- **`product-forge.status`** — Status reporter showing all phases, artifact inventory, and next recommended action

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

[1.0.0]: https://github.com/VaiYav/speckit-product-forge/releases/tag/v1.0.0
