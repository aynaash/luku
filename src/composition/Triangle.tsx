/**
 * @module design/composition/Triangle
 *
 * PURPOSE
 * Arrange three elements so the eye travels a closed path between them instead of
 * escaping off the edge of the layout.
 *
 * DESIGN PRINCIPLE
 * Triangle composition, borrowed from painting and cinematography. Three points
 * of interest form the most stable arrangement the eye can rest in: the gaze
 * moves between them and returns, rather than exiting the frame. A base-down
 * triangle (two anchors below, one apex above) feels grounded and calm; a
 * base-up triangle feels dynamic and unresolved — useful when you *want* momentum
 * toward what follows.
 *
 * WHEN TO USE
 * Three-item feature rows, pricing tiers, testimonial trios, an icon-headline-CTA
 * cluster that should read as a single unit.
 *
 * WHEN NOT TO USE
 * With any count other than three. Four points form a rectangle — stable to the
 * point of inert — and the effect simply doesn't exist for two. Use <Grid>.
 *
 * RESPONSIVE BEHAVIOUR
 * Below `md` the triangle flattens into a stack. The offsets that create the
 * triangle need horizontal room; forcing them onto a phone produces a staircase,
 * not a composition.
 *
 * ACCESSIBILITY
 * The apex is visually first but can be placed anywhere in the DOM. Put it first
 * in source when it is genuinely the most important of the three, so that
 * keyboard and screen-reader order match the visual emphasis.
 *
 * @example
 * <Triangle apex="top">
 *   <Card>Explain</Card>   // apex — rendered raised and centred
 *   <Card>Highlight</Card>
 *   <Card>Recall</Card>
 * </Triangle>
 */
import { Children, type ReactNode } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'

export interface TriangleProps {
  /** Exactly three children. The first is the apex. */
  children: ReactNode
  /**
   * `top`    — apex raised, base below: stable, resolved, terminal.
   * `bottom` — apex dropped, base above: dynamic, pushes the eye onward.
   */
  apex?: 'top' | 'bottom'
  /** How far the apex is displaced from the base line. */
  lift?: 'subtle' | 'medium' | 'strong'
  gap?: Space
  className?: string
}

const LIFT: Record<NonNullable<TriangleProps['lift']>, { apex: string; base: string }> = {
  subtle: { apex: 'md:-translate-y-4', base: 'md:translate-y-2' },
  medium: { apex: 'md:-translate-y-10', base: 'md:translate-y-4' },
  strong: { apex: 'md:-translate-y-16', base: 'md:translate-y-8' },
}

export function Triangle({
  children,
  apex = 'top',
  lift = 'medium',
  gap = 'md',
  className,
}: TriangleProps) {
  const items = Children.toArray(children)

  if (process.env.NODE_ENV !== 'production' && items.length !== 3) {
    // eslint-disable-next-line no-console
    console.warn(
      `[design] <Triangle> needs exactly 3 children, received ${items.length}. ` +
        `Triangle composition is undefined for any other count — use <Grid>.`,
    )
  }

  const [first, ...rest] = items
  const direction = apex === 'top' ? 1 : -1

  return (
    <div
      data-design="triangle"
      data-design-apex={apex}
      className={cn('grid grid-cols-1 md:grid-cols-3 items-center', GAP_CLASS[gap], className)}
    >
      {/* Apex sits in the centre column, displaced along the vertical axis. */}
      <div
        data-design="triangle-apex"
        className={cn(
          'md:col-start-2 md:row-start-1 transition-transform duration-500',
          direction === 1 ? LIFT[lift].apex : LIFT[lift].base,
        )}
      >
        {first}
      </div>

      {rest.map((child, i) => (
        <div
          key={i}
          data-design="triangle-base"
          className={cn(
            i === 0 ? 'md:col-start-1' : 'md:col-start-3',
            'md:row-start-1 transition-transform duration-500',
            direction === 1 ? LIFT[lift].base : LIFT[lift].apex,
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
