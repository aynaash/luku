/**
 * @module core/rules/layout
 *
 * Rules about the page as a whole: does it fit, does it tip, does it hold
 * together, and can it be operated by a thumb.
 */
import { ACTION_SELECTOR, isLayoutRelevant, ownText, round } from '../dom.js'
import type { RawFinding, Rule } from '../types.js'

/* ──────────────────────────────── overflow ───────────────────────────────── */

/**
 * The single highest-value check for generated UI. A fixed width, a `100vw`
 * that forgot the scrollbar, or an unwrapped flex row produces a page that
 * scrolls sideways — and it is invisible on the desktop the author is looking at.
 */
export const overflow: Rule = {
  id: 'overflow',
  title: 'Horizontal overflow',
  rationale:
    'A page that scrolls sideways is broken on every phone, and the author almost ' +
    'never sees it because their own viewport is wide enough to hide the cause.',
  run(ctx) {
    const doc = document.documentElement
    const limit = doc.clientWidth
    const excess = doc.scrollWidth - limit
    if (excess <= 1) return []

    const out: RawFinding[] = []
    const over: Element[] = []

    for (const el of ctx.elements('*')) {
      const style = ctx.style(el)
      if (style.position === 'fixed') continue
      const rect = ctx.rect(el)
      if (rect.width <= 0) continue
      if (rect.right <= limit + 1) continue
      over.push(el)
    }

    // Report only the outermost offenders. A wide child inside a wide parent is
    // one bug, and naming forty descendants of it is how a linter gets muted.
    const culprits = over.filter((el) => {
      const parent = el.parentElement
      if (!parent || parent === ctx.root) return true
      return ctx.rect(parent).right <= limit + 1
    })

    for (const el of (culprits.length > 0 ? culprits : over).slice(0, 5)) {
      const rect = ctx.rect(el)
      out.push({
        rule: 'overflow',
        severity: 'error',
        message: `Extends ${round(rect.right - limit)}px past the ${limit}px viewport, forcing horizontal scroll.`,
        hint: 'Give it a max-width, let it wrap, or clip the overflow on an ancestor. Watch for fixed pixel widths and 100vw, which includes the scrollbar.',
        element: el,
        meta: {
          viewport: limit,
          right: round(rect.right),
          excess: round(rect.right - limit),
          documentExcess: round(excess),
        },
      })
    }

    return out
  },
}

/* ───────────────────────────────── balance ───────────────────────────────── */

/**
 * Descends through single-child wrappers until it finds a node with real
 * siblings. Counting a wrapper *and* its children — the obvious implementation
 * — double-counts every pixel and makes the skew figure meaningless.
 */
function layoutChildren(el: Element, ctx: Parameters<Rule['run']>[0]): Element[] {
  let node: Element = el
  for (let depth = 0; depth < 6; depth++) {
    const kids: Element[] = []
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      if (isLayoutRelevant(child, ctx.style(child))) kids.push(child)
    }
    if (kids.length >= 2) return kids
    if (kids.length === 1) {
      node = kids[0]
      continue
    }
    return []
  }
  return []
}

export const balance: Rule = {
  id: 'balance',
  title: 'Layout balance',
  rationale:
    'Visual weight either side of the centre line should be comparable unless the ' +
    'asymmetry is deliberate. A layout that tips registers as unease before a ' +
    'viewer can name the cause.',
  run(ctx) {
    const out: RawFinding[] = []
    const regions = ctx.elements('section,article,header,footer,main')

    for (const region of regions) {
      const bounds = ctx.rect(region)
      if (bounds.height < 320 || bounds.width < 640) continue

      const children = layoutChildren(region, ctx)
      if (children.length < 2) continue

      const axis = bounds.left + bounds.width / 2
      let left = 0
      let right = 0

      for (const child of children) {
        const rect = ctx.rect(child)
        if (rect.width <= 0 || rect.height <= 0) continue

        // Weight ≈ area × ink density. A text-bearing node weighs more per
        // pixel than an empty container, which is what lets a small dense block
        // balance a large airy one.
        const area = rect.width * rect.height
        const density = (child.textContent ?? '').trim().length > 0 ? 1 : 0.25
        const weight = area * density

        const overlapLeft = Math.max(0, Math.min(rect.right, axis) - rect.left)
        const share = overlapLeft / rect.width

        left += weight * share
        right += weight * (1 - share)
      }

      const total = left + right
      if (total === 0) continue

      const skew = Math.abs(left - right) / total
      if (skew > 0.55) {
        out.push({
          rule: 'balance',
          severity: 'info',
          message: `Weight sits ${Math.round(skew * 100)}% to the ${left > right ? 'left' : 'right'} of centre.`,
          hint: 'Counterweight the light side, or make the asymmetry deliberate — a dense small block can balance a large airy one.',
          element: region,
          meta: { skew: Number(skew.toFixed(2)), side: left > right ? 'left' : 'right' },
        })
      }
    }

    return out
  },
}

/* ──────────────────────────────── repetition ─────────────────────────────── */

const LIMITS = { radius: 6, shadow: 5, fontSize: 12, fontFamily: 3 } as const

export const repetition: Rule = {
  id: 'repetition',
  title: 'One-off values',
  rationale:
    'Reusing the same radii, shadows and type sizes is what makes a page feel like ' +
    'one product. Each new one-off is invisible alone and collectively reads as ' +
    'carelessness — and generated code produces them faster than anything else.',
  run(ctx) {
    const radii = new Map<string, Element>()
    const shadows = new Map<string, Element>()
    const fontSizes = new Map<string, Element>()
    const families = new Map<string, Element>()

    for (const el of ctx.elements('*')) {
      const style = ctx.style(el)

      const radius = style.borderRadius
      if (radius && radius !== '0px' && !radii.has(radius)) radii.set(radius, el)

      const shadow = style.boxShadow
      if (shadow && shadow !== 'none' && !shadows.has(shadow)) shadows.set(shadow, el)

      if (ownText(el).length > 0) {
        const size = style.fontSize
        if (size && !fontSizes.has(size)) fontSizes.set(size, el)

        // Normalise to the first family in the stack; the fallbacks are noise.
        const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
        if (family && !families.has(family)) families.set(family, el)
      }
    }

    const checks: Array<[keyof typeof LIMITS, Map<string, Element>, string, string]> = [
      ['radius', radii, 'corner radii', 'Collapse these onto three or four steps.'],
      ['shadow', shadows, 'box shadows', 'Depth should mean importance, not decoration — one elevation scale.'],
      ['fontSize', fontSizes, 'font sizes', 'A closed type scale removes the temptation to split the difference between two steps.'],
      ['fontFamily', families, 'typefaces', 'Two families plus a mono is the working maximum.'],
    ]

    const out: RawFinding[] = []
    for (const [key, map, noun, hint] of checks) {
      const limit = LIMITS[key]
      if (map.size <= limit) continue

      const values = [...map.keys()]
      const sample = [...map.values()][limit]
      out.push({
        rule: 'repetition',
        severity: 'info',
        message: `${map.size} distinct ${noun} on this page (a system uses about ${limit}).`,
        hint: `${hint} Found: ${values.slice(0, 6).join(' · ')}${map.size > 6 ? ' …' : ''}`,
        element: sample,
        meta: { kind: key, count: map.size, limit },
      })
    }

    return out
  },
}

/* ─────────────────────────────── tap-target ──────────────────────────────── */

export const tapTarget: Rule = {
  id: 'tap-target',
  title: 'Tap target size',
  experimental: true,
  rationale:
    'WCAG 2.2 requires interactive targets of at least 24×24 CSS px; 44×44 is the ' +
    'size a thumb actually hits reliably. Generated buttons routinely come in under ' +
    'both because padding was chosen to look right on a desktop mock.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const el of ctx.elements(ACTION_SELECTOR)) {
      const style = ctx.style(el)
      // Inline links inside running text are explicitly exempt from SC 2.5.8.
      if (style.display.startsWith('inline') && el.closest('p,li,blockquote,td')) continue

      const rect = ctx.rect(el)
      if (rect.width <= 0 || rect.height <= 0) continue

      const smallest = Math.min(rect.width, rect.height)
      if (smallest >= 44) continue

      out.push({
        rule: 'tap-target',
        severity: smallest < 24 ? 'error' : 'info',
        message: `Target is ${Math.round(rect.width)}×${Math.round(rect.height)}px — ${
          smallest < 24 ? 'below the 24px WCAG 2.2 minimum' : 'under the 44px comfortable size'
        }.`,
        hint: 'Add padding rather than growing the label, so the hit area grows without the type changing.',
        element: el,
        meta: { width: Math.round(rect.width), height: Math.round(rect.height), smallest: Math.round(smallest) },
      })
    }

    return out
  },
}

/* ───────────────────────────────── density ───────────────────────────────── */

/** Rasterisation cell, in px. Fine enough to see gutters, coarse enough to be cheap. */
const CELL = 24
/** Above this share of a region covered by content, it reads as crowded. */
const CROWDED = 0.72

export const density: Rule = {
  id: 'density',
  title: 'Crowding',
  rationale:
    'Whitespace is what gives the parts with something in them their weight. This ' +
    'rasterises each region and reports the share actually covered by content, ' +
    'because "does it feel cramped" is otherwise pure assertion.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const region of ctx.elements('section,article,main,header,footer')) {
      const bounds = ctx.rect(region)
      if (bounds.height < 240 || bounds.width < 320) continue

      const cols = Math.max(1, Math.ceil(bounds.width / CELL))
      const rows = Math.max(1, Math.ceil(bounds.height / CELL))
      const filled = new Set<number>()

      // Leaves only. Counting containers would mark every cell and report that
      // no page anywhere has any whitespace.
      for (const el of ctx.elements('*')) {
        if (!region.contains(el) || el === region) continue
        if (el.querySelector('*')) continue
        const style = ctx.style(el)
        if (style.position === 'fixed') continue
        const isContent =
          (el.textContent ?? '').trim().length > 0 || el.tagName === 'IMG' || el.tagName === 'SVG'
        if (!isContent) continue

        const r = ctx.rect(el)
        if (r.width <= 0 || r.height <= 0) continue

        const c0 = Math.max(0, Math.floor((r.left - bounds.left) / CELL))
        const c1 = Math.min(cols - 1, Math.floor((r.right - bounds.left) / CELL))
        const r0 = Math.max(0, Math.floor((r.top - bounds.top) / CELL))
        const r1 = Math.min(rows - 1, Math.floor((r.bottom - bounds.top) / CELL))
        for (let y = r0; y <= r1; y++) {
          for (let x = c0; x <= c1; x++) filled.add(y * cols + x)
        }
      }

      const occupancy = filled.size / (cols * rows)
      if (occupancy <= CROWDED) continue

      out.push({
        rule: 'density',
        severity: occupancy > 0.85 ? 'warning' : 'info',
        message: `${Math.round(occupancy * 100)}% of this region is covered by content (crowding starts around ${Math.round(CROWDED * 100)}%).`,
        hint: 'Open up the rhythm between groups, or move something out of this region. Space is what makes the rest of it readable.',
        element: region,
        meta: { occupancy: Number(occupancy.toFixed(2)), threshold: CROWDED },
      })
    }

    return out
  },
}
