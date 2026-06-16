# vs-css

Modern CSS architecture boilerplate — standards-based, token-driven, layer-aware. Built for greenfield web projects.

**No Tailwind. No magic. Pure Web Standards.**

## Quick Start

### As a template (recommended for new projects)

```bash
npx giget gh:davidhund/vs-css my-project
cd my-project
npm install
npm run tokens  # Generate tokens from Style Dictionary
npm run build   # Bundle CSS with LightningCSS
```

### As an npm package

```bash
npm install @davidhund/vs-css
```

Then import in your HTML:

```html
<link rel="stylesheet" href="node_modules/@davidhund/vs-css/dist/css/main.css">
```

Or in your CSS:

```css
@import '@davidhund/vs-css';
```

## What's Inside

```
css/
├── reset/          # Andy Bell's modern reset + [hidden] + prefers-reduced-motion
├── base/           # Element defaults: typography, forms, focus, media
├── layout/         # Primitives: stack, cluster, center, sidebar, grid, switcher, prose
├── utilities/      # Helpers: visually-hidden, flow, truncate, skip-to-content
├── tokens/         # Generated design tokens (CSS custom properties)
└── main.css        # @layer orchestration
```

**👉 [View the kitchen sink demo](./examples/index.html)** — interactive examples of all features in action (no build needed)

## Core Concepts

### Layer Architecture

CSS organized with `@layer` for predictable cascade, ordered from least to most specific:

```css
@layer reset, tokens, base, layout, utilities, overrides;
```

| Layer | Purpose |
|---|---|
| `reset` | Browser defaults + accessibility fixes |
| `tokens` | Design tokens (colors, spacing, typography) |
| `base` | Element-level styling (headings, inputs, focus) |
| `layout` | Layout primitives (intrinsic, no breakpoints) |
| `utilities` | Single-purpose helpers |
| `overrides` | Project-specific exceptions (empty by default) |

### Design Tokens (2-tier)

**Primitive tokens:** Raw values (color palettes, spacing scale, typography)
**Semantic tokens:** Purposeful aliases (`text-default`, `bg-subtle`, `border-focus`)

Tokens are generated from JSON via [Style Dictionary](https://styledictionary.com/).

### Dark Mode with `light-dark()`

Colors automatically adapt via the `light-dark()` CSS function (Baseline 2024 Newly Available):

```css
--vs-color-text-default: light-dark(#1a1a1a, #ffffff);
```

Toggle with CSS `color-scheme`:

```js
document.documentElement.style.colorScheme = 'dark';
```

### Focus Accessibility

Double-ring focus indicator survives Windows High Contrast Mode:

```css
:focus-visible {
  outline: 3px solid var(--vs-color-border-focus);
  box-shadow: 0 0 0 6px var(--vs-color-bg-default);
}
```

The `outline` survives forced colors; the box-shadow gap degrades gracefully.

### Layout Primitives (7)

Built-in Every Layout-inspired components—all intrinsic, no media queries:

- `.stack` — Vertical spacing
- `.cluster` — Flex-wrap groups
- `.center` — Max-width container
- `.sidebar` — Two-column asymmetric
- `.grid` — Auto-fill responsive grid
- `.switcher` — Horizontal ↔ vertical
- `.prose` + `.breakout` — Reading context with full-bleed children

## Customization

### Change the token prefix

Edit `styledictionary.config.js`:

```js
const PREFIX = 'my-org'; // outputs --my-org-color-text-default
```

Then regenerate:

```bash
npm run tokens
```

### Add project-specific styles

Edit the `overrides` layer in `css/main.css`:

```css
@layer overrides {
  /* Your project-specific CSS here */
}
```

### Customize primitives

Modify any class in `css/layout/` or `css/utilities/`. Names like `.stack`, `.cluster` are working names—rename freely (one file each).

## Scripts

```bash
npm run tokens      # Generate tokens from tokens/*.tokens.json
npm run build       # Bundle CSS to dist/
npm run lint        # Check CSS with Biome + Stylelint
npm run format      # Auto-fix CSS + config formatting
npm run dev         # Watch and rebuild (--watch flag in build.mjs)
```

## Browser Support

Targets:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**New features used:**
- `light-dark()` (Baseline 2024 Newly Available; fallback works)
- CSS nesting (Baseline 2024)
- `@layer` (Baseline 2024)
- CSS custom properties (Baseline 2022)

## File Structure for npm Distribution

When published, `dist/` contains:

```
dist/
├── css/
│   └── main.css           # Full bundled, minified CSS
└── tokens/
    ├── primitive.tokens.json
    └── semantic.tokens.json   # Raw DTCG tokens for custom builds
```

Source maps are excluded from the published package (kept locally for dev).

## Philosophy

- **Standards-first:** Native CSS, no polyfills
- **Minimal tooling:** LightningCSS + Style Dictionary + Biome + Stylelint
- **Token-driven:** Everything via custom properties, no hardcoding
- **Cascade-aware:** `@layer` replaces "fighting CSS" with architecture
- **Accessible:** WCAG 2.2 AA structural baseline (focus, motion, contrast)
- **Dark mode ready:** `light-dark()` + `color-scheme`
- **Mobile-first:** Intrinsic layouts, no breakpoints (container queries ready)

## Documentation

- **[`examples/index.html`](./examples/index.html)** — Kitchen sink demo: all features in action (no build needed)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Detailed design decisions, patterns, and ASCII diagrams
- `_PLAN.md` — Project architecture plan (archived)

## License

MIT

---

Built by [David Hund](https://davidhund.dev) (@davidhund)

