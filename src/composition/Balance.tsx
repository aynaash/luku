/**
 * @module design/composition/Balance
 *
 * PURPOSE
 * Distribute visual weight across an axis — either evenly (symmetric) or as a
 * deliberate counterweight (asymmetric).
 *
 * DESIGN PRINCIPLE
 * Visual balance. Every element has perceptual "weight" — driven by size, colour
 * contrast, density and isolation, not by pixel area. A layout is balanced when
 * the weights on either side of the optical axis are equal. Unbalanced layouts
 * feel like they're tipping, and readers register it as unease long before they
 * can name the cause.
 *
 * SYMMETRIC VS ASYMMETRIC
 * Symmetric balance is formal, calm, and slightly static — right for sign-in,
 * empty states, confirmations. Asymmetric balance (a large light area against a
 * small dense one) is dynamic and more interesting, and is what most editorial
 * layouts use. Asymmetric does not mean unbalanced: the small dark element still
 * has to *weigh* as much as the large pale one.
 *
 * WHEN TO USE
 * Any two-part composition where the parts differ in density: text beside
 * imagery, a heading group beside a stat block.
 *
 * WHEN NOT TO USE
 * For structural columns with an intended proportion — that's <Split>, which
 * expresses ratio. Balance expresses *weight*, and the two often disagree: a
 * dense 38% column can outweigh an airy 62% one.
 *
 * RESPONSIVE BEHAVIOUR
 * Stacks below `md`. Balance is a two-dimensional property; in a single column
 * the concept doesn't apply and the weight hints are dropped.
 *
 * ACCESSIBILITY
 * Visual only. `weight` sets no ARIA and changes no order.
 *
 * @example
 * <Balance mode="asymmetric" heavy="end">
 *   <Prose>…long, low-density argument…</Prose>
 *   <Stat value="4×" label="better recall" />   // small, dense, high contrast
 * </Balance>
 */
import type { ReactNode } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { RATIO } from '../tokens/scale.js'

export type BalanceMode = 'symmetric' | 'asymmetric'

export interface BalanceProps {
  /** Exactly two children. */
  children: ReactNode
  mode?: BalanceMode
  /**
   * Which side carries the greater *perceptual* weight. In asymmetric mode the
   * heavy side gets the *smaller* track — dense content needs less room to weigh
   * the same, and giving it more would tip the composition.
   */
  heavy?: 'start' | 'end'
  gap?: Space
  align?: 'start' | 'center' | 'end'
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<BalanceProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
}

export function Balance({
  children,
  mode = 'asymmetric',
  heavy = 'end',
  gap = 'xl',
  align = 'center',
  className,
}: BalanceProps) {
  const tracks =
    mode === 'symmetric'
      ? 'minmax(0, 1fr) minmax(0, 1fr)'
      : heavy === 'end'
        ? `minmax(0, ${RATIO.golden}fr) minmax(0, 1fr)`
        : `minmax(0, 1fr) minmax(0, ${RATIO.golden}fr)`

  return (
    <div
      data-design="balance"
      data-design-balance={mode}
      style={{ ['--balance-tracks' as string]: tracks }}
      className={cn(
        'grid grid-cols-1 md:grid-cols-[var(--balance-tracks)]',
        ALIGN_CLASS[align],
        GAP_CLASS[gap],
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Marks an element's perceptual weight so <DesignInspector /> can check the
 * layout's balance without having to infer weight from pixels — which it can only
 * approximate. Purely an annotation; it renders `display: contents` and changes
 * nothing about the layout.
 *
 * @example
 * <Weight level="heavy"><PrimaryCTA /></Weight>
 */
export function Weight({
  children,
  level = 'medium',
}: {
  children: ReactNode
  level?: 'light' | 'medium' | 'heavy'
}) {
  return (
    <div data-design="weight" data-design-weight={level} className="contents">
      {children}
    </div>
  )
}
