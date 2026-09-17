/**
 * @module core/scale
 *
 * Spacing-scale inference, and the reading-measure estimate.
 *
 * WHY INFER INSTEAD OF ASSERT
 * A linter that ships its own spacing scale is only correct for projects that
 * already agreed to it, and produces noise for everyone else — which is how
 * linters get muted. Instead: read every spacing value the page actually
 * paints, treat the common ones as the system, and report the rare ones as
 * strays. That makes "20px twice on a page built from 8/16/24/32" a finding,
 * and makes "everything is a multiple of 5" a non-finding, which is the honest
 * answer in both cases.
 *
 * The inference is deterministic — a pure function of the rendered tree.
 */

/**
 * The scale is the smallest set of steps that accounts for this much of the
 * page's spacing. Everything outside it is the tail, and the tail is where
 * strays live.
 *
 * A per-value share threshold — "a step must be >=3% of all spacing" — is the
 * obvious formulation and it is wrong, because share is a function of page
 * size. On a page with thousands of elements a legitimate step used by thirty
 * of them falls under any fixed share, drops out of the "system", and then
 * every single use of it is reported as a stray. Measured against
 * tailwindcss.com, that formulation inferred a six-step scale and confidently
 * reported Tailwind's own `p-3`, `p-5`, `p-16` and `p-24` as off-system.
 *
 * Coverage has no such dependence: a tidy page reaches 92% in a few steps, a
 * messy one needs more, and in both cases what is left over is genuinely rare.
 */
const COVERAGE = 0.92
/** A step must be used by at least this many distinct elements, at any page size. */
const MIN_OCCURRENCES = 3
/** Real design systems run to about twenty steps. Tailwind's default has 25. */
const MAX_STEPS = 24
/** Below this many samples the distribution is meaningless; the rule stands down. */
export const MIN_SAMPLES = 20
/** Values above this are page-level composition, not rhythm. Ignored. */
const MAX_TRACKED = 400

export interface ScaleReport {
  scale: number[]
  baseUnit: number
  samples: number
}

/**
 * Reads the page's own spacing distribution.
 *
 * @param elements  every visible element, in document order
 * @param getStyle  cached computed-style accessor
 */
export function inferScale(
  elements: Element[],
  getStyle: (el: Element) => CSSStyleDeclaration,
): ScaleReport {
  const counts = new Map<number, number>()
  let samples = 0

  for (const el of elements) {
    const s = getStyle(el)
    const values = [
      s.rowGap,
      s.columnGap,
      s.paddingTop,
      s.paddingBottom,
      s.paddingLeft,
      s.paddingRight,
      s.marginTop,
      s.marginBottom,
    ]

    // Count each value once per element, not once per property. `padding: 13px`
    // otherwise votes four times and a single stray element can install itself
    // as a step in the scale it is violating.
    const here = new Set<number>()
    for (const raw of values) {
      const px = parseFloat(raw)
      if (!Number.isFinite(px) || px <= 0 || px > MAX_TRACKED) continue
      // Half-pixel buckets: rem-based scales land on .5 legitimately, and
      // rounding to integers would merge 14 and 14.4 into one phantom step.
      here.add(Math.round(px * 2) / 2)
    }
    for (const bucket of here) {
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
      samples++
    }
  }

  if (samples < MIN_SAMPLES) return { scale: [], baseUnit: 0, samples }

  // Most-used first, so accumulating coverage takes the system and leaves the
  // tail. Ties break on the smaller value to keep the result deterministic.
  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= MIN_OCCURRENCES)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])

  const scale: number[] = []
  let covered = 0
  for (const [value, count] of ranked) {
    if (scale.length >= MAX_STEPS) break
    if (covered / samples >= COVERAGE) break
    scale.push(value)
    covered += count
  }
  scale.sort((a, b) => a - b)

  return { scale, baseUnit: inferBaseUnit(scale), samples }
}

/**
 * The largest of 8/4/2/1 that divides most of the scale. Not a strict GCD —
 * one odd value in an otherwise 8px system shouldn't collapse the answer to 1.
 */
export function inferBaseUnit(scale: number[]): number {
  if (scale.length === 0) return 0
  for (const unit of [8, 4, 2]) {
    const onUnit = scale.filter((v) => Math.abs(v % unit) < 0.01).length
    if (onUnit / scale.length >= 0.8) return unit
  }
  return 1
}

/** True when `px` sits on one of the scale's steps. */
export function onScale(px: number, scale: number[], tolerance = 0.51): boolean {
  for (const v of scale) if (Math.abs(v - px) <= tolerance) return true
  return false
}

/** Nearest step, for "did you mean…" hints. */
export function nearestStep(px: number, scale: number[]): number {
  let best = scale[0] ?? px
  let delta = Infinity
  for (const v of scale) {
    const d = Math.abs(v - px)
    if (d < delta) {
      delta = d
      best = v
    }
  }
  return best
}

/**
 * Estimated characters per line.
 *
 * The 0.5 factor approximates average glyph advance as a fraction of font
 * size. It is an approximation on purpose: measuring real advance widths per
 * element would force a layout flush on every audited node, and the rule only
 * needs to distinguish "about 60" from "about 110".
 */
export function estimateMeasure(widthPx: number, fontSizePx: number): number {
  if (fontSizePx <= 0 || widthPx <= 0) return 0
  return Math.round(widthPx / (fontSizePx * 0.5))
}

/** Comfortable band for sustained reading, in characters per line. */
export const DEFAULT_MEASURE = { min: 45, max: 80 }

/** Headlines want to read as one gesture, not as a paragraph set large. */
export const HEADLINE_MEASURE_MAX = 50
/** Below this font size an element isn't playing the "headline" game. */
export const HEADLINE_MIN_FONT_PX = 28
