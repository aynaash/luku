'use client'

/**
 * @module design/patterns/SectionHeader
 *
 * PURPOSE
 * The eyebrow / title / description cluster that opens a section — spaced
 * correctly, in the outline correctly, every time.
 *
 * DESIGN PRINCIPLE
 * Gestalt proximity applied to a three-part group. The three parts must bind
 * tightly to each other and sit far from what follows. Hand-built headers get
 * this backwards constantly: `mb-4` under the eyebrow and `mb-4` under the
 * description makes four elements read as four unrelated things.
 *
 * The internal rhythm is deliberately asymmetric — eyebrow→title is tighter
 * (`2xs`) than title→description (`sm`), because the eyebrow is a label *on* the
 * title while the description is a separate statement.
 *
 * WHEN TO USE
 * At the top of any <Section> that needs an introduction.
 *
 * WHEN NOT TO USE
 * When the section's content is self-describing. A header above an obvious grid
 * of logos adds a line of text nobody reads. Also skip the description when the
 * title already says it — a subtitle that restates the title is pure noise.
 *
 * RESPONSIVE BEHAVIOUR
 * `align="center"` caps the description's measure and centres it; centred text
 * beyond ~55ch is genuinely hard to read because the left edge moves every line.
 *
 * ACCESSIBILITY
 * The title renders through <Heading>, so it takes its level from the surrounding
 * <Section> nesting. Pass `id` and point the section's `aria-labelledby` at it to
 * turn the section into a properly-named landmark.
 *
 * @example
 * <SectionHeader
 *   eyebrow="What you get"
 *   title="A workshop for hard reading."
 *   description="Everything below exists to slow you down in the useful way."
 *   align="center"
 * />
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { Stack } from '../spacing/Stack.js'
import { Heading } from '../typography/Heading.js'
import { Text } from '../typography/Text.js'
import { Eyebrow } from '../typography/Eyebrow.js'
import type { Align } from '../tokens/typography.js'
import type { Measure } from '../tokens/scale.js'
import type { TypeRole } from '../tokens/typography.js'

export interface SectionHeaderProps {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  align?: Align
  /** Override the title's visual role without changing its outline level. */
  role?: TypeRole
  /** Measure cap for the description. */
  measure?: Measure
  /** Trailing content — a link or action aligned with the header. */
  action?: ReactNode
  className?: string
  id?: string
}

export function SectionHeader({
  title,
  eyebrow,
  description,
  align = 'start',
  role,
  measure = 'md',
  action,
  className,
  id,
}: SectionHeaderProps) {
  const centered = align === 'center'

  const header = (
    <Stack
      gap="2xs"
      align={centered ? 'center' : align === 'end' ? 'end' : 'start'}
      className={cn('w-full', className)}
    >
      {eyebrow && <Eyebrow align={align}>{eyebrow}</Eyebrow>}

      <Heading id={id} role={role} align={align} measure={centered ? 'normal' : 'none'}>
        {title}
      </Heading>

      {description && (
        <Text
          size="lead"
          tone="secondary"
          align={align}
          // Centred copy needs a tighter cap than ragged-left copy.
          measure={centered ? 'sm' : measure}
          className="mt-2"
        >
          {description}
        </Text>
      )}
    </Stack>
  )

  if (!action) return header

  return (
    <div
      data-design="section-header"
      className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
    >
      {header}
      <div className="shrink-0">{action}</div>
    </div>
  )
}
