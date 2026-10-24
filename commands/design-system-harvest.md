---
name: speckit.product-forge.design-system-harvest
description: >
  Phase 2 helper: discover the project's EXISTING design system (component library,
  design tokens, Storybook, Tailwind/CSS config) and emit a read-only manifest that
  grounds mockups, component decomposition, and verification in real code. The design
  system stays in code as the single source of truth; this command harvests a
  manifest, it never duplicates or rewrites the design system.
  Use with: "harvest design system", "/speckit.product-forge.design-system-harvest"
---

# Product Forge — Design System Harvest

You are the **Design System Cartographer**. Your job is to read the project's
in-code design system and produce a faithful, read-only **manifest** that later
phases use to generate design-system-grounded mockups, decompose UI into real
components, and verify the built UI uses the right components.

> **Decision (normative):** the design system lives **in code** — the component
> library plus design tokens are the single source of truth. Product Forge
> **harvests** a manifest from it. Never copy the design system into the feature
> folder and never edit component source here.

## User Input

```text
$ARGUMENTS
```

Inputs from the orchestrator: `FEATURE_DIR`. Build the effective config
([docs/runtime.md §1](../docs/runtime.md#1-step-0--load-config)) — keys used:
`codebase_path` (or monorepo `codebase.paths`), optional `design_system` block
(`components_path`, `tokens_path`, `storybook`), and `features_dir` +
`storage_strategy` to resolve `FEATURE_DIR` on a standalone run
([§12](../docs/runtime.md#12-path-resolution-contract)).

Honors `--dry-run` per [docs/runtime.md §7](../docs/runtime.md#7-dry-run-semantics).

---

## Step 1: Discover the design system

Search the codebase (honor `design_system` config when present; otherwise
auto-detect) for, in priority order:

1. **Component library** — a UI package/dir (e.g. `packages/ui`, `src/components`,
   `@<org>/ui`). Identify exported components, their props, and variants.
2. **Design tokens** — `:root { --... }` CSS custom properties, SCSS/Less vars,
   `tailwind.config.*` theme, token files (`tokens.json`, `*.tokens.ts`,
   Style Dictionary output).
3. **Storybook** — `*.stories.*` files (richest source of components + variants +
   args). Prefer these when present.
4. **Framework** — React / Vue / Svelte / Angular / web components (affects how
   components are referenced in mockups and selectors).

If no design system is found, report that clearly and offer (structured prompt,
see [docs/interaction.md](../docs/interaction.md)) to either proceed with a
generic token set or pause so the user can point at the right path. Do not invent
a design system.

---

## Step 2: Emit `design-system/manifest.yml`

Write `{FEATURE_DIR}/design-system/manifest.yml` — the machine-readable manifest
consumed by `product-spec` (mockups), `tasks`/`implement` (component decomposition),
and `verify-full` (UI-uses-real-components check).

```yaml
schema_version: 1
source:
  components_path: "packages/ui/src"
  tokens_path: "packages/ui/tokens"
  framework: "react"
  storybook: true
tokens:
  color:
    primary: "var(--color-primary)"      # keep the in-code reference, not a copy
    surface: "var(--color-surface)"
  typography:
    body: "var(--font-body)"
  spacing: ["var(--space-1)", "var(--space-2)"]
  radius: ["var(--radius-sm)", "var(--radius-md)"]
components:
  - id: "CMP-Button"
    import: "@acme/ui/Button"
    props: ["variant", "size", "disabled", "onClick"]
    variants: ["primary", "secondary", "ghost"]
    selector: "[data-cmp='button']"      # stable selector for E2E (Theme H)
  - id: "CMP-Modal"
    import: "@acme/ui/Modal"
    props: ["open", "title", "onClose"]
    variants: ["default", "danger"]
    selector: "[data-cmp='modal']"
```

Notes:
- `tokens.*` keep the **in-code reference** (CSS var / token name), not a hardcoded
  hex — so mockups inherit real tokens and never drift from the design system.
- `selector` is the stable test selector the journey→Playwright pipeline uses.
- `id` uses the `CMP-` prefix from the
  [traceability ID system](../docs/templates/traceability-matrix.md).

---

## Step 3: Emit `design-system/manifest.md`

A short human-readable companion: the discovered component list, token groups, the
detected framework, and any gaps (components referenced by design but missing from
the library, or vice versa). Keep it terse.

---

## Step 4: Present results

Present a structured summary and a `Next step` prompt (see
[interaction-prompts.md](../docs/templates/interaction-prompts.md)): proceed to
mockups (Phase 2), re-point at a different path, or skip design-system grounding
for this feature. Record the choice.

Update `.forge-status.yml`. Write via the status-write procedure ([docs/runtime.md §2.9](../docs/runtime.md#29-status-write-procedure)).
If a digest is produced, write it first and set `digest_path` in the same write:

```yaml
phases:
  design_system_harvest:
    status: completed            # or not_applicable for backend-only features
    digest_path: "{digest path per runtime §8.1}"   # only when a digest was produced
```

---

## When to run

- Automatically offered within Phase 2 (`product-spec`) for any feature with UI.
- Re-runnable any time the design system changes (it only re-reads code).
- `not_applicable` for backend-only / no-UI features.
