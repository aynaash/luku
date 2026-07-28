'use client'

/**
 * @module design/devtools/DesignInspector
 *
 * PURPOSE
 * A development-only overlay that audits the rendered page against the principles
 * this library encodes, and points at the exact element that breaks each one.
 *
 * DESIGN PRINCIPLE
 * Design systems decay silently. Nobody ships a broken heading outline on
 * purpose — it arrives one reasonable-looking commit at a time, and it's only
 * visible if something is watching. Making the checks run against the *rendered
 * DOM* rather than the source is what catches problems that only exist after
 * composition: a measure that's fine alone and too wide inside a wide container,
 * contrast that's fine until a translucent card sits on a lighter section.
 *
 * WHEN TO USE
 * Mount once in the root layout. It renders `null` unless
 * `process.env.NODE_ENV === 'development'`, so it is a no-op in production
 * builds — bundlers drop the whole subtree during dead-code elimination.
 *
 * WHEN NOT TO USE
 * As a substitute for real accessibility testing. It checks nine specific things
 * and knows nothing about keyboard traps, focus order, or whether the copy makes
 * sense. A clean panel means "no known layout defects", not "accessible".
 *
 * KEYBOARD
 *   ⌥⇧D  toggle the panel
 *   ⌥⇧G  toggle the grid/measure overlay
 *
 * ACCESSIBILITY
 * The panel is itself excluded from every audit (via `data-design-devtool`), so
 * it never reports on its own markup. It's keyboard-operable and its findings are
 * a real list, but it makes no claim to be a production-grade UI — it is a tool
 * for the person building the page.
 *
 * @example
 * // app/layout.tsx
 * <body>
 *   {children}
 *   <DesignInspector />
 * </body>
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../utils/cn.js'
import { RULES } from './rules.js'
import { runCritique, type CritiqueItem, type CritiqueStatus } from './checklist.js'
import { SEVERITY_ORDER, type Finding, type RuleId, type Severity } from './types.js'

const IS_DEV = process.env.NODE_ENV === 'development'

const SEVERITY_STYLE: Record<Severity, { dot: string; text: string; ring: string }> = {
  error: { dot: 'bg-red-500', text: 'text-red-300', ring: 'outline-red-500' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-300', ring: 'outline-amber-400' },
  info: { dot: 'bg-sky-400', text: 'text-sky-300', ring: 'outline-sky-400' },
}

export interface DesignInspectorProps {
  /** Rules to run. Defaults to all nine. */
  only?: RuleId[]
  /** Start with the panel open. */
  defaultOpen?: boolean
  /** Panel corner. */
  position?: 'bottom-right' | 'bottom-left'
  /** Force-enable outside development. Use for a staging build, never production. */
  force?: boolean
}

export function DesignInspector(props: DesignInspectorProps) {
  if (!IS_DEV && !props.force) return null
  return <Inspector {...props} />
}

function Inspector({ only, defaultOpen = false, position = 'bottom-right' }: DesignInspectorProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState<'findings' | 'critique'>('findings')
  const [findings, setFindings] = useState<Finding[]>([])
  const [critique, setCritique] = useState<CritiqueItem[]>([])
  const [gridOverlay, setGridOverlay] = useState(false)
  const [active, setActive] = useState<Finding | null>(null)
  const [muted, setMuted] = useState<Set<RuleId>>(new Set())
  const [scanning, setScanning] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const rules = useMemo(() => (only ? RULES.filter((r) => only.includes(r.id)) : RULES), [only])

  const scan = useCallback(() => {
    setScanning(true)

    // Defer past paint so measurements read settled layout, not mid-transition.
    requestAnimationFrame(() => {
      const isIgnored = (el: Element) => Boolean(el.closest('[data-design-devtool]'))
      const ctx = { root: document.body, isIgnored }

      const next: Finding[] = []
      for (const rule of rules) {
        try {
          next.push(...rule.run(ctx))
        } catch (error) {
          // A throwing rule must not take the whole panel down with it.
          // eslint-disable-next-line no-console
          console.error(`[design] rule "${rule.id}" threw during audit`, error)
        }
      }

      next.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
      setFindings(next)

      // The critique reads the unmuted findings. Muting hides rows in the panel;
      // it must not turn a checklist item green when nothing was fixed. (Passing
      // `only` does narrow the critique's evidence — that's an explicit choice to
      // audit a subset.)
      try {
        setCritique(runCritique(next, ctx))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[design] critique checklist threw', error)
        setCritique([])
      }

      setScanning(false)
    })
  }, [rules])

  // Initial scan once fonts have settled — glyph metrics change every measure.
  useEffect(() => {
    let cancelled = false
    const run = () => !cancelled && scan()

    if (document.fonts?.status === 'loaded') run()
    else void document.fonts?.ready.then(run)

    const timer = window.setTimeout(run, 600)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [scan])

  // Re-scan on resize — most of these rules are width-dependent by nature.
  useEffect(() => {
    let timer = 0
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(scan, 400)
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
    }
  }, [scan])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey) return
      if (e.code === 'KeyD') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.code === 'KeyG') {
        e.preventDefault()
        setGridOverlay((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => findings.filter((f) => !muted.has(f.rule)), [findings, muted])

  const counts = useMemo(() => {
    const acc: Record<Severity, number> = { error: 0, warning: 0, info: 0 }
    for (const f of visible) acc[f.severity] += 1
    return acc
  }, [visible])

  const critiqueFailures = useMemo(
    () => critique.filter((c) => c.status === 'fail').length,
    [critique],
  )

  const byRule = useMemo(() => {
    const map = new Map<RuleId, Finding[]>()
    for (const f of visible) map.set(f.rule, [...(map.get(f.rule) ?? []), f])
    return map
  }, [visible])

  const highlight = useCallback((finding: Finding | null) => {
    setActive(finding)
    finding?.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const corner = position === 'bottom-right' ? 'right-4' : 'left-4'

  return (
    <div data-design-devtool="" className="pointer-events-none fixed inset-0 z-[9999] font-sans">
      {gridOverlay && <GridOverlay />}
      {active && <Highlight finding={active} />}

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="design-inspector-panel"
        className={cn(
          'pointer-events-auto fixed bottom-4 flex items-center gap-2 rounded-full',
          'border border-white/15 bg-neutral-900/90 px-3.5 py-2 text-xs font-medium text-white',
          'shadow-2xl backdrop-blur-xl transition hover:border-white/30',
          corner,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'inline-flex h-2 w-2 rounded-full',
              counts.error > 0 ? 'bg-red-500' : counts.warning > 0 ? 'bg-amber-400' : 'bg-emerald-400',
            )}
          />
        </span>
        design
        {visible.length > 0 && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 tabular-nums">{visible.length}</span>
        )}
      </button>

      {open && (
        <div
          id="design-inspector-panel"
          ref={panelRef}
          className={cn(
            'pointer-events-auto fixed bottom-16 flex max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] flex-col',
            'overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 text-white shadow-2xl backdrop-blur-2xl',
            corner,
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Design Inspector</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {scanning ? 'scanning…' : `${rules.length} rules · ${visible.length} findings`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <IconButton label="Toggle grid overlay (⌥⇧G)" active={gridOverlay} onClick={() => setGridOverlay((v) => !v)}>
                #
              </IconButton>
              <IconButton label="Re-scan" onClick={scan}>
                ↻
              </IconButton>
              <IconButton label="Close" onClick={() => setOpen(false)}>
                ✕
              </IconButton>
            </div>
          </header>

          <div role="tablist" className="flex border-b border-white/10">
            <Tab active={tab === 'findings'} onClick={() => setTab('findings')}>
              Findings
              {visible.length > 0 && (
                <span className="ml-1.5 rounded bg-white/10 px-1 tabular-nums text-white/60">{visible.length}</span>
              )}
            </Tab>
            <Tab active={tab === 'critique'} onClick={() => setTab('critique')}>
              Critique
              {critiqueFailures > 0 && (
                <span className="ml-1.5 rounded bg-red-500/20 px-1 tabular-nums text-red-300">{critiqueFailures}</span>
              )}
            </Tab>
          </div>

          {tab === 'critique' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="border-b border-white/5 px-4 py-2.5 text-[11px] leading-relaxed text-white/40">
                Ten critique questions, answered from the rendered page. Items marked{' '}
                <span className="text-white/60">unknown</span> have no honest automated proxy — look
                at those yourself.
              </p>
              <ul className="divide-y divide-white/5">
                {critique.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <StatusMark status={item.status} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold leading-snug text-white/90">{item.question}</p>
                        <p className="mt-1 text-[11px] leading-snug text-white/50">{item.evidence}</p>
                        {item.rules.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTab('findings')
                              setMuted((prev) => {
                                const next = new Set(prev)
                                for (const r of item.rules) next.delete(r)
                                return next
                              })
                            }}
                            className="mt-1 font-mono text-[10px] text-white/30 hover:text-white/70"
                          >
                            {item.rules.join(' · ')} →
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
          <>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2 text-[11px]">
            <Count severity="error" n={counts.error} />
            <Count severity="warning" n={counts.warning} />
            <Count severity="info" n={counts.info} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-white/50">
                {scanning ? 'Scanning…' : 'No findings. Composition is clean.'}
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {[...byRule.entries()].map(([ruleId, items]) => {
                  const rule = RULES.find((r) => r.id === ruleId)
                  return (
                    <li key={ruleId}>
                      <details open>
                        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_STYLE[items[0].severity].dot)} />
                            {rule?.title ?? ruleId}
                            <span className="rounded bg-white/10 px-1.5 tabular-nums text-white/60">{items.length}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setMuted((prev) => new Set(prev).add(ruleId))
                            }}
                            className="text-[10px] font-normal text-white/40 hover:text-white"
                          >
                            mute
                          </button>
                        </summary>

                        {rule && (
                          <p className="px-4 pb-2 text-[11px] leading-relaxed text-white/40">{rule.rationale}</p>
                        )}

                        <ul className="pb-1">
                          {items.map((finding, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                onMouseEnter={() => setActive(finding)}
                                onMouseLeave={() => setActive(null)}
                                onClick={() => highlight(finding)}
                                className="block w-full px-4 py-2 text-left transition hover:bg-white/5"
                              >
                                <span className={cn('block text-[11px] leading-snug', SEVERITY_STYLE[finding.severity].text)}>
                                  {finding.message}
                                </span>
                                {finding.hint && (
                                  <span className="mt-1 block text-[11px] leading-snug text-white/50">{finding.hint}</span>
                                )}
                                <code className="mt-1 block truncate font-mono text-[10px] text-white/30">
                                  {finding.label}
                                </code>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          </>
          )}

          {muted.size > 0 && tab === 'findings' && (
            <footer className="border-t border-white/10 px-4 py-2">
              <button
                type="button"
                onClick={() => setMuted(new Set())}
                className="text-[10px] text-white/40 hover:text-white"
              >
                Unmute {muted.size} rule{muted.size === 1 ? '' : 's'}
              </button>
            </footer>
          )}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────── sub-components ───────────────────────────── */

function Count({ severity, n }: { severity: Severity; n: number }) {
  return (
    <span className={cn('flex items-center gap-1.5', n === 0 ? 'text-white/25' : SEVERITY_STYLE[severity].text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', n === 0 ? 'bg-white/20' : SEVERITY_STYLE[severity].dot)} />
      <span className="tabular-nums">{n}</span>
      <span className="capitalize">{severity}</span>
    </span>
  )
}

function Tab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex-1 border-b-2 px-4 py-2 text-[11px] font-semibold transition',
        active
          ? 'border-white/70 text-white'
          : 'border-transparent text-white/40 hover:text-white/70',
      )}
    >
      {children}
    </button>
  )
}

const STATUS_MARK: Record<CritiqueStatus, { glyph: string; className: string; label: string }> = {
  pass: { glyph: '✓', className: 'bg-emerald-500/15 text-emerald-400', label: 'Pass' },
  warn: { glyph: '!', className: 'bg-amber-400/15 text-amber-300', label: 'Warning' },
  fail: { glyph: '✕', className: 'bg-red-500/15 text-red-400', label: 'Fail' },
  unknown: { glyph: '?', className: 'bg-white/10 text-white/40', label: 'Not measurable' },
}

function StatusMark({ status }: { status: CritiqueStatus }) {
  const mark = STATUS_MARK[status]
  return (
    <span
      title={mark.label}
      className={cn(
        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold',
        mark.className,
      )}
    >
      <span aria-hidden="true">{mark.glyph}</span>
      <span className="sr-only">{mark.label}:</span>
    </span>
  )
}

function IconButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md text-xs transition',
        active ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

/** Outlines the offending element in place, with its rule and size. */
function Highlight({ finding }: { finding: Finding }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const update = () => setRect(finding.element.getBoundingClientRect())
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [finding])

  if (!rect) return null

  const style = SEVERITY_STYLE[finding.severity]

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed outline-2 outline-dashed', style.ring)}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <span
        className={cn(
          'absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium',
          'bg-neutral-900/95 text-white',
        )}
      >
        {finding.rule} · {Math.round(rect.width)}×{Math.round(rect.height)}
      </span>
    </div>
  )
}

/**
 * Baseline grid and reading-measure guides. The 4px grid shows whether edges land
 * on the system's rhythm; the 65ch band shows where comfortable text should end.
 */
function GridOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(56,189,248,0.16) 0 1px, transparent 1px 4px)',
        }}
      />
      <div className="absolute inset-y-0 left-1/2 flex w-[65ch] -translate-x-1/2 justify-between">
        <span className="h-full w-px bg-cyan-400/40" />
        <span className="h-full w-px bg-cyan-400/40" />
      </div>
      <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-neutral-900/90 px-2 py-0.5 text-[10px] text-cyan-300">
        65ch reading measure · 4px baseline
      </span>
    </div>
  )
}
