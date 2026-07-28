'use client'

/**
 * @module design/composition/Hierarchy
 *
 * PURPOSE
 * Make heading level a property of *position in the layout tree* rather than
 * something every author hand-picks. Nest a Section, and the headings inside it
 * step down automatically.
 *
 * DESIGN PRINCIPLE
 * Visual hierarchy (Gestalt / Refactoring UI) and document semantics are the same
 * hierarchy expressed twice. When they're maintained by hand they drift — someone
 * picks `<h4>` because it "looked right" and a screen-reader user gets a broken
 * outline. Deriving both from one source makes drift impossible.
 *
 * WHEN TO USE
 * Automatically, via <Section>. Reach for <HierarchyLevel> directly only when you
 * need to shift level without introducing a layout section (e.g. inside a portal
 * or a slot rendered far from where it's declared).
 *
 * WHEN NOT TO USE
 * Don't wrap every div. A level shift should correspond to a real subdivision of
 * the document; gratuitous nesting produces `<h5>`s three cards deep.
 *
 * ACCESSIBILITY
 * Guarantees a monotonic, gap-free heading outline — never skipping from h2 to
 * h4. Levels clamp at 6; past that, <Heading> keeps shrinking visually but stops
 * emitting deeper heading tags, which is the correct HTML behaviour.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface HierarchyValue {
  /** Level that the *next* <Heading> in this subtree will render at. */
  level: HeadingLevel
  /** Depth of nesting, independent of the clamped level. */
  depth: number
}

const HierarchyContext = createContext<HierarchyValue>({ level: 1, depth: 0 })

export interface HierarchyLevelProps {
  children: ReactNode
  /**
   * Force a level instead of stepping down from the parent. Use sparingly — an
   * explicit level is a hand-maintained value, which is what this module exists
   * to avoid.
   */
  level?: HeadingLevel
  /** Step down by N levels. Defaults to 1. `0` keeps the current level. */
  step?: number
}

/**
 * @example
 * <HierarchyLevel>       // children render <h2>
 *   <Heading>Features</Heading>
 *   <HierarchyLevel>     // children render <h3>
 *     <Heading>Reader</Heading>
 *   </HierarchyLevel>
 * </HierarchyLevel>
 */
export function HierarchyLevel({ children, level, step = 1 }: HierarchyLevelProps) {
  const parent = useContext(HierarchyContext)

  const value = useMemo<HierarchyValue>(() => {
    const next = level ?? clamp(parent.level + step)
    return { level: next, depth: parent.depth + 1 }
  }, [parent.level, parent.depth, level, step])

  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>
}

/**
 * Reads the level the next heading should use.
 * @returns the current level (1–6) and the raw nesting depth
 */
export function useHierarchy(): HierarchyValue {
  return useContext(HierarchyContext)
}

/**
 * Resets the outline to level 1. Use at the root of a page whose content is
 * mounted inside an already-nested layout (a modal, a full-screen route) where
 * inheriting the surrounding depth would be wrong.
 */
export function HierarchyRoot({ children }: { children: ReactNode }) {
  const value = useMemo<HierarchyValue>(() => ({ level: 1, depth: 0 }), [])
  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>
}

function clamp(n: number): HeadingLevel {
  return Math.min(6, Math.max(1, n)) as HeadingLevel
}
