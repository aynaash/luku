'use client'

/**
 * @module design/layout/Page
 *
 * PURPOSE
 * The root of a route. Establishes the page's maximum width, resets the heading
 * outline to level 1, and opens a page-wide anchor region.
 *
 * DESIGN PRINCIPLE
 * Information architecture comes before visual design. A page is the unit at
 * which you answer "what is the user's goal, what do they need first, what can be
 * hidden until later" — and those answers have structural consequences: one h1,
 * one focal point, one primary action. Page is where those invariants are
 * declared, so the rules downstream have something to be measured against.
 *
 * WHY IT IS NOT JUST <Container>
 * Container is a width. Page is a width *plus* three scopes:
 *
 *   1. <HierarchyRoot>  — the outline restarts here, so a route mounted inside a
 *                         nested layout doesn't inherit that layout's depth and
 *                         emit an <h3> as its page title.
 *   2. <AnchorRegion>   — gives the page one focal-point budget, so the inspector
 *                         can tell "no anchor" from "four anchors".
 *   3. <EmphasisScope>  — catches primary actions that escaped a CTAGroup, which
 *                         is how two of them end up on one screen.
 *
 * WHEN TO USE
 * Once per route, as the outermost element of `page.tsx`. Nested App Router
 * layouts should use <Container> or a plain element — a second Page would reset
 * the outline mid-document.
 *
 * WHEN NOT TO USE
 * Inside a modal, drawer or portal. Those need <HierarchyRoot> (their content is
 * a fresh outline) but not a page width, and they shouldn't claim the page's
 * anchor budget.
 *
 * RESPONSIVE BEHAVIOUR
 * `width` is the ceiling, not the target — every value is inert below its own
 * size. Gutters live on the sections inside, not here, so full-bleed bands can
 * still reach the viewport edge.
 *
 * ACCESSIBILITY
 * Renders `<main>` by default, which gives the page its main landmark and makes
 * "skip to content" work with no extra markup. Set `as="div"` when the route
 * already sits inside a layout that renders `<main>` — two main landmarks is
 * worse than none, because the skip link becomes ambiguous.
 *
 * @example
 * // app/dashboard/page.tsx
 * <Page width="wide">
 *   <Hero … />
 *   <Section>…</Section>
 * </Page>
 */
import type { ElementType, ReactNode } from 'react'
import { CONTAINER, type ContainerSize } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { HierarchyRoot } from '../composition/Hierarchy.js'
import { AnchorRegion } from '../composition/Anchor.js'
import { EmphasisScope } from '../composition/Emphasis.js'

export interface PageProps {
  children: ReactNode
  /** Maximum width of the page's content. A ceiling, not a target. */
  width?: ContainerSize
  /**
   * Name used in dev warnings and in the inspector's critique panel. Defaults to
   * the route being unnamed, which makes warnings harder to place — set it.
   */
  name?: string
  /** Element to render. `main` by default, for the landmark. */
  as?: ElementType
  /**
   * Skip the `<main>` landmark and the anchor/emphasis scopes, keeping only the
   * outline reset. For routes whose chrome already provides them.
   */
  bare?: boolean
  className?: string
}

export function Page({
  children,
  width = 'full',
  name = 'page',
  as: Component = 'main',
  bare = false,
  className,
}: PageProps) {
  const body = (
    <Component
      data-design="page"
      data-design-page={name}
      className={cn('relative w-full', width !== 'full' && cn(CONTAINER[width], 'mx-auto'), className)}
    >
      {children}
    </Component>
  )

  if (bare) return <HierarchyRoot>{body}</HierarchyRoot>

  return (
    <HierarchyRoot>
      <AnchorRegion name={name}>
        <EmphasisScope label={name}>{body}</EmphasisScope>
      </AnchorRegion>
    </HierarchyRoot>
  )
}
