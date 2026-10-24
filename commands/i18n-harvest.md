---
name: speckit.product-forge.i18n-harvest
description: >
  Harvest every user-facing string from wireframes and the product spec into
  feature-namespaced locale keys: primary-locale drafts plus TODO stubs in every
  other locale. Use after Bridge, before Plan, on multi-locale projects.
---

# Product Forge — Phase 4.5: i18n Harvest

You are the **Localization Harvester**. Turn user-facing strings in wireframes
and spec documents into locale keys with primary-language drafts and TODO stubs
in every other configured locale, so no string reaches release untranslated.
You touch only locale files and `{FEATURE_DIR}/i18n/`; wiring keys into UI
components happens in Phase 6 (Implement).

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `i18n_harvest` (Phase 4.5)
- **Config keys:** `supported_locales`, `codebase_path` (or monorepo
  `codebase.paths`), `features_dir`, `storage_strategy`
- **Writes:** project locale files (append only), `i18n/keys.yml`,
  `i18n/report.md`, `i18n/digest.md`, `phases.i18n_harvest.*`
- **Contract deltas:** `--locales=<list>` (comma-separated) overrides the
  locale set (default: `supported_locales`, else the existing i18n folder
  structure). Under `--dry-run` the Step 3 locale-file appends are listed in
  `DRY-RUN-REPORT.md`, not made.

## Step 0: Check scope

1. `spec.md` exists.
2. At least one of `product-spec/wireframes/`, `product-spec/user-stories.md`,
   `product-spec/README.md` holds user-facing text.
3. The project is multi-locale — detected by `supported_locales`, an existing
   `i18n/` or `locales/` directory in the codebase, or a framework signal (Nuxt
   i18n config, Vue-i18n, i18next).

English-only project → exit with a note and create no stub locale files.

## Step 1: Extract strings

Sources, in priority order:

1. `product-spec/wireframes/*` — button labels, headings, empty states, error
   messages, form placeholders.
2. `product-spec/user-stories.md` — quoted in-UI text ("The button says 'Send'").
3. `spec.md` — acceptance criteria that name on-screen copy.

Build the candidate table:

| Proposed key | English draft | Source | Context |
|--------------|---------------|--------|---------|
| `{feature-slug}.cta.send` | "Send" | wireframes/main.png | Primary CTA on main screen |
| `{feature-slug}.error.quota_exceeded` | "You've hit today's limit." | spec.md AC-5 | Shown when quota reached |
| `{feature-slug}.empty.no_items` | "Nothing here yet — start a chat." | wireframes/empty.png | Empty state on main list |

- Keys are dot-separated, lowercase and namespaced `{feature-slug}.*` (no
  collisions across in-flight features).
- Drafts are plain text; formatting goes through the i18n framework.
- Duplicate strings across screens collapse to one key unless the context
  differs meaningfully.

## Step 2: Detect existing keys

Read the project's i18n folder. For each proposed key:

1. Exact match → reuse it; create no duplicate.
2. Near match (same English value, different key) → list it as a
   *consolidation candidate* in the report; leave both keys as they are.

## Step 3: Write stubs

Delegate to the `i18n-workflow` skill when installed; otherwise write the locale
files directly, following the convention detected from the existing locale
structure (and note the fallback in the report).

- **Primary locale** (usually `en`): the English draft.
- **Every other locale**: `"{{TODO:{key}}}"`, so the framework still resolves.
  Real translations come from `i18n-workflow` or human translators — never
  machine-translate here.

```yaml
# locales/en.yml  — append
{feature-slug}:
  cta:
    send: "Send"

# locales/es.yml  — append
{feature-slug}:
  cta:
    send: "{{TODO:{feature-slug}.cta.send}}"
```

Only append. An existing key with a different value is a **conflict**: skip it
and list it in the report.

## Step 4: Write `i18n/keys.yml`

```yaml
# {FEATURE_DIR}/i18n/keys.yml
feature: "{slug}"
generated_at: "{ISO}"
primary_locale: "{en}"
locales_covered: ["en", "es", "fr", "de"]
keys:
  - key: "{feature-slug}.cta.send"
    en: "Send"
    source: "wireframes/main.png"
    status:
      en: drafted
      es: todo
      fr: todo
      de: todo
  - key: "{feature-slug}.error.quota_exceeded"
    en: "You've hit today's limit."
    source: "spec.md AC-5"
    status: { en: drafted, es: todo, fr: todo, de: todo }
```

## Step 5: Write `i18n/report.md`

Sections: new keys created · existing keys reused · consolidation candidates ·
conflicts · per-locale TODO counts · fallback used (when `i18n-workflow` was absent).

## Step 6: Digest and status

Write `i18n/digest.md` from [docs/templates/phase-digest.md](../docs/templates/phase-digest.md),
then the run summary under the phase key (never a top-level `i18n:` block):

```yaml
phases:
  i18n_harvest:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "i18n/digest.md"
    primary_locale: "en"
    keys_created: {N}
    keys_reused: {N}
    todos_per_locale:
      es: {N}
      fr: {N}
```

`status` here is the standalone value: set it from the gate decision (approve →
`completed`). Under `--from-forge`, write the digest and the data fields, leave
`status` out, and return the outcome to forge.

## Done when

- Every user-facing string from the Step 1 sources has a key in `keys.yml`
  (new or reused), namespaced `{feature-slug}.*`.
- Every configured locale has an entry per new key: the draft in the primary
  locale, `{{TODO:{key}}}` elsewhere; no existing key was overwritten.
- `report.md` lists new, reused, consolidation candidates, conflicts and
  per-locale TODO counts.
- English-only project → exited with a note and no locale files created.
- Standalone: digest written, gate shown, decision recorded, status set from it.
- `--from-forge`: digest and `i18n_harvest` data fields written; outcome
  (keys created / reused, TODOs per locale, conflicts) returned to forge; no gate
  prompt, no status write.
