# Claude Plugin Packaging

Product Forge ships from a single repository in **two installable forms**:

| Form | Manifest | Install command | Command syntax |
|------|----------|-----------------|----------------|
| SpecKit extension | `extension.yml` | `specify extension add product-forge --from <zip>` | `/speckit.product-forge.forge` |
| Claude Code / Claude plugin | `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` | `/plugin install speckit-product-forge@vaiyav-plugins` | `/speckit-product-forge:forge` |

Both forms reuse the **same 33 command files** in [`commands/`](../commands) and the same [`docs/`](.) and [`scripts/`](../scripts); plugin support adds only manifest files.

## What makes this a plugin

Claude Code auto-discovers a plugin's `commands/` directory, so the command files become slash commands unchanged. Two manifests sit at the repo root:

```
.claude-plugin/
├── plugin.json        # the plugin manifest (name, version, metadata)
└── marketplace.json   # a one-plugin marketplace catalog, source: "./"
```

Because the plugin **is** the repository root (`"source": "./"`), `commands/`, `docs/`, `scripts/`, and `config-template.yml` are copied together into the plugin cache, so every `../docs/...` reference inside a command resolves after installation. Commands locate bundled scripts via `${PLUGIN_ROOT}` ([docs/runtime.md §1A](./runtime.md#1a-locating-bundled-scripts-plugin_root)), which resolves from the cache too.

### `marketplace.json`

Defines the **`vaiyav-plugins`** marketplace with one plugin whose source is the repo root; more plugins can join the `plugins` array without changing the install flow.

### `plugin.json`

Declares the plugin **`speckit-product-forge`**, version `1.8.0` (kept in sync with `extension.yml`), plus author, repository, license, and discovery keywords. The version lives **only** here, not in the marketplace entry (`plugin.json` wins silently if both are set).

## Command-name mapping

The command name comes from the file name, namespaced by the plugin name. As a plugin every workflow is `/speckit-product-forge:<file>`:

| File | SpecKit extension | Claude plugin |
|------|-------------------|---------------|
| `commands/forge.md` | `/speckit.product-forge.forge` | `/speckit-product-forge:forge` |
| `commands/status.md` | `/speckit.product-forge.status` | `/speckit-product-forge:status` |
| `commands/research.md` | `/speckit.product-forge.research` | `/speckit-product-forge:research` |
| …all 33 commands | `/speckit.product-forge.<name>` | `/speckit-product-forge:<name>` |

The dotted `name:` in each command's frontmatter is the SpecKit identifier; Claude Code ignores it and derives the slash command from the file name, so both forms coexist.

## Install, validate, publish

Validate the manifests before pushing (runs offline, no auth needed):

```bash
claude plugin validate .
# ✔ Validation passed
```

Add and install from GitHub:

```bash
claude plugin marketplace add VaiYav/speckit-product-forge
claude plugin install speckit-product-forge@vaiyav-plugins
```

Publishing is just `git push` — users pick up changes with `/plugin marketplace update vaiyav-plugins`. Pin a release by tagging (`git tag v1.8.0 && git push --tags`) and adding with `@ref`:

```bash
claude plugin marketplace add VaiYav/speckit-product-forge@v1.8.0
```

### Versioning

Bump `version` in `plugin.json` on every release (and match `extension.yml`); with an unchanged `version`, installed users keep the cached copy even after new commits. The version is pinned intentionally (omitting it would make every commit a new version).

## Caching caveat

When installed, the plugin is copied to `~/.claude/plugins/cache`, so commands reference only files inside the plugin root — never above it (no `../../`). `node scripts/doctor.js` enforces this on every push (`lint-docs` XREF rule): every intra-plugin reference (`../docs/`, `../scripts/`, `../config-template.yml`) must resolve inside the plugin root. Relative `./…` paths in command prose (e.g. `./research/README.md`, `./spec.md`) point to **runtime artifacts the workflows generate inside a feature directory**, not to plugin files.

## Runtime artifacts excluded from the plugin

`.gitignore` excludes local runtime artifacts so they never ship in the plugin: `.claude/`, `ruvector.db`, `agentdb.rvf`, `agentdb.rvf.lock`, `node_modules/`, and test output.
