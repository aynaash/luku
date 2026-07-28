/**
 * @module design/composition/ScanPattern
 *
 * PURPOSE
 * Lay content along the paths eye-tracking research says people actually follow:
 * the F-pattern for dense text, the Z-pattern for sparse promotional screens.
 *
 * DESIGN PRINCIPLE
 * Reading behaviour is not uniform. On text-heavy pages readers scan two
 * horizontal sweeps and then a vertical run down the left edge — the F. On sparse
 * pages with few elements they trace a Z: top-left to top-right, diagonally down,
 * then left to right again. Placing the important things *on* the path, rather
 * than hoping they're noticed, is the difference between a layout that works and
 * one that merely looks tidy.
 *
 * PRACTICAL CONSEQUENCE
 * The F-pattern's vertical stem is why front-loading matters: readers see the
 * first two or three words of each line and little else. FPattern therefore
 * enforces a left-aligned rag and warns on centred text, which destroys the stem.
 *
 * WHEN TO USE
 * - FPattern: documentation, search results, article listings, dense feature
 *   copy — anywhere the reader is scanning for something specific.
 * - ZPattern: landing sections, hero bands, pricing — few elements, one decision.
 *
 * WHEN NOT TO USE
 * ZPattern with more than four stops; the diagonal stops being legible and it
 * degrades into an ordinary grid. FPattern for anything centred or symmetric —
 * the pattern depends on a hard left edge.
 *
 * RESPONSIVE BEHAVIOUR
 * Both collapse to a single column on mobile, where every layout is an F by
 * default. The Z in particular is meaningless below ~640px: there is no
 * horizontal distance to traverse.
 *
 * ACCESSIBILITY
 * These affect visual placement only. ZPattern's stops are rendered in DOM order,
 * so the audible order matches the intended reading order — a Z-pattern built by
 * hand with absolute positioning usually gets this wrong.
 *
 * @example
 * <ZPattern>
 *   <Logo />                 // ① top-left
 *   <Nav />                  // ② top-right
 *   <Heading>…</Heading>     // ③ centre-left, on the diagonal
 *   <CTAGroup>…</CTAGroup>   // ④ bottom-right — the decision point
 * </ZPattern>
 */
import { Children, type ReactNode } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'

/* ──────────────────────────────── F-pattern ──────────────────────────────── */

export interface FPatternProps {
  children: ReactNode
  gap?: Space
  /**
   * Emphasise the vertical stem with a rule on the leading edge. Makes the scan
   * path literal — useful for long documentation sidebars and timelines.
   */
  stem?: boolean
  className?: string
}

export function FPattern({ children, gap = 'lg', stem = false, className }: FPatternProps) {
  return (
    <div
      data-design="f-pattern"
      className={cn(
        'flex flex-col text-left items-start',
        // The stem is the left edge; nothing may be centred against it.
        '[&_[data-design=text]]:text-left [&_[data-design=heading]]:text-left',
        stem && 'border-l-2 border-[var(--accent)]/20 pl-6 md:pl-8',
        GAP_CLASS[gap],
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * A single horizontal sweep of the F. The first child is the sweep's headline —
 * front-loaded, because it is what the reader actually sees.
 */
export function FRow({ children, gap = 'xs', className }: { children: ReactNode; gap?: Space; className?: string }) {
  return (
    <div data-design="f-row" className={cn('flex flex-col items-start', GAP_CLASS[gap], className)}>
      {children}
    </div>
  )
}

/* ──────────────────────────────── Z-pattern ──────────────────────────────── */

export interface ZPatternProps {
  /** Two to four children, in reading order: ① ② ③ ④. */
  children: ReactNode
  gap?: Space
  /** Draw the diagonal for development. */
  guides?: boolean
  className?: string
}

/** Placement of each stop on the Z. Index maps to reading order. */
const Z_STOPS = [
  'sm:col-start-1 sm:row-start-1 sm:justify-self-start sm:text-left',
  'sm:col-start-2 sm:row-start-1 sm:justify-self-end sm:text-right',
  'sm:col-start-1 sm:row-start-2 sm:justify-self-start sm:text-left',
  'sm:col-start-2 sm:row-start-2 sm:justify-self-end sm:text-right',
]

export function ZPattern({ children, gap = 'xl', guides = false, className }: ZPatternProps) {
  const stops = Children.toArray(children)

  if (process.env.NODE_ENV !== 'production' && (stops.length < 2 || stops.length > 4)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[design] <ZPattern> works with 2–4 stops, received ${stops.length}. ` +
        `Beyond four the diagonal is no longer readable — use <FPattern> or <Grid>.`,
    )
  }

  return (
    <div
      data-design="z-pattern"
      className={cn('relative grid grid-cols-1 sm:grid-cols-2 items-center', GAP_CLASS[gap], className)}
    >
      {guides && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 hidden h-full w-full sm:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <polyline
            points="5,10 95,10 5,90 95,90"
            fill="none"
            stroke="rgb(34 211 238 / 0.35)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {stops.slice(0, 4).map((child, i) => (
        <div key={i} data-design="z-stop" data-design-stop={i + 1} className={cn('w-full', Z_STOPS[i])}>
          {child}
        </div>
      ))}
      {stops.slice(4)}
    </div>
  )
}
