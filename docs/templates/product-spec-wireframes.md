> Template for `product-spec/wireframes.md` or `product-spec/wireframes/wireframe-{screen-name}.html` — written by `product-spec` Step 4.

Pick the section that matches `WIREFRAME_DETAIL`.

---

## Text / ASCII — single `wireframes.md`

````markdown
# Wireframes: {Feature Name}

> Navigation: [Screen 1](#screen-1) | [Screen 2](#screen-2)
> Related: [Product Spec](./product-spec.md) | [Mockups](./mockups/)

## Screen 1: {Screen Name}

**Purpose:** {what this screen does}

```
┌─────────────────────────────────┐
│  Header / Navigation            │
├─────────────────────────────────┤
│  [Component: Search Bar]        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │  Card 1  │  │  Card 2  │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  [Button: Primary Action]       │
└─────────────────────────────────┘
```

**Components:** {list of UI components}
**States:** Default | Loading | Empty | Error
````

---

## Basic HTML — one `wireframe-{screen-name}.html` per screen

```html
<!DOCTYPE html>
<html>
<head>
  <title>Wireframe: {Screen Name} — {Feature}</title>
  <style>
    /* Minimal wireframe styles — gray boxes, no decoration */
    body { font-family: sans-serif; background: #f5f5f5; padding: 20px; }
    .screen { max-width: 390px; margin: 0 auto; background: white; border: 2px solid #333; min-height: 844px; padding: 16px; }
    .nav { background: #ddd; padding: 12px; text-align: center; margin-bottom: 16px; }
    .component { background: #eee; border: 1px solid #bbb; padding: 12px; margin-bottom: 8px; border-radius: 4px; }
    .button { background: #333; color: white; padding: 12px 24px; border: none; cursor: pointer; width: 100%; }
    /* Navigation links to other screens */
    .wireframe-nav { text-align: center; margin-bottom: 20px; }
    .wireframe-nav a { margin: 0 8px; color: #0066cc; }
  </style>
</head>
<body>
  <div class="wireframe-nav">
    <strong>Screens:</strong>
    <!-- Links to other wireframe files -->
  </div>
  <div class="screen">
    <!-- Screen content -->
  </div>
</body>
</html>
```

---

## Detailed HTML — one `wireframe-{screen-name}.html` per screen

Start from the basic HTML skeleton, then scan `{codebase_path}` for CSS variables
and design tokens and apply them (colors, typography, spacing, hover states), so the
wireframe matches the project design system.
