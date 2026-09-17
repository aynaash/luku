/**
 * @module core/rules/structure
 *
 * Rules about what the page *claims*: its outline, and which action it
 * recommends. Both are defects of relationship — one heading is never wrong on
 * its own, and one filled button is never wrong on its own.
 */
import { contrastRatio, effectiveBackground, flatten, parseColor } from '../color.js'
import { ACTION_SELECTOR, accessibleName, ownText, snippet } from '../dom.js'
import type { RawFinding, Rule } from '../types.js'

/* ─────────────────────────────── heading-order ───────────────────────────── */

function levelOf(el: Element): number {
  if (/^H[1-6]$/.test(el.tagName)) return Number(el.tagName[1])
  const aria = Number(el.getAttribute('aria-level'))
  return Number.isFinite(aria) && aria >= 1 ? Math.min(6, aria) : 2
}

export const headingOrder: Rule = {
  id: 'heading-order',
  title: 'Heading outline',
  rationale:
    'The heading outline is how screen-reader and keyboard users navigate. Skipped ' +
    'levels break that map, and generated markup skips them constantly because a ' +
    'level is chosen for how big it looks rather than for where it sits.',
  run(ctx) {
    const out: RawFinding[] = []
    const headings = ctx.elements('h1,h2,h3,h4,h5,h6,[role="heading"]')
    if (headings.length === 0) return out

    const h1s = headings.filter((h) => levelOf(h) === 1)

    if (h1s.length === 0) {
      out.push({
        rule: 'heading-order',
        severity: 'warning',
        message: 'Page has no level-1 heading.',
        hint: 'Give the document one top-level heading naming what this page is.',
        element: headings[0],
        meta: { headings: headings.length },
      })
    }

    for (const extra of h1s.slice(1)) {
      out.push({
        rule: 'heading-order',
        severity: 'error',
        message: `Second level-1 heading: "${snippet(extra)}"`,
        hint: 'One h1 per document. Demote this to h2 — the visual size is a separate decision from the level.',
        element: extra,
        meta: { count: h1s.length },
      })
    }

    let previous = 0
    for (const heading of headings) {
      const level = levelOf(heading)

      if (previous !== 0 && level > previous + 1) {
        out.push({
          rule: 'heading-order',
          severity: 'error',
          message: `Outline jumps from h${previous} to h${level}: "${snippet(heading)}"`,
          hint: `Use h${previous + 1} here and style it however you like — level and size are independent.`,
          element: heading,
          meta: { from: previous, to: level, expected: previous + 1 },
        })
      }

      // The accessible name, not the text. `<h1><img alt="Acme"></h1>` is a
      // logo-as-heading — extremely common, and perfectly named.
      if (accessibleName(heading).length === 0) {
        out.push({
          rule: 'heading-order',
          severity: 'error',
          message: `Empty h${level} — no text, no alt text and no label, so it appears in the outline as a blank entry.`,
          hint: 'Give it text, put alt text on the image inside it, or add aria-label.',
          element: heading,
          meta: { level },
        })
      }

      previous = level
    }

    return out
  },
}

/* ──────────────────────────── competing-emphasis ─────────────────────────── */

/**
 * A "filled" action carries a surface distinct from what's behind it — the
 * classic primary-button treatment. Deriving this from painted pixels rather
 * than from a `variant` prop is what makes the rule framework-agnostic: it
 * works on Tailwind, on CSS modules, on a `<button style>`.
 */
function isFilled(el: Element, ctx: Parameters<Rule['run']>[0]): boolean {
  const style = ctx.style(el)
  const bg = parseColor(style.backgroundColor)
  if (!bg || bg.a < 0.5) return false

  const parent = el.parentElement
  if (!parent) return false

  const behind = effectiveBackground(parent, (e) => ctx.style(e)).color
  // 1.15 is deliberately low: a subtle filled button is still a filled button.
  return contrastRatio(flatten(bg, behind), behind) > 1.15
}

export const competingEmphasis: Rule = {
  id: 'competing-emphasis',
  title: 'Competing primary actions',
  rationale:
    'One decision point should offer exactly one recommended action. Two equally ' +
    'weighted buttons do not give the user a choice, they give them hesitation — ' +
    'and a model generating a CTA row has no reason not to fill both.',
  run(ctx) {
    const out: RawFinding[] = []
    const groups = new Map<Element, Element[]>()

    for (const el of ctx.elements(ACTION_SELECTOR)) {
      // Icon-only controls in a toolbar are a set, not a decision.
      if (ownText(el).length < 2 && (el.textContent ?? '').trim().length < 2) continue
      if (!isFilled(el, ctx)) continue

      const parent = el.parentElement
      if (!parent) continue
      const bucket = groups.get(parent)
      if (bucket) bucket.push(el)
      else groups.set(parent, [el])
    }

    for (const [parent, actions] of groups) {
      if (actions.length < 2) continue
      // Four or more filled siblings is a toolbar, a pagination row or a tab
      // bar — a set of peers, where uniform weight is correct.
      if (actions.length > 3) continue
      // A nav is a set of destinations, not a recommendation.
      if (parent.closest('nav,[role="navigation"],[role="tablist"]')) continue

      for (const extra of actions.slice(1)) {
        out.push({
          rule: 'competing-emphasis',
          severity: 'warning',
          message: `${actions.length} filled actions share one container — "${snippet(extra, 24)}" is one of them.`,
          hint: 'Keep one filled action and give the others an outline or text treatment, so the recommended path is unambiguous.',
          element: extra,
          meta: { siblings: actions.length },
        })
      }
    }

    return out
  },
}
