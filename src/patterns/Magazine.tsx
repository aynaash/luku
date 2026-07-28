'use client'

/**
 * @module design/patterns/Magazine
 *
 * PURPOSE
 * A grid where one item is deliberately larger than the rest — the front-page
 * arrangement.
 *
 * DESIGN PRINCIPLE
 * Hierarchy through scale contrast. A grid of identically-sized tiles is
 * democratic and therefore flat: the reader gets no help deciding what to look at
 * first, so they look at nothing in particular. Making one item 2–4× the area of
 * its neighbours creates an anchor and makes the remaining items read as a
 * supporting set, which is faster to scan than the flat grid it replaced.
 *
 * WHY THE FEATURE GOES FIRST
 * Top-left is where the eye starts in left-to-right layouts (the origin of both
 * the F and Z patterns). A feature tile placed lower has to fight for the
 * attention the top-left tile gets for free.
 *
 * WHEN TO USE
 * Article indexes, content libraries, "recently read", release notes — collections
 * where the items genuinely differ in importance.
 *
 * WHEN NOT TO USE
 * When items are true peers. Arbitrarily featuring one implies an editorial
 * judgement; if there isn't one, the layout is lying and users learn to distrust
 * the emphasis. Use <Grid>.
 *
 * RESPONSIVE BEHAVIOUR
 * Collapses to a single column below `md`, where the feature keeps its position
 * (first) but loses its size advantage — every mobile tile is full-width anyway.
 *
 * ACCESSIBILITY
 * Renders `<ul>`/`<li>` with `role="list"` restored (Safari drops list semantics
 * from `display: grid`). The feature is not marked as more important in the
 * accessibility tree, because it isn't — it's the same content, shown larger.
 *
 * @example
 * <Magazine feature={<ArticleCard {...lead} large />}>
 *   {rest.map((a) => <ArticleCard key={a.id} {...a} />)}
 * </Magazine>
 */
import { Children, type ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { GAP_CLASS, type Space } from '../tokens/scale.js'

export interface MagazineProps {
  /** The supporting items. */
  children: ReactNode
  /** The dominant item. Occupies a 2×2 block on wide viewports. */
  feature?: ReactNode
  /** Feature on the right instead of the left. */
  featureSide?: 'start' | 'end'
  gap?: Space
  /** Columns in the supporting grid. */
  columns?: 2 | 3 | 4
  className?: string
}

const COLUMNS_CLASS: Record<NonNullable<MagazineProps['columns']>, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
}

export function Magazine({
  children,
  feature,
  featureSide = 'start',
  gap = 'md',
  columns = 3,
  className,
}: MagazineProps) {
  const items = Children.toArray(children)

  return (
    <ul
      role="list"
      data-design="magazine"
      className={cn('grid grid-cols-1 auto-rows-[minmax(0,auto)]', COLUMNS_CLASS[columns], GAP_CLASS[gap], className)}
    >
      {feature && (
        <li
          data-design="magazine-feature"
          className={cn(
            'md:col-span-2 md:row-span-2',
            featureSide === 'end' && 'md:order-last',
          )}
        >
          {feature}
        </li>
      )}
      {items.map((item, i) => (
        <li key={i} data-design="magazine-item">
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * A tighter variant: alternating full-width bands and paired items, the rhythm a
 * print magazine uses down a long index. Use when the collection is long enough
 * that a uniform grid becomes monotonous — roughly past a dozen items.
 */
export function MagazineFlow({
  children,
  gap = 'md',
  /** Every Nth item spans the full width. */
  every = 5,
  className,
}: {
  children: ReactNode
  gap?: Space
  every?: number
  className?: string
}) {
  const items = Children.toArray(children)

  return (
    <ul
      role="list"
      data-design="magazine-flow"
      className={cn('grid grid-cols-1 sm:grid-cols-2', GAP_CLASS[gap], className)}
    >
      {items.map((item, i) => (
        <li key={i} className={cn((i + 1) % every === 0 && 'sm:col-span-2')}>
          {item}
        </li>
      ))}
    </ul>
  )
}
