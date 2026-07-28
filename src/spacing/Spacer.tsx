/**
 * @module design/spacing/Spacer
 *
 * PURPOSE
 * An explicit, deliberate void — and a flexible pusher for edge-anchored layouts.
 *
 * DESIGN PRINCIPLE
 * Whitespace as an active element (Swiss Design). Space is not "the part with
 * nothing in it"; it is what gives the parts with something in them their weight.
 * Making an intentional void a *named component* rather than a stray margin keeps
 * that intent legible to the next person reading the JSX.
 *
 * WHEN TO USE
 * - `grow`: push trailing content to the far edge of a flex container (the
 *   classic "logo left, nav right" bar) without `justify-between`, which breaks
 *   the moment a third child appears.
 * - fixed `size`: a deliberate breath that isn't a group boundary — for instance
 *   between a hero and the fold, where the emptiness is doing the work.
 *
 * WHEN NOT TO USE
 * As a substitute for `gap`. If you find Spacers between every sibling, the
 * parent should be a <Stack> instead — that's the whole point of the scale.
 *
 * ACCESSIBILITY
 * `aria-hidden` and no focusable content: it is purely presentational and should
 * never be announced.
 */
import { SPACE, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'

export interface SpacerProps {
  /** Fixed size from the rhythm scale. Ignored when `grow` is set. */
  size?: Space
  /** Absorb all free space in the parent flex container. */
  grow?: boolean
  /** Axis the size applies to. */
  axis?: 'vertical' | 'horizontal'
  className?: string
}

export function Spacer({ size = 'md', grow = false, axis = 'vertical', className }: SpacerProps) {
  const px = SPACE[size]

  return (
    <div
      aria-hidden="true"
      data-design="spacer"
      className={cn(grow && 'flex-1', 'shrink-0', className)}
      style={
        grow
          ? undefined
          : axis === 'vertical'
            ? { height: px }
            : { width: px }
      }
    />
  )
}
