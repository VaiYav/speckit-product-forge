# Product Forge — Configuration Reference

Product Forge is configured via `.product-forge/config.yml` in your project root.
All settings are optional — missing values will be asked at runtime.

---

## Quick Setup

```bash
# Create the config directory
mkdir -p .product-forge

# Copy the template
cp path/to/speckit-product-forge/config-template.yml .product-forge/config.yml

# Edit with your project details
nano .product-forge/config.yml
```

---

## Full Configuration Reference

### Project Identity

```yaml
project_name: "My Zodiac AI"
```
Human-readable project name. Used in all research prompts, report headers, and competitor search queries. The more specific, the better the research quality.

---

```yaml
project_tech_stack: "NestJS + Vue 3 + Quasar + Capacitor"
```
Brief tech stack description. Helps research agents:
- Find stack-specific libraries and packages
- Understand mobile vs web constraints
- Identify relevant codebase integration patterns

Examples:
- `"Next.js + TypeScript + Postgres + Vercel"`
- `"Django REST + React + Redux + AWS"`
- `"Flutter + Firebase"`

---

```yaml
project_domain: "astrology mobile app"
```
Domain and industry context. Used for:
- Targeting competitor search to relevant apps
- UX pattern research in the right vertical
- Metrics/ROI benchmarks from the same industry

Examples:
- `"B2B SaaS fintech platform"`
- `"consumer fitness mobile app"`
- `"e-commerce marketplace"`

---

### Paths

```yaml
codebase_path: "."
```
Relative path to the project codebase from the config file location.
Used by:
- Codebase analysis agent (Phase 1)
- Project-styled mockup generator (Phase 2)

If your codebase is in a subdirectory:
```yaml
codebase_path: "./src"
# or for monorepos:
codebase_path: "./apps/mobile"
```

---

```yaml
features_dir: "features"
```
Directory where Product Forge creates feature artifact folders.
**Avoid changing this after features have been created** — it will break `.forge-status.yml` lookups.

---

### SpecKit Integration

```yaml
default_speckit_mode: "ask"
```

Controls Phase 4 behavior:

| Value | Behavior |
|-------|----------|
| `"ask"` | Always ask the user which mode to use (recommended) |
| `"classic"` | Always use `plan → tasks → implement` (fastest path) |
| `"v-model"` | Always use full V-Model with test specs (most thorough) |

---

### Research Defaults

```yaml
default_competitors: []
```
List of competitors to always include in Phase 1 competitor analysis.
The agent will add more from web search even if this is set.

```yaml
default_competitors:
  - "CoStar Group"
  - "Redfin"
  - "Zillow"
```

---

```yaml
default_tech_research: false
default_metrics_research: false
```
Whether to run optional research dimensions by default (without asking).
Setting to `true` means these run automatically on every feature.
The user can still override per-feature during Phase 1.

---

### Product Spec Defaults

```yaml
default_wireframe_detail: "basic-html"
```

| Value | What it creates |
|-------|----------------|
| `"text"` | Markdown with ASCII box diagrams — fast, version-friendly |
| `"basic-html"` | Clean HTML wireframe per screen, gray-box style |
| `"detailed-html"` | Full HTML/CSS wireframe matching project design tokens |

---

```yaml
default_mockup_style: "project-styled"
```

| Value | What it creates |
|-------|----------------|
| `"none"` | No mockups — wireframes only |
| `"generic"` | Clean HTML mockup with generic design system |
| `"project-styled"` | Agent scans codebase for CSS tokens and applies them |

The user can always override this per-feature during Phase 2.

---

### Advanced

```yaml
max_tokens_per_doc: 4000
```
Maximum approximate token budget per generated document.
When a document would exceed this, Product Forge will:
1. Suggest decomposing into multiple files
2. Ask the user how many files/sections to create
3. Create individual files with cross-links

Recommended range: `3000` (concise) to `6000` (exhaustive).
Do not set above `8000` — this risks hitting context limits in downstream agents.

---

```yaml
output_language: "en"
```
Language for all generated documents.
Supported values: any BCP-47 language code (`"en"`, `"ru"`, `"de"`, `"fr"`, etc.)
Note: Research agents use web search, so results may mix languages regardless of this setting.

---

## Per-Feature Config Override

You can override any setting for a specific feature by adding a config block
to `{features_dir}/{feature-slug}/.forge-status.yml`:

```yaml
# .forge-status.yml
feature: "push-notifications"
config_override:
  default_wireframe_detail: "detailed-html"
  default_mockup_style: "project-styled"
  output_language: "ru"
```

---

## Environment Variable Overrides

Any config value can be overridden via environment variable using the prefix `PRODUCT_FORGE_`:

```bash
PRODUCT_FORGE_PROJECT_NAME="My App" \
PRODUCT_FORGE_CODEBASE_PATH="./src" \
/speckit.product-forge.forge
```
