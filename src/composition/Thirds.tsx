/**
 * @module design/composition/Thirds
 *
 * PURPOSE
 * Place content at the compositional positions photographers and painters use:
 * rule-of-thirds intersections, and the golden section.
 *
 * DESIGN PRINCIPLE
 * Rule of thirds / golden ratio. Content placed at a third-line intersection
 * reads as *composed*; content dead-centre reads as *static*. Neither is
 * universally better — a static, symmetric composition is right for a sign-in
 * card and wrong for a hero. The value of these primitives is making the choice
 * explicit instead of accidental.
 *
 * WHEN TO USE
 * Hero bands, cinematic imagery with overlaid text, feature sections where a
 * visual and its caption should sit off-axis.
 *
 * WHEN NOT TO USE
 * On dense or utilitarian screens. Rule-of-thirds placement spends space to buy
 * elegance; a dashboard has no space to spend, and asymmetry there just makes
 * scanning harder.
 *
 * RESPONSIVE BEHAVIOUR
 * The thirds structure collapses to a single stacked column below `md` —
 * off-centre placement is meaningless in a 390px-wide field, where every position
 * is effectively centre.
 *
 * ACCESSIBILITY
 * Positioning is visual only; DOM order is preserved, so reading order stays
 * intact regardless of where things land on screen.
 *
 * @example
 * <ThirdsField height="cinematic">
 *   <ThirdsCell column={1} span={2} row="middle">
 *     <Heading role="display">Read deeply.</Heading>
 *   </ThirdsCell>
 * </ThirdsField>
 */
import type { ReactNode } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { RATIO } from '../tokens/scale.js'

/* ────────────────────────────── Rule of thirds ───────────────────────────── */

export interface ThirdsFieldProps {
  children: ReactNode
  /** Vertical extent of the field. Thirds only mean something in a bounded box. */
  height?: 'auto' | 'half' | 'tall' | 'cinematic' | 'screen'
  gap?: Space
  /** Show the third-lines. Dev aid — also toggled globally by <DesignInspector />. */
  guides?: boolean
  className?: string
}

const HEIGHT_CLASS: Record<NonNullable<ThirdsFieldProps['height']>, string> = {
  auto: '',
  half: 'min-h-[50vh]',
  tall: 'min-h-[70vh]',
  cinematic: 'min-h-[60vh]',
  screen: 'min-h-dvh',
}

export function ThirdsField({
  children,
  height = 'auto',
  gap = 'lg',
  guides = false,
  className,
}: ThirdsFieldProps) {
  return (
    <div
      data-design="thirds-field"
      className={cn(
        'relative grid grid-cols-1 md:grid-cols-3 md:grid-rows-3',
        HEIGHT_CLASS[height],
        GAP_CLASS[gap],
        className,
      )}
    >
      {guides && <ThirdsGuides />}
      {children}
    </div>
  )
}

export interface ThirdsCellProps {
  children: ReactNode
  /** Starting column, 1–3. */
  column?: 1 | 2 | 3
  /** Columns to span. */
  span?: 1 | 2 | 3
  /** Which horizontal band the content sits in. */
  row?: 'top' | 'middle' | 'bottom'
  /** Alignment inside the cell. */
  align?: 'start' | 'center' | 'end'
  className?: string
}

const COL_START: Record<NonNullable<ThirdsCellProps['column']>, string> = {
  1: 'md:col-start-1',
  2: 'md:col-start-2',
  3: 'md:col-start-3',
}

const COL_SPAN: Record<NonNullable<ThirdsCellProps['span']>, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
}

const ROW_START: Record<NonNullable<ThirdsCellProps['row']>, string> = {
  top: 'md:row-start-1',
  middle: 'md:row-start-2',
  bottom: 'md:row-start-3',
}

const ALIGN_CLASS: Record<NonNullable<ThirdsCellProps['align']>, string> = {
  start: 'items-start justify-start text-left',
  center: 'items-center justify-center text-center',
  end: 'items-end justify-end text-right',
}

export function ThirdsCell({
  children,
  column = 1,
  span = 1,
  row = 'middle',
  align = 'start',
  className,
}: ThirdsCellProps) {
  return (
    <div
      data-design="thirds-cell"
      className={cn(
        'flex flex-col',
        COL_START[column],
        COL_SPAN[span],
        ROW_START[row],
        ALIGN_CLASS[align],
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The four intersection lines, drawn for development. */
export function ThirdsGuides({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-design="thirds-guides"
      className={cn('pointer-events-none absolute inset-0 z-50 hidden md:block', className)}
    >
      {[33.333, 66.667].map((x) => (
        <div key={`x${x}`} className="absolute inset-y-0 w-px bg-cyan-400/30" style={{ left: `${x}%` }} />
      ))}
      {[33.333, 66.667].map((y) => (
        <div key={`y${y}`} className="absolute inset-x-0 h-px bg-cyan-400/30" style={{ top: `${y}%` }} />
      ))}
    </div>
  )
}

/* ─────────────────────────────── Golden ratio ────────────────────────────── */

export interface GoldenRatioProps {
  children: ReactNode
  /** `width` fixes the box's proportion; `stack` splits it vertically 1:1.618. */
  mode?: 'box' | 'stack'
  /** Which portion leads. */
  bias?: 'start' | 'end'
  gap?: Space
  className?: string
}

/**
 * A golden-section container.
 *
 * `box`   — the element itself takes a 1.618:1 aspect ratio. For imagery and
 *           cards where the *shape* should feel resolved.
 * `stack` — splits the vertical axis at the golden section. For hero bands where
 *           the headline group should occupy the major portion and supporting
 *           content the minor.
 *
 * Prefer <Split ratio="golden"> for two side-by-side columns; this component is
 * for the cases where the ratio applies to a single box or to vertical space.
 */
export function GoldenRatio({
  children,
  mode = 'box',
  bias = 'end',
  gap = 'lg',
  className,
}: GoldenRatioProps) {
  if (mode === 'box') {
    return (
      <div
        data-design="golden-box"
        className={cn('aspect-[1.618/1] w-full', className)}
      >
        {children}
      </div>
    )
  }

  const tracks =
    bias === 'end'
      ? `minmax(0, 1fr) minmax(0, ${RATIO.golden}fr)`
      : `minmax(0, ${RATIO.golden}fr) minmax(0, 1fr)`

  return (
    <div
      data-design="golden-stack"
      style={{ gridTemplateRows: tracks }}
      className={cn('grid h-full', GAP_CLASS[gap], className)}
    >
      {children}
    </div>
  )
}
