'use client'

/**
 * @module design/hooks/useMeasureCheck
 *
 * PURPOSE
 * Measure the actual characters-per-line of a rendered text block and report
 * whether it sits in the comfortable reading band.
 *
 * DESIGN PRINCIPLE
 * Reading width. 45–75 characters per line is the band where sustained reading is
 * fastest — long enough for rhythm, short enough that the eye reliably finds the
 * start of the next line. A `max-w-[65ch]` class *asserts* the measure; this hook
 * *verifies* it, which matters because font loading, zoom and user stylesheets
 * all change the answer after the CSS was written.
 *
 * WHEN TO USE
 * In development, inside <DesignInspector />. Also useful in a component that
 * legitimately adapts — say, switching a two-column layout to one when the
 * measure collapses below 45ch.
 *
 * WHEN NOT TO USE
 * In production render paths on many elements. Each check reads layout, and doing
 * that in a loop forces synchronous reflow.
 *
 * ACCESSIBILITY
 * A too-long measure is a genuine barrier, not a stylistic preference — it's
 * hardest on dyslexic readers and anyone using screen magnification, where the
 * return sweep is already expensive.
 */
import { useCallback, useEffect, useState, type RefObject } from 'react'
import { estimateMeasure, MEASURE_BAND } from '../utils/rhythm.js'

export interface MeasureReport {
  /** Estimated characters per line. */
  chars: number
  status: 'narrow' | 'ideal' | 'wide' | 'unknown'
  widthPx: number
  fontSizePx: number
}

const EMPTY: MeasureReport = { chars: 0, status: 'unknown', widthPx: 0, fontSizePx: 0 }

export function useMeasureCheck(ref: RefObject<HTMLElement | null>, enabled = true): MeasureReport {
  const [report, setReport] = useState<MeasureReport>(EMPTY)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return

    const style = getComputedStyle(el)
    const fontSizePx = parseFloat(style.fontSize)
    // Content box: padding is not part of the text's line length.
    const widthPx =
      el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)

    const chars = estimateMeasure(widthPx, fontSizePx)
    const status: MeasureReport['status'] =
      chars === 0 ? 'unknown' : chars < MEASURE_BAND.min ? 'narrow' : chars > MEASURE_BAND.max ? 'wide' : 'ideal'

    setReport({ chars, status, widthPx, fontSizePx })
  }, [ref])

  useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') return
    const el = ref.current
    if (!el) return

    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)

    // Fonts change glyph advance after load, which changes the measure.
    void document.fonts?.ready.then(check)

    return () => observer.disconnect()
  }, [ref, enabled, check])

  return report
}
