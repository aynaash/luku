/**
 * @module design/utils/ratio
 *
 * PURPOSE
 * Turn a compositional ratio into CSS grid track definitions.
 *
 * DESIGN PRINCIPLE
 * Golden ratio / rule of thirds. An asymmetric split reads as *composed*; a 50/50
 * split reads as *undecided* unless the two halves are genuinely equal in weight.
 *
 * WHY `minmax(0, Nfr)` AND NOT `Nfr`
 * A bare `fr` track has an implicit `min-width: auto`, so a long unbreakable
 * string (a URL, a code token) blows the track past its share and silently
 * breaks the ratio. `minmax(0, …)` is the fix, and getting it wrong is the single
 * most common grid bug — so the engine encodes it once, here.
 */
import { RATIO, type RatioName } from '../tokens/scale.js'

export type SplitBias = 'start' | 'end'

/**
 * @param ratio  named composition ratio
 * @param bias   which side gets the *major* portion
 * @returns a `grid-template-columns` value
 */
export function splitTracks(ratio: RatioName, bias: SplitBias = 'end'): string {
  const major = RATIO[ratio]
  const a = bias === 'end' ? 1 : major
  const b = bias === 'end' ? major : 1
  return `minmax(0, ${round(a)}fr) minmax(0, ${round(b)}fr)`
}

/** Three tracks with the focal weight on one third — rule-of-thirds grids. */
export function thirdsTracks(): string {
  return 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)'
}

/**
 * Golden-section subdivision of a length, e.g. for computing a hero's optical
 * centre. Returns [minor, major] summing to `total`.
 */
export function goldenSplit(total: number): [number, number] {
  const minor = total / RATIO.golden
  return [round(total - minor), round(minor)]
}

/**
 * Rule-of-thirds intersection points as percentages. These are the four spots a
 * viewer's eye lands on first — anchor a focal element to one of them.
 */
export const THIRDS_POINTS = {
  topLeft: { x: 33.333, y: 33.333 },
  topRight: { x: 66.667, y: 33.333 },
  bottomLeft: { x: 33.333, y: 66.667 },
  bottomRight: { x: 66.667, y: 66.667 },
} as const

export type ThirdsPoint = keyof typeof THIRDS_POINTS

/**
 * Optical centre. The true geometric centre of a tall block looks like it sits
 * too low, so designers place focal content slightly above it — at ~45%, close
 * to the golden section. Apple's layouts do this consistently.
 */
export const OPTICAL_CENTER_Y = 45

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
