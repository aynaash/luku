/**
 * @module design/tokens/typography
 *
 * PURPOSE
 * A closed set of type roles. Components pick a *role*; the role decides size,
 * weight, leading and tracking together — because those four are never
 * independent decisions in good typography.
 *
 * DESIGN PRINCIPLE
 * Apple HIG: type scales are a hierarchy of roles, not a menu of sizes.
 * Refactoring UI: "limit your choices" — a fixed scale removes the temptation to
 * split the difference between two steps and end up with mush.
 *
 * TIGHTER AS IT GETS BIGGER
 * Leading and tracking both shrink as size grows. Large text at body leading
 * looks like it's falling apart; small text at display leading looks cramped.
 */

export const TYPE_ROLE = {
  /** Hero-scale statement. One per page, maximum. */
  display: 'text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[0.95]',
  /** Section-opening statement. */
  title: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08]',
  /** Sub-section heading. */
  heading: 'text-2xl sm:text-3xl font-bold tracking-tight leading-[1.15]',
  /** Card / list-item heading. */
  subheading: 'text-lg sm:text-xl font-bold leading-snug tracking-tight',
  /** Smallest heading role — dense data, table groups. */
  label: 'text-sm font-semibold leading-snug tracking-tight',

  /** Introductory paragraph directly under a title. Larger, more air. */
  lead: 'text-lg sm:text-xl lg:text-2xl leading-relaxed',
  /** Default running text. */
  body: 'text-base leading-relaxed',
  /** Secondary running text — card descriptions, captions with substance. */
  small: 'text-sm leading-relaxed',
  /** Metadata, footnotes, timestamps. */
  caption: 'text-xs leading-normal',
  /** Kicker above a heading. All-caps, wide tracking, tiny. */
  eyebrow: 'text-[10px] font-mono uppercase tracking-[0.3em] leading-none',
  /** Pull-quote / editorial aside. */
  quote: 'text-xl sm:text-2xl italic leading-relaxed',
} as const

export type TypeRole = keyof typeof TYPE_ROLE

/**
 * Default role per heading level. `<Heading>` uses this when no explicit role is
 * given, so nesting a Section automatically steps the type down.
 */
export const LEVEL_ROLE: Record<1 | 2 | 3 | 4 | 5 | 6, TypeRole> = {
  1: 'display',
  2: 'title',
  3: 'heading',
  4: 'subheading',
  5: 'label',
  6: 'label',
}

/**
 * Text tone. Maps to the theme variables in globals.css so the whole system
 * follows the active theme (charcoal / parchment / obsidian / boreal).
 */
export const TONE = {
  /** Highest contrast. Headings and the one thing you want read first. */
  primary: 'text-[var(--text-primary)]',
  /** Supporting copy. Deliberately lower contrast to create hierarchy. */
  secondary: 'text-[var(--text-secondary)]',
  /** Accent — reserved for emphasis, never for whole paragraphs. */
  accent: 'text-[var(--accent)]',
  /** Quiet metadata. */
  muted: 'text-[var(--text-secondary)]/60',
  /** Inverted for use on accent fields. */
  onAccent: 'text-white',
  /** Problem/negative framing in editorial contexts. */
  critical: 'text-red-400/80',
  /** Inherit from parent — for when the container already set the colour. */
  inherit: '',
} as const

export type Tone = keyof typeof TONE

/** Typeface families. `display` is the serif; `ui` is the sans; `mono` for data. */
export const FAMILY = {
  display: 'font-serif',
  ui: 'font-sans',
  mono: 'font-mono',
  inherit: '',
} as const

export type Family = keyof typeof FAMILY

/** Text alignment, expressed as intent rather than direction. */
export const ALIGN = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
} as const

export type Align = keyof typeof ALIGN

/**
 * Balanced/pretty wrapping. `text-wrap: balance` on short headings prevents the
 * lonely last word; `pretty` on body text prevents orphans without the cost of
 * balancing every line.
 */
export const WRAP = {
  balance: '[text-wrap:balance]',
  pretty: '[text-wrap:pretty]',
  normal: '',
} as const

export type Wrap = keyof typeof WRAP
