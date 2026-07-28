/**
 * @module design/devtools/rules
 *
 * PURPOSE
 * The audit rules behind <DesignInspector />. Each is a pure function from a DOM
 * subtree to a list of findings, so rules can be unit-tested against a fixture
 * and added without touching the panel.
 *
 * PHILOSOPHY
 * Every rule encodes a principle stated elsewhere in this library, and every
 * finding names the principle rather than just the symptom. "Spacing 20px is not
 * on the scale" teaches nothing; "20px is off the rhythm scale — nearest step is
 * md (24px)" tells you what to type.
 *
 * FALSE POSITIVES ARE THE ENEMY
 * A linter people ignore is worse than no linter. Where a rule can't be certain,
 * it reports `info` rather than `error`, and several rules deliberately skip
 * cases they can't judge (decorative text, absolutely-positioned overlays,
 * elements inside a scroll container) instead of guessing.
 */
import { contrastRatio, effectiveBackground, parseColor, requiredRatio } from '../utils/contrast.js'
import { estimateMeasure, isOnGrid, isOnScale, MEASURE_BAND, nearestToken } from '../utils/rhythm.js'
import { describe, snippet, type Finding, type Rule, type RuleContext } from './types.js'

/* ─────────────────────────────── helpers ─────────────────────────────────── */

function visibleElements(ctx: RuleContext, selector: string): HTMLElement[] {
  return Array.from(ctx.root.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (ctx.isIgnored(el)) return false
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
}

/** Text belonging to this element rather than to its descendants. */
function ownText(el: Element): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
  }
  return text.trim().replace(/\s+/g, ' ')
}

/* ───────────────────────── 1. heading hierarchy ──────────────────────────── */

const headingHierarchy: Rule = {
  id: 'heading-hierarchy',
  title: 'Heading hierarchy',
  rationale:
    'The heading outline is how screen-reader and keyboard users navigate a page. ' +
    'Skipped levels break that map, and duplicate h1s leave no single page title.',
  run(ctx) {
    const findings: Finding[] = []
    const headings = visibleElements(ctx, 'h1,h2,h3,h4,h5,h6')
    if (headings.length === 0) return findings

    const h1s = headings.filter((h) => h.tagName === 'H1')

    if (h1s.length === 0) {
      findings.push({
        rule: 'heading-hierarchy',
        severity: 'warning',
        message: 'Page has no <h1>.',
        hint: 'Give the page one top-level heading — <Heading level={1}> or a <Hero>, which emits it for you.',
        element: headings[0],
        label: describe(headings[0]),
      })
    }

    if (h1s.length > 1) {
      for (const extra of h1s.slice(1)) {
        findings.push({
          rule: 'heading-hierarchy',
          severity: 'error',
          message: `Second <h1> on the page: "${snippet(extra)}"`,
          hint: 'Only one h1 per document. Nest this inside a <Section> so it steps down to h2 automatically.',
          element: extra,
          label: describe(extra),
        })
      }
    }

    let previous = 0
    for (const heading of headings) {
      const level = Number(heading.tagName[1])
      if (previous !== 0 && level > previous + 1) {
        findings.push({
          rule: 'heading-hierarchy',
          severity: 'error',
          message: `Outline jumps from h${previous} to h${level}: "${snippet(heading)}"`,
          hint:
            `Use h${previous + 1} here, or let <Section> nesting derive it. To keep the ` +
            `smaller look without breaking the outline, pass role="subheading" instead.`,
          element: heading,
          label: describe(heading),
        })
      }
      previous = level
    }

    return findings
  },
}

/* ────────────────────────── 2. multiple primaries ────────────────────────── */

const multiplePrimary: Rule = {
  id: 'multiple-primary',
  title: 'Competing primary actions',
  rationale:
    'One decision point should offer exactly one recommended action. Two equally ' +
    'weighted actions do not give the user a choice — they give them hesitation.',
  run(ctx) {
    const findings: Finding[] = []

    // Explicit groups first — these are the ones the author scoped deliberately.
    for (const group of visibleElements(ctx, '[data-design="cta-group"]')) {
      const primaries = Array.from(
        group.querySelectorAll<HTMLElement>('[data-design-emphasis="primary"]'),
      ).filter((el) => !ctx.isIgnored(el))

      if (primaries.length > 1) {
        const name = group.getAttribute('data-design-group') ?? 'unnamed'
        for (const extra of primaries.slice(1)) {
          findings.push({
            rule: 'multiple-primary',
            severity: 'error',
            message: `CTAGroup "${name}" has ${primaries.length} primary actions — "${snippet(extra, 24)}" is one of them.`,
            hint: 'Demote all but the recommended action to emphasis="secondary".',
            element: extra,
            label: describe(extra),
          })
        }
      }
    }

    // Then ungrouped primaries sharing one viewport-height band, which compete
    // even though no group declares them as peers.
    const loose = visibleElements(ctx, '[data-design-emphasis="primary"]').filter(
      (el) => !el.closest('[data-design="cta-group"]'),
    )

    const byBand = new Map<number, HTMLElement[]>()
    for (const el of loose) {
      const band = Math.floor((el.getBoundingClientRect().top + window.scrollY) / window.innerHeight)
      byBand.set(band, [...(byBand.get(band) ?? []), el])
    }

    for (const [, group] of byBand) {
      if (group.length < 2) continue
      for (const extra of group.slice(1)) {
        findings.push({
          rule: 'multiple-primary',
          severity: 'warning',
          message: `${group.length} primary actions share one screen without a <CTAGroup>: "${snippet(extra, 24)}"`,
          hint: 'Wrap them in <CTAGroup label="…"> so the single-primary rule is scoped and enforced.',
          element: extra,
          label: describe(extra),
        })
      }
    }

    return findings
  },
}

/* ───────────────────────── 3. inconsistent spacing ───────────────────────── */

const inconsistentSpacing: Rule = {
  id: 'inconsistent-spacing',
  title: 'Off-scale spacing',
  rationale:
    'A page reads as one system when every distance comes from one scale. ' +
    'Off-scale values are almost always a hand-tweak that outlived its reason.',
  run(ctx) {
    const findings: Finding[] = []
    const seen = new Set<HTMLElement>()

    for (const el of visibleElements(ctx, 'div,section,ul,ol,article,main,header,footer,aside,nav')) {
      const style = getComputedStyle(el)
      const props: Array<[string, string]> = [
        ['row-gap', style.rowGap],
        ['column-gap', style.columnGap],
        ['margin-top', style.marginTop],
        ['margin-bottom', style.marginBottom],
      ]

      for (const [name, raw] of props) {
        if (!raw || raw === 'normal' || raw === 'auto') continue
        const px = parseFloat(raw)
        if (!Number.isFinite(px) || px === 0) continue
        // Negative margins are a deliberate technique (Bleed, CardMedia), not drift.
        if (px < 0) continue
        if (isOnScale(px)) continue
        if (seen.has(el)) continue

        const near = nearestToken(px)
        seen.add(el)
        findings.push({
          rule: 'inconsistent-spacing',
          severity: isOnGrid(px) ? 'info' : 'warning',
          message: `${name} of ${round(px)}px is not a step on the rhythm scale.`,
          hint: `Nearest step is "${near.token}" (${near.value}px). Use <Stack gap="${near.token}"> or <Inset space="${near.token}">.`,
          element: el,
          label: describe(el),
        })
      }
    }

    return findings
  },
}

/* ─────────────────────────── 4. missing anchor ───────────────────────────── */

const missingAnchor: Rule = {
  id: 'missing-anchor',
  title: 'Visual anchor',
  rationale:
    'Every region needs one dominant element to resolve the first fixation. ' +
    'Zero anchors reads as "busy"; two anchors is the same as zero.',
  run(ctx) {
    const findings: Finding[] = []

    for (const section of visibleElements(ctx, 'section,[data-design="section"]')) {
      // Only judge sections with enough content for an anchor to matter.
      const rect = section.getBoundingClientRect()
      if (rect.height < 240) continue

      const anchors = Array.from(section.querySelectorAll<HTMLElement>('[data-design-anchor]')).filter(
        // Anchors belonging to a nested section are that section's business.
        (a) => a.closest('section,[data-design="section"]') === section,
      )

      if (anchors.length > 1) {
        for (const extra of anchors.slice(1)) {
          findings.push({
            rule: 'missing-anchor',
            severity: 'warning',
            message: `Region declares ${anchors.length} visual anchors — the eye has no single entry point.`,
            hint: 'Keep one <Anchor>; lower the others to supporting weight.',
            element: extra,
            label: describe(extra),
          })
        }
        continue
      }

      if (anchors.length === 0) {
        // A heading is an implicit anchor — only flag sections that have neither.
        const heading = section.querySelector('h1,h2,h3,[data-design="heading"]')
        if (heading) continue

        findings.push({
          rule: 'missing-anchor',
          severity: 'info',
          message: 'Region has no heading and no declared anchor.',
          hint: 'Add a <Heading>, or wrap the dominant element in <Anchor strength="medium">.',
          element: section,
          label: describe(section),
        })
      }
    }

    return findings
  },
}

/* ───────────────────── 5 & 6. reading width / line length ────────────────── */

const readingWidth: Rule = {
  id: 'reading-width',
  title: 'Reading width',
  rationale:
    'Text primitives declare a measure cap. This checks the cap is actually doing ' +
    'its job once the real typeface has loaded.',
  run(ctx) {
    const findings: Finding[] = []

    for (const el of visibleElements(ctx, '[data-design="text"],[data-design="prose"]')) {
      const text = el.textContent?.trim() ?? ''
      if (text.length < 120) continue

      const style = getComputedStyle(el)
      const fontSize = parseFloat(style.fontSize)
      const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const chars = estimateMeasure(width, fontSize)
      if (chars === 0) continue

      if (chars > MEASURE_BAND.max) {
        findings.push({
          rule: 'reading-width',
          severity: 'warning',
          message: `Measure is ~${chars} characters — past the ${MEASURE_BAND.max}ch comfortable limit.`,
          hint: `Set measure="md" or wrap in <Container size="reading">. Declared measure: "${el.getAttribute('data-design-measure') ?? 'none'}".`,
          element: el,
          label: describe(el),
        })
      }
    }

    return findings
  },
}

const lineLength: Rule = {
  id: 'line-length',
  title: 'Excessive line length',
  rationale:
    'Past ~80 characters the eye loses the return sweep and re-reads lines. ' +
    'This checks every text block, including ones not built with the system.',
  run(ctx) {
    const findings: Finding[] = []

    for (const el of visibleElements(ctx, 'p,li,blockquote,dd,figcaption')) {
      // Skip anything the reading-width rule already covers.
      if (el.hasAttribute('data-design') || el.closest('[data-design="prose"]')) continue

      const text = ownText(el)
      if (text.length < 160) continue

      const style = getComputedStyle(el)
      const fontSize = parseFloat(style.fontSize)
      const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const chars = estimateMeasure(width, fontSize)

      if (chars > MEASURE_BAND.max) {
        findings.push({
          rule: 'line-length',
          severity: 'warning',
          message: `~${chars} characters per line in a ${text.length}-character block.`,
          hint: `Aim for ${MEASURE_BAND.min}–${MEASURE_BAND.max}. Replace with <Text measure="md"> or <Prose>.`,
          element: el,
          label: describe(el),
        })
      }
    }

    return findings
  },
}

/* ────────────────────────── 7. grid alignment ────────────────────────────── */

const gridAlignment: Rule = {
  id: 'grid-alignment',
  title: 'Grid alignment',
  rationale:
    'A layout feels ordered when edges land on a shared 4px grid. Off-grid padding ' +
    'is invisible alone and cumulatively makes a page look slightly out of focus.',
  run(ctx) {
    const findings: Finding[] = []
    const seen = new Set<HTMLElement>()

    for (const el of visibleElements(ctx, '[data-design],section,article,header,footer')) {
      if (seen.has(el)) continue
      const style = getComputedStyle(el)

      const offenders: string[] = []
      for (const [name, raw] of [
        ['padding-top', style.paddingTop],
        ['padding-bottom', style.paddingBottom],
        ['padding-left', style.paddingLeft],
        ['padding-right', style.paddingRight],
      ] as const) {
        const px = parseFloat(raw)
        if (!Number.isFinite(px) || px === 0) continue
        // Sub-pixel values come from percentage padding and rem rounding, not drift.
        if (Math.abs(px - Math.round(px)) > 0.01) continue
        if (!isOnGrid(px)) offenders.push(`${name} ${round(px)}px`)
      }

      if (offenders.length > 0) {
        seen.add(el)
        findings.push({
          rule: 'grid-alignment',
          severity: 'info',
          message: `Off the 4px base grid: ${offenders.join(', ')}.`,
          hint: 'Use <Inset space="…"> so padding comes from the scale.',
          element: el,
          label: describe(el),
        })
      }
    }

    return findings
  },
}

/* ──────────────────────────── 8. contrast ────────────────────────────────── */

const contrast: Rule = {
  id: 'contrast',
  title: 'Text contrast',
  rationale:
    'WCAG AA requires 4.5:1 for body text and 3:1 for large text, measured against ' +
    'the composited background — not the one declared on the same element.',
  run(ctx) {
    const findings: Finding[] = []

    for (const el of visibleElements(ctx, 'p,span,a,li,h1,h2,h3,h4,h5,h6,button,label,dt,dd,figcaption,blockquote')) {
      const text = ownText(el)
      if (text.length < 3) continue

      const style = getComputedStyle(el)
      const fg = parseColor(style.color)
      if (!fg) continue

      // Composite the text colour's own alpha over its background first.
      const bg = effectiveBackground(el)
      const flat = fg.a < 1 ? { ...bg, r: mix(fg.r, bg.r, fg.a), g: mix(fg.g, bg.g, fg.a), b: mix(fg.b, bg.b, fg.a) } : fg

      const ratio = contrastRatio(flat, bg)
      const fontSize = parseFloat(style.fontSize)
      const weight = Number(style.fontWeight) || 400
      const required = requiredRatio(fontSize, weight)

      if (ratio < required) {
        findings.push({
          rule: 'contrast',
          severity: ratio < required - 1 ? 'error' : 'warning',
          message: `Contrast ${ratio.toFixed(2)}:1 against its background — AA needs ${required}:1 at ${Math.round(fontSize)}px/${weight}.`,
          hint:
            ratio < 3
              ? 'Raise the text colour, or place a scrim between the text and its backdrop.'
              : 'Nudge toward --text-primary, or increase the size past 24px to qualify as large text.',
          element: el,
          label: `${describe(el)} — "${snippet(el, 28)}"`,
        })
      }
    }

    return findings
  },
}

/* ───────────────────────── 9. layout balance ─────────────────────────────── */

const layoutBalance: Rule = {
  id: 'layout-balance',
  title: 'Layout balance',
  rationale:
    'Visual weight either side of the optical axis should be comparable. A layout ' +
    'that tips registers as unease before a viewer can name the cause.',
  run(ctx) {
    const findings: Finding[] = []

    for (const section of visibleElements(ctx, 'section,[data-design="section"]')) {
      const bounds = section.getBoundingClientRect()
      if (bounds.height < 320 || bounds.width < 640) continue

      const children = Array.from(section.querySelectorAll<HTMLElement>(':scope > * > *, :scope > *'))
        .filter((el) => !ctx.isIgnored(el))
        .filter((el) => {
          const s = getComputedStyle(el)
          return s.position !== 'absolute' && s.position !== 'fixed' && s.display !== 'none'
        })

      if (children.length < 2) continue

      const axis = bounds.left + bounds.width / 2
      let left = 0
      let right = 0

      for (const child of children) {
        const rect = child.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue

        // Weight ≈ area × ink density. Text-bearing nodes weigh more per pixel
        // than empty containers, which is what makes a small dense block balance
        // a large airy one.
        const area = rect.width * rect.height
        const density = (child.textContent?.trim().length ?? 0) > 0 ? 1 : 0.25
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
        findings.push({
          rule: 'layout-balance',
          severity: 'info',
          message: `Weight sits ${Math.round(skew * 100)}% to the ${left > right ? 'left' : 'right'} of the optical axis.`,
          hint: 'Counterweight the light side, or make the asymmetry deliberate with <Balance mode="asymmetric">.',
          element: section,
          label: describe(section),
        })
      }
    }

    return findings
  },
}

/* ─────────────────────── 10. Gestalt proximity ───────────────────────────── */

/**
 * The proximity inversion is the most common grouping bug in real interfaces and
 * one almost nobody catches by eye, because each spacing value looks reasonable
 * on its own. It only shows up when you compare the space *inside* a group with
 * the space *around* it.
 */
const proximity: Rule = {
  id: 'proximity',
  title: 'Gestalt proximity',
  rationale:
    'Things close together read as one group. If the space inside a group is as ' +
    'large as the space around it, the grouping inverts and the eye reads the ' +
    'wrong sets — no matter how consistent each individual value is.',
  run(ctx) {
    const findings: Finding[] = []

    // A. A container whose own gap is >= its parent's gap. The children then sit
    //    as far apart as the groups do, so the group boundary disappears.
    for (const el of visibleElements(ctx, '[data-design="stack"],[data-design="inline"],[data-design="cluster"],[data-design="grid"]')) {
      const parent = el.parentElement?.closest<HTMLElement>(
        '[data-design="stack"],[data-design="grid"],[data-design="section-body"]',
      )
      if (!parent || ctx.isIgnored(parent)) continue

      const own = largestGap(el)
      const outer = largestGap(parent)
      if (own === 0 || outer === 0) continue

      // Only a real inversion, not a tie from rounding.
      if (own > outer + 0.5) {
        findings.push({
          rule: 'proximity',
          severity: 'warning',
          message: `Inner gap (${round(own)}px) is larger than the gap separating this group from its siblings (${round(outer)}px).`,
          hint:
            'Tighten this group, or loosen its parent. Space inside a group must ' +
            'be smaller than the space around it or the grouping reads backwards.',
          element: el,
          label: describe(el),
        })
      }
    }

    // B. A card whose internal padding meets or exceeds the grid gap between
    //    cards, which makes a row of cards read as one continuous field.
    for (const card of visibleElements(ctx, '[data-design="card"]')) {
      const grid = card.parentElement?.closest<HTMLElement>('[data-design="grid"],[data-design="stack"]')
      if (!grid || ctx.isIgnored(grid)) continue

      const gap = largestGap(grid)
      if (gap === 0) continue

      const style = getComputedStyle(card)
      const padding = Math.max(parseFloat(style.paddingLeft) || 0, parseFloat(style.paddingTop) || 0)
      if (padding === 0) continue

      if (padding >= gap) {
        findings.push({
          rule: 'proximity',
          severity: 'info',
          message: `Card padding (${round(padding)}px) is not smaller than the gap between cards (${round(gap)}px).`,
          hint: 'Reduce the card padding or raise the grid gap, so "inside the card" reads as closer than "next card".',
          element: card,
          label: describe(card),
        })
      }
    }

    return findings
  },
}

/* ────────────────────────── 11. repetition ───────────────────────────────── */

/**
 * Thresholds are deliberately generous. The goal is catching *proliferation* —
 * the slow accumulation of one-off values — not policing a page that legitimately
 * uses the full scale. Everything here reports `info`.
 */
const REPETITION_LIMITS = {
  radius: 6,
  shadow: 5,
  fontSize: 12,
  fontFamily: 3,
} as const

const repetition: Rule = {
  id: 'repetition',
  title: 'Repetition and consistency',
  rationale:
    'Reusing the same radii, shadows and type sizes is what makes a page feel like ' +
    'one product. Each new one-off value is invisible alone and collectively reads ' +
    'as carelessness — and raises the cost of every future change.',
  run(ctx) {
    const findings: Finding[] = []

    const radii = new Map<string, HTMLElement>()
    const shadows = new Map<string, HTMLElement>()
    const fontSizes = new Map<string, HTMLElement>()
    const families = new Map<string, HTMLElement>()

    for (const el of visibleElements(ctx, 'div,section,article,header,footer,aside,button,a,p,h1,h2,h3,h4,li,span,input')) {
      const style = getComputedStyle(el)

      const radius = style.borderRadius
      if (radius && radius !== '0px' && !radii.has(radius)) radii.set(radius, el)

      const shadow = style.boxShadow
      if (shadow && shadow !== 'none' && !shadows.has(shadow)) shadows.set(shadow, el)

      // Only count sizes on elements that actually render text of their own.
      if (ownText(el).length > 0) {
        const size = style.fontSize
        if (size && !fontSizes.has(size)) fontSizes.set(size, el)

        // Normalise to the first family in the stack — the fallbacks are noise.
        const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
        if (family && !families.has(family)) families.set(family, el)
      }
    }

    const checks: Array<[keyof typeof REPETITION_LIMITS, Map<string, HTMLElement>, string, string]> = [
      ['radius', radii, 'corner radii', 'Pull these onto the RADIUS scale in tokens/scale.ts.'],
      ['shadow', shadows, 'box shadows', 'Use the ELEVATION tokens — depth should mean importance, not decoration.'],
      ['fontSize', fontSizes, 'font sizes', 'Use TYPE_ROLE via <Heading role> and <Text size> instead of one-off sizes.'],
      ['fontFamily', families, 'typefaces', 'Two families (display + UI) plus mono is the working maximum.'],
    ]

    for (const [key, map, noun, hint] of checks) {
      const limit = REPETITION_LIMITS[key]
      if (map.size <= limit) continue

      const sample = [...map.values()][limit]
      findings.push({
        rule: 'repetition',
        severity: 'info',
        message: `${map.size} distinct ${noun} on this page (system uses ${limit} or fewer).`,
        hint: `${hint} Values found: ${[...map.keys()].slice(0, 6).join(' · ')}${map.size > 6 ? ' …' : ''}`,
        element: sample,
        label: describe(sample),
      })
    }

    return findings
  },
}

/** Largest of an element's row/column gaps, in px. 0 when it isn't a flex/grid. */
function largestGap(el: HTMLElement): number {
  const style = getComputedStyle(el)
  if (style.display !== 'flex' && style.display !== 'grid' && style.display !== 'inline-flex') return 0
  const row = parseFloat(style.rowGap)
  const col = parseFloat(style.columnGap)
  return Math.max(Number.isFinite(row) ? row : 0, Number.isFinite(col) ? col : 0)
}

/* ─────────────────────────────── registry ────────────────────────────────── */

export const RULES: Rule[] = [
  headingHierarchy,
  multiplePrimary,
  contrast,
  readingWidth,
  lineLength,
  proximity,
  missingAnchor,
  inconsistentSpacing,
  gridAlignment,
  layoutBalance,
  repetition,
]

function round(n: number): number {
  return Math.round(n * 10) / 10
}

function mix(a: number, b: number, alpha: number): number {
  return a * alpha + b * (1 - alpha)
}
