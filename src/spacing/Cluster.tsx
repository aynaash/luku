/**
 * @module design/spacing/Cluster
 *
 * PURPOSE
 * A wrapping row of small, self-sized things: tags, chips, badges, filters,
 * avatars, toolbar buttons.
 *
 * RELATIONSHIP TO <Inline>
 * Cluster *is* Inline with the defaults that suit chips, and it exists because
 * defaults are the whole game in a composition engine. Inline defaults to
 * `gap="sm"` and `wrap` optional, which is right for a heading beside its icon.
 * A row of fifteen tags at that spacing reads as fifteen separate things rather
 * than one set — chips need a tighter step (`2xs`) and must always wrap. Reach
 * for Inline when you need `wrap={false}` or baseline alignment; reach for
 * Cluster for everything chip-shaped.
 *
 * DESIGN PRINCIPLE
 * Gestalt proximity and similarity working together. Chips are visually similar
 * (same shape, same size), so similarity already binds them into a set; the
 * spacing job is only to keep them tighter than the distance to whatever sits
 * around them. Overspacing a cluster breaks the set apart even though every chip
 * still looks identical.
 *
 * WHEN TO USE
 * Tag lists, filter pills, badge rows, social links, toolbar actions.
 *
 * WHEN NOT TO USE
 * For a row of items with different jobs — a Cancel and a Save button are not a
 * set, they're a decision, and that's <CTAGroup>. Also not for anything that
 * should stay on one line: Cluster always wraps, by design.
 *
 * RESPONSIVE BEHAVIOUR
 * Wraps at the container's natural limit with no breakpoints involved. Row gap
 * matches column gap, so a cluster that wraps to three lines keeps an even
 * texture instead of looking like three separate rows.
 *
 * ACCESSIBILITY
 * Renders a `<div>`. Pass `as="ul"` for a genuine list of tags so the count is
 * announced — `role="list"` is re-added, since `display: flex` strips list
 * semantics in Safari/VoiceOver exactly as `display: grid` does.
 *
 * @example
 * <Cluster as="ul" gap="2xs">
 *   {tags.map((t) => <li key={t}><Badge>{t}</Badge></li>)}
 * </Cluster>
 */
import { createElement, type ElementType } from 'react'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'
import { baseOf, resolveResponsive, type Responsive } from './responsive.js'

export interface ClusterOwnProps {
  /** Tighter than Inline by default — a set should read as one thing. */
  gap?: Responsive<Space>
  align?: 'start' | 'center' | 'end' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between'
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<ClusterOwnProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
}

const JUSTIFY_CLASS: Record<NonNullable<ClusterOwnProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
}

export function Cluster<T extends ElementType = 'div'>({
  as,
  gap = '2xs',
  align = 'center',
  justify = 'start',
  className,
  children,
  ...rest
}: PolymorphicProps<T, ClusterOwnProps>) {
  const Component = (as ?? 'div') as ElementType
  const isList = Component === 'ul' || Component === 'ol'

  return createElement(
    Component,
    {
      'data-design': 'cluster',
      'data-design-gap': baseOf(gap),
      role: isList ? 'list' : undefined,
      className: cn(
        'flex flex-wrap',
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        resolveResponsive(gap, GAP_CLASS),
        className,
      ),
      ...rest,
    },
    children,
  )
}
