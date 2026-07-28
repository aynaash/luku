'use client'

/**
 * @module design/hooks/useElementSize
 *
 * PURPOSE
 * Observe an element's rendered size so a component can adapt to its *container*
 * rather than to the viewport.
 *
 * DESIGN PRINCIPLE
 * Intrinsic layout. A card doesn't know whether it sits in a full-width grid or a
 * 300px sidebar, so viewport breakpoints give it the wrong answer half the time.
 * Container-relative decisions are correct in both.
 *
 * WHEN TO USE
 * When CSS genuinely can't express the decision — computing a column count for a
 * virtualised list, or measuring text to decide whether to truncate. Prefer
 * `@container` queries when plain CSS suffices; this hook costs a render.
 *
 * ACCESSIBILITY
 * Nothing here should gate *content* on size. Hiding information at narrow widths
 * hides it from anyone zoomed to 200%, which WCAG 1.4.10 treats as a failure.
 *
 * @example
 * const [ref, { width }] = useElementSize<HTMLDivElement>()
 * return <div ref={ref}>{width > 640 ? <WideView /> : <NarrowView />}</div>
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  ElementSize,
] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const box = entry.borderBoxSize?.[0]
      setSize({
        width: box ? box.inlineSize : entry.contentRect.width,
        height: box ? box.blockSize : entry.contentRect.height,
      })
    })

    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [ref, size]
}
