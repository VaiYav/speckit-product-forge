# test-run — a11y floor and component/token conformance scripts

> Reference for `test-run` Step 4.7. The command owns when each leg runs, its
> BLOCKED rules and how findings become bugs; this file holds the scripts. Both
> run in the `pf-test` session at the journey's final state, before tracing stops.

## (a) WCAG-AA accessibility floor — axe-core

Run only when `a11y_gate: axe`. Injects axe-core (local `node_modules` first, CDN
fallback — network required) and runs the WCAG 2.0/2.1 A + AA rules:

```bash
playwright-cli -s=pf-test run-code "async page => {
  // Inject axe-core: prefer local node_modules, else CDN (network required).
  try {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  } catch (e) {
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
  }
  const result = await page.evaluate(async () => {
    if (typeof axe === 'undefined') return { blocked: true };
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
    });
    return {
      blocked: false,
      violations: r.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
        nodes: v.nodes.map(n => ({ target: n.target, html: n.html }))
      }))
    };
  });
  return JSON.stringify(result);
}"
```

Output: `{ blocked: true }` or `{ blocked: false, violations: [...] }`.

## (b) Component + design-token conformance — DOM / computed style

Checks that every region in `mockups/component-map.yml` resolves to a `CMP-*`
whose `selector` (owned by `design-system/manifest.yml`) is present, and that the
rendered colors are design-system **token** values rather than off-system
hardcoded hex. DOM presence and computed style only — no pixel diffing.

**1. Produce the selector list** from the manifest (`components[].selector`)
with the zero-dependency YAML parser
([lib-yaml.js](../../scripts/lib-yaml.js)). When the script is unreachable, read
the selector list from the manifest by hand.

```bash
# Resolve {SELECTORS}: the CMP-* selectors the manifest owns.
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(specify extension path product-forge 2>/dev/null || echo .)}"
node -e "const {parseYaml}=require('$PLUGIN_ROOT/scripts/lib-yaml.js');const fs=require('fs');
  const m=parseYaml(fs.readFileSync('{FEATURE_DIR}/design-system/manifest.yml','utf8'));
  console.log(JSON.stringify((m.components||[]).map(c=>c.selector).filter(Boolean)));"
```

**2. Check presence and token colors.** Substitute the array as `{SELECTORS}`.
The manifest keeps token *names* / CSS-var references, not resolved hex, so the
allow-set is built at runtime from the live page: every color-valued `--*`
custom property on `:root`, plus transparents. Any computed color outside it is
flagged.

```bash
playwright-cli -s=pf-test run-code "async page => {
  const expected = {SELECTORS};   // CMP-* selectors resolved from manifest.yml (step 1)
  const report = await page.evaluate((expected) => {
    const missing = expected.filter(sel => !document.querySelector(sel));
    // Build the allow-set from the design system's own CSS custom properties
    // resolved on the live page (token VALUES, not names) — plus transparents.
    const rootCS = getComputedStyle(document.documentElement);
    const allowed = new Set(['rgba(0, 0, 0, 0)', 'transparent']);
    for (const name of Array.from(rootCS)) {
      if (!name.startsWith('--')) continue;
      const val = rootCS.getPropertyValue(name).trim();
      if (/^(#|rgb|hsl)/i.test(val)) allowed.add(val);
    }
    const offToken = [];
    for (const sel of expected) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'background-color', 'border-color']) {
          const v = cs.getPropertyValue(prop).trim();
          if (v && v !== 'rgba(0, 0, 0, 0)' && !allowed.has(v)) {
            offToken.push({ selector: sel, prop, value: v });
          }
        }
      }
    }
    return { missingComponents: missing, offTokenStyles: offToken };
  }, expected);
  return JSON.stringify(report);
}"
```

Output: `{ missingComponents: [selector…], offTokenStyles: [{selector, prop, value}…] }`.
When the design system ships colors as Tailwind classes instead of `:root`
custom properties, the allow-set is empty — the command then keeps only the
presence check and records the token check BLOCKED.
