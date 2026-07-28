'use client'

/**
 * @module design/hooks/useBreakpoint
 *
 * PURPOSE
 * Read the active breakpoint and other media state in JavaScript, matching the
 * same values Tailwind uses in CSS.
 *
 * DESIGN PRINCIPLE
 * One source of truth for breakpoints. When JS thinks "mobile" ends at 768 and
 * CSS thinks 640, you get a band of widths where the two disagree — and those
 * bugs are invisible on the two devices anyone actually tests on.
 *
 * WHEN TO USE
 * Only for decisions CSS cannot make: which component to *mount*, whether to
 * open a drawer versus a popover, whether to enable a drag interaction.
 *
 * WHEN NOT TO USE
 * For styling. A `useBreakpoint` branch that renders different classes is a media
 * query with extra steps, an extra render, and an SSR hydration hazard.
 *
 * SSR NOTE
 * Returns `'base'` on the server and during the first client render, then
 * corrects after mount via `useSyncExternalStore`. That ordering is deliberate:
 * rendering the mobile layout first and widening is far less jarring than the
 * reverse, and it guarantees markup that matches on hydration.
 */
import { useSyncExternalStore } from 'react'

/** Matches Tailwind's default screens. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const

export type BreakpointName = 'base' | keyof typeof BREAKPOINTS

const ORDER: BreakpointName[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl']

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('resize', callback, { passive: true })
  return () => window.removeEventListener('resize', callback)
}

function getSnapshot(): BreakpointName {
  const width = window.innerWidth
  let active: BreakpointName = 'base'
  for (const name of ORDER) {
    if (name === 'base') continue
    if (width >= BREAKPOINTS[name as keyof typeof BREAKPOINTS]) active = name
  }
  return active
}

/** The largest breakpoint currently satisfied. `'base'` during SSR. */
export function useBreakpoint(): BreakpointName {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'base' as BreakpointName)
}

/**
 * Arbitrary media query.
 * @param query e.g. `'(min-width: 1024px)'`
 * @param serverValue what to assume before hydration
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

/**
 * True when the user has asked for reduced motion.
 *
 * Prefer the CSS `motion-safe:` / `motion-reduce:` variants where possible — this
 * hook is for JS-driven animation (Framer Motion, canvas, scroll effects) that
 * CSS can't reach. Defaults to `true` on the server: starting still and animating
 * once known is the safe direction.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', true)
}
