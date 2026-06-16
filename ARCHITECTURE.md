# Architecture Guide

Detailed design decisions, rationale, and implementation patterns for `@davidhund/vs-css`.

## Table of Contents

1. [Layer System](#layer-system)
2. [Token Architecture](#token-architecture)
3. [Dark Mode](#dark-mode)
4. [Focus & Accessibility](#focus--accessibility)
5. [Dynamic Contrast with `contrast-color()`](#dynamic-contrast-with-contrast-color)
6. [Layout Primitives](#layout-primitives)
7. [Tooling](#tooling)
8. [Customization](#customization)

---

## Layer System

### Why `@layer`?

The cascade is a feature, not a bug. `@layer` lets us partition CSS by specificity/responsibility *without* fighting the cascade.

**Problem it solves:**
- Without layers, a utility `.text-red` is overpowered by a specific selector `article p { color: blue }` — even if the utility should win
- With layers, we control precedence: utilities layer has lower priority than blocks, but higher than reset

**Ordering:**

```
@layer reset, tokens, base, layout, utilities, overrides;
```

- **`reset`** — Strip browser defaults + accessibility fixes (lowest priority)
- **`tokens`** — CSS custom properties (no rules, just definitions)
- **`base`** — Element-level defaults (body, h1–h6, inputs, focus)
- **`layout`** — Layout primitives (classes like `.stack`, `.grid`)
- **`utilities`** — Single-purpose helpers (`.visually-hidden`, `.truncate`)
- **`overrides`** — Project-specific rules (highest priority, empty by default)

### All CSS lives in a layer

This is critical: **unlayered CSS automatically wins over all layered CSS**, regardless of specificity. If a file doesn't declare `@layer`, its styles will trump everything.

Every file in `css/` starts with `@layer <name> { ... }` to prevent this accident.

---

## Token Architecture

### 2-Tier System: Primitive → Semantic

**Primitives** are raw, unfiltered design values:
- `color.neutral.0`, `color.neutral.900`, `color.blue.500`
- `space.1`, `space.2`, `space.4` (4px, 8px, 16px steps)
- `font.family.sans`, `font.size.lg`, `font.weight.bold`

**Semantics** are purposeful aliases that *mean* something:
- `color.text.default` → resolves to `color.neutral.900` (light) / `color.neutral.0` (dark)
- `space.md` → `space.4` (16px)
- `typography.body` → `font.family.sans`

### Light + Dark in Tokens

Semantic color tokens use the `$extensions.vs` property to declare light/dark values:

```json
{
  "color": {
    "text": {
      "default": {
        "$type": "color",
        "$value": "#000",
        "$extensions": {
          "vs": {
            "light": "{color.neutral.900}",
            "dark": "{color.neutral.0}"
          }
        }
      }
    }
  }
}
```

The Style Dictionary config reads this and outputs:

```css
--vs-color-text-default: light-dark(var(--vs-color-neutral-900), var(--vs-color-neutral-0));
```

### Prefix Configuration

All tokens are prefixed with `--vs-` by default. To change:

**`styledictionary.config.js`:**

```js
const PREFIX = 'my-org'; // Outputs --my-org-color-text-default
```

Then run:

```bash
npm run tokens
```

One change. All references update automatically via Style Dictionary's `outputReferences` option.

### No hardcoded values

Every color, spacing, font, and radius uses a token. This ensures:
- Centralized control (change `color.neutral.900` once, updates everywhere)
- Dark mode support (semantic colors flip automatically)
- Consistency (impossible to have a rogue `#ff00ff` or `14px`)

---

## Dark Mode

### `light-dark()` + `color-scheme`

**Primary approach (Baseline 2024 Newly Available):**

```css
:root {
  color-scheme: light dark;
  --vs-color-text-default: light-dark(var(--vs-color-neutral-900), var(--vs-color-neutral-0));
}
```

Browser automatically resolves `light-dark()` based on `color-scheme`:
- `light` → first argument (dark text)
- `dark` → second argument (light text)

**Advantages:**
- No media query duplication
- Browser UI (form controls, scrollbars) respects scheme
- Manual override works: `document.documentElement.style.colorScheme = 'dark'`

### Manual Theme Toggle

```js
document.documentElement.style.colorScheme = 'dark';
```

All `light-dark()` values cascade to descendants automatically. No JavaScript needed to update CSS.

### Fallback: Media Query

If you need to support older browsers or server-side rendering, use `@media (prefers-color-scheme: dark)`:

```css
:root {
  --vs-color-text-default: var(--vs-color-neutral-900);
}

@media (prefers-color-scheme: dark) {
  :root {
    --vs-color-text-default: var(--vs-color-neutral-0);
  }
}
```

This is less elegant but works everywhere. Choose based on your target audience.

---

## Focus & Accessibility

### Double-Ring Outline

```css
:focus-visible {
  outline: 3px solid var(--vs-color-border-focus);
  outline-offset: 3px;
  box-shadow: 0 0 0 6px var(--vs-color-bg-default);
}

:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

**Why this pattern:**

1. **Keyboard-only focus** (`:focus-visible`) — visible to keyboard users and screen reader users
2. **Pointer focus suppression** (`:focus:not(:focus-visible)`) — hidden for mouse users (they see the visual change already)
3. **Double ring** (outline + box-shadow) — meets WCAG 2.2 SC 2.4.13 (Focus Appearance)
   - Outline: 3px ≥ 2px minimum perimeter
   - Gap ring: Uses `--vs-color-bg-default` (white in light, dark in dark mode)
   - Contrast: 3:1 between focused/unfocused states

### Windows High Contrast Mode / Forced Colors

In forced colors mode:
- `outline` → color is overridden to system color (e.g., `ButtonText`) → **still visible**
- `box-shadow` → forced to `none` → gap ring disappears

Result: Users in WHCM see one clear ring (the outline), still WCAG-compliant.

### Transparent Outline Pattern

If a component uses only `box-shadow` for its focus ring (not recommended, but sometimes necessary):

```css
:focus-visible {
  box-shadow: 0 0 0 3px var(--vs-color-accent-default);
  outline: 2px solid transparent; /* Backup for forced colors */
}
```

In normal mode, `transparent` is invisible, and `box-shadow` shows. In forced colors, `box-shadow` disappears but `transparent` → system color → visible.

---

## Dynamic Contrast with `contrast-color()`

### What It Does

The CSS `contrast-color()` function (Baseline Newly Available: Chrome 147+, Firefox 146+, Safari 26, 2026) automatically returns either black or white—whichever provides better WCAG AA contrast against a given background color.

```css
.button {
  background-color: var(--vs-color-accent-default);
  color: contrast-color(var(--vs-color-accent-default));
}
```

This solves a key accessibility gap: 70% of websites still fail basic WCAG contrast checks, often because developers hardcode text colors for one background and don't account for dynamic themes or user-selected colors.

### When to Use `contrast-color()`

**Good use cases:**
- User-selected or dynamically-generated background colors (theme pickers, color swatches)
- Overlaid content on dynamic backgrounds (e.g., text on a user-uploaded image)
- Components that adapt to multiple background contexts

**Not recommended for:**
- Static, semantic color combinations (use `color.text.*` tokens instead)
- Cases requiring specific semantic colors (blue text vs. gray text)
- Animations or transitions (output is discrete, not smooth)

### Browser Support & Fallbacks

Use `@supports` to provide fallbacks:

```css
.dynamic-background {
  @supports (color: contrast-color(red)) {
    color: contrast-color(var(--bg-color));
  }

  @supports not (color: contrast-color(red)) {
    /* Fallback to semantic token */
    color: var(--vs-color-text-default);
  }
}
```

### Limitations

- **Binary output only:** Returns black or white, not custom colors (extended options planned for future specs)
- **No gradients/images:** Input must be a solid color
- **Transparent colors:** Composited against assumed white canvas before calculation
- **Snaps, doesn't fade:** Discrete values; avoid in animations where smooth color transitions are expected

### Example: User-Picked Accent Color

```html
<div style="--user-color: #ff6b6b; background-color: var(--user-color); color: contrast-color(var(--user-color));">
  Text automatically adapts to user-selected background
</div>
```

With no JavaScript, the browser ensures readable contrast automatically.

---

## Layout Primitives

### Intrinsic Layouts (No Breakpoints)

Every layout is algorithmic, not breakpoint-based. They adapt to content and container, not screen size.

#### `.stack`

Vertical rhythm with consistent gap. Items never wrap; always stack vertically.

```css
.stack {
  --stack-gap: var(--vs-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--stack-gap);
}
```

**Visualization:**

```
┌─────────────────┐
│     Item 1      │
├─────────────────┤
│      gap        │
├─────────────────┤
│     Item 2      │
├─────────────────┤
│      gap        │
├─────────────────┤
│     Item 3      │
└─────────────────┘
```

Override with inline custom property:

```html
<div class="stack" style="--stack-gap: var(--vs-space-lg);">
  <p>Larger gap</p>
</div>
```

#### `.cluster`

Flex-wrap groups (like words in a sentence). Adapts to available width—wraps items when they don't fit.

```css
.cluster {
  --cluster-gap: var(--vs-space-md);
  display: flex;
  flex-wrap: wrap;
  gap: var(--cluster-gap);
}
```

**Visualization (wide):**

```
┌───────────────────────────────────────┐
│ Item 1  Item 2  Item 3  Item 4  Item 5 │
└───────────────────────────────────────┘
```

**Visualization (narrow—wraps):**

```
┌──────────────┐
│ Item 1  Item 2 │
│ Item 3  Item 4 │
│ Item 5       │
└──────────────┘
```

#### `.center`

Max-width container, horizontally centered. Content respects max-width; excess space distributed equally left/right.

```css
.center {
  --center-max-width: 45rem;
  margin-inline: auto;
  max-width: var(--center-max-width);
  padding-inline: var(--vs-space-md);
}
```

**Visualization (wide):**

```
┌─────────────────────────────────────────────┐
│              padding                        │
│  ┌─────────────────────────────────────┐   │
│  │      Content (max 45rem)            │   │
│  └─────────────────────────────────────┘   │
│              padding                        │
└─────────────────────────────────────────────┘
```

**Visualization (narrow—no margin, respects padding):**

```
┌───────────────────────┐
│ pad │   Content   │ pad │
└───────────────────────┘
```

#### `.sidebar`

Two-column layout: narrow left (sidebar), wide right (main). Stacks when combined width exceeds viewport.

```css
.sidebar {
  --sidebar-width: 12rem;
  display: flex;
  flex-wrap: wrap;
  gap: var(--vs-space-md);
}

.sidebar > :first-child {
  flex: 0 1 var(--sidebar-width);
}

.sidebar > :last-child {
  flex: 1 1 calc((100% - var(--sidebar-width)) - var(--gap));
  min-inline-size: 0;
}
```

**Visualization (wide):**

```
┌──────────────────────────────────────────┐
│ Sidebar │ gap │     Main Content        │
│ (12rem) │     │   (takes rest)          │
└──────────────────────────────────────────┘
```

**Visualization (narrow—stacks):**

```
┌─────────────────┐
│     Sidebar     │
│    (12rem)      │
├─────────────────┤
│      gap        │
├─────────────────┤
│ Main Content    │
│ (100% width)    │
└─────────────────┘
```

#### `.grid`

Auto-fill responsive grid. Columns wrap automatically based on available space. Items grow equally to fill available width.

```css
.grid {
  --grid-min: 15rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--grid-min), 1fr));
  gap: var(--vs-space-md);
}
```

**Visualization (wide):**

```
┌─────────────────────────────────────────────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 │   │
│ └────────┘ └────────┘ └────────┘ └────────┘   │
│ ┌────────┐ ┌────────┐                          │
│ │ Card 5 │ │ Card 6 │                          │
│ └────────┘ └────────┘                          │
└─────────────────────────────────────────────────┘
```

**Visualization (narrow—fewer columns):**

```
┌──────────────────┐
│ ┌──────┐ ┌──────┐│
│ │Card 1│ │Card 2││
│ └──────┘ └──────┘│
│ ┌──────┐ ┌──────┐│
│ │Card 3│ │Card 4││
│ └──────┘ └──────┘│
└──────────────────┘
```

#### `.switcher`

Flex layout that switches from horizontal to vertical based on available space. Like `.sidebar` but symmetric.

```css
.switcher {
  --switcher-threshold: 30rem;
  display: flex;
  flex-wrap: wrap;
  gap: var(--vs-space-md);
}

.switcher > * {
  flex-grow: 1;
  flex-basis: calc((var(--switcher-threshold) - 100%) * 999);
}
```

**Visualization (wide):**

```
┌────────────────────────────────────┐
│ ┌────────┐  ┌────────┐  ┌────────┐ │
│ │ Item 1 │  │ Item 2 │  │ Item 3 │ │
│ └────────┘  └────────┘  └────────┘ │
└────────────────────────────────────┘
```

**Visualization (narrow—switches to vertical):**

```
┌────────────┐
│  Item 1    │
├────────────┤
│   Item 2   │
├────────────┤
│   Item 3   │
└────────────┘
```

#### `.prose` + `.breakout`

Reading context with constrained width. Children escape with `.breakout`.

```css
.prose {
  --vs-prose-width: 65ch;
  display: grid;
  grid-template-columns:
    [full-start] minmax(0, 1fr)
    [prose-start] min(var(--vs-prose-width), 100% - (2 * var(--padding)))
    [prose-end] minmax(0, 1fr)
    [full-end];
}

.prose > * {
  grid-column: prose;
}

.prose > .breakout {
  grid-column: full;
}
```

**Visualization (standard flow):**

```
┌─────────────────────────────────────────┐
│ ┌───────────────────────────────────┐   │
│ │ Paragraph text constrained to     │   │
│ │ ~65 characters per line for easy  │   │
│ │ reading.                          │   │
│ └───────────────────────────────────┘   │
│ ┌───────────────────────────────────┐   │
│ │ More paragraph text with the same │   │
│ │ comfortable line length.          │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Visualization (with .breakout child):**

```
┌─────────────────────────────────────────┐
│ ┌───────────────────────────────────┐   │
│ │ Paragraph text.                   │   │
│ └───────────────────────────────────┘   │
│ ┌─────────────────────────────────────┐ │
│ │ Full-width image (escaped via      │ │
│ │ .breakout)                         │ │
│ └─────────────────────────────────────┘ │
│ ┌───────────────────────────────────┐   │
│ │ More text, back to constrained    │   │
│ │ width.                            │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Use case:**
```html
<article class="prose">
  <p>Regular paragraph stays within 65ch line length.</p>
  <figure class="breakout">
    <img src="wide-image.jpg" alt="">
  </figure>
  <p>More text, back to constrained width.</p>
</article>
```

---

## Tooling

### Style Dictionary

Generates CSS custom properties from JSON.

**Input:** `tokens/*.tokens.json` (DTCG format)
**Output:** `css/tokens/primitive.css`, `css/tokens/semantic.css`

**Custom formatter** handles `light-dark()` for semantic colors.

**Run:**

```bash
npm run tokens
```

### LightningCSS

Bundles CSS `@import` statements into a single file.

**Why LightningCSS over PostCSS?**
- Single tool, not a plugin ecosystem
- Native CSS nesting is standard → no transpilation needed
- Fast (Rust, not JavaScript)
- Less configuration

**Run:**

```bash
npm run build
```

### Biome

Formats and lints CSS, JavaScript, JSON.

- Formatter: enforces consistent tabs, double quotes
- Linter: basic CSS rules (catches typos, obvious errors)

Does NOT replace Stylelint for architecture-level rules.

**Run:**

```bash
npm run format
```

### Stylelint

Architecture-level CSS linting.

**Configured rules:**
- Disables vendor-prefix warnings (valid for fallbacks)
- Disables strict empty-line rules (too rigid for short files)
- Enforces BEM-like class names (`^[a-z0-9]+((-[a-z0-9]+)*...)?$`)

**Run:**

```bash
npm run lint
```

---

## Customization

### Renaming a layout primitive

To rename `.stack` → `.vstack`:

1. Edit `css/layout/stack.css`:
   ```css
   .vstack { /* was .stack */ }
   ```

2. Update docs/examples
3. Run `npm run lint` to verify

That's it. One file to change.

### Adding a new layout primitive

Create `css/layout/new-primitive.css`:

```css
@layer layout {
  .new-primitive {
    /* your styles */
  }
}
```

Import in `css/main.css`:

```css
@import './layout/new-primitive.css' layer(layout);
```

### Adding a new utility

Create `css/utilities/new-utility.css`:

```css
@layer utilities {
  .new-utility {
    /* single purpose rule */
  }
}
```

Import in `css/main.css`:

```css
@import './utilities/new-utility.css' layer(utilities);
```

### Extending tokens

Edit `tokens/primitive.tokens.json` or `tokens/semantic.tokens.json`, then:

```bash
npm run tokens
```

Style Dictionary will generate new CSS variables and update all `semantic.tokens.json` references automatically.

### Project overrides

Add custom rules in the `overrides` layer in `css/main.css`. These will always win.

```css
@layer overrides {
  /* Your project-specific rules */
  .my-custom-class {
    color: red; /* This wins over everything else */
  }
}
```

---

## Design Principles

### Simplicity

- No abstractions until there's duplication
- Prefer CSS fundamentals over clever techniques
- Explicit over implicit

### Standards-First

- Use Web Platform features, not polyfills
- Target Baseline 2026 Widely Available when possible
- Document newer features (Newly Available) for upgrade planning

### Accessible by Default

- Focus indicators that survive forced colors
- `prefers-reduced-motion` respected globally
- Semantic HTML supported (form elements inherit properly)

### Mobile-First

- Intrinsic layouts adapt to content, not viewport
- No mobile-specific media queries
- Container queries ready (when support is better)

### Dark Mode Ready

- All colors via `light-dark()` or `@media (prefers-color-scheme)`
- No hardcoded light-only colors
- Respects user preference + allows manual override

---

## FAQ

**Q: Can I use this with [framework]?**
A: Yes. It's framework-agnostic CSS. Works with vanilla HTML, React, Vue, Svelte, etc.

**Q: Why no Tailwind?**
A: Tailwind is opinionated about project structure and scale. This architecture is minimal and modular, letting teams add their own abstractions on top.

**Q: How do I support older browsers?**
A: The main pain point is `light-dark()`. Use the `@media (prefers-color-scheme)` fallback documented above. All other features (nesting, `@layer`, custom properties) have been standard for years.

**Q: Can I change the token prefix after publishing?**
A: In the template, yes—just edit `styledictionary.config.js`. For the npm package, it's a breaking change (token names differ), so increment to a new major version.

**Q: Should I version tokens separately from CSS?**
A: No. Tokens are part of the CSS—they're in the same bundle. Version them together.

---

## Related Reading

- [Web Standards: CSS @layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [CUBE CSS](https://cube.fyi/)
- [Every Layout](https://every-layout.dev/)
- [WCAG 2.2: Focus Appearance (2.4.13)](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)
- [Microsoft: Forced Colors](https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/)
- [Baseline: light-dark() function](https://web.dev/baseline)

