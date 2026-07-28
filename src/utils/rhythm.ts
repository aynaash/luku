/**
 * @module design/utils/rhythm
 *
 * PURPOSE
 * Answer "is this measurement on the system's rhythm?" — used by the inspector's
 * inconsistent-spacing and grid-misalignment rules.
 *
 * DESIGN PRINCIPLE
 * Swiss Design: a page feels ordered when every edge lands on a shared grid.
 * Off-grid values are rarely deliberate; they're almost always a hand-tweak that
 * outlived its reason.
 */
import { BASE_UNIT, SPACE, SPACE_ORDER, type Space } from '../tokens/scale.js'

/** Values in the scale, ascending. */
export const SCALE_VALUES: number[] = SPACE_ORDER.map((k) => SPACE[k])

/** True when `px` is an exact step on the rhythm scale. */
export function isOnScale(px: number, tolerance = 0.5): boolean {
  return SCALE_VALUES.some((v) => Math.abs(v - px) <= tolerance)
}

/** True when `px` at least lands on the 4px base grid, even if not a named step. */
export function isOnGrid(px: number, tolerance = 0.5): boolean {
  const mod = Math.abs(px % BASE_UNIT)
  return mod <= tolerance || Math.abs(mod - BASE_UNIT) <= tolerance
}

/** Nearest named token to an arbitrary pixel value — for "did you mean…" hints. */
export function nearestToken(px: number): { token: Space; value: number; delta: number } {
  let best: Space = SPACE_ORDER[0]
  let bestDelta = Infinity
  for (const token of SPACE_ORDER) {
    const delta = Math.abs(SPACE[token] - px)
    if (delta < bestDelta) {
      bestDelta = delta
      best = token
    }
  }
  return { token: best, value: SPACE[best], delta: Math.round(bestDelta * 10) / 10 }
}

/**
 * Estimated characters per line for a text element. Used for the reading-width
 * and line-length rules.
 *
 * The 0.5 factor approximates average glyph advance as a fraction of font size.
 * It's an approximation on purpose — measuring real advance widths per element
 * would force a layout flush on every audited node.
 */
export function estimateMeasure(widthPx: number, fontSizePx: number): number {
  if (fontSizePx <= 0) return 0
  return Math.round(widthPx / (fontSizePx * 0.5))
}

/** The comfortable band for sustained reading, in characters per line. */
export const MEASURE_BAND = { min: 45, ideal: 65, max: 80 } as const
