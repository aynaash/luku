'use client'

/**
 * @module design/patterns/Card
 *
 * PURPOSE
 * Card *composition* — a set of slots with pre-decided internal rhythm — rather
 * than a card component with a fixed shape.
 *
 * DESIGN PRINCIPLE
 * A card is a Gestalt closure device: a border or surface says "these things are
 * one thing". Three rules make cards work, and all three are enforced here:
 *
 * 1. Internal padding must be smaller than the gap between cards, or the grouping
 *    inverts and the cards read as one field.
 * 2. Internal rhythm must be tighter than the padding, so the contents bind to
 *    each other before they bind to the edge.
 * 3. Elevation must mean importance. A grid of equally-raised cards is a grid of
 *    equally-unimportant cards — hence `elevation="flat"` by default.
 *
 * WHEN TO USE
 * Repeating units of comparable content: features, articles, settings, results.
 *
 * WHEN NOT TO USE
 * As a wrapper for a whole page section. Cards imply peers; a lone card with
 * nothing to be a peer *of* is just a box with a border. Also avoid nesting cards
 * — the second border cancels the first one's grouping signal.
 *
 * RESPONSIVE BEHAVIOUR
 * Padding is a single scale step at every width, not a breakpoint ramp. A ramp
 * looks harmless and quietly breaks rule 1: `p-6 md:p-8` grows to 32px on desktop
 * and meets the 24px gap most grids use, so the cards fuse into one field exactly
 * where there is most room to keep them apart. If a card needs less padding on
 * mobile, its grid gap has to shrink with it — pass both, deliberately.
 *
 * ACCESSIBILITY
 * `interactive` cards render a real `<a>` wrapping the whole surface, not an
 * onClick div, so they're keyboard-reachable and announce as links. When a card
 * has its own heading, it enters the document outline — which is correct, and why
 * CardTitle goes through <Heading>. Card opens a <HierarchyLevel>, so a card
 * heading is one level below its section's heading rather than a sibling of it.
 *
 * @example
 * <Card interactive href="/reader">
 *   <CardIcon><BookOpen size={22} /></CardIcon>
 *   <CardTitle>A reader that gets out of the way</CardTitle>
 *   <CardBody>PDFs, papers and transcripts in a calm, keyboard-first reader.</CardBody>
 * </Card>
 */
import { createElement, type ReactNode } from 'react'
import { ELEVATION, RADIUS, PAD_CLASS, GAP_CLASS, type Elevation, type Radius, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { Heading } from '../typography/Heading.js'
import { Text } from '../typography/Text.js'
import { HierarchyLevel } from '../composition/Hierarchy.js'

export type CardTone = 'surface' | 'accent' | 'critical' | 'bare'

const TONE_CLASS: Record<CardTone, string> = {
  surface: 'bg-white/5 border border-white/5 hover:border-[var(--accent)]/30',
  accent: 'bg-[var(--accent)]/5 border border-[var(--accent)]/20',
  critical: 'bg-white/5 border border-white/5 hover:border-red-400/30',
  bare: '',
}

export interface CardProps {
  children: ReactNode
  tone?: CardTone
  /**
   * Internal padding. Must stay at least one step below the gap that separates
   * this card from its neighbours — the `proximity` audit rule checks it.
   */
  padding?: Space
  /** Rhythm between the card's own slots. Must stay below `padding`. */
  gap?: Space
  radius?: Radius
  /** Depth. Use sparingly — depth is a claim about importance. */
  elevation?: Elevation
  /** Makes the whole surface a link. Requires `href`. */
  interactive?: boolean
  href?: string
  /** Centre the card's contents. For icon-led feature cards. */
  center?: boolean
  className?: string
}

export function Card({
  children,
  tone = 'surface',
  // md (24px) — one step below the lg (32px) gap that typically separates cards.
  // The `proximity` rule flags padding >= sibling gap.
  padding = 'md',
  gap = 'sm',
  radius = 'lg',
  elevation = 'flat',
  interactive = false,
  href,
  center = false,
  className,
}: CardProps) {
  if (process.env.NODE_ENV !== 'production' && interactive && !href) {
    // eslint-disable-next-line no-console
    console.warn(
      '[design] <Card interactive> without `href` renders a non-focusable ' +
        'surface. Provide href, or put the link on the CardTitle instead.',
    )
  }

  const Component = interactive && href ? 'a' : 'div'

  return createElement(
    Component,
    {
      ...(interactive && href ? { href } : {}),
      'data-design': 'card',
      'data-design-tone': tone,
      className: cn(
        'group flex flex-col',
        center && 'items-center text-center',
        // Straight off the scale, deliberately. An earlier `p-6 md:p-8` grew to
        // 32px on desktop — meeting or exceeding the 24px gap that typically
        // separates cards, which inverts the grouping this component exists to
        // create. Keep padding one clear step below the parent's gap.
        PAD_CLASS[padding],
        GAP_CLASS[gap],
        RADIUS[radius],
        ELEVATION[elevation],
        TONE_CLASS[tone],
        'transition-all duration-500',
        interactive &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        className,
      ),
    },
    // A card is a real subdivision of its section, so its heading steps down one
    // level. Without this, every card in a section emits a sibling of the
    // section's own heading and the outline flattens to a wall of h2s.
    <HierarchyLevel key="hierarchy">{children}</HierarchyLevel>,
  )
}

/**
 * The card's visual anchor. An icon at the top establishes the entry point before
 * the reader parses any text — which is why feature grids are so much faster to
 * scan with them than without.
 */
export function CardIcon({
  children,
  size = 'md',
  className,
}: {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = { sm: 'w-10 h-10 rounded-lg', md: 'w-12 h-12 rounded-xl', lg: 'w-16 h-16 rounded-2xl' }[size]

  return (
    <div
      aria-hidden="true"
      data-design="card-icon"
      className={cn(
        dims,
        'flex shrink-0 items-center justify-center',
        'border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]',
        'transition-transform duration-500 motion-safe:group-hover:scale-110',
        // Extra room below the icon binds it to the title as a unit.
        'mb-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Heading
      role="subheading"
      family="ui"
      className={cn('text-white transition-colors group-hover:text-[var(--accent)]', className)}
    >
      {children}
    </Heading>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text size="small" tone="secondary" measure="none" className={className}>
      {children}
    </Text>
  )
}

/**
 * Actions pinned to the bottom of the card. `mt-auto` keeps them aligned across a
 * row of cards with different body lengths — the alternative is a ragged bottom
 * edge that makes an otherwise clean grid look broken.
 */
export function CardActions({
  children,
  gap = 'xs',
  className,
}: {
  children: ReactNode
  gap?: Space
  className?: string
}) {
  return (
    <div data-design="card-actions" className={cn('mt-auto flex flex-wrap items-center pt-2', GAP_CLASS[gap], className)}>
      {children}
    </div>
  )
}

/** Media slot. Bleeds to the card's edges — inset media wastes the padding twice. */
export function CardMedia({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-design="card-media"
      className={cn('-mx-6 -mt-6 mb-2 overflow-hidden', className)}
    >
      {children}
    </div>
  )
}
