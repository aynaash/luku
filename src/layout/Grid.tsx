/**
 * @module design/layout/Grid
 *
 * PURPOSE
 * Responsive multi-column layout that adapts to available space rather than to
 * hard-coded breakpoints.
 *
 * DESIGN PRINCIPLE
 * Swiss Design's modular grid, expressed intrinsically. The classic
 * `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` chain encodes assumptions about
 * *viewport* width, which are wrong the moment the grid sits inside a sidebar
 * layout. `repeat(auto-fit, minmax(<min>, 1fr))` encodes the thing you actually
 * know — the narrowest a card may be before it stops working — and derives the
 * column count from that.
 *
 * WHEN TO USE
 * Card grids, feature lists, media galleries, dashboard tiles.
 *
 * WHEN NOT TO USE
 * When the columns have *different* jobs and proportions — that's <Split>. And
 * when the items form a single row of unequal-width chips, use <Inline>.
 *
 * RESPONSIVE BEHAVIOUR
 * Columns reflow continuously; there are no jumps at breakpoints. Pass
 * `columns` to force a fixed track count when the count is semantically
 * meaningful (a 3-step process must not reflow to 2 + 1).
 *
 * ACCESSIBILITY
 * `display: grid` on a `<ul>` removes list semantics in Safari/VoiceOver. When
 * using `as="ul"`, Grid re-adds `role="list"`, which restores announcement.
 *
 * @example
 * <Grid min="18rem" gap="md">{cards}</Grid>          // auto-fit
 * <Grid columns={3} gap="lg" as="ul">{steps}</Grid>  // exactly 3, always
 */
import { createElement, type ElementType } from 'react'
import { GAP_CLASS, GAP_X_CLASS, GAP_Y_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'

export interface GridOwnProps {
  /**
   * Narrowest acceptable column width, e.g. `'18rem'`. Drives auto-fit.
   * Ignored when `columns` is set.
   */
  min?: string
  /**
   * Fixed track count. Collapses to a single column below `sm` unless
   * `collapse={false}`.
   */
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: Space
  /** Override the column gap independently. */
  gapX?: Space
  /** Override the row gap independently — usually tighter than the column gap. */
  gapY?: Space
  /** Whether a fixed-`columns` grid stacks on small screens. */
  collapse?: boolean
  /** `auto-fill` keeps empty tracks; `auto-fit` collapses them. Default auto-fit. */
  fill?: boolean
  /** Vertical alignment of items within their track. */
  align?: 'start' | 'center' | 'end' | 'stretch'
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<GridOwnProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

/** Written out so Tailwind's scanner sees each class literally. */
const COLUMNS_CLASS: Record<NonNullable<GridOwnProps['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-12',
}

const COLUMNS_FIXED_CLASS: Record<NonNullable<GridOwnProps['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
}

export function Grid<T extends ElementType = 'div'>({
  as,
  min = '16rem',
  columns,
  gap = 'md',
  gapX,
  gapY,
  collapse = true,
  fill = false,
  align = 'stretch',
  className,
  children,
  style,
  ...rest
}: PolymorphicProps<T, GridOwnProps>) {
  const Component = (as ?? 'div') as ElementType
  const isList = Component === 'ul' || Component === 'ol'

  const columnClass = columns
    ? (collapse ? COLUMNS_CLASS : COLUMNS_FIXED_CLASS)[columns]
    : undefined

  return createElement(
    Component,
    {
      'data-design': 'grid',
      'data-design-gap': gap,
      role: isList ? 'list' : undefined,
      className: cn(
        'grid',
        columnClass,
        ALIGN_CLASS[align],
        GAP_CLASS[gap],
        gapX && GAP_X_CLASS[gapX],
        gapY && GAP_Y_CLASS[gapY],
        className,
      ),
      style: columns
        ? style
        : {
            gridTemplateColumns: `repeat(${fill ? 'auto-fill' : 'auto-fit'}, minmax(min(${min}, 100%), 1fr))`,
            ...style,
          },
      ...rest,
    },
    children,
  )
}

/**
 * Spans multiple tracks inside a fixed-`columns` Grid. Use to give one tile more
 * visual weight than its neighbours — the cheapest way to break a monotonous
 * grid without abandoning it.
 */
export interface GridItemProps {
  span?: 1 | 2 | 3 | 4 | 6 | 12
  rowSpan?: 1 | 2 | 3
  className?: string
  children?: React.ReactNode
}

const SPAN_CLASS: Record<NonNullable<GridItemProps['span']>, string> = {
  1: 'col-span-1',
  2: 'col-span-1 sm:col-span-2',
  3: 'col-span-1 sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
  6: 'col-span-2 lg:col-span-6',
  12: 'col-span-full',
}

const ROW_SPAN_CLASS: Record<NonNullable<GridItemProps['rowSpan']>, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
}

export function GridItem({ span = 1, rowSpan, className, children }: GridItemProps) {
  return (
    <div
      data-design="grid-item"
      className={cn(SPAN_CLASS[span], rowSpan && ROW_SPAN_CLASS[rowSpan], className)}
    >
      {children}
    </div>
  )
}
