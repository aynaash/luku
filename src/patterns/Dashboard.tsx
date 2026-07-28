'use client'

/**
 * @module design/patterns/Dashboard
 *
 * PURPOSE
 * Dense information layouts: metric tiles, panel grids, and data rows that stay
 * scannable as the data volume grows.
 *
 * DESIGN PRINCIPLE
 * Dense ≠ cramped. Density comes from removing *chrome* — borders, shadows,
 * padding, repeated labels — not from shrinking type or tightening line-height.
 * The classic mistake is compressing everything uniformly, which makes a screen
 * that holds more but communicates less.
 *
 * Two rules do most of the work:
 *
 * 1. *Right-align numbers.* Digits share a column so magnitudes compare at a
 *    glance. Left-aligned numeric columns make 9 and 1,000,000 look alike.
 * 2. *Tabular figures.* Proportional digits change width between renders, so a
 *    live-updating metric visibly jitters. `font-variant-numeric: tabular-nums`
 *    fixes it, and almost nobody remembers to set it.
 *
 * WHEN TO USE
 * Analytics, library statistics, review queues, admin tables.
 *
 * WHEN NOT TO USE
 * On marketing pages. Density signals "work to do"; a landing page wants the
 * opposite. And avoid <Stat> for a single number with no peers — a metric with
 * nothing to compare against is just a sentence.
 *
 * RESPONSIVE BEHAVIOUR
 * Tiles reflow via intrinsic auto-fit rather than breakpoints, so a dashboard
 * behaves correctly inside a sidebar layout as well as full-width. DataRow drops
 * its columns below `sm` and stacks label over value.
 *
 * ACCESSIBILITY
 * <Stat> pairs value and label as a `<dl>` so the relationship is announced —
 * a bare div with a big number reads as a meaningless digit. Trend direction is
 * conveyed by an arrow glyph *and* text, never by colour alone.
 *
 * @example
 * <DashboardGrid>
 *   <Stat value="1,284" label="Context bytes" trend="up" delta="+12%" />
 *   <Stat value="97%" label="Recall rate" />
 * </DashboardGrid>
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { GAP_CLASS, RADIUS, type Space } from '../tokens/scale.js'

/* ─────────────────────────────── Tile grid ───────────────────────────────── */

export interface DashboardGridProps {
  children: ReactNode
  /** Narrowest a tile may be before reflowing. */
  min?: string
  gap?: Space
  className?: string
}

export function DashboardGrid({ children, min = '13rem', gap = 'sm', className }: DashboardGridProps) {
  return (
    <div
      data-design="dashboard-grid"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))` }}
      className={cn('grid', GAP_CLASS[gap], className)}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────────── Metric ─────────────────────────────────── */

export interface StatProps {
  value: ReactNode
  label: ReactNode
  /** Secondary context — comparison period, unit, source. */
  hint?: ReactNode
  trend?: 'up' | 'down' | 'flat'
  /** The change itself, e.g. "+12%". Rendered beside the trend indicator. */
  delta?: ReactNode
  /** `plain` for tiles inside an already-bordered panel. */
  variant?: 'panel' | 'plain'
  className?: string
}

const TREND_META: Record<NonNullable<StatProps['trend']>, { glyph: string; tone: string; label: string }> = {
  up: { glyph: '↑', tone: 'text-emerald-400', label: 'increased' },
  down: { glyph: '↓', tone: 'text-red-400', label: 'decreased' },
  flat: { glyph: '→', tone: 'text-[var(--text-secondary)]', label: 'unchanged' },
}

export function Stat({ value, label, hint, trend, delta, variant = 'panel', className }: StatProps) {
  const meta = trend ? TREND_META[trend] : null

  return (
    <dl
      data-design="stat"
      className={cn(
        'flex flex-col gap-1',
        variant === 'panel' && cn('border border-white/5 bg-white/[0.03] p-5', RADIUS.md),
        className,
      )}
    >
      <dt className="order-2 text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)]">
        {label}
      </dt>

      <dd className="order-1 flex items-baseline gap-2">
        {/* Tabular figures: without these a live metric jitters as digits change. */}
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
          {value}
        </span>
        {meta && delta && (
          <span className={cn('inline-flex items-center gap-1 text-sm tabular-nums', meta.tone)}>
            <span aria-hidden="true">{meta.glyph}</span>
            <span className="sr-only">{meta.label} by</span>
            {delta}
          </span>
        )}
      </dd>

      {hint && <dd className="order-3 text-xs text-[var(--text-secondary)]/70">{hint}</dd>}
    </dl>
  )
}

/* ──────────────────────────────── Panels ─────────────────────────────────── */

export interface PanelProps {
  children: ReactNode
  title?: ReactNode
  /** Actions aligned with the title. */
  action?: ReactNode
  /** Remove internal padding — for tables that should meet the panel's edges. */
  flush?: boolean
  className?: string
}

export function Panel({ children, title, action, flush = false, className }: PanelProps) {
  return (
    <section
      data-design="panel"
      className={cn('flex flex-col border border-white/5 bg-white/[0.03]', RADIUS.md, className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
          {action}
        </header>
      )}
      <div className={cn(!flush && 'p-5')}>{children}</div>
    </section>
  )
}

/* ────────────────────────────── Dense rows ───────────────────────────────── */

export interface DataRowProps {
  children: ReactNode
  /**
   * Column template, e.g. `'1fr auto auto'`. Applied at `sm` and up; below that
   * the row stacks, because a three-column row on a phone is unreadable.
   */
  columns?: string
  /** Highlight on hover — only for rows that are actually interactive. */
  interactive?: boolean
  className?: string
}

export function DataRow({ children, columns = '1fr auto', interactive = false, className }: DataRowProps) {
  return (
    <div
      data-design="data-row"
      style={{ ['--row-cols' as string]: columns }}
      className={cn(
        'grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[var(--row-cols)]',
        'border-b border-white/5 py-2.5 text-sm last:border-b-0',
        interactive && 'cursor-pointer transition-colors hover:bg-white/[0.04]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * A numeric cell. Right-aligned and tabular so magnitudes line up down the
 * column — the single highest-leverage detail in any data table.
 */
export function DataValue({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      data-design="data-value"
      className={cn('text-right tabular-nums text-[var(--text-primary)]', className)}
    >
      {children}
    </span>
  )
}
