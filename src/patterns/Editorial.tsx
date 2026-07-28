'use client'

/**
 * @module design/patterns/Editorial
 *
 * PURPOSE
 * Long-form and magazine compositions: a measured reading column, asides that sit
 * beside it, and full-bleed interruptions that reset the eye.
 *
 * DESIGN PRINCIPLE
 * Editorial layout descends from print, where the constraints were physical and
 * therefore honest. Three carry over intact:
 *
 * 1. The text column has a fixed measure and never stretches to the page.
 * 2. Asides and figures hang *outside* that column, in the margin, so the reading
 *    line is never interrupted mid-thought.
 * 3. Full-bleed images are structural punctuation — they mark a change of subject,
 *    and used more than a few times per piece they stop marking anything.
 *
 * WHEN TO USE
 * Essays, documentation, changelogs, the narrative section of a landing page.
 *
 * WHEN NOT TO USE
 * For scannable content. A reader who is *looking for* something wants an
 * F-pattern with headings and lists, not a beautifully-set column of prose.
 *
 * RESPONSIVE BEHAVIOUR
 * The margin column collapses below `lg` and asides fall inline, after the
 * paragraph they relate to — which is why they must be placed near that paragraph
 * in source rather than positioned absolutely.
 *
 * ACCESSIBILITY
 * Renders `<article>` with the margin as `<aside>`. Since asides land inline on
 * mobile, keep them genuinely parenthetical: content nobody can afford to miss
 * doesn't belong in the margin at any width.
 *
 * @example
 * <Editorial>
 *   <EditorialLead>The knowledge wasn't sticking.</EditorialLead>
 *   <Text>…</Text>
 *   <EditorialAside>A "context byte" is the smallest unit of understanding.</EditorialAside>
 *   <Text>…</Text>
 * </Editorial>
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { GAP_CLASS, MEASURE, type Measure, type Space } from '../tokens/scale.js'
import { Text } from '../typography/Text.js'
import { Quote } from '../typography/Quote.js'

export interface EditorialProps {
  children: ReactNode
  /** Reading measure for the main column. */
  measure?: Measure
  /** Rhythm between blocks. */
  gap?: Space
  /**
   * Reserve a margin column for asides on wide viewports. Off by default —
   * a hanging margin needs real horizontal room to be worth the complexity.
   */
  margin?: boolean
  className?: string
}

export function Editorial({
  children,
  measure = 'lg',
  gap = 'md',
  margin = false,
  className,
}: EditorialProps) {
  if (!margin) {
    return (
      <article
        data-design="editorial"
        className={cn('mx-auto flex flex-col', MEASURE[measure], GAP_CLASS[gap], className)}
      >
        {children}
      </article>
    )
  }

  return (
    <article
      data-design="editorial"
      data-design-margin="true"
      className={cn(
        'mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,68ch)_minmax(0,20ch)] lg:gap-x-12',
        // Everything defaults into the reading column; asides opt out.
        '[&>*]:col-start-1',
        GAP_CLASS[gap],
        className,
      )}
    >
      {children}
    </article>
  )
}

/**
 * The opening paragraph. Larger and higher-contrast than the body — print calls
 * this the "standfirst", and it exists to convert a scanner into a reader.
 */
export function EditorialLead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text
      size="lead"
      tone="primary"
      family="display"
      measure="none"
      italic
      className={cn('leading-relaxed', className)}
    >
      {children}
    </Text>
  )
}

/**
 * A marginal note. Inside `<Editorial margin>` it hangs in the margin column on
 * wide screens; otherwise it renders as a ruled aside inline.
 */
export function EditorialAside({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <aside
      data-design="editorial-aside"
      className={cn(
        'lg:col-start-2 lg:row-auto lg:self-start',
        'border-l-2 border-[var(--accent)]/30 pl-5',
        'text-sm leading-relaxed text-[var(--text-secondary)] italic',
        className,
      )}
    >
      {children}
    </aside>
  )
}

/**
 * A pull-quote that spans both columns and interrupts the flow. One or two per
 * piece; more and the interruptions become the flow.
 */
export function EditorialBreak({
  children,
  attribution,
  className,
}: {
  children: ReactNode
  attribution?: ReactNode
  className?: string
}) {
  return (
    <div data-design="editorial-break" className={cn('lg:col-span-2 py-6', className)}>
      <Quote variant="rule" attribution={attribution} measure="lg">
        {children}
      </Quote>
    </div>
  )
}
