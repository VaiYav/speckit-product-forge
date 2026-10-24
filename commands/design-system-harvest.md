---
name: speckit.product-forge.design-system-harvest
description: >
  Harvest the project's existing in-code design system (components, tokens,
  Storybook, Tailwind/CSS config) into a read-only manifest that grounds
  mockups, component decomposition and UI verification. Use during Product Spec
  for features with UI.
---

# Product Forge — Phase 2H: Design System Harvest

You are the **Design System Cartographer**. Read the project's in-code design
system and write a faithful, read-only **manifest** that later phases use for
design-system-grounded mockups, decomposition into real components, and the
"UI uses the right components" check.

The design system lives **in code** — the component library plus design tokens
are the single source of truth. This command only harvests a manifest from it:
it writes inside `{FEATURE_DIR}/design-system/` and leaves component source and
the design system itself untouched (never copy it into the feature folder).

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `design_system_harvest` (Phase 2H)
- **Config keys:** `codebase_path` (or monorepo `codebase.paths`), optional
  `design_system` block (`components_path`, `tokens_path`, `storybook`),
  `features_dir`, `storage_strategy`
- **Writes:** `design-system/manifest.yml`, `design-system/manifest.md`, a digest
  when produced, `phases.design_system_harvest.*`
- **Contract deltas:**
  - `--nested` — passed by `product-spec` Step 2E, which runs this inside Phase 2
    for any feature with UI. Under `--nested` there is no Gate: Step 4 shows the
    three-choice `Next step` prompt, writes `phases.design_system_harvest.status`
    and `digest_path` itself, and appends no `gates[]` entry.
  - A direct standalone run ends with the Gate (approve → `completed`).
  - Re-runnable whenever the design system changes (it only re-reads code).

## Step 1: Discover the design system

Use the `design_system` config paths when set; otherwise auto-detect, in priority
order:

1. **Component library** — a UI package/dir (e.g. `packages/ui`,
   `src/components`, `@<org>/ui`): exported components, their props and variants.
2. **Design tokens** — `:root { --... }` CSS custom properties, SCSS/Less vars,
   `tailwind.config.*` theme, token files (`tokens.json`, `*.tokens.ts`, Style
   Dictionary output).
3. **Storybook** — `*.stories.*` files, the richest source of components +
   variants + args; prefer them when present.
4. **Framework** — React / Vue / Svelte / Angular / web components (sets how
   components are referenced in mockups and selectors).

When nothing is found, report it and ask:

```
[Design system] No design system found under {searched paths}. How to proceed?

  1. Pause (recommended) — point me at the right path
  2. Proceed with a generic token set
  (or type your own answer)
```

Report only what exists in code; never invent a design system.

Result: component list, token groups and framework identified (or the user's choice).

## Step 2: Write `design-system/manifest.yml`

Write `{FEATURE_DIR}/design-system/manifest.yml` — read by `product-spec`
(mockups), `tasks` / `implement` (component decomposition) and `verify-full`
(UI-uses-real-components check):

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
    selector: "[data-cmp='button']"      # stable selector for E2E
  - id: "CMP-Modal"
    import: "@acme/ui/Modal"
    props: ["open", "title", "onClose"]
    variants: ["default", "danger"]
    selector: "[data-cmp='modal']"
```

- `tokens.*` keep the **in-code reference** (CSS var / token name), never a
  hardcoded hex, so mockups inherit real tokens.
- `selector` is the stable test selector the journey → Playwright pipeline uses.
- `id` uses the `CMP-` prefix from the
  [traceability ID system](../docs/templates/traceability-matrix.md).

## Step 3: Write `design-system/manifest.md`

A terse human-readable companion: discovered components, token groups, detected
framework, and gaps in both directions (components the design references but the
library lacks, and library components the design never uses).

## Step 4: Status and gate

Write the digest first when one is produced. The status fields:

```yaml
phases:
  design_system_harvest:
    status: completed            # or not_applicable for backend-only features
    digest_path: "{digest path per runtime §8.1}"   # only when a digest was produced
```

**Under `--nested`** (from `product-spec` Step 2E) — no Gate. Ask:

```
[Next step] Design-system harvest done — {N} components, {N} token groups. What next?

  1. Proceed to mockups (recommended) — continue Phase 2 with this manifest
  2. Re-point — harvest again from a different path
  3. Skip design-system grounding for this feature
  (or type your own answer)
```

Proceed → write `status: completed` and `digest_path`; re-point → re-run Step 1
against the given path; skip (or a backend-only feature) → write
`status: not_applicable`. Append no `gates[]` entry; `product-spec` continues
with 2E.

**Direct standalone run** — end with the Gate (outcome: components / token
groups found). Approve → status `completed`; Revise → re-point at a different
path and re-run Step 1.

## Done when

- `manifest.yml` lists every discovered component with `id` (`CMP-*`), `import`,
  `props`, `variants`, `selector`, and every token group as an in-code reference.
- `manifest.md` lists components, token groups, framework and gaps.
- No design system found → the user chose pause or generic tokens; nothing was invented.
- `--nested`: the `Next step` choice was asked and acted on;
  `phases.design_system_harvest.status` is `completed` or `not_applicable`
  (skipped grounding / backend-only) with `digest_path` when produced; no
  `gates[]` entry was written.
- Direct standalone run: the Gate was shown, its decision recorded and the
  status set from it.
