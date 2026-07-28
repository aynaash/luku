/**
 * @module design/layout/Center
 *
 * PURPOSE
 * Centre content both ways, optionally at the *optical* centre rather than the
 * geometric one.
 *
 * DESIGN PRINCIPLE
 * Apple's layout system places focal content slightly above the true middle of a
 * tall region. The reason is perceptual: the eye reads the horizon of a frame as
 * higher than its midpoint, so geometrically-centred content looks like it has
 * sagged. Nudging to ~45% is the correction — close to the golden section, and
 * the difference between "centred" and "composed".
 *
 * WHEN TO USE
 * Hero content over a full-height band, empty states, sign-in cards, loading and
 * error screens.
 *
 * WHEN NOT TO USE
 * For centring a text column horizontally — <Container> already does that, and
 * Center adds a flex context you don't need. Never centre long-form body copy:
 * centred paragraphs destroy the left rag the eye uses to find the next line.
 *
 * RESPONSIVE BEHAVIOUR
 * `minHeight="screen"` uses `dvh` so mobile browser chrome doesn't clip the
 * bottom of the frame — the bug `100vh` has shipped for a decade.
 *
 * ACCESSIBILITY
 * Purely visual. Content keeps DOM order.
 *
 * @example
 * <Center minHeight="screen" optical>
 *   <EmptyState … />
 * </Center>
 */
import { createElement, type ElementType } from 'react'
import { cn } from '../utils/cn.js'
import { OPTICAL_CENTER_Y } from '../utils/ratio.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'

export interface CenterOwnProps {
  /** Sit at the optical centre (~45%) rather than the geometric one. */
  optical?: boolean
  /** `screen` uses dvh; `full` fills the parent; `auto` sizes to content. */
  minHeight?: 'auto' | 'full' | 'screen'
  /** Also centre text alignment. Off by default — centring text is a decision. */
  text?: boolean
  className?: string
}

const HEIGHT_CLASS: Record<NonNullable<CenterOwnProps['minHeight']>, string> = {
  auto: '',
  full: 'min-h-full',
  screen: 'min-h-dvh',
}

export function Center<T extends ElementType = 'div'>({
  as,
  optical = false,
  minHeight = 'auto',
  text = false,
  className,
  children,
  style,
  ...rest
}: PolymorphicProps<T, CenterOwnProps>) {
  const Component = (as ?? 'div') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'center',
      className: cn(
        'flex w-full flex-col items-center justify-center',
        HEIGHT_CLASS[minHeight],
        text && 'text-center',
        className,
      ),
      style: optical
        ? // Pull up by half the offset from true centre, so the content's own
          // mass sits at ~45% of the frame.
          { transform: `translateY(-${(50 - OPTICAL_CENTER_Y) / 2}%)`, ...style }
        : style,
      ...rest,
    },
    children,
  )
}
