/**
 * @module design/typography/Text
 *
 * PURPOSE
 * Body copy with an enforced measure and a tone that carries hierarchy.
 *
 * DESIGN PRINCIPLE
 * Two rules do most of the work in body text:
 *
 * 1. *Measure.* 45–75 characters per line. Beyond that the eye loses the return
 *    sweep and re-reads lines; below it, the rhythm of fixations breaks up.
 * 2. *Contrast as hierarchy.* Supporting copy should be a step down in contrast,
 *    not a step down in size. Shrinking secondary text hurts everyone; lowering
 *    its contrast tells the eye what to skip while keeping it readable when it's
 *    actually wanted.
 *
 * WHEN TO USE
 * All running prose, descriptions, captions, and metadata.
 *
 * WHEN NOT TO USE
 * For headings — those need to be in the outline; use <Heading>. For blocks of
 * multi-paragraph markdown, use <Prose>, which handles the vertical rhythm
 * *between* paragraphs too.
 *
 * RESPONSIVE BEHAVIOUR
 * `lead` scales up with viewport; the rest hold a constant size, because body
 * text that grows on desktop just runs past a comfortable measure. The `ch`-based
 * measure cap adapts on its own — it's relative to the rendered font.
 *
 * ACCESSIBILITY
 * `tone="muted"` sits near the AA floor by design; the inspector's contrast rule
 * checks it against the real composited background. Renders `<p>` by default —
 * use `as="span"` for inline runs so you don't nest a `<p>` inside a `<p>`, which
 * browsers silently unnest and which breaks hydration.
 *
 * @example
 * <Text size="lead" tone="secondary" measure="md">
 *   A focused reader for dense technical work.
 * </Text>
 */
import { createElement, type ElementType } from 'react'
import {
  ALIGN,
  FAMILY,
  TONE,
  TYPE_ROLE,
  WRAP,
  type Align,
  type Family,
  type Tone,
  type Wrap,
} from '../tokens/typography.js'
import { MEASURE, type Measure } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import type { PolymorphicProps } from '../utils/polymorphic.js'

export type TextSize = 'lead' | 'body' | 'small' | 'caption'

export interface TextOwnProps {
  size?: TextSize
  tone?: Tone
  family?: Family
  align?: Align
  /**
   * Line-length cap. Defaults to `md` (~58ch) — inside the comfortable band
   * without needing thought. Set `none` only inside an already-narrow column.
   */
  measure?: Measure
  wrap?: Wrap
  /** Italic — for editorial voice, not for emphasis (use `<em>` for that). */
  italic?: boolean
  className?: string
}

export function Text<T extends ElementType = 'p'>({
  as,
  size = 'body',
  tone = 'secondary',
  family = 'ui',
  align = 'start',
  measure = 'md',
  wrap = 'pretty',
  italic = false,
  className,
  children,
  ...rest
}: PolymorphicProps<T, TextOwnProps>) {
  const Component = (as ?? 'p') as ElementType

  return createElement(
    Component,
    {
      'data-design': 'text',
      // Namespaced: `data-design-size` belongs to <Container> and means a width.
      'data-design-text-size': size,
      'data-design-measure': measure,
      className: cn(
        TYPE_ROLE[size],
        TONE[tone],
        FAMILY[family],
        ALIGN[align],
        MEASURE[measure],
        WRAP[wrap],
        italic && 'italic',
        align === 'center' && measure !== 'none' && 'mx-auto',
        className,
      ),
      ...rest,
    },
    children,
  )
}
