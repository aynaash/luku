/**
 * @module design/typography/Quote
 *
 * PURPOSE
 * Pull-quotes and blockquotes — text that interrupts the flow deliberately.
 *
 * DESIGN PRINCIPLE
 * Editorial layout. A pull-quote earns attention by *differing* on several axes
 * at once: larger, italic, serif, and offset from the measure. Changing only one
 * axis reads as an accident; changing several reads as intent.
 *
 * WHEN TO USE
 * A sentence from the body worth re-reading, a testimonial, a stated principle.
 *
 * WHEN NOT TO USE
 * More than once or twice per page — a pull-quote is an interruption, and
 * constant interruption is just noise. Don't use it for text that isn't actually
 * a quotation *and* isn't a stated principle; large italic serif for ordinary
 * copy is decoration pretending to be hierarchy.
 *
 * ACCESSIBILITY
 * Renders `<blockquote>` with an optional `<cite>` inside `<figcaption>` when
 * attributed. If the quote merely repeats adjacent body text, mark it
 * `aria-hidden` — screen-reader users otherwise hear the same sentence twice.
 *
 * @example
 * <Quote variant="rule" attribution="The first user">
 *   If you didn't write a note about it, you didn't read it.
 * </Quote>
 */
import type { ReactNode } from 'react'
import { ALIGN, FAMILY, TONE, TYPE_ROLE, type Align, type Tone } from '../tokens/typography.js'
import { MEASURE, type Measure } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'

export type QuoteVariant = 'plain' | 'rule' | 'panel'

export interface QuoteProps {
  children: ReactNode
  /**
   * plain — type alone does the work
   * rule  — accent rule on the leading edge (classic editorial aside)
   * panel — tinted surface; the loudest option, use once per page
   */
  variant?: QuoteVariant
  attribution?: ReactNode
  tone?: Tone
  align?: Align
  measure?: Measure
  className?: string
}

const VARIANT_CLASS: Record<QuoteVariant, string> = {
  plain: '',
  rule: 'border-l-2 border-[var(--accent)]/40 pl-6 py-2',
  panel: 'rounded-[2rem] border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-8',
}

export function Quote({
  children,
  variant = 'plain',
  attribution,
  tone = 'primary',
  align = 'start',
  measure = 'lg',
  className,
}: QuoteProps) {
  const quote = (
    <blockquote
      data-design="quote"
      data-design-variant={variant}
      className={cn(
        TYPE_ROLE.quote,
        TONE[tone],
        FAMILY.display,
        ALIGN[align],
        MEASURE[measure],
        VARIANT_CLASS[variant],
        '[text-wrap:balance]',
        className,
      )}
    >
      {children}
    </blockquote>
  )

  if (!attribution) return quote

  return (
    <figure data-design="quote-figure" className="flex flex-col gap-4">
      {quote}
      <figcaption className={cn(TYPE_ROLE.caption, TONE.muted, FAMILY.mono, ALIGN[align], 'italic')}>
        <cite className="not-italic">— {attribution}</cite>
      </figcaption>
    </figure>
  )
}
