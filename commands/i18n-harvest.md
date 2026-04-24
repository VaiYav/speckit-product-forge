---
name: speckit.product-forge.i18n-harvest
description: >
  Optional post-bridge step: extract every user-facing string from wireframes,
  product-spec, and (if available) UI prototypes, generate locale key stubs
  namespaced by the feature slug, and create TODO entries in every configured
  locale file. Wraps the project's `i18n-workflow` skill where available.
  Runs at Phase 4.5 — between Phase 4 (Bridge) and Phase 5 (Plan).
  Use: "harvest i18n keys", "i18n stubs", "/speckit.product-forge.i18n-harvest"
---

# Product Forge — i18n Harvest

You are the **Localization Harvester** for Product Forge.
Your job: turn user-facing strings in wireframes and spec documents into
locale keys with first-language drafts and TODO stubs in every other
configured locale. Prevent the "we forgot to translate X" bug from
surfacing mid-release.

This phase is **opt-in**. English-only projects skip it.

## User Input

```text
$ARGUMENTS
```

Parse for:
- Feature slug (required).
- `--locales=<list>` — comma-separated override. Default: read
  `supported_locales` from project config or from the existing i18n folder
  structure.

---

## Step 0: Prerequisites

1. `spec.md` exists.
2. At least one of: `product-spec/wireframes/`, `product-spec/user-stories.md`,
   `product-spec/README.md` is populated with user-facing text.
3. Project is multi-locale. Detect by one of:
   - `supported_locales` in `.product-forge/config.yml`.
   - Existing `i18n/` or `locales/` directory in the codebase.
   - Framework signal (Nuxt i18n config, Vue-i18n, i18next).
4. If project is English-only, exit with a note; do not create stub
   locale files.

---

## Step 1: Extract Strings

Scan user-facing artifacts for string candidates:

Sources (in priority order):

1. `product-spec/wireframes/*` — button labels, headings, empty states,
   error messages, form placeholders.
2. `product-spec/user-stories.md` — quoted in-UI text ("The button says
   'Send'").
3. `spec.md` — acceptance criteria referencing on-screen copy.

Build a candidate table:

| Proposed key | English draft | Source | Context |
|--------------|---------------|--------|---------|
| `{feature-slug}.cta.send` | "Send" | wireframes/main.png | Primary CTA on main screen |
| `{feature-slug}.error.quota_exceeded` | "You've hit today's limit." | spec.md AC-5 | Shown when quota reached |
| `{feature-slug}.empty.no_items` | "Nothing here yet — start a chat." | wireframes/empty.png | Empty state on main list |

Rules:
- Keys are dot-separated, lowercase, feature-namespaced.
- No Markdown or HTML inside drafts; format via the i18n framework.
- Duplicate strings across screens collapse to one key unless context
  differs meaningfully.

---

## Step 2: Detect Existing Keys

Read the project's i18n folder. For each proposed key:

1. Check for exact match — if present, do not create a duplicate; reuse.
2. Check for near matches (same English value, different key) — flag as
   *possible consolidation candidate* in the report; do not auto-merge.

---

## Step 3: Write Stubs

Delegate to `i18n-workflow` skill if installed. Otherwise, fall back to
direct file writes following project convention (detect from existing
locale structure).

For each configured locale:

- **Default/primary locale** (usually `en`): write the English draft.
- **Other locales**: write `"{{TODO:{key}}}"` as a placeholder so the
  framework still resolves without crashing.

Example (Nuxt i18n, YAML locales):

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

Never overwrite an existing key. If a key exists with a different value,
flag as conflict and skip.

---

## Step 4: Write keys.yml

Consolidated machine-readable record:

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

---

## Step 5: Report

Write `{FEATURE_DIR}/i18n/report.md`:

- New keys created
- Existing keys reused
- Consolidation candidates (similar strings)
- Conflicts (key exists with different value)
- Per-locale TODO counts

---

## Step 6: Update Status

Update `.forge-status.yml`:

```yaml
phases:
  i18n_harvest:
    status: "completed"
    started_at: "{ISO}"
    completed_at: "{ISO}"
    digest_path: "i18n/digest.md"
i18n:
  primary_locale: "en"
  keys_created: {N}
  keys_reused: {N}
  todos_per_locale:
    es: {N}
    fr: {N}
```

Write `i18n/digest.md` per the digest template.

---

## Operating Principles

1. **Never overwrite.** Existing keys are reused or flagged, never replaced.
2. **Never auto-translate.** TODO placeholders go into non-primary locales.
   Real translations come from `i18n-workflow` or human translators.
3. **Namespace discipline.** All new keys are feature-namespaced
   (`{feature-slug}.*`) to avoid collisions across in-flight features.
4. **Degrade gracefully.** If `i18n-workflow` is not installed, fall back
   to raw file writes using detected framework conventions. Document the
   fallback in the report.
5. **No frontend code changes.** This phase only touches locale files and
   writes the keys.yml record. Wiring keys to UI components happens in
   Phase 6 (Implement).
