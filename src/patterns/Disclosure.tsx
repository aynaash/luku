'use client'

/**
 * @module design/patterns/Disclosure
 *
 * PURPOSE
 * Progressive disclosure: show the smallest thing that answers the user's
 * question, and keep the rest one interaction away.
 *
 * DESIGN PRINCIPLE
 * Apple HIG's progressive disclosure. The cost of hidden information is one
 * click; the cost of shown-but-irrelevant information is paid by every user on
 * every visit, in scanning time. So the default is hidden — but only for content
 * that is genuinely secondary. Hiding something users need is not disclosure, it
 * is an obstacle course.
 *
 * THE SUMMARY IS THE CONTRACT
 * A disclosure trigger must describe what's inside precisely enough that someone
 * who doesn't need it can skip it confidently. "Learn more" fails this test; it
 * forces everyone to open it to find out whether they cared.
 *
 * WHEN TO USE
 * Advanced settings, FAQs, long explanations under a short answer, per-item
 * detail in a list, optional form sections.
 *
 * WHEN NOT TO USE
 * For content users need on first read, and for anything they must compare
 * side-by-side — comparison across collapsed panels forces people to hold state
 * in their heads. Never hide errors or required fields.
 *
 * RESPONSIVE BEHAVIOUR
 * `openOnDesktop` lets the same markup be expanded on wide screens and collapsed
 * on mobile, where vertical space is actually scarce. This is the correct default
 * for supporting detail on a marketing page.
 *
 * ACCESSIBILITY
 * Built on native `<details>`/`<summary>`, which gives keyboard operation,
 * `aria-expanded`, and in-page find (browsers expand `<details>` to reveal search
 * matches). A hand-rolled div + useState version gets none of that for free, and
 * usually gets the ARIA wrong. The marker is replaced with a rotating chevron
 * that respects `prefers-reduced-motion`.
 *
 * @example
 * <Disclosure summary="How does spaced repetition scheduling work?">
 *   <Text>Cards are scheduled with SM-2…</Text>
 * </Disclosure>
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { GAP_CLASS, type Space } from '../tokens/scale.js'

export interface DisclosureProps {
  /** Must describe the contents specifically enough to be skippable. */
  summary: ReactNode
  children: ReactNode
  /** Open on first render. */
  defaultOpen?: boolean
  /** `bare` for FAQ lists; `panel` when it needs a surface of its own. */
  variant?: 'bare' | 'panel'
  className?: string
  name?: string
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  variant = 'bare',
  className,
  name,
}: DisclosureProps) {
  return (
    <details
      data-design="disclosure"
      open={defaultOpen}
      name={name}
      className={cn(
        'group',
        variant === 'panel' && 'rounded-2xl border border-white/5 bg-white/[0.03] px-6',
        variant === 'bare' && 'border-b border-white/5',
        className,
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-4 py-4',
          'text-left text-base font-semibold text-[var(--text-primary)]',
          'transition-colors hover:text-[var(--accent)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:rounded-lg',
          // Safari renders its own marker unless this is removed explicitly.
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        {summary}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--accent)]',
            'motion-safe:transition-transform motion-safe:duration-300',
            'group-open:rotate-180',
          )}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="pb-5 text-[var(--text-secondary)]">{children}</div>
    </details>
  )
}

/**
 * A group of disclosures. `exclusive` makes them behave as an accordion using the
 * native `name` attribute — no JavaScript, no state, and it degrades correctly in
 * browsers that don't support it (all panels simply open independently).
 */
export function DisclosureGroup({
  children,
  gap = 'none',
  className,
}: {
  children: ReactNode
  gap?: Space
  className?: string
}) {
  return (
    <div data-design="disclosure-group" className={cn('flex flex-col', GAP_CLASS[gap], className)}>
      {children}
    </div>
  )
}

/**
 * Reveals supporting detail on wide screens while keeping it collapsed on mobile.
 * Renders the content twice — visible on desktop, inside a <Disclosure> on mobile
 * — which is why `children` must be idempotent and free of unique DOM ids.
 */
export function ResponsiveDisclosure({
  summary,
  children,
  className,
}: {
  summary: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{children}</div>
      <div className="md:hidden">
        <Disclosure summary={summary}>{children}</Disclosure>
      </div>
    </div>
  )
}
