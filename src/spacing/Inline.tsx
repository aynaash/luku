/**
 * @module design/spacing/Inline
 *
 * PURPOSE
 * Horizontal rhythm that wraps gracefully. The companion to <Stack>.
 *
 * DESIGN PRINCIPLE
 * Gestalt proximity and continuity. A row of related controls reads as one unit
 * only if the spacing inside it is tighter than the spacing around it — so Inline
 * defaults to a tighter step (`sm`) than Stack (`md`).
 *
 * WHY IT WRAPS BY DEFAULT
 * Horizontal rows are the most common source of mobile overflow. Wrapping is
 * almost always the right behaviour and almost always forgotten, so it's the
 * default; opt out with `wrap={false}` when you genuinely want a single line.
 *
 * WHEN TO USE
 * Button groups, tag lists, nav links, an icon beside its label, metadata rows.
 *
 * WHEN NOT TO USE
 * For proportional columns — that's <Split> or <Grid>. Inline sizes to content;
 * it does not create a column structure.
 *
 * RESPONSIVE BEHAVIOUR
 * Wraps at the container's natural limit. Pass `collapse` to stack vertically
 * below `sm` — the right call for CTA rows, where side-by-side buttons on a phone
 * end up too narrow to read.
 *
 * ACCESSIBILITY
 * Visual order follows DOM order, so tab order stays correct. Use `as="nav"` +
 * `aria-label` for navigation groups.
 *
 * @example
 * <Inline gap="xs" align="center">
 *   <Sparkles size={20} />
 *   <Text size="small">Join the community</Text>
 * </Inline>
 */
import { createElement, type ElementType } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'
import { resolveResponsive, baseOf, type Responsive } from './responsive.js'

export type InlineAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'
export type InlineJustify = 'start' | 'center' | 'end' | 'between' | 'around'

const ALIGN_CLASS: Record<InlineAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
}

const JUSTIFY_CLASS: Record<InlineJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
}

export interface InlineOwnProps {
  gap?: Responsive<Space>
  /**
   * Cross-axis alignment. `baseline` is the right choice when items have
   * different type sizes — aligning their centres makes text look off-kilter.
   */
  align?: InlineAlign
  justify?: InlineJustify
  /** Allow items onto multiple lines. Default true. */
  wrap?: boolean
  /** Stack vertically below the `sm` breakpoint. */
  collapse?: boolean
  className?: string
}

export function Inline<T extends ElementType = 'div'>({
  as,
  gap = 'sm',
  align = 'center',
  justify = 'start',
  wrap = true,
  collapse = false,
  className,
  children,
  ...rest
}: PolymorphicProps<T, InlineOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'inline',
      'data-design-gap': baseOf(gap),
      className: cn(
        'flex',
        collapse ? 'flex-col sm:flex-row' : 'flex-row',
        wrap && 'flex-wrap',
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        resolveResponsive(gap, GAP_CLASS),
        className,
      ),
      ...rest,
    },
    children,
  )
}
