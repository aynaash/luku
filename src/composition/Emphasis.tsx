'use client'

/**
 * @module design/composition/Emphasis
 *
 * PURPOSE
 * Track how many competing calls-to-action exist inside one decision point, and
 * make a second primary action a *development-time error* rather than a design
 * review comment nobody files.
 *
 * DESIGN PRINCIPLE
 * Refactoring UI: "when everything is emphasised, nothing is." Apple HIG says the
 * same in accessibility terms — one unambiguous default action per screen region.
 * Two equally-weighted buttons don't offer a choice; they offer hesitation.
 *
 * HOW IT WORKS
 * <CTAGroup> opens a registry. Each <CTA emphasis="primary"> registers on mount.
 * In development a second registration logs a warning naming the group, and the
 * DOM carries `data-design-emphasis` so <DesignInspector /> can surface it
 * visually. In production this costs one context read and nothing else.
 *
 * IMPLEMENTATION NOTE
 * `register` is identity-stable — it mutates a ref and schedules the count update
 * separately. If the callback's identity changed with the count, every registered
 * CTA would unregister and re-register on each change, which both churns renders
 * and makes the count briefly wrong.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type EmphasisLevel = 'primary' | 'secondary' | 'tertiary'

interface EmphasisRegistry {
  /** Registers an action; returns an unregister callback. Identity-stable. */
  register: (level: EmphasisLevel) => () => void
  /** Number of primaries currently mounted in this group. */
  primaryCount: number
  /** Human-readable name, used in warnings. */
  label: string
  /** True when this subtree sits inside a real scope. */
  bounded: boolean
}

const ROOT_REGISTRY: EmphasisRegistry = {
  register: () => () => {},
  primaryCount: 0,
  label: 'root',
  bounded: false,
}

const EmphasisContext = createContext<EmphasisRegistry>(ROOT_REGISTRY)

export interface EmphasisScopeProps {
  children: ReactNode
  /** Named in dev warnings so the offending group is easy to find. */
  label?: string
}

/**
 * Opens an emphasis scope. <CTAGroup> renders this for you — use it directly only
 * when actions that share one decision are spread across containers (a form whose
 * submit button lives in a sticky footer, say).
 */
export function EmphasisScope({ children, label = 'unnamed group' }: EmphasisScopeProps) {
  const countRef = useRef(0)
  const [primaryCount, setPrimaryCount] = useState(0)
  const warned = useRef(false)

  const register = useCallback((level: EmphasisLevel) => {
    if (level !== 'primary') return () => {}
    countRef.current += 1
    setPrimaryCount(countRef.current)
    return () => {
      countRef.current = Math.max(0, countRef.current - 1)
      setPrimaryCount(countRef.current)
    }
  }, [])

  const value = useMemo<EmphasisRegistry>(
    () => ({ register, primaryCount, label, bounded: true }),
    [register, primaryCount, label],
  )

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (primaryCount > 1 && !warned.current) {
      warned.current = true
      // eslint-disable-next-line no-console
      console.warn(
        `[design] CTAGroup "${label}" has ${primaryCount} primary actions. ` +
          `A decision point should have exactly one — demote the others to ` +
          `emphasis="secondary".`,
      )
    }
    if (primaryCount <= 1) warned.current = false
  }, [primaryCount, label])

  return <EmphasisContext.Provider value={value}>{children}</EmphasisContext.Provider>
}

/** Registers an action with the nearest scope for the component's lifetime. */
export function useEmphasisRegistration(level: EmphasisLevel) {
  const registry = useContext(EmphasisContext)
  const { register } = registry

  useEffect(() => register(level), [register, level])

  return {
    /** True when this action is competing with another primary in the same group. */
    isCompeting: level === 'primary' && registry.primaryCount > 1,
    groupLabel: registry.label,
    bounded: registry.bounded,
  }
}

export function useEmphasisScope() {
  return useContext(EmphasisContext)
}
