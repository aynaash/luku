/**
 * @module design/spacing/responsive
 *
 * PURPOSE
 * Let every spatial prop take either a single value or a per-breakpoint object,
 * without each component reimplementing breakpoint plumbing.
 *
 * DESIGN PRINCIPLE
 * Rhythm is viewport-relative. A gap that separates two groups on a 390px phone
 * reads as accidental on a 1920px display — the eye judges distance against the
 * size of the field, not in absolutes. Making the responsive form as cheap to
 * write as the static one is what gets it actually used.
 *
 * WHY A PREFIX MAP AND NOT STRING INTERPOLATION
 * Tailwind scans source text for complete class names. `` `${bp}:${cls}` ``
 * produces nothing at build time. Every emitted class must therefore be assembled
 * from literals that appear verbatim in a source file — which is why the
 * responsive variants below are written out.
 */

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl'

export type Responsive<T> = T | ({ base: T } & Partial<Record<Exclude<Breakpoint, 'base'>, T>>)

/** Every Tailwind class the system may emit, in each breakpoint variant. */
const PREFIXED: Record<Exclude<Breakpoint, 'base'>, Record<string, string>> = {
  sm: {
    'gap-0': 'sm:gap-0', 'gap-1': 'sm:gap-1', 'gap-2': 'sm:gap-2', 'gap-3': 'sm:gap-3',
    'gap-4': 'sm:gap-4', 'gap-6': 'sm:gap-6', 'gap-8': 'sm:gap-8', 'gap-12': 'sm:gap-12',
    'gap-16': 'sm:gap-16', 'gap-24': 'sm:gap-24', 'gap-32': 'sm:gap-32', 'gap-40': 'sm:gap-40',
    'p-0': 'sm:p-0', 'p-1': 'sm:p-1', 'p-2': 'sm:p-2', 'p-3': 'sm:p-3', 'p-4': 'sm:p-4',
    'p-6': 'sm:p-6', 'p-8': 'sm:p-8', 'p-12': 'sm:p-12', 'p-16': 'sm:p-16', 'p-24': 'sm:p-24',
    'p-32': 'sm:p-32', 'p-40': 'sm:p-40',
    'py-0': 'sm:py-0', 'py-1': 'sm:py-1', 'py-2': 'sm:py-2', 'py-3': 'sm:py-3', 'py-4': 'sm:py-4',
    'py-6': 'sm:py-6', 'py-8': 'sm:py-8', 'py-12': 'sm:py-12', 'py-16': 'sm:py-16',
    'py-24': 'sm:py-24', 'py-32': 'sm:py-32', 'py-40': 'sm:py-40',
    'px-0': 'sm:px-0', 'px-1': 'sm:px-1', 'px-2': 'sm:px-2', 'px-3': 'sm:px-3', 'px-4': 'sm:px-4',
    'px-6': 'sm:px-6', 'px-8': 'sm:px-8', 'px-12': 'sm:px-12', 'px-16': 'sm:px-16',
    'px-24': 'sm:px-24', 'px-32': 'sm:px-32', 'px-40': 'sm:px-40',
  },
  md: {
    'gap-0': 'md:gap-0', 'gap-1': 'md:gap-1', 'gap-2': 'md:gap-2', 'gap-3': 'md:gap-3',
    'gap-4': 'md:gap-4', 'gap-6': 'md:gap-6', 'gap-8': 'md:gap-8', 'gap-12': 'md:gap-12',
    'gap-16': 'md:gap-16', 'gap-24': 'md:gap-24', 'gap-32': 'md:gap-32', 'gap-40': 'md:gap-40',
    'p-0': 'md:p-0', 'p-1': 'md:p-1', 'p-2': 'md:p-2', 'p-3': 'md:p-3', 'p-4': 'md:p-4',
    'p-6': 'md:p-6', 'p-8': 'md:p-8', 'p-12': 'md:p-12', 'p-16': 'md:p-16', 'p-24': 'md:p-24',
    'p-32': 'md:p-32', 'p-40': 'md:p-40',
    'py-0': 'md:py-0', 'py-1': 'md:py-1', 'py-2': 'md:py-2', 'py-3': 'md:py-3', 'py-4': 'md:py-4',
    'py-6': 'md:py-6', 'py-8': 'md:py-8', 'py-12': 'md:py-12', 'py-16': 'md:py-16',
    'py-24': 'md:py-24', 'py-32': 'md:py-32', 'py-40': 'md:py-40',
    'px-0': 'md:px-0', 'px-1': 'md:px-1', 'px-2': 'md:px-2', 'px-3': 'md:px-3', 'px-4': 'md:px-4',
    'px-6': 'md:px-6', 'px-8': 'md:px-8', 'px-12': 'md:px-12', 'px-16': 'md:px-16',
    'px-24': 'md:px-24', 'px-32': 'md:px-32', 'px-40': 'md:px-40',
  },
  lg: {
    'gap-0': 'lg:gap-0', 'gap-1': 'lg:gap-1', 'gap-2': 'lg:gap-2', 'gap-3': 'lg:gap-3',
    'gap-4': 'lg:gap-4', 'gap-6': 'lg:gap-6', 'gap-8': 'lg:gap-8', 'gap-12': 'lg:gap-12',
    'gap-16': 'lg:gap-16', 'gap-24': 'lg:gap-24', 'gap-32': 'lg:gap-32', 'gap-40': 'lg:gap-40',
    'p-0': 'lg:p-0', 'p-1': 'lg:p-1', 'p-2': 'lg:p-2', 'p-3': 'lg:p-3', 'p-4': 'lg:p-4',
    'p-6': 'lg:p-6', 'p-8': 'lg:p-8', 'p-12': 'lg:p-12', 'p-16': 'lg:p-16', 'p-24': 'lg:p-24',
    'p-32': 'lg:p-32', 'p-40': 'lg:p-40',
    'py-0': 'lg:py-0', 'py-1': 'lg:py-1', 'py-2': 'lg:py-2', 'py-3': 'lg:py-3', 'py-4': 'lg:py-4',
    'py-6': 'lg:py-6', 'py-8': 'lg:py-8', 'py-12': 'lg:py-12', 'py-16': 'lg:py-16',
    'py-24': 'lg:py-24', 'py-32': 'lg:py-32', 'py-40': 'lg:py-40',
    'px-0': 'lg:px-0', 'px-1': 'lg:px-1', 'px-2': 'lg:px-2', 'px-3': 'lg:px-3', 'px-4': 'lg:px-4',
    'px-6': 'lg:px-6', 'px-8': 'lg:px-8', 'px-12': 'lg:px-12', 'px-16': 'lg:px-16',
    'px-24': 'lg:px-24', 'px-32': 'lg:px-32', 'px-40': 'lg:px-40',
  },
  xl: {
    'gap-0': 'xl:gap-0', 'gap-1': 'xl:gap-1', 'gap-2': 'xl:gap-2', 'gap-3': 'xl:gap-3',
    'gap-4': 'xl:gap-4', 'gap-6': 'xl:gap-6', 'gap-8': 'xl:gap-8', 'gap-12': 'xl:gap-12',
    'gap-16': 'xl:gap-16', 'gap-24': 'xl:gap-24', 'gap-32': 'xl:gap-32', 'gap-40': 'xl:gap-40',
    'p-0': 'xl:p-0', 'p-1': 'xl:p-1', 'p-2': 'xl:p-2', 'p-3': 'xl:p-3', 'p-4': 'xl:p-4',
    'p-6': 'xl:p-6', 'p-8': 'xl:p-8', 'p-12': 'xl:p-12', 'p-16': 'xl:p-16', 'p-24': 'xl:p-24',
    'p-32': 'xl:p-32', 'p-40': 'xl:p-40',
    'py-0': 'xl:py-0', 'py-1': 'xl:py-1', 'py-2': 'xl:py-2', 'py-3': 'xl:py-3', 'py-4': 'xl:py-4',
    'py-6': 'xl:py-6', 'py-8': 'xl:py-8', 'py-12': 'xl:py-12', 'py-16': 'xl:py-16',
    'py-24': 'xl:py-24', 'py-32': 'xl:py-32', 'py-40': 'xl:py-40',
    'px-0': 'xl:px-0', 'px-1': 'xl:px-1', 'px-2': 'xl:px-2', 'px-3': 'xl:px-3', 'px-4': 'xl:px-4',
    'px-6': 'xl:px-6', 'px-8': 'xl:px-8', 'px-12': 'xl:px-12', 'px-16': 'xl:px-16',
    'px-24': 'xl:px-24', 'px-32': 'xl:px-32', 'px-40': 'xl:px-40',
  },
}

const BREAKPOINTS: Exclude<Breakpoint, 'base'>[] = ['sm', 'md', 'lg', 'xl']

/**
 * Resolves a responsive token into a class string.
 *
 * @param value  a token, or `{ base, sm?, md?, lg?, xl? }`
 * @param map    token → base Tailwind class (e.g. GAP_CLASS)
 */
export function resolveResponsive<T extends string>(
  value: Responsive<T>,
  map: Record<T, string>,
): string {
  if (typeof value === 'string') return map[value]

  const classes: string[] = [map[value.base]]
  for (const bp of BREAKPOINTS) {
    const token = value[bp]
    if (token === undefined) continue
    const base = map[token]
    const prefixed = PREFIXED[bp][base]
    if (prefixed) classes.push(prefixed)
    else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[design] no ${bp}: variant registered for "${base}". ` +
          `Add it to PREFIXED in design/spacing/responsive.ts — Tailwind cannot ` +
          `see interpolated class names.`,
      )
    }
  }
  return classes.join(' ')
}

/** Reads the base value out of a responsive prop, for data attributes and audits. */
export function baseOf<T extends string>(value: Responsive<T>): T {
  return typeof value === 'string' ? value : value.base
}
