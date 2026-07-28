/**
 * @module design/typography/Prose
 *
 * PURPOSE
 * A reading environment for content you don't control — markdown, a CMS payload,
 * an extracted article.
 *
 * DESIGN PRINCIPLE
 * Reading width plus vertical rhythm. When markup comes from outside the system,
 * you can't wrap each paragraph in <Text>; instead you set the rules once on a
 * container and let descendants inherit. That's the only place in this library
 * where descendant selectors are the right tool rather than a shortcut.
 *
 * WHY 65ch AND NOT A PIXEL WIDTH
 * `ch` is relative to the rendered font's zero-width. A 680px column is ~62
 * characters in Inter and ~78 in Cormorant Garamond — the second is outside the
 * comfortable band while looking identical in the spec. Measuring in characters
 * is measuring the thing that actually matters.
 *
 * WHEN TO USE
 * Article bodies, docs pages, changelogs, rendered markdown, extracted reader
 * content.
 *
 * WHEN NOT TO USE
 * For composed page sections where you control every node — use <Stack> + <Text>
 * so spacing stays explicit and inspectable. Prose's descendant rules will fight
 * primitives nested inside it.
 *
 * RESPONSIVE BEHAVIOUR
 * The measure cap is inert below its own width, so mobile needs no special case.
 * Headings inside Prose use the same ramp as <Heading> roles.
 *
 * ACCESSIBILITY
 * Sets a relaxed line-height (1.7), which materially helps dyslexic readers, and
 * keeps link underlines with an offset rather than removing them — colour alone
 * is not a sufficient link affordance.
 *
 * @example
 * <Prose measure="lg">
 *   <ReactMarkdown>{article.body}</ReactMarkdown>
 * </Prose>
 */
import type { ReactNode } from 'react'
import { MEASURE, type Measure } from '../tokens/scale.js'
import { ALIGN, FAMILY, type Align, type Family } from '../tokens/typography.js'
import { cn } from '../utils/cn.js'

export interface ProseProps {
  children: ReactNode
  /** Line-length cap. `lg` (~68ch) suits long-form; `md` suits denser pages. */
  measure?: Measure
  family?: Family
  align?: Align
  /** Centre the column in its parent. */
  center?: boolean
  className?: string
}

/**
 * Descendant rules. Kept in one string so the reading environment is defined in
 * exactly one place and can be diffed as a unit.
 */
const PROSE_RULES = [
  // Rhythm: space belongs between blocks, and headings need more room above than
  // below so they bind to the text they introduce (Gestalt proximity).
  '[&>*+*]:mt-6',
  '[&>h2]:mt-16 [&>h3]:mt-12 [&>h4]:mt-10',
  '[&>h2+*]:mt-4 [&>h3+*]:mt-3 [&>h4+*]:mt-3',

  // Type roles, matching TYPE_ROLE so Prose and <Heading> agree.
  '[&>h2]:text-3xl [&>h2]:sm:text-4xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:leading-[1.1]',
  '[&>h3]:text-2xl [&>h3]:font-bold [&>h3]:tracking-tight [&>h3]:leading-snug',
  '[&>h4]:text-xl [&>h4]:font-bold [&>h4]:leading-snug',
  '[&>h2]:text-[var(--text-primary)] [&>h3]:text-[var(--text-primary)] [&>h4]:text-[var(--text-primary)]',

  // Body.
  'text-[var(--text-secondary)] leading-[1.7]',
  '[&>p]:text-[var(--text-secondary)]',
  '[&_strong]:text-[var(--text-primary)] [&_strong]:font-semibold',
  '[&_em]:italic',

  // Links keep an underline — colour alone fails WCAG 1.4.1.
  '[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-[var(--accent)]/40 hover:[&_a]:decoration-[var(--accent)]',

  // Lists.
  '[&>ul]:list-disc [&>ol]:list-decimal [&>ul]:pl-6 [&>ol]:pl-6',
  '[&>ul>li]:mt-2 [&>ol>li]:mt-2 [&_li]:pl-1',
  '[&>ul]:marker:text-[var(--accent)] [&>ol]:marker:text-[var(--accent)]',

  // Quotes and rules.
  '[&>blockquote]:border-l-2 [&>blockquote]:border-[var(--accent)]/40 [&>blockquote]:pl-6 [&>blockquote]:italic [&>blockquote]:text-[var(--text-primary)]',
  '[&>hr]:border-white/10 [&>hr]:my-12',

  // Code.
  '[&_code]:text-[var(--accent)] [&_code]:text-[0.9em]',
  '[&>pre]:overflow-x-auto [&>pre]:rounded-2xl [&>pre]:bg-black/30 [&>pre]:p-6 [&>pre]:text-sm',
  '[&>pre_code]:text-[var(--text-primary)]',

  // Media escapes the measure — a 65ch-wide image is a thumbnail.
  '[&>img]:rounded-2xl [&>img]:w-full',
  '[&>figure>figcaption]:mt-3 [&>figure>figcaption]:text-sm [&>figure>figcaption]:opacity-60',
].join(' ')

export function Prose({
  children,
  measure = 'lg',
  family = 'ui',
  align = 'start',
  center = true,
  className,
}: ProseProps) {
  return (
    <div
      data-design="prose"
      data-design-measure={measure}
      className={cn(
        PROSE_RULES,
        MEASURE[measure],
        FAMILY[family],
        ALIGN[align],
        center && 'mx-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
