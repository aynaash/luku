# luku

**Drip for your React sites.** _Luku_ is Sheng for drip — the way something is put together, not the pieces it's made of.

Not a UI component library. There is no Button here, no Dialog, no Select.

This is the layer _above_ those: the decisions about how far apart things sit, how
wide text is allowed to be, which element the eye lands on first, and how many
actions may claim to be the most important one. Those decisions are usually made
ad hoc, in a hundred `className` strings, and they drift. Here they're components.

The guiding rule: **a primitive should guide hierarchy, not just render HTML.**
If a component only wraps a div in some classes, it doesn't belong here.

```tsx
<Section>
  <SectionHeader eyebrow="What you get" title="A workshop for hard reading." />

  <Grid min="17rem" gap="lg">
    {features.map((f) => (
      <Card key={f.title}>
        <CardTitle>{f.title}</CardTitle>
        <CardBody>{f.desc}</CardBody>
      </Card>
    ))}
  </Grid>
</Section>
```

No heading levels chosen by hand. No pixel gaps. No `max-w-` guesswork.

---

## Install

```bash
npm install luku      # or: bun add luku · pnpm add luku · yarn add luku
```

Peer dependency: React 18 or 19. Tailwind CSS is required — luku emits Tailwind
utility classes.

### 1. Let Tailwind see the package

Tailwind scans source text, and it skips `node_modules` by default. Point it at
luku's dist or none of the classes will be generated.

**Tailwind v4** — in your CSS entry:

```css
@import 'tailwindcss';
@source "../node_modules/luku/dist";
```

**Tailwind v3** — in `tailwind.config.js`:

```js
content: ['./app/**/*.{ts,tsx}', './node_modules/luku/dist/**/*.js']
```

### 2. Provide the six theme variables

luku references exactly six CSS custom properties and nothing else:

| Variable | Meaning |
| --- | --- |
| `--background` | Page surface |
| `--text-primary` | Body and heading text |
| `--text-secondary` | Muted / supporting text |
| `--accent` | The one colour that means "act on this" |
| `--accent-glow` | A translucent cast of the accent, for glows |
| `--ring` | Focus ring |

Either declare them yourself, or import the defaults (light, with a dark
`prefers-color-scheme` variant and `[data-theme]` overrides):

```css
@import 'luku/theme.css';
```

### 3. Use it

```tsx
import { Page, Section, Stack, Heading, Text, CTA, CTAGroup } from 'luku'
```

Subpath imports work too, if you'd rather be explicit:
`luku/layout`, `luku/spacing`, `luku/typography`, `luku/composition`,
`luku/patterns`, `luku/tokens`, `luku/utils`, `luku/hooks`, `luku/devtools`.

The package is **ESM-only**, published as one JavaScript file per source module
(no bundle), so tree-shaking works and `'use client'` directives survive intact.

---

## Layers

Each layer depends only on the ones above it. No cycles, no upward imports.

| Layer | What lives there | Server-safe |
| --- | --- | --- |
| `tokens/` | Numbers and class maps — the single source of spatial truth | ✅ |
| `utils/` | Pure functions: ratio maths, WCAG contrast, rhythm checks | ✅ |
| `spacing/` | `Stack` `Inline` `Cluster` `Inset` `Spacer` `Bleed` | ✅ |
| `layout/` | `Page` `Container` `Section` `Grid` `Split` `Sidebar` `Center` `Frame` | mostly |
| `typography/` | `Heading` `Text` `Eyebrow` `Prose` `Quote` | mostly |
| `composition/` | `Hierarchy` `Anchor` `Thirds` `Triangle` `F/ZPattern` `Balance` | ❌ |
| `patterns/` | `Hero` `Card` `CTA` `Editorial` `Magazine` `Dashboard` `EmptyState` `Disclosure` | ❌ |
| `hooks/` | Container size, breakpoints, measure verification | ❌ |
| `devtools/` | `<DesignInspector />` — eleven audits plus a live critique checklist | ❌ |

**Server vs client.** Pure layout carries no `'use client'` directive and renders
on the server. Anything reading context — `Section`, `Heading`, `CTA`, `Card`,
`Hero` — is a client component, because heading level and action emphasis are
_inherited state_. That is the price of the enforcement, and it is worth paying:
the alternative is every author hand-picking `<h4>` because it looked right.

**Dependencies.** `react`, `clsx`, `tailwind-merge`. That's the whole list.

---

## The three ideas that make it work

### 1. Heading level comes from the layout tree

`<Section>` opens a `<HierarchyLevel>`. `<Heading>` reads it. Nest a section and
the headings inside step down — tag _and_ type scale, together.

```tsx
<Section>                              {/* level 2 */}
  <Heading>Read anything</Heading>      {/* <h2>, `title` role  */}
  <Card>                               {/* cards subdivide too */}
    <CardTitle>PDFs</CardTitle>         {/* <h3>, `subheading`  */}
  </Card>
</Section>
```

The visual role and the outline level are decoupled, so you can make a heading
_look_ small without corrupting the document structure:

```tsx
<Heading role="display">…</Heading>   {/* still an <h2> where it sits */}
```

### 2. Spacing is semantic, not numeric

`gap="lg"` says _"these are separate groups."_ `gap-8` says _"32 pixels."_
Intent survives redesigns; measurements don't. The scale is non-linear because
perception of space is non-linear (Refactoring UI), and every step is a multiple
of 4 because that's what makes unrelated blocks look like one system (Swiss).

```
none 3xs 2xs   xs sm md    lg xl      2xl 3xl 4xl 5xl
└─ inside one element ─┘  └─ groups ─┘  └─ page sections ─┘
```

One mechanism only: `gap` on the parent, never margins on children. Margins
belong to the child, so a child's spacing depends on who its siblings are — plus
margin collapse. `gap` puts the grouping decision where it actually lives.

### 3. Emphasis is scoped and counted

`<CTAGroup>` opens an emphasis scope. A second `emphasis="primary"` inside it is
a development-time warning and a visible dashed outline, not a design-review
comment nobody files.

```tsx
<CTAGroup label="hero">
  <CTA href="/sign-up" emphasis="primary">Start reading</CTA>
  <CTA href="#how" emphasis="secondary">How it works</CTA>
</CTAGroup>
```

---

## `<DesignInspector />`

Mount once in the root layout. Returns `null` unless
`process.env.NODE_ENV === 'development'`, so bundlers drop the whole subtree from
production builds.

```tsx
// app/layout.tsx
import { DesignInspector } from 'luku/devtools'

<body>
  {children}
  <DesignInspector position="bottom-left" />
</body>
```

`⌥⇧D` toggles the panel · `⌥⇧G` toggles the 4px baseline + 65ch measure guides.

Two tabs: **Findings** (individual defects) and **Critique** (see below).

| Rule | Severity | Catches |
| --- | --- | --- |
| `heading-hierarchy` | error | Skipped levels, duplicate or missing `<h1>` |
| `multiple-primary` | error | Two primary actions in one group or one screen |
| `contrast` | error/warn | Text below WCAG AA against its _composited_ background |
| `reading-width` | warn | A declared measure that isn't actually binding |
| `line-length` | warn | Any text block past ~80 characters per line |
| `proximity` | warn/info | Space inside a group ≥ space around it (Gestalt inversion) |
| `missing-anchor` | info | A region with no focal point — or with two |
| `inconsistent-spacing` | warn/info | Gaps and margins off the rhythm scale |
| `grid-alignment` | info | Padding off the 4px base grid |
| `layout-balance` | info | Visual weight tipping to one side of the optical axis |
| `repetition` | info | Proliferation of one-off radii, shadows, type sizes, typefaces |

Rules run against the **rendered DOM**, not the source. That's the point: it
catches defects that only exist after composition — a measure that's fine alone
and too wide inside a wide container, contrast that's fine until a translucent
card lands on a lighter section.

Rules are pure functions in `devtools/rules.ts`. Adding one is a `Rule` object and
a line in the registry. Where a rule can't be certain it reports `info` rather
than `error` — a linter people ignore is worse than no linter.

**It is not an accessibility audit.** It checks eleven specific things and knows
nothing about focus order, keyboard traps, or whether the copy makes sense.

### The Critique tab

The ten questions of a design critique, answered against the live page with
evidence instead of opinion. Most have a measurable proxy: _"is spacing
consistent?"_ is a count of off-scale values, _"is there enough whitespace?"_ is
an occupancy ratio (each section rasterised into 24px cells, content-covered
cells counted), _"does it work on mobile?"_ is, most often, whether anything
overflows horizontally.

Items with no honest proxy report **unknown** and say what you'd need to look at
yourself. A checklist that guesses is worse than one that abstains — a green tick
you didn't earn is a tick that stops you looking.

Muting a rule hides its rows in Findings but never turns a critique item green;
the checklist always reads the unmuted findings.

---

## Choosing a primitive

| You want | Use | Not |
| --- | --- | --- |
| Vertical rhythm | `Stack` | margins on children |
| A row that wraps | `Inline` | `flex gap-x-*` |
| A set of chips, tags or badges | `Cluster` | `Inline` |
| The root of a route | `Page` | `Container` |
| Padding inside a surface | `Inset` | `p-*` by hand |
| Equal columns that reflow | `Grid min="18rem"` | breakpoint column chains |
| Two columns with a _proportion_ | `Split ratio="golden"` | `Grid` |
| Two columns with different _weight_ | `Balance` | `Split` |
| A persistent nav rail | `Sidebar` | `Split` |
| Long-form body copy | `Prose` or `Editorial` | `Stack` + `Text` per paragraph |
| Composed page copy you control | `Stack` + `Text` | `Prose` |
| Three peers, closed eye path | `Triangle` | `Grid columns={3}` |
| One dominant item in a set | `Magazine` | `Grid` |
| Scannable dense copy | `FPattern` | `ZPattern` |
| Sparse promo with one decision | `ZPattern` | `FPattern` |

---

## Container sizes

Width is a **content** decision, not a viewport decision. A paragraph wants ~65
characters per line whether the display is 13" or 34".

| Size | Width | For |
| --- | --- | --- |
| `reading` | 65ch | Sustained body reading |
| `prose` | 75ch | Long-form with generous type |
| `narrow` | 42rem | Editorial column, forms, empty states |
| `content` | 64rem | Cards, feature grids |
| `wide` | 80rem | Dashboards, 3–4 up grids |
| `full` | none | Imagery and colour fields — **never text** |

Headings measure on their own scale (`tight` `snug` `normal` `wide`, 14–38ch).
A body cap is inert at display sizes: 65ch of 96px type is ~3000px, so it never
binds and the headline runs the full container.

---

## Conventions

**`data-design-*` attributes** are the contract between components and the
inspector. They are namespaced by owner — `data-design-size` means a Container
width, `data-design-text-size` a type role. Two components must never share an
attribute name with different meanings, or the audit rules miscount.

**Responsive props** take `"md"` or `{ base: 'sm', lg: 'xl' }`. Every emitted
class is written out literally in `spacing/responsive.ts`, because Tailwind scans
source text and cannot see an interpolated class name. Adding a breakpoint
variant means adding it to that map — the dev build warns when one is missing
rather than silently dropping the style.

**`className` always wins.** Every primitive merges through `twMerge`, so a
caller's `max-w-3xl` beats the token's `max-w-5xl` instead of losing to source
order.

**Polymorphism via `as`.** Layout and semantics are orthogonal: `<Stack>` is a
rhythm decision, whether it's a `<ul>` is an accessibility decision. Coupling them
would force authors to abandon the primitive the moment they need a list.

---

## License

MIT © [aynaash](https://github.com/aynaash)
