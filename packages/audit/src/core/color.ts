/**
 * @module core/color
 *
 * WCAG 2.1 contrast maths against the *composited* background — walking up the
 * tree past translucent ancestors, which is where naive checkers get it wrong.
 * A card at `bg-white/5` over a dark section is neither white nor the section
 * colour, and the text on it passes or fails depending on the difference.
 */

import { backgroundImageCoversText } from './dom.js'
import {
  displayP3ToRgb,
  hslToRgb,
  labToRgb,
  oklabToRgb,
  parseComponent,
  polarToRectangular,
  splitComponents,
} from './convert.js'

export interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

const NAMED: Record<string, Rgb> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
}

/**
 * Parses every colour form `getComputedStyle` can hand back.
 *
 * `rgb()` and hex are the easy half. The other half — `lab()`, `oklab()`,
 * `oklch()`, `lch()`, `color()` — is not exotic any more: a Tailwind v4 site
 * serialises roughly half its computed colours into CIE spaces. Returning null
 * for those is what makes a contrast checker report 1.00:1 on legible text.
 */
export function parseColor(input: string): Rgb | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (NAMED[value]) return { ...NAMED[value] }

  const fn = value.match(/^rgba?\(([^)]+)\)$/)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
    const [r, g, b, a] = parts
    if (r === undefined || g === undefined || b === undefined) return null
    return { r: channel(r), g: channel(g), b: channel(b), a: a === undefined ? 1 : alpha(a) }
  }

  const hsl = value.match(/^hsla?\(([^)]+)\)$/)
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const [r, g, b] = hslToRgb(
      parseComponent(parts[0]),
      parseComponent(parts[1], 1) / (parts[1].endsWith('%') ? 1 : 100),
      parseComponent(parts[2], 1) / (parts[2].endsWith('%') ? 1 : 100),
    )
    return { r, g, b, a: parts[3] === undefined ? 1 : alpha(parts[3]) }
  }

  // oklab(L a b / α) — L is 0–1, a and b roughly ±0.4.
  const oklab = value.match(/^oklab\(([^)]+)\)$/)
  if (oklab) {
    const { parts, alpha: a } = splitComponents(oklab[1])
    if (parts.length < 3) return null
    const [r, g, b] = oklabToRgb(parseComponent(parts[0], 1), parseComponent(parts[1], 0.4), parseComponent(parts[2], 0.4))
    return { r, g, b, a }
  }

  // oklch(L C H / α) — polar form of the same space.
  const oklch = value.match(/^oklch\(([^)]+)\)$/)
  if (oklch) {
    const { parts, alpha: a } = splitComponents(oklch[1])
    if (parts.length < 3) return null
    const [aa, bb] = polarToRectangular(parseComponent(parts[1], 0.4), parseComponent(parts[2]))
    const [r, g, b] = oklabToRgb(parseComponent(parts[0], 1), aa, bb)
    return { r, g, b, a }
  }

  // lab(L a b / α) — CIE Lab against D50. L is 0–100.
  const lab = value.match(/^lab\(([^)]+)\)$/)
  if (lab) {
    const { parts, alpha: a } = splitComponents(lab[1])
    if (parts.length < 3) return null
    const [r, g, b] = labToRgb(parseComponent(parts[0], 100), parseComponent(parts[1], 125), parseComponent(parts[2], 125))
    return { r, g, b, a }
  }

  // lch(L C H / α)
  const lch = value.match(/^lch\(([^)]+)\)$/)
  if (lch) {
    const { parts, alpha: a } = splitComponents(lch[1])
    if (parts.length < 3) return null
    const [aa, bb] = polarToRectangular(parseComponent(parts[1], 150), parseComponent(parts[2]))
    const [r, g, b] = labToRgb(parseComponent(parts[0], 100), aa, bb)
    return { r, g, b, a }
  }

  // color(<space> r g b / α) — srgb and display-p3 are the ones that appear.
  const fnColor = value.match(/^color\(\s*([\w-]+)\s+([^)]+)\)$/)
  if (fnColor) {
    const space = fnColor[1]
    const { parts, alpha: a } = splitComponents(fnColor[2])
    if (parts.length < 3) return null
    const [c0, c1, c2] = parts.map((p) => parseComponent(p, 1))
    if (space === 'display-p3') {
      const [r, g, b] = displayP3ToRgb(c0, c1, c2)
      return { r, g, b, a }
    }
    if (space === 'srgb') return { r: c0 * 255, g: c1 * 255, b: c2 * 255, a }
    if (space === 'srgb-linear') {
      const encode = (c: number) =>
        (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255
      return { r: encode(c0), g: encode(c1), b: encode(c2), a }
    }
    // An unknown space is better admitted than guessed at.
    return null
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    }
  }

  return null
}

/** `255`, `100%` — both legal in an rgb() channel. */
function channel(value: string): number {
  return value.endsWith('%') ? (parseFloat(value) / 100) * 255 : parseFloat(value)
}

/** `0.5`, `50%` — both legal as an alpha. */
function alpha(value: string): number {
  return value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
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

export function luminance({ r, g, b }: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** AA minimum. Large text is >=24px, or >=18.66px at weight >=700. */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)
  return large ? 3 : 4.5
}

/**
 * Walks ancestors until an opaque background is found, compositing translucent
 * layers on the way back down. Falls back to white — the browser's own default
 * — rather than to black, which would silently pass light-on-light text.
 */
export interface Backdrop {
  color: Rgb
  /**
   * True when a background image sat between the text and the colour returned,
   * so the real backdrop is a sample we cannot take.
   */
  uncertain: boolean
}

export function effectiveBackground(
  el: Element,
  getStyle: (e: Element) => CSSStyleDeclaration,
): Backdrop {
  const layers: Rgb[] = []
  let node: Element | null = el
  let uncertain = false

  while (node) {
    const style = getStyle(node)

    // An image we cannot sample makes the true backdrop unknowable. The
    // previous behaviour — substitute an opaque mid-grey and stop — invented a
    // number, and an invented number is worse than an admitted unknown: it
    // reported 1.52:1 on links that actually clear 5:1. Now: note the doubt,
    // ignore decorative images entirely, and keep walking for a real colour.
    if (backgroundImageCoversText(style)) uncertain = true

    const bg = parseColor(style.backgroundColor)
    if (bg && bg.a > 0) {
      layers.push(bg)
      if (bg.a >= 1) break
    }
    node = node.parentElement
  }

  let color: Rgb = { r: 255, g: 255, b: 255, a: 1 }
  for (let i = layers.length - 1; i >= 0; i--) color = flatten(layers[i], color)
  return { color, uncertain }
}

/**
 * True when the element's text is painted by something we can't measure —
 * gradient-clipped text, `-webkit-text-fill-color: transparent`. Extremely
 * common in generated hero copy, and a naive reading reports a 1:1 failure on
 * text that is perfectly legible.
 */
export function isUnmeasurableText(style: CSSStyleDeclaration): boolean {
  const fill = style.getPropertyValue('-webkit-text-fill-color')
  if (fill && parseColor(fill)?.a === 0) return true
  const clip = style.getPropertyValue('-webkit-background-clip') || style.backgroundClip
  return clip === 'text'
}
