/**
 * @module design/utils/contrast
 *
 * PURPOSE
 * WCAG 2.1 contrast maths, used by <DesignInspector /> to flag unreadable text
 * against its *effective* background (walking up the tree past transparent
 * ancestors, which is where naive contrast checkers get it wrong).
 *
 * These are pure functions with no DOM dependency beyond the optional
 * `effectiveBackground` helper, so they're testable in isolation.
 */

export interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

/** Parses `rgb()`, `rgba()`, `#rgb`, `#rrggbb`. Returns null for `transparent`. */
export function parseColor(input: string): Rgb | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  const fn = value.match(/^rgba?\(([^)]+)\)$/)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
    const [r, g, b, a] = parts
    if (r === undefined || g === undefined || b === undefined) return null
    return {
      r: channel(r),
      g: channel(g),
      b: channel(b),
      a: a === undefined ? 1 : alpha(a),
    }
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }

  return null
}

/** Composites a translucent foreground over an opaque backdrop. */
export function flatten(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  }
}

/** WCAG relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  const [rl, gl, bl] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Minimum ratio required by WCAG AA.
 * Large text = 18.66px bold, or 24px regular.
 */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)
  return large ? 3 : 4.5
}

/**
 * Walks ancestors until an opaque background is found, compositing translucent
 * layers on the way down. Falls back to white — the browser's own default.
 */
export function effectiveBackground(el: Element): Rgb {
  const layers: Rgb[] = []
  let node: Element | null = el

  while (node) {
    const bg = parseColor(getComputedStyle(node).backgroundColor)
    if (bg && bg.a > 0) {
      layers.push(bg)
      if (bg.a >= 1) break
    }
    node = node.parentElement
  }

  let result: Rgb = { r: 255, g: 255, b: 255, a: 1 }
  for (let i = layers.length - 1; i >= 0; i--) {
    result = flatten(layers[i], result)
  }
  return result
}

function channel(v: string): number {
  return v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v)
}

function alpha(v: string): number {
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)
}
