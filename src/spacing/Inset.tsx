/**
 * @module design/spacing/Inset
 *
 * PURPOSE
 * Internal padding from the shared scale. The counterpart to Stack/Inline, which
 * handle space *between* things; Inset handles space *inside* a thing.
 *
 * DESIGN PRINCIPLE
 * Refactoring UI: padding should scale with the element. A dense table cell and a
 * hero card cannot share a padding value and both look right. Also — internal
 * padding must be *smaller* than the gap separating that element from its
 * neighbours, or the boundary between "inside" and "outside" dissolves and
 * Gestalt proximity stops doing its job.
 *
 * WHEN TO USE
 * Cards, panels, callouts, page gutters, anything with a visible surface.
 *
 * WHEN NOT TO USE
 * To fake spacing between siblings. Padding on a child to push it away from a
 * sibling is the bug that Stack exists to prevent.
 *
 * RESPONSIVE BEHAVIOUR
 * `space` accepts the responsive object form. Gutters especially should grow:
 * `space={{ base: 'sm', md: 'lg' }}` keeps phones from wasting width.
 *
 * @example
 * <Inset space="lg" className="rounded-2xl bg-white/5">…</Inset>
 * <Inset x="lg" y="3xl">…</Inset>   // asymmetric: wide gutters, tall rhythm
 */
import { createElement, type ElementType } from 'react'
import { PAD_CLASS, PAD_X_CLASS, PAD_Y_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'
import { resolveResponsive, type Responsive } from './responsive.js'

export interface InsetOwnProps {
  /** Uniform padding on all four sides. */
  space?: Responsive<Space>
  /** Horizontal padding. Overrides `space` on the x axis. */
  x?: Responsive<Space>
  /** Vertical padding. Overrides `space` on the y axis. */
  y?: Responsive<Space>
  className?: string
}

export function Inset<T extends ElementType = 'div'>({
  as,
  space,
  x,
  y,
  className,
  children,
  ...rest
}: PolymorphicProps<T, InsetOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'inset',
      className: cn(
        space !== undefined && resolveResponsive(space, PAD_CLASS),
        x !== undefined && resolveResponsive(x, PAD_X_CLASS),
        y !== undefined && resolveResponsive(y, PAD_Y_CLASS),
        className,
      ),
      ...rest,
    },
    children,
  )
}
