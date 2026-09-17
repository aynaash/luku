/**
 * @module core/rules/a11y
 *
 * Checks that need the cascade resolved, not the source read.
 */
import { ACTION_SELECTOR, snippet } from '../dom.js'
import type { RawFinding, Rule } from '../types.js'

/* ────────────────────────────── focus-visible ────────────────────────────── */

interface FocusRule {
  /** Selector with focus pseudo-classes stripped, so it matches a resting node. */
  base: string
  scopedToFocus: boolean
  /** Sets `outline` to nothing — which overrides the UA ring, author beats UA. */
  killsOutline: boolean
  /** Draws something a keyboard user can see. */
  drawsIndicator: boolean
}

/**
 * Reads the document's own stylesheets.
 *
 * Two things make this the right approach over `.focus()` plus a computed-style
 * diff. First, programmatic focus does not reliably match `:focus-visible` —
 * the heuristic depends on the last input modality, which a headless run has
 * none of — so the mutation approach answers differently depending on how the
 * page was reached. Second, the resting `outline-style` of almost every element
 * is `none`; the browser's focus ring lives in the UA stylesheet's own
 * `:focus-visible` rule and never appears in the resting computed style. Reading
 * it that way reports every button on every page, which is worse than useless.
 *
 * So the question is narrower and answerable: did the author suppress the
 * default ring, and if so did they replace it?
 */
function collectFocusRules(): { rules: FocusRule[]; unreadable: number } {
  const rules: FocusRule[] = []
  let unreadable = 0

  /**
   * Resolves a nested selector against its parent context, per CSS Nesting:
   * `&:focus` inside `.btn` is `.btn:focus`, and a bare `.icon` inside `.btn`
   * is `.btn .icon`.
   */
  const resolveNested = (selectorText: string, parents: string[]): string[] => {
    const parts = selectorText.split(',').map((s) => s.trim()).filter(Boolean)
    if (parents.length === 0) return parts
    const resolved: string[] = []
    for (const parent of parents) {
      for (const part of parts) {
        resolved.push(part.includes('&') ? part.replace(/&/g, parent) : `${parent} ${part}`)
      }
    }
    return resolved
  }

  const collect = (selectors: string[], declarations: CSSStyleDeclaration) => {
    const outlineStyle = declarations.getPropertyValue('outline-style')
    const outlineWidth = declarations.getPropertyValue('outline-width')
    const outlineColor = declarations.getPropertyValue('outline-color')
    const boxShadow = declarations.getPropertyValue('box-shadow')

    const killsOutline =
      outlineStyle === 'none' ||
      outlineStyle === 'hidden' ||
      (outlineWidth !== '' && parseFloat(outlineWidth) === 0) ||
      outlineColor === 'transparent'

    const drawsIndicator =
      (outlineStyle !== '' && outlineStyle !== 'none' && parseFloat(outlineWidth || '3') > 0) ||
      (boxShadow !== '' && boxShadow !== 'none') ||
      declarations.getPropertyValue('border-color') !== '' ||
      declarations.getPropertyValue('background-color') !== '' ||
      declarations.getPropertyValue('text-decoration-line') !== ''

    if (!killsOutline && !drawsIndicator) return

    for (const part of selectors) {
      const scopedToFocus = part.includes(':focus')
      const base = part
        .replace(/:focus-visible/g, '')
        .replace(/:focus-within/g, '')
        .replace(/:focus/g, '')
        .trim()
      if (!base) continue
      rules.push({ base, scopedToFocus, killsOutline, drawsIndicator })
    }
  }

  const walk = (list: CSSRuleList, parents: string[]) => {
    for (let i = 0; i < list.length; i++) {
      const rule = list[i] as CSSStyleRule & { cssRules?: CSSRuleList }
      const selectorText = rule.selectorText
      const declarations = rule.style

      // A style rule is NOT an either/or with a grouping rule. CSS Nesting gave
      // CSSStyleRule its own `cssRules`, so branching on the property's presence
      // — `if (rule.cssRules) { recurse; continue }` — silently skips the
      // declarations of every style rule in a modern engine, and the whole rule
      // quietly finds nothing.
      const selectors = selectorText ? resolveNested(selectorText, parents) : parents

      if (selectorText && declarations) collect(selectors, declarations)
      // @media / @supports / @layer keep the parent context; a nested style
      // rule becomes the context for anything inside it.
      if (rule.cssRules) walk(rule.cssRules, selectors)
    }
  }

  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const cssRules = document.styleSheets[i].cssRules
      if (cssRules) walk(cssRules, [])
    } catch {
      // Cross-origin stylesheet. Counted, so a finding can admit the doubt
      // rather than claim a focus style is absent when it merely wasn't legible.
      unreadable++
    }
  }

  return { rules, unreadable }
}

function matches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector)
  } catch {
    // Unsupported or vendor-prefixed selector syntax. Guessing here would
    // produce a finding the author cannot act on.
    return false
  }
}

export const focusVisible: Rule = {
  id: 'focus-visible',
  title: 'Suppressed focus indicator',
  rationale:
    'Removing the default outline without replacing it makes a control invisible to ' +
    'anyone navigating by keyboard. `outline: none` is the single most copied line in ' +
    'generated component code and its replacement is the most forgotten.',
  run(ctx) {
    const out: RawFinding[] = []
    const { rules, unreadable } = collectFocusRules()
    if (rules.length === 0) return out

    for (const el of ctx.elements(ACTION_SELECTOR)) {
      let suppressed = false
      let replaced = false

      for (const rule of rules) {
        if (!matches(el, rule.base)) continue
        // An unscoped `outline: none` kills the UA focus ring too — author
        // declarations beat the UA stylesheet regardless of specificity.
        if (rule.killsOutline) suppressed = true
        if (rule.scopedToFocus && rule.drawsIndicator) replaced = true
      }

      if (!suppressed || replaced) continue

      out.push({
        rule: 'focus-visible',
        severity: unreadable > 0 ? 'warning' : 'error',
        message: `Focus ring removed with no replacement — this control is invisible to keyboard users. "${snippet(el, 24)}"`,
        hint:
          unreadable > 0
            ? `Add a :focus-visible style. (${unreadable} cross-origin stylesheet${unreadable === 1 ? '' : 's'} could not be read, so this may be a false positive.)`
            : 'Add a :focus-visible rule that draws an outline, ring or border, or stop suppressing the default outline.',
        element: el,
        meta: { tag: el.tagName.toLowerCase(), unreadableSheets: unreadable },
      })
    }

    return out
  },
}
