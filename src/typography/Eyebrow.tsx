/**
 * @module design/typography/Eyebrow
 *
 * PURPOSE
 * The small, wide-tracked kicker that sits above a section title and says what
 * *kind* of thing follows.
 *
 * DESIGN PRINCIPLE
 * Editorial layout. A kicker gives the reader a category before the headline
 * gives them a claim — it's how a magazine spread orients you in under a second.
 * The all-caps + wide-tracking + tiny-size treatment is deliberate: it must be
 * legible but must never compete with the title beneath it.
 *
 * WHY IT'S NOT A HEADING
 * An eyebrow is a label for the section, not a level in the outline. Marking it
 * up as `<h3>` above an `<h2>` inverts the document structure. It renders as a
 * `<p>` and, when `describes` is set, is wired to the heading with
 * `aria-describedby` so the relationship survives into the accessibility tree.
 *
 * WHEN TO USE
 * Above section titles, on cards that belong to a category, above pull-stats.
 *
 * WHEN NOT TO USE
 * More than once per section — a page of eyebrows is a page of noise. And never
 * for anything the reader must actually read: all-caps at 10px is the worst
 * possible setting for a sentence.
 *
 * ACCESSIBILITY
 * All-caps is applied with CSS `text-transform`, not by capitalising the source
 * string, so screen readers announce the word normally rather than spelling out
 * an acronym. Wide letter-spacing helps low-vision users track the small size.
 *
 * @example
 * <Stack gap="xs">
 *   <Eyebrow>Why notes matter</Eyebrow>
 *   <Heading>Reading is input. Notes are understanding.</Heading>
 * </Stack>
 */
import type { ReactNode } from 'react'
import { ALIGN, TONE, TYPE_ROLE, type Align, type Tone } from '../tokens/typography.js'
import { cn } from '../utils/cn.js'

export interface EyebrowProps {
  children: ReactNode
  tone?: Tone
  align?: Align
  /** id of the heading this eyebrow labels — wires up `aria-describedby`. */
  describes?: string
  className?: string
  id?: string
}

export function Eyebrow({
  children,
  tone = 'accent',
  align = 'start',
  describes,
  className,
  id,
}: EyebrowProps) {
  return (
    <p
      id={id}
      data-design="eyebrow"
      aria-describedby={describes}
      className={cn(TYPE_ROLE.eyebrow, TONE[tone], ALIGN[align], 'opacity-70', className)}
    >
      {children}
    </p>
  )
}
