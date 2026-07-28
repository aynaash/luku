'use client'

/**
 * @module design/composition/Anchor
 *
 * PURPOSE
 * Declare the one element in a region that the eye should land on first, and let
 * the system verify that exactly one exists.
 *
 * DESIGN PRINCIPLE
 * Visual anchoring. Every composition needs an entry point — a dominant element
 * that resolves the viewer's first fixation. Without one the eye wanders the
 * region and the layout reads as "busy" even when the spacing is perfect. Gestalt
 * calls this figure/ground; Refactoring UI calls it "not everything can be bold".
 *
 * HOW DOMINANCE IS CREATED
 * Not by size alone. An anchor wins through *contrast on multiple axes* — scale,
 * weight, colour, isolation (whitespace around it), or depth. `strength` bundles
 * those into three honest levels rather than pretending it's a continuum.
 *
 * WHEN TO USE
 * Once per <Section>: the hero headline, the primary CTA, the key metric on a
 * dashboard card, the illustration in an empty state.
 *
 * WHEN NOT TO USE
 * Twice in one region. Two anchors is zero anchors — the inspector's
 * missing-anchor rule reports both cases, and the second is the more common bug.
 *
 * RESPONSIVE BEHAVIOUR
 * `isolate` adds whitespace around the anchor that scales with viewport, because
 * isolation is the anchoring technique that survives small screens best — you can
 * always give something room, but you can't always make it bigger.
 *
 * ACCESSIBILITY
 * Visual only; it adds no semantics. If the anchor is also the primary action, it
 * should be a <CTA emphasis="primary">, which carries the semantics. Marking
 * `data-design-anchor` lets the inspector cross-check that the visual anchor and
 * the semantic primary agree — when they disagree, sighted and non-sighted users
 * are being given different priorities.
 *
 * @example
 * <Section>
 *   <Anchor strength="strong" isolate>
 *     <Heading role="display">Read deeply. Remember forever.</Heading>
 *   </Anchor>
 *   <Text>…supporting copy…</Text>
 * </Section>
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../utils/cn.js'

export type AnchorStrength = 'subtle' | 'medium' | 'strong'

interface AnchorRegistry {
  register: () => () => void
  count: number
  region: string
  bounded: boolean
}

const AnchorContext = createContext<AnchorRegistry>({
  register: () => () => {},
  count: 0,
  region: 'page',
  bounded: false,
})

/**
 * Opens an anchor region. <Section> does *not* do this automatically — a region
 * is a perceptual unit, and only the author knows whether two adjacent sections
 * read as one field or two.
 */
export function AnchorRegion({ children, name = 'unnamed region' }: { children: ReactNode; name?: string }) {
  const countRef = useRef(0)
  const [count, setCount] = useState(0)
  const warned = useRef(false)

  const register = useMemo(
    () => () => {
      countRef.current += 1
      setCount(countRef.current)
      return () => {
        countRef.current = Math.max(0, countRef.current - 1)
        setCount(countRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (count > 1 && !warned.current) {
      warned.current = true
      // eslint-disable-next-line no-console
      console.warn(
        `[design] AnchorRegion "${name}" declares ${count} anchors. ` +
          `A region with two focal points has none — demote all but one.`,
      )
    }
    if (count <= 1) warned.current = false
  }, [count, name])

  const value = useMemo<AnchorRegistry>(
    () => ({ register, count, region: name, bounded: true }),
    [register, count, name],
  )

  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>
}

export interface AnchorProps {
  children: ReactNode
  /**
   * subtle — slight lift; the anchor of a card
   * medium — clear dominance; the anchor of a section
   * strong — unmistakable; the anchor of a page
   */
  strength?: AnchorStrength
  /** Surround with whitespace. Isolation is the most reliable anchoring device. */
  isolate?: boolean
  className?: string
}

const STRENGTH_CLASS: Record<AnchorStrength, string> = {
  subtle: '',
  medium: 'relative z-10',
  strong: 'relative z-10',
}

const ISOLATE_CLASS: Record<AnchorStrength, string> = {
  subtle: 'py-2',
  medium: 'py-4 md:py-6',
  strong: 'py-8 md:py-12',
}

export function Anchor({ children, strength = 'medium', isolate = false, className }: AnchorProps) {
  const registry = useContext(AnchorContext)
  const { register } = registry

  useEffect(() => register(), [register])

  return (
    <div
      data-design="anchor"
      data-design-anchor={strength}
      className={cn(STRENGTH_CLASS[strength], isolate && ISOLATE_CLASS[strength], className)}
    >
      {children}
    </div>
  )
}

export function useAnchorRegion() {
  return useContext(AnchorContext)
}
