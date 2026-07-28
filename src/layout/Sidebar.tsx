/**
 * @module design/layout/Sidebar
 *
 * PURPOSE
 * A persistent rail beside a fluid main column — app shells, docs, dashboards,
 * reader chrome.
 *
 * DESIGN PRINCIPLE
 * The rail is *supporting* content and must never compete for attention with the
 * main column. That means a fixed, modest width (not a fraction of the viewport,
 * which grows absurd on wide monitors), lower contrast, and a visible boundary so
 * the eye knows where the content region begins.
 *
 * WHY A FIXED WIDTH AND NOT A RATIO
 * A navigation list needs a roughly constant number of characters. At 20% of a
 * 3440px display that's 688px of nav — nonsense. Fixed rail, fluid content is the
 * correct intrinsic model, and it's what <Split> deliberately does *not* do.
 *
 * WHEN TO USE
 * Long-lived navigation or tools that persist across route changes. Pairs with
 * Next.js nested layouts: put Sidebar in `layout.tsx` so the rail doesn't
 * re-render or lose scroll position on navigation.
 *
 * WHEN NOT TO USE
 * For a one-off aside beside an article — that's <Split ratio="thirds">. And on
 * mobile: below `at`, the rail stacks above content, which is only acceptable if
 * it's short. A long nav needs a drawer, which is a different component with
 * different focus-management responsibilities.
 *
 * RESPONSIVE BEHAVIOUR
 * Below `at`, rail and content stack in DOM order. `sticky` pins the rail to the
 * viewport on desktop only — sticky positioning on a stacked mobile layout pins
 * the nav over the content the user is trying to read.
 *
 * ACCESSIBILITY
 * Renders the rail as `<aside>` and the content as `<div>`. Pass `label` to name
 * the complementary landmark; without a name, multiple asides on a page are
 * indistinguishable in a landmark list.
 *
 * @example
 * // app/dashboard/layout.tsx
 * <Sidebar width="18rem" sticky label="Library navigation">
 *   <LibraryNav />
 *   {children}
 * </Sidebar>
 */
import { Children, type ReactNode } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'

export type SidebarBreakpoint = 'sm' | 'md' | 'lg' | 'xl'

const SIDEBAR_AT: Record<SidebarBreakpoint, string> = {
  sm: 'sm:grid-cols-[var(--sidebar-tracks)]',
  md: 'md:grid-cols-[var(--sidebar-tracks)]',
  lg: 'lg:grid-cols-[var(--sidebar-tracks)]',
  xl: 'xl:grid-cols-[var(--sidebar-tracks)]',
}

const STICKY_AT: Record<SidebarBreakpoint, string> = {
  sm: 'sm:sticky sm:top-0 sm:h-dvh sm:overflow-y-auto',
  md: 'md:sticky md:top-0 md:h-dvh md:overflow-y-auto',
  lg: 'lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto',
  xl: 'xl:sticky xl:top-0 xl:h-dvh xl:overflow-y-auto',
}

export interface SidebarProps {
  /** Exactly two children: [rail, content]. */
  children: ReactNode
  /** Rail width. Keep it a fixed length, not a percentage. */
  width?: string
  /** Rail on the right instead of the left. */
  side?: 'start' | 'end'
  gap?: Space
  /** Breakpoint at which the two columns appear. */
  at?: SidebarBreakpoint
  /** Pin the rail while content scrolls. Desktop only. */
  sticky?: boolean
  /** Accessible name for the complementary landmark. */
  label?: string
  className?: string
  railClassName?: string
  contentClassName?: string
}

export function Sidebar({
  children,
  width = '16rem',
  side = 'start',
  gap = 'lg',
  at = 'lg',
  sticky = false,
  label,
  className,
  railClassName,
  contentClassName,
}: SidebarProps) {
  const [rail, content] = Children.toArray(children)

  if (process.env.NODE_ENV !== 'production' && Children.count(children) !== 2) {
    // eslint-disable-next-line no-console
    console.warn('[design] <Sidebar> expects exactly 2 children: [rail, content].')
  }

  const tracks =
    side === 'start'
      ? `${width} minmax(0, 1fr)`
      : `minmax(0, 1fr) ${width}`

  return (
    <div
      data-design="sidebar"
      style={{ ['--sidebar-tracks' as string]: tracks }}
      className={cn('grid grid-cols-1 items-start', SIDEBAR_AT[at], GAP_CLASS[gap], className)}
    >
      <aside
        data-design="sidebar-rail"
        aria-label={label}
        className={cn(
          side === 'end' && 'order-last',
          sticky && STICKY_AT[at],
          railClassName,
        )}
      >
        {rail}
      </aside>
      <div data-design="sidebar-content" className={cn('min-w-0', contentClassName)}>
        {content}
      </div>
    </div>
  )
}
