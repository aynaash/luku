/**
 * @module design/spacing/Stack
 *
 * PURPOSE
 * Vertical rhythm. The default answer to "how far apart should these be?"
 *
 * DESIGN PRINCIPLE
 * Gestalt proximity: elements close together are read as one group; elements far
 * apart are read as separate. Spacing is therefore not decoration — it is the
 * primary way a layout communicates structure, and it must come from a shared
 * scale or the groupings blur.
 *
 * WHY GAP AND NOT MARGIN
 * Margins belong to children, so a child's spacing depends on who its siblings
 * are — the classic lobotomised-owl problem, plus margin collapse. `gap` belongs
 * to the parent, which is where the grouping decision actually lives. It also
 * means a child can be moved between Stacks without carrying stale spacing.
 *
 * WHEN TO USE
 * Any vertical sequence: form fields, a heading with its paragraph, a list of
 * cards, page sections.
 *
 * WHEN NOT TO USE
 * When items should wrap onto multiple lines — use <Inline>. When you need
 * columns — use <Grid> or <Split>.
 *
 * RESPONSIVE BEHAVIOUR
 * `gap` accepts a responsive object: `gap={{ base: 'md', md: 'xl' }}`. Rhythm
 * should loosen as viewports grow — the same 32px that separates groups on a
 * phone reads as cramped on a 27" display.
 *
 * ACCESSIBILITY
 * Renders a `<div>` by default. Pass `as="ul"`/`as="ol"` for genuine lists so the
 * item count is announced; children then need to be `<li>`.
 *
 * @example
 * <Stack gap="md" align="center">
 *   <Heading>Read deeply</Heading>
 *   <Text tone="secondary">A focused reader for dense technical work.</Text>
 * </Stack>
 */
import { createElement, type ElementType } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'
import { resolveResponsive, type Responsive } from './responsive.js'

export type StackAlign = 'start' | 'center' | 'end' | 'stretch'
export type StackJustify = 'start' | 'center' | 'end' | 'between'

const ALIGN_CLASS: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const JUSTIFY_CLASS: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

export interface StackOwnProps {
  /** Distance between children. Semantic step, not pixels. */
  gap?: Responsive<Space>
  /** Cross-axis alignment. `stretch` (default) makes children fill the width. */
  align?: StackAlign
  /** Main-axis distribution. Only meaningful when the Stack has a fixed height. */
  justify?: StackJustify
  /** Reverses visual order without changing DOM order (keeps tab order sane). */
  reverse?: boolean
  className?: string
}

export function Stack<T extends ElementType = 'div'>({
  as,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  reverse = false,
  className,
  children,
  ...rest
}: PolymorphicProps<T, StackOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'stack',
      'data-design-gap': typeof gap === 'string' ? gap : gap.base,
      className: cn(
        'flex',
        reverse ? 'flex-col-reverse' : 'flex-col',
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
