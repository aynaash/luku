import type { Rule } from '../types.js'
import { competingEmphasis, headingOrder } from './structure.js'
import { alignment, headingAttachment, proximity, spacingScale } from './rhythm.js'
import { clippedText, contrast, measure, typeScale } from './text.js'
import { balance, density, overflow, repetition, tapTarget } from './layout.js'
import { focusVisible } from './a11y.js'

/**
 * Registry order is report order within a severity band, so it doubles as a
 * priority list: the things that break the page, then the things that make it
 * unusable, then the things that make it worse.
 */
export const RULES: Rule[] = [
  // Broken
  overflow,
  clippedText,
  // Unusable
  contrast,
  focusVisible,
  tapTarget,
  headingOrder,
  // Incoherent
  measure,
  proximity,
  headingAttachment,
  alignment,
  competingEmphasis,
  spacingScale,
  typeScale,
  // Uncomfortable
  density,
  balance,
  repetition,
]

export const RULE_IDS = RULES.map((r) => r.id)

export {
  overflow,
  clippedText,
  contrast,
  focusVisible,
  tapTarget,
  headingOrder,
  measure,
  proximity,
  headingAttachment,
  alignment,
  competingEmphasis,
  spacingScale,
  typeScale,
  density,
  balance,
  repetition,
}
