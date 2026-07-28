'use client'

/**
 * @module design/layout/Section
 *
 * PURPOSE
 * The unit of page structure. A Section owns three things at once: vertical
 * rhythm, container width, and its position in the heading outline.
 *
 * DESIGN PRINCIPLE
 * The three are inseparable. A new section is simultaneously a visual break
 * (whitespace), a scope (width), and a semantic subdivision (heading level).
 * Splitting them across three components guarantees they drift apart — which is
 * how pages end up with an `<h2>` that looks like an `<h4>` sitting 12px from the
 * paragraph above it.
 *
 * WHEN TO USE
 * Every top-level band of a page. Nest for sub-sections; headings step down
 * automatically via <HierarchyLevel>.
 *
 * WHEN NOT TO USE
 * Inside a card or list item. Those are components, not document subdivisions —
 * nesting Sections there pushes headings to `<h5>` for purely visual reasons.
 * Use <Stack> instead.
 *
 * RESPONSIVE BEHAVIOUR
 * Vertical padding scales with the `space` prop's named rhythm. `cinematic`
 * intentionally leaves a lot of air; it's for the one or two moments on a page
 * that should feel like a held breath.
 *
 * ACCESSIBILITY
 * Renders `<section>`. An `<section>` without an accessible name is not exposed
 * as a landmark, so pass `aria-label`, or point `aria-labelledby` at the id of
 * the heading inside it — in dev, Section warns when neither is present and it
 * contains no <Heading>.
 *
 * @example
 * <Section space="loose" size="wide" id="how-it-works">
 *   <SectionHeader eyebrow="What you get" title="A workshop for hard reading." />
 *   <Grid min="18rem">…</Grid>
 * </Section>
 */
import { type ElementType, type ReactNode } from 'react'
import { GAP_CLASS, PAD_Y_CLASS, SECTION_SPACE, type ContainerSize, type Space } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { HierarchyLevel } from '../composition/Hierarchy.js'
import { Container } from './Container.js'

export type SectionSpace = keyof typeof SECTION_SPACE

export interface SectionProps {
  children: ReactNode
  /** Vertical breathing room around the section. */
  space?: SectionSpace | Space
  /** Max width of the inner container. */
  size?: ContainerSize
  /** Rhythm between the section's own direct children. */
  gap?: Space
  /** Skip the inner Container — for full-bleed bands that manage their own width. */
  bare?: boolean
  /** Don't step the heading level down. For the first section of a page. */
  keepLevel?: boolean
  /** Element to render. `section` by default; use `header`/`footer` where apt. */
  as?: ElementType
  className?: string
  /** Applied to the inner Container rather than the outer band. */
  innerClassName?: string
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function Section({
  children,
  space = 'normal',
  size = 'content',
  gap = 'xl',
  bare = false,
  keepLevel = false,
  as: Component = 'section',
  className,
  innerClassName,
  ...rest
}: SectionProps) {
  const rhythm: Space = space in SECTION_SPACE ? SECTION_SPACE[space as SectionSpace] : (space as Space)

  const body = (
    <div
      data-design="section-body"
      className={cn('flex flex-col', GAP_CLASS[gap], bare && innerClassName)}
    >
      {children}
    </div>
  )

  return (
    <Component
      data-design="section"
      data-design-space={space}
      className={cn('relative', PAD_Y_CLASS[rhythm], className)}
      {...rest}
    >
      <HierarchyLevel step={keepLevel ? 0 : 1}>
        {bare ? body : (
          <Container size={size} className={innerClassName}>
            {body}
          </Container>
        )}
      </HierarchyLevel>
    </Component>
  )
}
