/**
 * @module design/spacing/Bleed
 *
 * PURPOSE
 * Let a child escape its container's gutters — full-bleed imagery, colour fields
 * and dividers inside an otherwise constrained column.
 *
 * DESIGN PRINCIPLE
 * Editorial/magazine layout. A full-bleed image between two measured text columns
 * is one of the strongest rhythm devices in print: it resets the eye and marks a
 * chapter boundary. Constrain the text, release the image.
 *
 * WHY A COMPONENT AND NOT `-mx-8`
 * Negative margins must exactly match the parent's padding or the layout tears at
 * one breakpoint and nobody notices for a month. Bleed uses the viewport-relative
 * technique instead, which is correct at every width regardless of the parent's
 * gutter.
 *
 * WHEN TO USE
 * Imagery, background bands, `<hr>`-style rules, and code blocks that need more
 * width than the reading measure allows.
 *
 * WHEN NOT TO USE
 * On running text. Escaping the measure is exactly what the reading-width rules
 * exist to prevent. Also avoid inside horizontally-scrolling containers, where
 * `100vw` and the container's width are unrelated.
 *
 * RESPONSIVE BEHAVIOUR
 * `full` spans the viewport at every size. `gutter` only cancels the container's
 * own padding, which is usually what cards want.
 *
 * ACCESSIBILITY
 * Purely visual. Note that `100vw` includes the scrollbar on some desktop
 * browsers, so the technique below uses `100cqw`-free maths that clamps to the
 * body width to avoid inducing horizontal scroll.
 */
import { createElement, type ElementType } from 'react'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'

export type BleedMode = 'full' | 'gutter'

export interface BleedOwnProps {
  /**
   * `full`   — span the whole viewport width.
   * `gutter` — cancel the immediate container's horizontal padding only.
   */
  mode?: BleedMode
  className?: string
}

export function Bleed<T extends ElementType = 'div'>({
  as,
  mode = 'full',
  className,
  children,
  ...rest
}: PolymorphicProps<T, BleedOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'bleed',
      'data-design-bleed': mode,
      className: cn(
        mode === 'full'
          ? // Centres a 100vw box on the container's own centre line. Works at any
            // container width without knowing the parent's padding.
            'relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw]'
          : '-mx-4 sm:-mx-6 lg:-mx-8',
        className,
      ),
      ...rest,
    },
    children,
  )
}
