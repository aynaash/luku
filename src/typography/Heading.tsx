'use client'

/**
 * @module design/typography/Heading
 *
 * PURPOSE
 * Render the semantically correct heading tag at the visually correct size, with
 * neither decided by hand.
 *
 * DESIGN PRINCIPLE
 * Typographic hierarchy (Refactoring UI / Apple HIG): hierarchy comes from the
 * *combination* of size, weight, colour and space — not from size alone. Bumping
 * only the font size produces a page of shouting; the roles in `TYPE_ROLE` move
 * size, weight, leading and tracking together, which is what actually reads as a
 * level change.
 *
 * THE CENTRAL IDEA
 * The tag comes from the layout tree (via <Section>/<HierarchyLevel>), and the
 * visual role defaults to that tag. You can override the *look* without touching
 * the *outline*:
 *
 *   <Heading role="display">…</Heading>   // still an <h2> if nested one deep
 *
 * That decoupling is the whole point: a card heading that must look small is a
 * visual decision, and it should never quietly corrupt the document outline.
 *
 * WHEN TO USE
 * Every heading. There is no case for a bare `<h2 className="text-4xl">` in a
 * system that has this.
 *
 * WHEN NOT TO USE
 * For text that merely looks like a heading but doesn't introduce a section — a
 * stat's value, a pull-quote, a large price. Those are <Text size="…"> or
 * <Display>; making them headings pollutes the outline a screen-reader user
 * navigates by.
 *
 * RESPONSIVE BEHAVIOUR
 * Every role carries its own breakpoint ramp, so headings shrink on small screens
 * without per-page overrides. `display` runs 48 → 128px across the range.
 *
 * ACCESSIBILITY
 * Emits `h1`–`h6` matching the current level, never skipping. Levels beyond 6
 * clamp: the visual role keeps stepping down but the tag stays `h6`, which is
 * what HTML requires. Passing an explicit `level` is available but should be rare
 * — it reintroduces the hand-maintenance this component removes.
 *
 * @example
 * <Section>
 *   <Heading>Read anything. Your way.</Heading>          // <h2>, `title` role
 *   <Section>
 *     <Heading>PDFs</Heading>                            // <h3>, `heading` role
 *     <Heading role="subheading">Academic papers</Heading>// <h3>, small look
 *   </Section>
 * </Section>
 */
import { createElement } from 'react'
import type { ReactNode } from 'react'
import {
  ALIGN,
  FAMILY,
  LEVEL_ROLE,
  TONE,
  TYPE_ROLE,
  WRAP,
  type Align,
  type Family,
  type Tone,
  type TypeRole,
  type Wrap,
} from '../tokens/typography.js'
import { HEADLINE_MEASURE, type HeadlineMeasure } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { useHierarchy, type HeadingLevel } from '../composition/Hierarchy.js'

export interface HeadingProps {
  children: ReactNode
  /** Visual role. Defaults to the role mapped from the current outline level. */
  role?: TypeRole
  /** Force a heading level. Prefer letting <Section> nesting decide. */
  level?: HeadingLevel
  tone?: Tone
  family?: Family
  align?: Align
  /**
   * Line-length cap, on the *headline* scale (14–38ch) rather than the body
   * scale. A body measure is inert at display sizes and would never bind.
   */
  measure?: HeadlineMeasure
  /** `balance` evens out the last line — worth it on any heading that wraps. */
  wrap?: Wrap
  className?: string
  id?: string
}

export function Heading({
  children,
  role,
  level,
  tone = 'primary',
  family = 'display',
  align = 'start',
  measure = 'none',
  wrap = 'balance',
  className,
  id,
}: HeadingProps) {
  const hierarchy = useHierarchy()
  const resolvedLevel = level ?? hierarchy.level
  const resolvedRole = role ?? LEVEL_ROLE[resolvedLevel]

  return createElement(
    `h${resolvedLevel}`,
    {
      id,
      'data-design': 'heading',
      'data-design-level': resolvedLevel,
      'data-design-role': resolvedRole,
      className: cn(
        TYPE_ROLE[resolvedRole],
        TONE[tone],
        FAMILY[family],
        ALIGN[align],
        HEADLINE_MEASURE[measure],
        WRAP[wrap],
        align === 'center' && measure !== 'none' && 'mx-auto',
        className,
      ),
    },
    children,
  )
}
