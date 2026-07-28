'use client'

/**
 * @module design/patterns/CTA
 *
 * PURPOSE
 * Action emphasis as a system rule rather than a per-button styling decision, and
 * a group that refuses to let you ship two primaries.
 *
 * DESIGN PRINCIPLE
 * Refactoring UI's action hierarchy: primary / secondary / tertiary. Emphasis is
 * built from *contrast against the surface*, not from size — a solid fill beats
 * an outline beats bare text, at identical dimensions. Sizing all three the same
 * and varying only weight is what makes a button group read as one decision with
 * a recommended answer.
 *
 * THE ENFORCEMENT
 * <CTAGroup> opens an emphasis scope. A second `emphasis="primary"` inside it
 * logs a dev warning naming the group and marks the DOM so <DesignInspector />
 * flags it. Production ships without the check.
 *
 * WHEN TO USE
 * Every action cluster: hero CTAs, form footers, card actions, empty states.
 *
 * WHEN NOT TO USE
 * For navigation. A nav link isn't an action, and styling it as a primary button
 * spends the page's single strongest emphasis on something the user isn't being
 * asked to do.
 *
 * RESPONSIVE BEHAVIOUR
 * CTAGroup stacks below `sm` and stretches its children full-width there —
 * side-by-side buttons on a phone end up too narrow to read and too small to hit.
 *
 * ACCESSIBILITY
 * Renders `<a>` when `href` is set, `<button>` otherwise — never a div with an
 * onClick. Both keep a visible focus ring using the theme's `--ring`. Targets
 * meet the 44×44px minimum at every size except `sm`, which is intended for
 * inline tertiary actions inside dense UI.
 *
 * @example
 * <CTAGroup label="hero" align="center">
 *   <CTA href="/sign-up" emphasis="primary" icon={<ArrowRight />}>
 *     Start reading slowly
 *   </CTA>
 *   <CTA href="#how-it-works" emphasis="secondary">How it works</CTA>
 * </CTAGroup>
 */
import { createElement, type ReactNode } from 'react'
import { cn } from '../utils/cn.js'
import { GAP_CLASS, type Space } from '../tokens/scale.js'
import { EmphasisScope, useEmphasisRegistration, type EmphasisLevel } from '../composition/Emphasis.js'

export type CTASize = 'sm' | 'md' | 'lg' | 'xl'

const EMPHASIS_CLASS: Record<EmphasisLevel, string> = {
  primary:
    'bg-[var(--accent)] text-white font-bold shadow-[0_15px_40px_-10px_var(--accent-glow)] ' +
    'hover:brightness-110 hover:shadow-[0_20px_50px_-10px_var(--accent-glow)] active:brightness-95',
  secondary:
    'border border-white/10 bg-white/5 text-[var(--text-primary)] font-semibold ' +
    'backdrop-blur-xl hover:bg-white/10 hover:border-white/20',
  tertiary:
    'text-[var(--text-secondary)] font-medium underline underline-offset-4 decoration-transparent ' +
    'hover:text-[var(--text-primary)] hover:decoration-current',
}

/** Same vertical rhythm across emphases — only the surface differs. */
const SIZE_CLASS: Record<CTASize, string> = {
  sm: 'px-4 py-2 text-sm rounded-full',
  md: 'px-6 py-3 text-base rounded-full',
  lg: 'px-8 py-4 text-lg rounded-full',
  xl: 'px-10 py-5 text-xl rounded-full',
}

/** Tertiary is text, so the padding that gives a filled button its mass is wrong. */
const TERTIARY_SIZE_CLASS: Record<CTASize, string> = {
  sm: 'text-sm py-1',
  md: 'text-base py-1',
  lg: 'text-lg py-2',
  xl: 'text-xl py-2',
}

export interface CTAProps {
  children: ReactNode
  emphasis?: EmphasisLevel
  size?: CTASize
  href?: string
  onClick?: () => void
  /** Trailing icon. Animates on hover for primary actions only. */
  icon?: ReactNode
  /** Fill the container's width. Automatic below `sm` inside a CTAGroup. */
  block?: boolean
  external?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  'aria-label'?: string
}

export function CTA({
  children,
  emphasis = 'secondary',
  size = 'lg',
  href,
  onClick,
  icon,
  block = false,
  external = false,
  disabled = false,
  type = 'button',
  className,
  ...rest
}: CTAProps) {
  const { isCompeting } = useEmphasisRegistration(emphasis)

  const classes = cn(
    'group inline-flex items-center justify-center gap-3 font-sans',
    'transition-all duration-200 will-change-transform',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
    'motion-safe:hover:scale-[1.03] motion-reduce:transition-none',
    emphasis === 'tertiary' ? TERTIARY_SIZE_CLASS[size] : SIZE_CLASS[size],
    EMPHASIS_CLASS[emphasis],
    block && 'w-full',
    disabled && 'pointer-events-none opacity-50',
    // Dev-only: a competing primary gets a dashed outline so it's obvious in situ.
    isCompeting && process.env.NODE_ENV !== 'production' && 'outline-dashed outline-2 outline-red-500',
    className,
  )

  const content = (
    <>
      {children}
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 transition-transform duration-200',
            emphasis === 'primary' && 'motion-safe:group-hover:translate-x-1',
          )}
        >
          {icon}
        </span>
      )}
    </>
  )

  const shared = {
    'data-design': 'cta',
    'data-design-emphasis': emphasis,
    'data-design-competing': isCompeting || undefined,
    className: classes,
    ...rest,
  }

  if (href) {
    return createElement(
      'a',
      {
        ...shared,
        href,
        onClick,
        ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
        ...(disabled ? { 'aria-disabled': true, tabIndex: -1 } : {}),
      },
      content,
    )
  }

  return createElement('button', { ...shared, type, onClick, disabled }, content)
}

export interface CTAGroupProps {
  children: ReactNode
  /** Named in dev warnings — make it findable, e.g. "hero" or "pricing-footer". */
  label?: string
  align?: 'start' | 'center' | 'end'
  gap?: Space
  /** Stack vertically at all sizes — for narrow columns and empty states. */
  stack?: boolean
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<CTAGroupProps['align']>, string> = {
  start: 'justify-start items-start',
  center: 'justify-center items-center',
  end: 'justify-end items-end',
}

export function CTAGroup({
  children,
  label = 'unnamed',
  align = 'start',
  gap = 'sm',
  stack = false,
  className,
}: CTAGroupProps) {
  return (
    <EmphasisScope label={label}>
      <div
        data-design="cta-group"
        data-design-group={label}
        className={cn(
          'flex',
          stack ? 'flex-col' : 'flex-col sm:flex-row',
          // Full-width targets while stacked; natural width once side by side.
          stack ? '[&>*]:w-full' : '[&>*]:w-full sm:[&>*]:w-auto',
          ALIGN_CLASS[align],
          GAP_CLASS[gap],
          className,
        )}
      >
        {children}
      </div>
    </EmphasisScope>
  )
}
