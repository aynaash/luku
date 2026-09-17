# @luku/audit

**A deterministic composition linter for rendered UI.** Point it at any URL or HTML
file — React, Next, Svelte, Astro, plain HTML, doesn't matter — and it reports the
layout defects that only exist *after* the page renders.

```bash
npx @luku/audit http://localhost:3000
```

```
  localhost:3000/  @390px
  scale inferred from page: 12 16 20 24 32 64 · base unit 4px

  overflow
    ✗ Extends 1034px past the 390px viewport, forcing horizontal scroll.
      → Give it a max-width, let it wrap, or clip the overflow on an ancestor.
      main > section:nth-of-type(3) > div > div
  contrast
    ✗ Contrast 2.38:1 — AA needs 4.5:1 at 14px/400. "No credit card required."
      → Raise the text colour or put an opaque layer between it and its backdrop.
      main > section:nth-of-type(1) > div > p:nth-of-type(2)
  heading-attachment
    ! 32px below the heading but only 8px above it — it binds to the section it
      just ended.
      main > section:nth-of-type(3) > div > h3

  13 error · 5 warning · 5 info   1 page × 390, 1280px
```

Exit code is `1` when anything at or above `--fail-on` is found. That is the whole
integration surface: CI, a pre-commit hook, or an agent loop.

---

## Why this exists

Every other tool checks an element **in isolation**. ESLint reads source. axe checks
one node's semantics. Lighthouse measures the document.

These rules check **relationships** — defects that exist in no single element and
only appear once the browser has done layout:

- padding measured against the *sibling* gap
- two filled buttons inside one *decision*
- contrast against the *composited ancestor chain*, not the declared background
- line length in *rendered* characters, after the webfont loaded
- one-off values counted across the *whole page*

None of that is visible in source, which is why it runs against the DOM.

It matters most for generated UI. A model produces markup that is locally
plausible and globally incoherent, and has no feedback signal for the difference —
screenshots miss 4px, and "looks good" isn't a gradient. This gives it a number.

---

## Install

```bash
npm i -D @luku/audit playwright-core
```

`playwright-core` ships no browser; it drives the Chrome already on the machine.
Already have `playwright`? That works too. Set `LUKU_CHROME=/path/to/chrome` to
pin a specific binary.

## Use

```bash
luku-audit http://localhost:3000                    # dev server
luku-audit ./dist/index.html                        # a built file
luku-audit http://localhost:3000 --crawl 2          # follow same-origin links
luku-audit http://localhost:3000 --json > report.json
luku-audit http://localhost:3000 --fail-on warning  # stricter gate
```

| Option | |
| --- | --- |
| `--widths <list>` | viewport widths, comma separated (default `390,1280`) |
| `--height <px>` | viewport height (default `900`) |
| `--crawl <depth>` | follow same-origin links this deep (default `0`) |
| `--max-pages <n>` | cap on pages visited (default `20`) |
| `--rules <list>` | run only these rules |
| `--ignore <selector>` | skip a subtree; repeatable |
| `--scale <list>` | assert a spacing scale in px instead of inferring it |
| `--base-unit <px>` | assert a grid instead of inferring it |
| `--wait-for <sel>` | wait for this selector before auditing |
| `--settle <ms>` | DOM must be quiet this long first (default `700`) |
| `--no-scroll` | skip the pre-scroll that triggers lazy content |
| `--visual <file>` | annotated screenshots as a self-contained HTML report |
| `--experimental` | also run the four rules whose precision is still being tuned |
| `--fail-on <level>` | `error` · `warning` · `info` · `never` (default `error`) |
| `--json` / `--out <file>` | machine-readable report |
| `--list-rules` | print the registry and exit |

Mark a subtree `data-luku-ignore` to exclude it permanently.

## Use it from an agent (MCP)

The reason this exists. Register the server:

```json
{
  "mcpServers": {
    "luku-audit": { "command": "npx", "args": ["-y", "@luku/audit", "luku-audit-mcp"] }
  }
}
```

Three tools:

- **`audit_page`** — render and report. Returns findings plus a snapshot id.
- **`compare_audits`** — diff two snapshots: what was fixed, what is new, what remains,
  and a verdict of `improved` / `regressed` / `traded` / `unchanged`.
- **`list_rules`** — the registry with the reasoning behind each rule.

That closes the loop. The model writes UI, audits it, edits, audits again, and
`compare_audits` tells it whether the edit helped or just moved the problem:

```
a1 → a2   verdict: improved
  before: 7E 10W 4I
  after:  0E 0W 5I

fixed (19): overflow ×1, clipped-text ×1, contrast ×2, focus-visible ×2, …
new (3): spacing-scale ×2, balance ×1
remaining (2): type-scale ×2
```

Output is tuned for context, not for looks: findings group by rule, a hint is printed
once per rule when it's identical across findings, and `info` collapses to counts
unless you pass `detail: "full"`. Selectors are never abbreviated — they're the
actionable part.

The server speaks MCP over stdio with **no runtime dependencies**; the JSON-RPC
transport is about 150 lines.

## Rules

| Rule | Severity | Catches |
| --- | --- | --- |
| `overflow` | error | Anything extending past the viewport — the bug the author's own wide screen hides |
| `clipped-text` | error/info | Text cut off by a fixed height or hidden overflow, with no ellipsis to signal it |
| `contrast` | error/warn | Text below WCAG AA against its *composited* background |
| `focus-visible` | error/warn | `outline: none` with no replacement — read from the CSSOM, not from computed style |
| `heading-order` | error | Skipped levels, duplicate or missing h1, empty headings |
| `measure` | warn/info | Line length outside 45–80ch; headlines past 50ch |
| `heading-attachment` | warn/info | More space below a heading than above it, so it binds to the wrong section |
| `competing-emphasis` | warn | Two filled actions in one decision |
| `type-scale` | info | Type steps under 10% apart — a level the reader cannot see |
| `density` | warn/info | Regions past ~72% covered by content |
| `balance` | info | Visual weight tipping to one side |
| `repetition` | info | Proliferation of one-off radii, shadows, type sizes, typefaces |

Four more are **off by default** — `spacing-scale`, `proximity`, `alignment` and
`tap-target`. Measured against production sites they produced 74% of all findings
while the ten above stayed quiet, and a rule that fires a hundred times on a
well-built page teaches its user to mute the tool. Enable with `--experimental`, or
name one directly with `--rules`.

Nothing here requires you to adopt a component library, a class convention, or an
annotation. Every rule derives what it needs from the DOM and the CSSOM.

### Measured against real sites

Findings at 390px and 1280px, default rules:

| | all 16 rules | shipped 12 (default) |
| --- | --- | --- |
| tailwindcss.com | 216 | **50** |
| vercel.com | 111 | **16** |
| news.ycombinator.com | 66 | **14** |

Those three are the calibration corpus: sites built by people who know what they are
doing should be quiet, and a rule that is loud on them is wrong about something.

### Modern colour spaces

`contrast` parses `lab()`, `oklab()`, `oklch()`, `lch()`, `hsl()`, `color(srgb …)` and
`color(display-p3 …)` in addition to `rgb()` and hex, converting each to sRGB with the
CSS Color 4 maths — including the D50 white point and Bradford adaptation that `lab()`
is defined against.

This is not a nicety. Measured on tailwindcss.com, 2,644 computed colours serialise as
`rgb()` and **2,335 as `lab()`** — Tailwind v4 ships an OKLCH palette and Chrome
serialises it into CIE spaces. A parser that handles only `rgb()` returns null for
nearly half the page, the background walk falls through to its white default, and
white-on-dark text gets reported at exactly 1.00:1. Before the fix, 8 of 11 contrast
findings on that site were impossible readings; after it, 0 of 24.

### Reading the CSSOM

`focus-visible` is the clearest case for why the CSSOM matters. The resting
`outline-style` of nearly every element is `none` — the browser's focus ring lives in
the UA stylesheet's own `:focus-visible` rule and never appears in computed style. Check
it that way and you report every button on every page.

So the rule walks `document.styleSheets` and asks a narrower, answerable question: did
the author suppress the ring, and if so did they replace it? It resolves CSS Nesting
(`&:focus` inside `.btn` → `.btn:focus`), descends `@media` / `@supports` / `@layer`,
and counts cross-origin sheets it couldn't read so a finding can admit the doubt
rather than assert an absence.

One trap worth knowing if you extend this: **CSS Nesting gave `CSSStyleRule` its own
`cssRules` property.** The obvious traversal — `if (rule.cssRules) { recurse; continue }`
— therefore treats every style rule as a grouping rule and silently skips its
declarations, and the whole thing quietly finds nothing.

### The scale is read off your page

`spacing-scale` does not ship an opinion about what your spacing should be. It reads
every spacing value the page actually paints, treats the ones used by three or more
elements as your system, and reports the rest as strays. A value is counted once per
element, so a single `padding: 13px` can't vote itself into the scale it's violating.

That makes *"20px twice on a page built from 8/16/24/32"* a finding, and
*"everything is a multiple of 5"* a non-finding. Pass `--scale` to override.

## Waiting for the page to exist

`load` fires long before a client-rendered app has content, so auditing at that
moment races the data fetch. Measured against a live Next.js site, an entire
article list appeared in one run and was absent in the next — taking five real
findings with it, and reading as clean.

So before auditing, the driver scrolls the page (to trigger lazy images and
IntersectionObserver reveals), waits for in-flight images, then waits for the DOM
to stop mutating for `--settle` milliseconds. It settles once after navigation and
again per width, because a responsive layout can mount different components at
390px than at 1280px and those have their own data to fetch.

Not `networkidle`: that waits for all network activity to stop, so analytics
beacons and open websockets hang it until the timeout on a large share of real
sites. DOM quiescence asks the question that actually matters — has the rendered
result stopped changing?

Use `--wait-for <selector>` when you know what marks the content ready; it is
strictly more reliable than any timing heuristic.

## Determinism

Same render, same viewport, same bytes out — verified by running twice and diffing.
That is a hard requirement, not a nice property: an agent loop can only tell "I fixed
it" from "it moved" if the report is stable.

- No clocks, no randomness, no unordered iteration
- Total ordering on output: severity → rule → document position → message
- Stable finding ids (`rule + selector + message`), so reports diff across runs
- Waits on `document.fonts.ready` before measuring — glyph advance changes every measure
- Viewport is pinned; no dependence on scroll position or host DPI
- A rule that throws is reported in `ruleErrors`, never silently dropped

## JSON

Flat and stably ordered, for something that will act on it rather than read it:

```json
{
  "tool": "@luku/audit",
  "summary": { "pages": 1, "widths": [390, 1280], "error": 4, "warning": 8, "info": 4 },
  "pages": [{ "url": "…", "width": 390, "scale": [12,16,20,24,32,64], "baseUnit": 4, "scaleInferred": true }],
  "findings": [
    {
      "id": "1hpb5wd",
      "rule": "proximity",
      "severity": "warning",
      "message": "Inner gap 20px is larger than the 16px separating this group from its siblings.",
      "hint": "Tighten this group or loosen its parent…",
      "selector": "main > section:nth-of-type(2) > div > div > article:nth-of-type(2)",
      "meta": { "inner": 20, "outer": 16 },
      "url": "http://localhost:3000/",
      "width": 390
    }
  ],
  "ruleErrors": []
}
```

`meta` carries the measurements as numbers, so nothing has to parse `message`.

## Driving your own browser

The engine is a dependency-free module. If you already have a page open — Playwright,
Puppeteer, a devtools overlay, a browser extension — skip the CLI:

```js
import { audit } from '@luku/audit'          // ESM
// or inject dist/core.global.js and call globalThis.__LUKU_AUDIT__.audit()

const result = audit(document.body, { maxPerRule: 10 })
```

It needs real layout. jsdom and happy-dom have no layout engine —
`getBoundingClientRect` returns zeros there, which would turn every geometric rule
into a silent no-op.

## Try it

```bash
npm run build
node dist/cli.js fixtures/messy.html    # 13 error · 5 warning · 5 info  → exit 1
node dist/cli.js fixtures/fixed.html    #  0 error · 0 warning · 5 info  → exit 0
```

`messy.html` is deliberately representative: every value in it is reasonable on its
own. `fixed.html` is the identical content with each reported finding acted on.

## License

MIT
