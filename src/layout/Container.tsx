/**
 * @module design/layout/Container
 *
 * PURPOSE
 * Decide how wide content is allowed to be, and centre it. Every horizontal
 * boundary on a page should come from here.
 *
 * DESIGN PRINCIPLE
 * Container sizing is a *content* decision, not a viewport decision. A paragraph
 * wants ~65 characters per line whether the monitor is 13" or 34". Naming sizes
 * by purpose (`reading`, `content`, `wide`) rather than by pixels is what keeps
 * that decision from being re-litigated on every page.
 *
 * WHEN TO USE
 * As the outermost element of any page section. Nest freely — a `wide` container
 * holding a `reading` container is the standard editorial arrangement.
 *
 * WHEN NOT TO USE
 * For full-bleed colour bands or imagery. Put the band outside the Container and
 * the Container inside the band, so the colour spans the viewport while the text
 * stays measured.
 *
 * RESPONSIVE BEHAVIOUR
 * Gutters step up with viewport (16 → 24 → 32px) so small screens don't waste
 * width and large ones don't push text to the glass edge. `max-w` never applies
 * below its own value, so there's no mobile-specific handling to write.
 *
 * ACCESSIBILITY
 * Renders a `<div>`. Pass `as="main"`/`as="section"`/`as="header"` to carry
 * landmark semantics rather than adding a redundant wrapper element.
 *
 * @example
 * <Container size="wide">
 *   <Container size="reading">…long-form copy…</Container>
 * </Container>
 */
import { createElement, type ElementType } from 'react'
import { CONTAINER, type ContainerSize } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'

export interface ContainerOwnProps {
  /**
   * reading (65ch) · prose (75ch) · narrow · content · wide · full
   * Pick by what the content *is*, not by how much space is available.
   */
  size?: ContainerSize
  /** Horizontal gutters. Turn off when nesting inside another Container. */
  gutter?: boolean
  /** Centre horizontally. Default true. */
  center?: boolean
  className?: string
}

export function Container<T extends ElementType = 'div'>({
  as,
  size = 'content',
  gutter = true,
  center = true,
  className,
  children,
  ...rest
}: PolymorphicProps<T, ContainerOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'container',
      'data-design-size': size,
      className: cn(
        'w-full',
        CONTAINER[size],
        center && 'mx-auto',
        gutter && 'px-4 sm:px-6 lg:px-8',
        className,
      ),
      ...rest,
    },
    children,
  )
}
