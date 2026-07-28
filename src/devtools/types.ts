/**
 * @module design/devtools/types
 *
 * Shared vocabulary for the audit engine. Rules are pure functions over the live
 * DOM, which keeps them individually testable and makes it trivial to add one.
 */

export type Severity = 'error' | 'warning' | 'info'

export type RuleId =
  | 'heading-hierarchy'
  | 'multiple-primary'
  | 'inconsistent-spacing'
  | 'missing-anchor'
  | 'reading-width'
  | 'line-length'
  | 'grid-alignment'
  | 'contrast'
  | 'layout-balance'
  | 'proximity'
  | 'repetition'

export interface Finding {
  rule: RuleId
  severity: Severity
  /** One line, stating the defect. */
  message: string
  /** What to do about it. */
  hint?: string
  /** The offending node, for highlighting. */
  element: HTMLElement
  /** Short human label for the element, e.g. `h3.text-xl`. */
  label: string
}

export interface RuleContext {
  /** Subtree being audited. Defaults to document.body. */
  root: HTMLElement
  /** Elements the audit should ignore (the inspector's own UI). */
  isIgnored: (el: Element) => boolean
}

export interface Rule {
  id: RuleId
  title: string
  /** Why this matters — shown in the panel. */
  rationale: string
  run: (ctx: RuleContext) => Finding[]
}

export const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

/** Compact, readable identifier for a DOM node. */
export function describe(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const design = el.getAttribute('data-design')
  if (design) return `${tag}${id}[${design}]`

  const cls = (el.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('')
  return `${tag}${id}${cls}`
}

/** First ~48 characters of an element's own text, for context in messages. */
export function snippet(el: Element, max = 48): string {
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
  return text.length > max ? `${text.slice(0, max)}…` : text
}
