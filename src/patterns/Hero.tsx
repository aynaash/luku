'use client'

/**
 * @module design/patterns/Hero
 *
 * PURPOSE
 * The opening composition of a page: one claim, one supporting sentence, one
 * decision — arranged so the eye reaches all three in that order.
 *
 * DESIGN PRINCIPLE
 * A hero is the clearest case of visual anchoring. The headline must be the
 * unambiguous entry point, the sub-copy must be subordinate in *contrast* rather
 * than merely smaller, and the primary action must be the only thing in the
 * region with a filled surface. Get those three right and the hero works with
 * almost any typeface; get them wrong and no amount of polish rescues it.
 *
 * WHY THE HEADLINE MEASURE IS CAPPED
 * A display headline running the full width of a 1440px viewport is ~90
 * characters — unreadable at that size, because the eye has to physically move
 * to track a single line. Capping around 16–20 words is what makes a big headline
 * feel confident rather than sprawling.
 *
 * LAYOUTS
 * `centered`  — symmetric, formal, product-launch. Everything on the axis.
 * `split`     — golden-ratio: copy against a visual. The editorial default.
 * `editorial` — left-aligned, no visual, generous whitespace. Reads as text-first
 *               and is the strongest choice when the words are the product.
 *
 * WHEN TO USE
 * Once, at the top of a marketing or landing route.
 *
 * WHEN NOT TO USE
 * On application screens. A hero spends an entire viewport to make one point;
 * inside a product that space belongs to the user's own content.
 *
 * RESPONSIVE BEHAVIOUR
 * `split` stacks below `lg` with the copy first. Vertical rhythm tightens on
 * mobile so the CTA stays above the fold — a hero whose action is unreachable
 * without scrolling has failed at its one job.
 *
 * ACCESSIBILITY
 * The headline renders as the page `<h1>` via <Heading level={1}>. Decorative
 * ambience is `aria-hidden`. Entrance animation is wrapped in `motion-safe`, so
 * users with reduced-motion preferences get the final state immediately.
 *
 * @example
 * <Hero
 *   layout="editorial"
 *   eyebrow="Slow reading for devs"
 *   headline={<>Read deeply. <em>Remember forever.</em></>}
 *   sub="A focused reader for dense technical work."
 *   actions={
 *     <CTAGroup label="hero">
 *       <CTA href="/sign-up" emphasis="primary">Start reading</CTA>
 *       <CTA href="#how" emphasis="secondary">How it works</CTA>
 *     </CTAGroup>
 *   }
 * />
 */
import type { ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { Container } from '../layout/Container.js'
import { Stack } from '../spacing/Stack.js'
import { Heading } from '../typography/Heading.js'
import { Text } from '../typography/Text.js'
import { Eyebrow } from '../typography/Eyebrow.js'
import { Anchor, AnchorRegion } from '../composition/Anchor.js'
import { HierarchyRoot } from '../composition/Hierarchy.js'
import type { ContainerSize } from '../tokens/scale.js'
import type { Family } from '../tokens/typography.js'

export type HeroLayout = 'centered' | 'split' | 'editorial'

export interface HeroProps {
  headline: ReactNode
  sub?: ReactNode
  eyebrow?: ReactNode
  /** The action cluster. Pass a <CTAGroup> so emphasis is scoped to the hero. */
  actions?: ReactNode
  /** Visual companion. Only rendered by `layout="split"`. */
  visual?: ReactNode
  /** Small trust/context line under the actions. */
  footnote?: ReactNode
  /** Typeface for the sub-copy. `display` gives the editorial serif voice. */
  subFamily?: Family
  /** Italic sub-copy. Editorial register — pair with `subFamily="display"`. */
  subItalic?: boolean
  layout?: HeroLayout
  size?: ContainerSize
  /** Vertical presence. `full` reserves a viewport; `standard` is usually right. */
  height?: 'compact' | 'standard' | 'full'
  className?: string
}

const HEIGHT_CLASS: Record<NonNullable<HeroProps['height']>, string> = {
  compact: 'pt-16 pb-20',
  standard: 'pt-20 pb-28 md:pt-24 md:pb-40',
  full: 'min-h-[86dvh] flex items-center pt-16 pb-24',
}

export function Hero({
  headline,
  sub,
  eyebrow,
  actions,
  visual,
  footnote,
  subFamily = 'ui',
  subItalic = false,
  layout = 'editorial',
  size = 'content',
  height = 'standard',
  className,
}: HeroProps) {
  const centered = layout === 'centered'
  const align = centered ? 'center' : 'start'

  const copy = (
    <Stack gap="lg" align={centered ? 'center' : 'start'} className={cn(centered && 'text-center')}>
      {eyebrow && <Eyebrow align={align}>{eyebrow}</Eyebrow>}

      {/* The anchor: the single strongest element in the region. */}
      <Anchor strength="strong">
        <Heading
          level={1}
          role="display"
          align={align}
          // ~4–6 words per line. Past this a display headline reads as a
          // paragraph set large rather than a single gesture.
          measure="snug"
          className={cn(centered && 'mx-auto')}
        >
          {headline}
        </Heading>
      </Anchor>

      {sub && (
        <Text
          size="lead"
          tone="secondary"
          family={subFamily}
          italic={subItalic}
          align={align}
          measure={centered ? 'md' : 'lg'}
          className={cn(centered && 'mx-auto')}
        >
          {sub}
        </Text>
      )}

      {actions && <div className={cn('w-full pt-2', centered && 'flex justify-center')}>{actions}</div>}

      {footnote && (
        <Text size="caption" tone="muted" align={align} measure="md">
          {footnote}
        </Text>
      )}
    </Stack>
  )

  return (
    <HierarchyRoot>
      <AnchorRegion name="hero">
        <section
          data-design="hero"
          data-design-layout={layout}
          className={cn('relative', HEIGHT_CLASS[height], className)}
        >
          <Container size={size}>
            {layout === 'split' && visual ? (
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.618fr)] lg:gap-20">
                {copy}
                <div aria-hidden={false}>{visual}</div>
              </div>
            ) : (
              copy
            )}
          </Container>
        </section>
      </AnchorRegion>
    </HierarchyRoot>
  )
}
