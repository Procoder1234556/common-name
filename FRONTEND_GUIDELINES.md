# Frontend Design System & Guidelines — Common Name

## 1. Design Principles

### Core Principles

1. **One composition:** First viewport is brand + one headline + one sentence + one CTA group + atmospheric background — not a dashboard.
2. **Clarity:** Uniqueness signal is readable as text; color never sole indicator.
3. **Transparency:** Matches are visible lists, not hidden scores.
4. **Accessibility:** WCAG 2.1 Level AA; 44×44px targets; visible focus; `prefers-reduced-motion`.
5. **Honest authority:** Visual tone is precise and calm (registry utility), not “growth hacker SaaS purple.”

### Anti-patterns (do not ship)

- Purple-on-white / purple-to-indigo gradient themes
- Warm cream (#F4F1EA) + terracotta + default serif broadsheet look
- Dark mode as default
- Glow effects, rounded-full pill clusters, multi-layer shadows
- Emoji as icons
- Cards in the hero; inset hero media cards
- Stats strips, promo chips, floating badges on hero

---

## 2. Design Tokens

### Color Palette

Direction: **ink on paper-blue** — deep slate ink, cool off-white ground, single teal accent for primary actions (distinct from MCA.gov chrome; not purple).

#### Primary (Teal accent)

```css
--color-primary-50: #e8f7f4;
--color-primary-100: #c5ebe3;
--color-primary-200: #9ad9cc;
--color-primary-300: #6bbfaf;
--color-primary-400: #3ea894;
--color-primary-500: #1f8a76; /* Main CTA */
--color-primary-600: #177264;
--color-primary-700: #125a50;
--color-primary-800: #0e463e;
--color-primary-900: #0a322d;
```

#### Neutral (Ink / Paper)

```css
--color-neutral-50: #f5f7f8;
--color-neutral-100: #e8eef1;
--color-neutral-200: #d2dde3;
--color-neutral-300: #b3c4ce;
--color-neutral-400: #879eab;
--color-neutral-500: #667f8d;
--color-neutral-600: #4f6571;
--color-neutral-700: #3d505a;
--color-neutral-800: #2a3840;
--color-neutral-900: #152026;
```

#### Semantic

```css
--color-success: #1f7a4c;
--color-warning: #b86e00;
--color-error: #b42318;
--color-info: #1f6b8a;
```

#### Signal mapping (text + icon required)

| Signal        | Text role | Icon (lucide) | Color token       |
| ------------- | --------- | ------------- | ----------------- |
| Likely unique | success   | CircleCheck   | `--color-success` |
| Similar exist | warning   | TriangleAlert | `--color-warning` |
| Exact taken   | error     | Ban           | `--color-error`   |
| Unavailable   | error     | CircleX       | `--color-error`   |

#### Usage Rules

- **Primary:** CTAs, focus rings, text links
- **Neutral:** Text, backgrounds, borders, atmospheric gradients
- **Semantic:** Signals, errors, warnings — always with icon + text

#### Background atmosphere (not flat-only)

- Base: `--color-neutral-50`
- Subtle radial wash: `radial-gradient(1200px 600px at 70% -10%, var(--color-primary-100), transparent 60%)` over neutral-50
- Optional faint paper grain SVG (opacity ≤ 0.04) — no stock photos required for MVP

---

### Typography

#### Font Families

Use expressive, purposeful fonts — **not** Inter / Roboto / Arial / system-only stacks.

```css
--font-display:
  "Fraunces", "Source Serif 4", Georgia, serif; /* brand + hero headline */
--font-sans:
  "Source Sans 3", "IBM Plex Sans", "Segoe UI", sans-serif; /* UI + body */
--font-mono: "IBM Plex Mono", "Consolas", monospace; /* CIN values */
```

Load via `next/font` (Google): Fraunces + Source Sans 3 + IBM Plex Mono.

#### Font Sizes

```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
--text-5xl: 3rem; /* brand on large screens only */
```

#### Font Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Line Heights

```css
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.65;
```

#### Usage Guidelines

- **Brand wordmark:** `--font-display`, ≥ `--text-4xl` on desktop (hero-level signal)
- **Headline:** `--font-display`, one line preferred; must not overpower brand
- **Body / UI:** `--font-sans`, `--text-base`, `--leading-normal`
- **CIN:** `--font-mono`, `--text-sm`

---

### Spacing Scale

```css
--spacing-0: 0;
--spacing-1: 0.25rem;
--spacing-2: 0.5rem;
--spacing-3: 0.75rem;
--spacing-4: 1rem;
--spacing-5: 1.25rem;
--spacing-6: 1.5rem;
--spacing-8: 2rem;
--spacing-10: 2.5rem;
--spacing-12: 3rem;
--spacing-16: 4rem;
```

#### Usage Rules

- Component padding: spacing-4
- Section spacing: spacing-8 to spacing-12
- Form gap: spacing-3 to spacing-4
- Touch gap between controls: ≥ 8px

---

### Border Radius

```css
--radius-none: 0;
--radius-sm: 0.125rem;
--radius-base: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
```

Avoid `--radius-full` pills for primary chrome (exception: tiny status dots only).

---

### Shadows

Keep shallow — utility, not glow.

```css
--shadow-sm: 0 1px 2px 0 rgba(21, 32, 38, 0.06);
--shadow-base:
  0 1px 3px 0 rgba(21, 32, 38, 0.08), 0 1px 2px 0 rgba(21, 32, 38, 0.04);
--shadow-md: 0 4px 8px -2px rgba(21, 32, 38, 0.08);
```

---

## 3. Layout System

### Grid / Container

- **Container:** max-width 42rem for search composition; 64rem for match table
- **Page padding:** spacing-4 mobile; spacing-6+ desktop

### Responsive Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### First Viewport Composition (hard rules)

Contains only:

1. Brand (Common Name)
2. One headline
3. One short supporting sentence
4. One CTA group (input + Check)
5. Atmospheric background

Do **not** place stats, schedules, address blocks, or secondary marketing in first viewport.

### Layout Patterns

#### Centered Search Composition

```jsx
<main className="min-h-[100dvh] bg-neutral-50">
  <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-4 py-12">
    {/* brand, headline, sentence, form */}
  </div>
</main>
```

#### Results Region

- Same page, below form, min-height reserved to reduce CLS
- Not a card grid; signal block + table/list

---

## 4. Component Library

### Button

**Primary**

```jsx
<button
  type="submit"
  className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
>
  Check uniqueness
</button>
```

**Secondary (About / external)**

```jsx
<a className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-neutral-100 px-4 py-2.5 font-medium text-neutral-900 hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:outline-none">
  Verify on MCA (official)
</a>
```

#### Sizes

- Small: min-h-9 px-3 text-sm
- Medium: min-h-11 px-5 text-base (default)
- Large: min-h-12 px-6 text-lg

#### Usage Rules

- One primary CTA per viewport
- Disable + spinner while loading
- Always visible focus ring

---

### Input Fields

```jsx
<div className="space-y-1.5">
  <label
    htmlFor="company-name"
    className="block text-sm font-medium text-neutral-700"
  >
    Proposed company name
  </label>
  <input
    id="company-name"
    name="name"
    type="text"
    autoComplete="organization"
    placeholder="e.g. Zephryn Analytic Works"
    className="focus:ring-primary-500 block min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-transparent focus:ring-2 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-500"
  />
  <p className="text-xs text-neutral-500">
    Leave off “Pvt Ltd” if you want — we normalize legal endings.
  </p>
</div>
```

**Error state:** `border-error` + `aria-invalid="true"` + error text with `id` referenced by `aria-describedby`.

---

### Uniqueness Signal Block

Not a floating badge on media — a clear results region:

```jsx
<div
  role="status"
  aria-live="polite"
  className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
>
  {/* lucide icon with aria-hidden + visible text */}
  <p className="text-lg font-semibold text-neutral-900">
    0 matches — likely unique in snapshot
  </p>
</div>
```

---

### Match List

Prefer table on `md+`; stacked definition list on mobile. Borders for scanability OK — this is an interaction container for reviewing rows.

```jsx
<table className="w-full text-left text-sm">
  <thead className="border-b border-neutral-200 text-neutral-600">
    <tr>
      <th className="py-2 pr-3 font-medium">Registered name</th>
      <th className="py-2 pr-3 font-medium">CIN</th>
      <th className="py-2 pr-3 font-medium">Status</th>
      <th className="py-2 font-medium">Match</th>
    </tr>
  </thead>
  <tbody>{/* rows */}</tbody>
</table>
```

CIN cells: `font-mono text-neutral-800`.

---

### Alerts

```jsx
<div
  className="border-error/30 bg-error/5 text-error rounded-lg border px-4 py-3"
  role="alert"
>
  <p className="font-medium">Company name index unavailable</p>
  <p className="mt-1 text-sm">
    Snapshot not loaded. This is not a uniqueness result.
  </p>
</div>
```

---

### Navigation

- Minimal: Brand (home) + About text link
- No sidebar; no bottom nav app shell

---

## 5. Accessibility Guidelines

### WCAG 2.1 Level AA

- Contrast: normal text ≥ 4.5:1; UI components ≥ 3:1
- Keyboard: all controls focusable; logical tab order
- Focus: visible 2px+ ring; not obscured
- Labels: visible `<label>` — not placeholder-only
- Live regions: results use `aria-live="polite"`; loading `aria-busy`
- Color not only: signal always includes text + icon
- Touch targets: min 44×44px
- Reduced motion: disable non-essential transitions

---

## 6. Animation Guidelines

```css
transition-property: color, background-color, border-color, opacity, transform;
transition-duration: 200ms;
transition-timing-function: ease-in-out;
```

### Rules

- ≤ 300ms
- Transform/opacity only for motion
- `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` scoped sanely in CSS
- Loading: spinner on button — required feedback

Ship **2–3 intentional motions:** (1) results fade-in, (2) button press scale, (3) focus ring / border transition.

---

## 7. Icon System

- **Library:** lucide-react
- **Sizes:** 16 / 20 / 24
- **Stroke:** 2
- Decorative icons: `aria-hidden`
- Icon-only controls: `aria-label` required (MVP prefers icon+text)

---

## 8. State Indicators

### Loading

- Button: spinner + “Checking…”
- Results: skeleton lines (pulse) in reserved area

### Empty matches (success unique)

- Signal + short sentence: “No close names in this snapshot. Still verify on MCA before filing.”

### Empty index (error)

- Error alert — never green unique signal

### Error

- Field-level or `role="alert"` region

---

## 9. Responsive Design

- Mobile-first
- Input and CTA stack full width under `md`
- Side-by-side input+button from `md` if space allows without crushing brand
- No horizontal scroll
- Do not disable zoom

---

## 10. Performance Guidelines

- `next/font` for fonts (no layout shift)
- Reserve results region height
- No heavy hero image required; CSS atmosphere preferred
- Lazy-load About-only assets if any

---

## 11. Browser Support

- Chrome, Firefox, Safari, Edge — last 2 versions
- Progressive enhancement: form works without client JS via progressive enhancement optional; MVP may be client-submit with clear noscript note on About

---

## 12. Tailwind v4 Mapping (Context7-verified)

**Do not** use Tailwind v3 `tailwind.config.ts` `theme.extend` as the primary token source.

### PostCSS (`postcss.config.mjs`)

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### Theme tokens (`app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --font-display: "Fraunces", "Source Serif 4", Georgia, serif;
  --font-sans: "Source Sans 3", "IBM Plex Sans", "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", Consolas, monospace;

  --color-primary-50: #e8f7f4;
  --color-primary-100: #c5ebe3;
  --color-primary-200: #9ad9cc;
  --color-primary-300: #6bbfaf;
  --color-primary-400: #3ea894;
  --color-primary-500: #1f8a76;
  --color-primary-600: #177264;
  --color-primary-700: #125a50;
  --color-primary-800: #0e463e;
  --color-primary-900: #0a322d;

  --color-neutral-50: #f5f7f8;
  --color-neutral-100: #e8eef1;
  --color-neutral-200: #d2dde3;
  --color-neutral-300: #b3c4ce;
  --color-neutral-400: #879eab;
  --color-neutral-500: #667f8d;
  --color-neutral-600: #4f6571;
  --color-neutral-700: #3d505a;
  --color-neutral-800: #2a3840;
  --color-neutral-900: #152026;

  --color-success: #1f7a4c;
  --color-warning: #b86e00;
  --color-error: #b42318;
  --color-info: #1f6b8a;
}
```

Components use utilities (`bg-primary-500`, `text-neutral-900`, `font-display`) — never raw hex in JSX.

**Docs:** Context7 `/websites/tailwindcss` — Next.js + `@tailwindcss/postcss` guide.

---

## 13. References

- ui-ux-pro-max quick reference: accessibility, touch, forms, motion
- [STANDARDS.md](STANDARDS.md) — Context7 + awesome-cursorrules contract
- [TECH_STACK.md](TECH_STACK.md) — pinned versions
- [APP_FLOW.md](APP_FLOW.md) copy bank
- [PRD.md](PRD.md) IA
