/**
 * @module luku
 *
 * Drip for your React sites — a composition and layout engine, not a UI
 * component library. ("Luku" is Sheng for drip: how a thing is put together,
 * not the pieces it's made of.)
 *
 * The distinction matters. A component library gives you a Button and a Dialog.
 * This gives you the *decisions* that sit above them: how far apart things are,
 * how wide text is allowed to be, which element the eye lands on first, and how
 * many actions may claim to be the most important one.
 *
 * LAYERS (each depends only on the ones above it)
 *
 *   tokens/       numbers and class maps — the single source of spatial truth
 *   utils/        pure functions: ratios, contrast maths, rhythm checks
 *   spacing/      Stack · Inline · Inset · Spacer · Bleed
 *   layout/       Container · Section · Grid · Split · Sidebar · Center · Frame
 *   typography/   Heading · Text · Eyebrow · Prose · Quote
 *   composition/  Hierarchy · Anchor · Thirds · Triangle · F/Z patterns · Balance
 *   patterns/     Hero · Card · CTA · Editorial · Magazine · Dashboard · Empty …
 *   hooks/        container queries, breakpoints, measure verification
 *   devtools/     <DesignInspector /> — nine audits over the rendered DOM
 *
 * SERVER VS CLIENT
 * Layout and spacing primitives carry no directive, so they render on the server.
 * Anything that reads context — Section, Heading, CTA, Hero — is a client
 * component, because heading level and action emphasis are inherited state.
 *
 * PORTABILITY
 * Nothing here imports from a host app. The only external dependencies are
 * `react`, `clsx` and `tailwind-merge`.
 *
 * THEMING
 * Six CSS custom properties are read and never written: --background,
 * --text-primary, --text-secondary, --accent, --accent-glow, --ring. Declare
 * them yourself or `@import "luku/theme.css"`. Anything else you see in a
 * var() here (--split-tracks, --sidebar-tracks, --balance-tracks, --row-cols)
 * is written inline by the component that owns it — don't set those.
 */

export * from './tokens/index.js'
export * from './utils/index.js'
export * from './spacing/index.js'
export * from './layout/index.js'
export * from './typography/index.js'
export * from './composition/index.js'
export * from './patterns/index.js'
export * from './hooks/index.js'
export * from './devtools/index.js'
