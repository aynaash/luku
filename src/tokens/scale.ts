/**
 * @module design/tokens/scale
 *
 * PURPOSE
 * The single source of numeric truth for the composition engine. Every spatial
 * decision in the system resolves to one of these tokens — never to a raw pixel.
 *
 * DESIGN PRINCIPLE
 * Refactoring UI: "Don't use a linear spacing scale." Human perception of space
 * is relative, so the steps grow proportionally. Swiss/International Style: every
 * value is a multiple of a base unit (4px), which is what makes unrelated blocks
 * on a page appear to belong to the same system.
 *
 * WHY NAMED STEPS AND NOT NUMBERS
 * `gap="lg"` states intent ("these are separate groups"). `gap-8` states a
 * measurement. Intent survives redesigns; measurements don't.
 */

/** The Swiss grid unit. Every spatial token is an integer multiple of this. */
export const BASE_UNIT = 4

/**
 * Composition ratios. These drive Split, GoldenRatio and RuleOfThirds.
 * Expressed as the *minor* portion of a whole, so 0.382 + 0.618 = 1.
 */
export const RATIO = {
  /** 1 : 1.618 — the golden section. Feels intentional but not obvious. */
  golden: 1.618033988749895,
  /** 1 : 2 — rule of thirds. The workhorse asymmetric split. */
  thirds: 2,
  /** 1 : 1 — symmetric. Use only when the two sides are genuinely peers. */
  half: 1,
  /** 1 : 3 — sidebar proportion. Strong dominance of the major side. */
  quarter: 3,
} as const

export type RatioName = keyof typeof RATIO

/**
 * The rhythm scale. Keys are semantic distances, not sizes.
 *
 *  none .. 2xs  →  within a single element (icon to its label)
 *  xs   .. md   →  between related elements (heading to its paragraph)
 *  lg   .. xl   →  between groups (one card to the next)
 *  2xl  .. 5xl  →  between page sections
 *
 * The px values are informational; `class` is what actually ships. Class strings
 * are written out in full so Tailwind's scanner can see them statically.
 */
export const SPACE = {
  none: 0,
  '3xs': 4,
  '2xs': 8,
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
  '3xl': 96,
  '4xl': 128,
  '5xl': 160,
} as const

export type Space = keyof typeof SPACE

/** Ordered, so tooling can reason about "one step tighter/looser". */
export const SPACE_ORDER: Space[] = [
  'none', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl',
]

/** flex/grid `gap` — the only spacing mechanism the system uses between siblings. */
export const GAP_CLASS: Record<Space, string> = {
  none: 'gap-0',
  '3xs': 'gap-1',
  '2xs': 'gap-2',
  xs: 'gap-3',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
  '2xl': 'gap-16',
  '3xl': 'gap-24',
  '4xl': 'gap-32',
  '5xl': 'gap-40',
}

/** Column gap only — for Split/Grid where the row gap should collapse tighter. */
export const GAP_X_CLASS: Record<Space, string> = {
  none: 'gap-x-0',
  '3xs': 'gap-x-1',
  '2xs': 'gap-x-2',
  xs: 'gap-x-3',
  sm: 'gap-x-4',
  md: 'gap-x-6',
  lg: 'gap-x-8',
  xl: 'gap-x-12',
  '2xl': 'gap-x-16',
  '3xl': 'gap-x-24',
  '4xl': 'gap-x-32',
  '5xl': 'gap-x-40',
}

export const GAP_Y_CLASS: Record<Space, string> = {
  none: 'gap-y-0',
  '3xs': 'gap-y-1',
  '2xs': 'gap-y-2',
  xs: 'gap-y-3',
  sm: 'gap-y-4',
  md: 'gap-y-6',
  lg: 'gap-y-8',
  xl: 'gap-y-12',
  '2xl': 'gap-y-16',
  '3xl': 'gap-y-24',
  '4xl': 'gap-y-32',
  '5xl': 'gap-y-40',
}

/** Uniform padding (Inset). */
export const PAD_CLASS: Record<Space, string> = {
  none: 'p-0',
  '3xs': 'p-1',
  '2xs': 'p-2',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
  '2xl': 'p-16',
  '3xl': 'p-24',
  '4xl': 'p-32',
  '5xl': 'p-40',
}

export const PAD_X_CLASS: Record<Space, string> = {
  none: 'px-0',
  '3xs': 'px-1',
  '2xs': 'px-2',
  xs: 'px-3',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
  '2xl': 'px-16',
  '3xl': 'px-24',
  '4xl': 'px-32',
  '5xl': 'px-40',
}

export const PAD_Y_CLASS: Record<Space, string> = {
  none: 'py-0',
  '3xs': 'py-1',
  '2xs': 'py-2',
  xs: 'py-3',
  sm: 'py-4',
  md: 'py-6',
  lg: 'py-8',
  xl: 'py-12',
  '2xl': 'py-16',
  '3xl': 'py-24',
  '4xl': 'py-32',
  '5xl': 'py-40',
}

/**
 * Container widths.
 *
 * `reading` and `prose` are measured in `ch` because line length is a function
 * of the typeface, not of the viewport. Everything else is a hard max so wide
 * monitors don't stretch layouts past the point of scannability.
 */
export const CONTAINER = {
  /** ~65ch — the classic ideal for sustained body reading. */
  reading: 'max-w-[65ch]',
  /** ~75ch — long-form with generous type; still inside the safe band. */
  prose: 'max-w-[75ch]',
  /** Narrow editorial column / forms / empty states. */
  narrow: 'max-w-2xl',
  /** Default content column — cards, feature grids. */
  content: 'max-w-5xl',
  /** Multi-column dashboards and 3–4 up grids. */
  wide: 'max-w-7xl',
  /** Full-bleed. Only for imagery and colour fields, never for text. */
  full: 'max-w-none',
} as const

export type ContainerSize = keyof typeof CONTAINER

/**
 * Measure caps applied to text blocks. Anything above ~75ch measurably slows
 * reading — the eye loses the return sweep to the next line.
 */
export const MEASURE = {
  xs: 'max-w-[38ch]',
  sm: 'max-w-[48ch]',
  md: 'max-w-[58ch]',
  lg: 'max-w-[68ch]',
  xl: 'max-w-[78ch]',
  none: '',
} as const

export type Measure = keyof typeof MEASURE

/**
 * Measure caps for *headings*, which need their own scale.
 *
 * A body cap of 65ch is inert at display sizes — 65ch of 96px type is ~3000px,
 * far wider than any viewport, so the cap never binds and the headline runs the
 * full container. Headlines want 20–30 characters per line so they read as one
 * gesture rather than a paragraph set large.
 */
export const HEADLINE_MEASURE = {
  /** ~2–4 words per line. Poster-like. */
  tight: 'max-w-[14ch]',
  /** ~4–6 words. The default for display headlines. */
  snug: 'max-w-[20ch]',
  /** ~6–8 words. Section titles. */
  normal: 'max-w-[28ch]',
  /** ~8–11 words. Long titles that must stay on two lines. */
  wide: 'max-w-[38ch]',
  none: '',
} as const

export type HeadlineMeasure = keyof typeof HEADLINE_MEASURE

/** Corner radii. One family, so cards never disagree with each other. */
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-lg',
  md: 'rounded-2xl',
  lg: 'rounded-[2rem]',
  xl: 'rounded-[2.5rem]',
  full: 'rounded-full',
} as const

export type Radius = keyof typeof RADIUS

/**
 * Elevation. Depth communicates hierarchy, not decoration — a raised element
 * should be raised *because* it is more important, not because it looks nice.
 */
export const ELEVATION = {
  flat: '',
  raised: 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.35)]',
  floating: 'shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]',
  lifted: 'shadow-[0_28px_70px_-20px_rgba(0,0,0,0.65)]',
} as const

export type Elevation = keyof typeof ELEVATION

/** Section rhythm: how much air sits between top-level page sections. */
export const SECTION_SPACE: Record<'tight' | 'normal' | 'loose' | 'cinematic', Space> = {
  tight: 'xl',
  normal: '3xl',
  loose: '4xl',
  cinematic: '5xl',
}
