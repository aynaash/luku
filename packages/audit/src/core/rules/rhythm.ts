/**
 * @module core/rules/rhythm
 *
 * Rules about distance. Both are relational: a spacing value is only a stray
 * relative to the rest of the page, and a gap is only wrong relative to the gap
 * around it.
 */
import { ACTION_SELECTOR, hasSurface, isLayoutRelevant, largestGap, round, snippet } from '../dom.js'
import { nearestStep, onScale } from '../scale.js'
import type { AuditContext, RawFinding, Rule } from '../types.js'

/** Direct children that occupy a box in normal flow. */
function flowChildren(el: Element, ctx: AuditContext): Element[] {
  const out: Element[] = []
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i]
    if (!isLayoutRelevant(child, ctx.style(child))) continue
    const rect = ctx.rect(child)
    if (rect.width <= 0 || rect.height <= 0) continue
    out.push(child)
  }
  return out
}

/* ─────────────────────────────── spacing-scale ───────────────────────────── */

const TRACKED: Array<[string, keyof CSSStyleDeclaration]> = [
  ['row-gap', 'rowGap'],
  ['column-gap', 'columnGap'],
  ['padding-top', 'paddingTop'],
  ['padding-bottom', 'paddingBottom'],
  ['padding-left', 'paddingLeft'],
  ['padding-right', 'paddingRight'],
  ['margin-top', 'marginTop'],
  ['margin-bottom', 'marginBottom'],
]

export const spacingScale: Rule = {
  id: 'spacing-scale',
  title: 'Off-system spacing',
  experimental: true,
  rationale:
    'A page reads as one system when every distance comes from one set of steps. ' +
    'The scale here is read off the page itself, so a finding means "this value ' +
    'disagrees with the rest of your own page", not "this value disagrees with me".',
  run(ctx) {
    // Without enough samples the inferred scale is noise; say nothing.
    if (ctx.scale.length < 3) return []

    const out: RawFinding[] = []

    for (const el of ctx.elements('*')) {
      const style = ctx.style(el)

      for (const [name, prop] of TRACKED) {
        const px = parseFloat(String(style[prop] ?? ''))
        if (!Number.isFinite(px) || px <= 0 || px > 400) continue
        if (onScale(px, ctx.scale)) continue

        const near = nearestStep(px, ctx.scale)
        const onGrid = ctx.baseUnit > 0 && Math.abs(px % ctx.baseUnit) < 0.01

        out.push({
          rule: 'spacing-scale',
          severity: onGrid ? 'info' : 'warning',
          message: `${name} of ${round(px)}px is not a step this page uses elsewhere.`,
          hint: `Nearest step in use is ${near}px.${onGrid ? '' : ` It is also off the ${ctx.baseUnit}px grid the rest of the page sits on.`}`,
          element: el,
          meta: { property: name, actual: round(px), nearest: near, baseUnit: ctx.baseUnit },
        })
        // One finding per element: a wrapper with four odd paddings is one bug.
        break
      }
    }

    return out
  },
}

/* ──────────────────────────────── proximity ──────────────────────────────── */

export const proximity: Rule = {
  id: 'proximity',
  title: 'Proximity inversion',
  experimental: true,
  rationale:
    'Things close together read as one group. When the space inside a group is as ' +
    'large as the space around it, the grouping inverts and the eye reads the wrong ' +
    'sets — no matter how consistent each individual value is. Nearly nobody catches ' +
    'this by eye, because every value involved looks reasonable on its own.',
  run(ctx) {
    const out: RawFinding[] = []
    const flagged = new Set<Element>()

    // A. A container whose own gap is larger than the gap separating it from
    //    its siblings. The children then sit as far apart as the groups do.
    for (const el of ctx.elements('*')) {
      const own = largestGap(ctx.style(el))
      if (own === 0) continue

      let ancestor: Element | null = el.parentElement
      let outer = 0
      let hops = 0
      while (ancestor && hops < 4) {
        outer = largestGap(ctx.style(ancestor))
        if (outer > 0) break
        ancestor = ancestor.parentElement
        hops++
      }
      if (!ancestor || outer === 0) continue

      // Only a real inversion, not a tie from sub-pixel rounding.
      if (own > outer + 0.5) {
        flagged.add(el)
        out.push({
          rule: 'proximity',
          severity: 'warning',
          message: `Inner gap ${round(own)}px is larger than the ${round(outer)}px separating this group from its siblings.`,
          hint: 'Tighten this group or loosen its parent. Space inside a group must be smaller than the space around it, or the grouping reads backwards.',
          element: el,
          meta: { inner: round(own), outer: round(outer) },
        })
      }
    }

    // B. A surface whose internal padding meets or exceeds the gap between it
    //    and its neighbours, so a row of cards reads as one continuous field.
    for (const el of ctx.elements('*')) {
      if (flagged.has(el)) continue
      const style = ctx.style(el)
      if (!hasSurface(style)) continue

      // A control is a surface, but generous padding on a button is the point
      // of a button — the grouping argument only applies to content containers.
      if (el.matches(ACTION_SELECTOR) || el.closest(ACTION_SELECTOR)) continue

      // Too small to be a card. A chip or a badge is padded relative to its
      // own type size, not relative to the gap between it and the next chip.
      const box = ctx.rect(el)
      if (box.width < 120 || box.height < 64) continue

      const parent = el.parentElement
      if (!parent) continue
      const gap = largestGap(ctx.style(parent))
      if (gap === 0) continue

      // Needs peers — a lone box has nothing to be grouped against.
      let peers = 0
      for (let i = 0; i < parent.children.length; i++) {
        if (hasSurface(ctx.style(parent.children[i]))) peers++
      }
      if (peers < 2) continue

      const padding = Math.max(
        parseFloat(style.paddingLeft) || 0,
        parseFloat(style.paddingTop) || 0,
      )
      if (padding === 0) continue

      if (padding >= gap) {
        out.push({
          rule: 'proximity',
          severity: 'info',
          message: `Surface padding ${round(padding)}px is not smaller than the ${round(gap)}px gap between siblings.`,
          hint: 'Reduce the padding or raise the gap, so "inside this box" reads as closer than "the next box".',
          element: el,
          meta: { padding: round(padding), gap: round(gap), peers },
        })
      }
    }

    return out
  },
}

/* ──────────────────────────────── alignment ──────────────────────────────── */

/** Below this a difference is sub-pixel noise; above it, it reads as deliberate. */
const NEAR_MISS_MIN = 1
const NEAR_MISS_MAX = 8

export const alignment: Rule = {
  id: 'alignment',
  title: 'Near-miss alignment',
  experimental: true,
  rationale:
    'Edges either line up or they clearly do not. A 3px difference is the worst of ' +
    'both: too small to read as intent, too large to read as alignment, and it makes ' +
    'a page look slightly out of focus without anyone being able to say why.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const container of ctx.elements('*')) {
      const children = flowChildren(container, ctx)
      if (children.length < 3) continue

      for (const edge of ['left', 'right'] as const) {
        // The modal edge is the container's implied alignment line. Anything
        // that misses it by a hair is the defect; anything that misses it by a
        // lot is an indent, a callout, or a deliberate offset.
        const positions = new Map<number, Element[]>()
        for (const child of children) {
          const value = round(ctx.rect(child)[edge], 1)
          const bucket = positions.get(value)
          if (bucket) bucket.push(child)
          else positions.set(value, [child])
        }
        if (positions.size < 2) continue

        let mode = 0
        let modeCount = 0
        for (const [value, group] of positions) {
          // Ties break toward the smaller coordinate, so the answer is stable.
          if (group.length > modeCount || (group.length === modeCount && value < mode)) {
            mode = value
            modeCount = group.length
          }
        }
        if (modeCount < 2) continue

        for (const [value, group] of positions) {
          const delta = Math.abs(value - mode)
          if (delta < NEAR_MISS_MIN || delta > NEAR_MISS_MAX) continue

          for (const child of group) {
            out.push({
              rule: 'alignment',
              severity: 'warning',
              message: `${edge} edge is ${round(delta)}px off the ${edge} edge its ${modeCount} siblings share. "${snippet(child, 20)}"`,
              hint: `Align it to ${round(mode)}px, or move it far enough (>${NEAR_MISS_MAX}px) that the offset reads as deliberate.`,
              element: child,
              meta: { edge, actual: value, expected: mode, delta: round(delta), siblings: modeCount },
            })
          }
        }
      }
    }

    return out
  },
}

/* ───────────────────────────── heading-attachment ────────────────────────── */

export const headingAttachment: Rule = {
  id: 'heading-attachment',
  title: 'Heading attachment',
  rationale:
    'A heading belongs to the content beneath it, so the space above it must be ' +
    'larger than the space below. Uniform spacing — the default a generator reaches ' +
    'for — detaches every heading from its own section and makes the page read as ' +
    'one undifferentiated column.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const heading of ctx.elements('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
      const parent = heading.parentElement
      if (!parent) continue

      const siblings = flowChildren(parent, ctx)
      const index = siblings.indexOf(heading)
      // Needs content on both sides: a heading at the top of a container has
      // nothing above it to be separated from.
      if (index <= 0 || index >= siblings.length - 1) continue

      const rect = ctx.rect(heading)
      const above = rect.top - ctx.rect(siblings[index - 1]).bottom
      const below = ctx.rect(siblings[index + 1]).top - rect.bottom
      if (above < 0 || below < 0) continue
      // Both sides collapsed to nothing: not a rhythm decision at all.
      if (above < 2 && below < 2) continue

      if (below > above + 1) {
        out.push({
          rule: 'heading-attachment',
          severity: 'warning',
          message: `${round(below)}px below the heading but only ${round(above)}px above it — it binds to the section it just ended. "${snippet(heading, 24)}"`,
          hint: 'Increase the space above the heading past the space below it, so the heading groups with the content it introduces.',
          element: heading,
          meta: { above: round(above), below: round(below) },
        })
      } else if (Math.abs(below - above) <= 1 && above > 8) {
        out.push({
          rule: 'heading-attachment',
          severity: 'info',
          message: `Equal ${round(above)}px above and below the heading — it belongs to neither side.`,
          hint: 'A uniform gap detaches the heading from its own section. Give it more room above than below.',
          element: heading,
          meta: { above: round(above), below: round(below) },
        })
      }
    }

    return out
  },
}
