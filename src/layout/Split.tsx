/**
 * @module design/layout/Split
 *
 * PURPOSE
 * Two-column layouts whose proportion is a deliberate compositional choice.
 *
 * DESIGN PRINCIPLE
 * Golden ratio and rule of thirds. A 50/50 split reads as neutral — appropriate
 * only when the two sides are genuine peers (a before/after comparison). Every
 * other pairing has a dominant side, and saying so with an asymmetric ratio is
 * what makes a layout look *composed* rather than merely arranged.
 *
 * WHEN TO USE
 * Text beside imagery, problem beside solution, form beside explanation, content
 * beside a supporting aside.
 *
 * WHEN NOT TO USE
 * For three or more peers — use <Grid>. For a persistent navigation rail — use
 * <Sidebar>, which handles stickiness and the mobile drawer question.
 *
 * RESPONSIVE BEHAVIOUR
 * Stacks to a single column below the `at` breakpoint (default `lg`). `swapOnStack`
 * controls which side comes first when stacked — usually the *minor* side should
 * lead on mobile if it holds the image, since a wall of text before any visual
 * anchor performs badly.
 *
 * ACCESSIBILITY
 * DOM order is the reading order for screen readers and keyboard users. `reverse`
 * flips only the visual order (via `direction`), so if the *semantic* order should
 * change too, reorder the children instead.
 *
 * @example
 * <Split ratio="golden" bias="start" gap="2xl">
 *   <Prose>…the argument…</Prose>
 *   <Figure src="/diagram.png" />
 * </Split>
 */
import { Children, type ReactNode } from 'react'
import { GAP_CLASS, type RatioName, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { splitTracks, type SplitBias } from '../utils/ratio.js'

export type SplitBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

const STACK_AT: Record<SplitBreakpoint, string> = {
  sm: 'sm:grid-cols-[var(--split-tracks)]',
  md: 'md:grid-cols-[var(--split-tracks)]',
  lg: 'lg:grid-cols-[var(--split-tracks)]',
  xl: 'xl:grid-cols-[var(--split-tracks)]',
}

export interface SplitProps {
  /** Exactly two children. Extra children are rendered but break the ratio. */
  children: ReactNode
  /** golden (1:1.618) · thirds (1:2) · half (1:1) · quarter (1:3) */
  ratio?: RatioName
  /** Which side receives the *major* share. Default `end`. */
  bias?: SplitBias
  gap?: Space
  /** Breakpoint at which the columns appear. Below it, content stacks. */
  at?: SplitBreakpoint
  /** Vertical alignment of the two columns relative to each other. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Reverse visual order only; DOM (and therefore reading) order is unchanged. */
  reverse?: boolean
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<SplitProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

export function Split({
  children,
  ratio = 'golden',
  bias = 'end',
  gap = 'xl',
  at = 'lg',
  align = 'start',
  reverse = false,
  className,
}: SplitProps) {
  if (process.env.NODE_ENV !== 'production') {
    const count = Children.count(children)
    if (count !== 2) {
      // eslint-disable-next-line no-console
      console.warn(
        `[design] <Split> expects exactly 2 children, received ${count}. ` +
          `The ratio only describes two tracks — use <Grid> for ${count} peers.`,
      )
    }
  }

  return (
    <div
      data-design="split"
      data-design-ratio={ratio}
      style={{ ['--split-tracks' as string]: splitTracks(ratio, bias) }}
      className={cn(
        'grid grid-cols-1',
        STACK_AT[at],
        ALIGN_CLASS[align],
        GAP_CLASS[gap],
        // `order` swaps which track each child lands in, leaving DOM order —
        // and therefore screen-reader and tab order — untouched.
        reverse && '[&>*:first-child]:order-2 [&>*:last-child]:order-1',
        className,
      )}
    >
      {children}
    </div>
  )
}
