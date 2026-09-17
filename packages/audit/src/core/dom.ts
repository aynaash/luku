/**
 * @module core/dom
 *
 * DOM helpers shared by every rule. All of them are deterministic: same tree,
 * same answer, no dependence on scroll position or time.
 */

/** Text belonging to this element rather than to its descendants. */
export function ownText(el: Element): string {
  let text = ''
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i]
    if (node.nodeType === 3) text += node.textContent ?? ''
  }
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * The element's accessible name, near enough for a heading check.
 *
 * `textContent` alone is not it. A logo-as-h1 — `<h1><img alt="Hersi."></h1>` —
 * has an empty `textContent` and a perfectly good accessible name, and calling
 * that an empty heading is a false positive on a very common pattern. This
 * follows the parts of accname that matter here: aria-labelledby, then
 * aria-label, then content including the alt text of descendant images and the
 * `<title>` of descendant SVGs.
 */
export function accessibleName(el: Element): string {
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const parts: string[] = []
    for (const id of labelledBy.split(/\s+/)) {
      const target = el.ownerDocument.getElementById(id)
      if (target) parts.push((target.textContent ?? '').trim())
    }
    const joined = parts.filter(Boolean).join(' ').trim()
    if (joined) return joined
  }

  const label = el.getAttribute('aria-label')?.trim()
  if (label) return label

  let name = (el.textContent ?? '').trim()

  if (!name) {
    const parts: string[] = []
    for (const node of Array.from(el.querySelectorAll('img,area,input[type="image"],svg,[role="img"]'))) {
      const alt = node.getAttribute('alt')?.trim()
      if (alt) { parts.push(alt); continue }
      const aria = node.getAttribute('aria-label')?.trim()
      if (aria) { parts.push(aria); continue }
      const title = node.querySelector('title')?.textContent?.trim()
      if (title) parts.push(title)
    }
    name = parts.join(' ').trim()
  }

  return name.replace(/\s+/g, ' ')
}

/** First `max` characters of an element's full text, for context in messages. */
export function snippet(el: Element, max = 40): string {
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * A CSS path from the audit root. Prefers a unique id when one exists, then
 * falls back to `tag:nth-of-type(n)` — which survives class churn, unlike a
 * class-based path, and matters because an agent re-runs this after editing.
 */
export function cssPath(el: Element, root: Element): string {
  if (isUniqueId(el)) return `#${cssEscape(el.id)}`

  const parts: string[] = []
  let node: Element | null = el

  while (node && node !== root && node !== document.documentElement) {
    if (isUniqueId(node)) {
      parts.unshift(`#${cssEscape(node.id)}`)
      return parts.join(' > ')
    }

    const tag = node.tagName.toLowerCase()
    const parent: Element | null = node.parentElement
    if (!parent) {
      parts.unshift(tag)
      break
    }

    const current = node
    const twins: Element[] = []
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i]
      if (child.tagName === current.tagName) twins.push(child)
    }

    parts.unshift(twins.length > 1 ? `${tag}:nth-of-type(${twins.indexOf(current) + 1})` : tag)
    node = parent
  }

  return parts.join(' > ') || el.tagName.toLowerCase()
}

function isUniqueId(el: Element): boolean {
  if (!el.id) return false
  try {
    return el.ownerDocument.querySelectorAll(`#${cssEscape(el.id)}`).length === 1
  } catch {
    return false
  }
}

function cssEscape(value: string): string {
  const globalCSS = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS
  if (globalCSS?.escape) return globalCSS.escape(value)
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}

/**
 * FNV-1a. A stable id needs to be reproducible in a page context with no
 * crypto and no dependencies, and needs to be short enough to read in a diff.
 */
export function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(7, '0')
}

export function round(n: number, places = 1): number {
  const f = Math.pow(10, places)
  return Math.round(n * f) / f
}

/** Document order. The total-ordering tiebreak that makes output diffable. */
export function documentOrder(a: Element, b: Element): number {
  if (a === b) return 0
  const relation = a.compareDocumentPosition(b)
  if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1
  if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1
  return 0
}

/** Interactive things, for the emphasis and tap-target rules. */
export const ACTION_SELECTOR =
  'a[href],button,[role="button"],[role="link"],input[type="submit"],input[type="button"],summary'

/** Elements that participate in layout as boxes rather than as flow content. */
export function isLayoutRelevant(el: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === 'none' || style.display === 'contents') return false
  if (style.visibility === 'hidden') return false
  if (style.position === 'absolute' || style.position === 'fixed') return false
  return true
}

/** Largest of an element's row/column gaps in px. 0 when it isn't flex/grid. */
export function largestGap(style: CSSStyleDeclaration): number {
  const display = style.display
  if (!display.includes('flex') && !display.includes('grid')) return 0
  const row = parseFloat(style.rowGap)
  const col = parseFloat(style.columnGap)
  return Math.max(Number.isFinite(row) ? row : 0, Number.isFinite(col) ? col : 0)
}

/**
 * True when an element's background-image plausibly sits *behind its text*.
 *
 * Not every background-image is a backdrop. The animated-underline pattern —
 * `linear-gradient(...)` at `background-size: 0px 1px`, `no-repeat`, positioned
 * at the bottom — is a 1px rule, and treating it as the backdrop is how a link
 * with 5:1 contrast gets reported at 1.52:1.
 */
export function backgroundImageCoversText(style: CSSStyleDeclaration): boolean {
  const image = style.backgroundImage
  if (!image || image === 'none') return false

  // Multiple backgrounds: the first layer paints on top.
  const size = (style.backgroundSize.split(',')[0] ?? '').trim()
  if (size === 'cover' || size === 'contain' || size === '' || size === 'auto') return true

  const parts = size.split(/\s+/)
  const tiny = (value: string | undefined): boolean => {
    if (!value) return false
    if (value.endsWith('px')) return parseFloat(value) < 8
    if (value.endsWith('%')) return parseFloat(value) < 25
    return false
  }
  // A zero or hairline dimension is a rule, an underline or a divider.
  return !(tiny(parts[0]) || tiny(parts[1]))
}

/**
 * Does this element read as a surface — a card, panel, chip — rather than as a
 * transparent wrapper? Needed because "card" cannot be a selector in a
 * framework-agnostic tool; it has to be derived from what was painted.
 */
export function hasSurface(style: CSSStyleDeclaration): boolean {
  const bg = style.backgroundColor
  if (bg && bg !== 'transparent' && !bg.endsWith(', 0)') && !bg.endsWith(',0)')) return true
  if (style.backgroundImage && style.backgroundImage !== 'none') return true
  const border = parseFloat(style.borderTopWidth) || parseFloat(style.borderLeftWidth) || 0
  if (border > 0 && style.borderTopStyle !== 'none') return true
  return style.boxShadow !== 'none' && style.boxShadow !== ''
}
