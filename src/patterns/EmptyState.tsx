'use client'

/**
 * @module design/patterns/EmptyState
 *
 * PURPOSE
 * The screen a user sees before they have any content — and, done properly, the
 * best onboarding surface a product has.
 *
 * DESIGN PRINCIPLE
 * An empty state is a composition with exactly one job, which makes it the purest
 * application of anchoring: one visual, one sentence, one action, symmetrically
 * balanced. Anything else added to it competes with the only thing the user can
 * usefully do.
 *
 * The copy rule matters as much as the layout: name the *next action*, not the
 * absence. "No documents yet" describes a void; "Add your first PDF and start
 * reading" describes a door.
 *
 * WHY IT'S OPTICALLY CENTRED
 * An empty state usually sits in a tall region. Geometric centring in a tall box
 * reads as sagging, so <Center optical> lifts it to ~45% — the difference between
 * "empty" and "waiting".
 *
 * WHEN TO USE
 * First-run states, cleared filters, zero search results, empty queues.
 *
 * WHEN NOT TO USE
 * For errors. An error is not an empty state: it needs a cause, a recovery path,
 * and often a way to report it, and dressing failure up in friendly onboarding
 * copy reads as evasive.
 *
 * RESPONSIVE BEHAVIOUR
 * Actions stack full-width on mobile via <CTAGroup>. The illustration scales down
 * and can be dropped entirely below `sm` with `hideVisualOnMobile` when vertical
 * room is scarce.
 *
 * ACCESSIBILITY
 * The illustration is `aria-hidden` — it is decorative, and describing a drawing
 * of an empty box helps no one. The heading enters the outline at the current
 * level so an empty state inside a panel doesn't claim to be a page title.
 *
 * @example
 * <EmptyState
 *   visual={<BookOpen size={32} />}
 *   title="Your library is waiting"
 *   description="Add a PDF, paste an article URL, or drop in a lecture link."
 *   action={
 *     <CTAGroup label="empty-library" align="center">
 *       <CTA href="/dashboard/create" emphasis="primary">Add your first document</CTA>
 *       <CTA href="/explore" emphasis="tertiary">Browse examples</CTA>
 *     </CTAGroup>
 *   }
 * />
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { Center } from '../layout/Center.js'
import { Stack } from '../spacing/Stack.js'
import { Heading } from '../typography/Heading.js'
import { Text } from '../typography/Text.js'
import { AnchorRegion, Anchor } from '../composition/Anchor.js'

export interface EmptyStateProps {
  title: ReactNode
  /** Say what to do next, not what is missing. */
  description?: ReactNode
  /** Icon or illustration. Decorative — it carries no information. */
  visual?: ReactNode
  /** Pass a <CTAGroup> so the single-primary rule is scoped here. */
  action?: ReactNode
  /** Vertical presence of the surrounding region. */
  height?: 'auto' | 'full' | 'screen'
  hideVisualOnMobile?: boolean
  className?: string
}

export function EmptyState({
  title,
  description,
  visual,
  action,
  height = 'full',
  hideVisualOnMobile = false,
  className,
}: EmptyStateProps) {
  return (
    <AnchorRegion name="empty-state">
      <Center
        optical
        minHeight={height}
        data-design="empty-state"
        className={cn('px-6 py-16', className)}
      >
        <Stack gap="md" align="center" className="max-w-md text-center">
          {visual && (
            <Anchor strength="medium">
              <div
                aria-hidden="true"
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-2xl',
                  'border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]',
                  hideVisualOnMobile && 'hidden sm:flex',
                )}
              >
                {visual}
              </div>
            </Anchor>
          )}

          <Heading role="heading" align="center" family="ui">
            {title}
          </Heading>

          {description && (
            <Text tone="secondary" align="center" measure="sm">
              {description}
            </Text>
          )}

          {action && <div className="w-full pt-2">{action}</div>}
        </Stack>
      </Center>
    </AnchorRegion>
  )
}
