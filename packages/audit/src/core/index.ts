/**
 * @module core
 *
 * The engine. One entry point, no dependencies, no framework, no build step
 * required to use it — drop the IIFE bundle into any page and call it.
 *
 *   const result = __LUKU_AUDIT__.audit()
 *
 * Everything here is a pure function of the rendered tree plus the viewport.
 * That is the property the whole tool rests on: an agent can edit, re-render,
 * re-run, and diff the two reports to know whether it actually improved
 * anything — which it cannot do against a screenshot or against its own taste.
 */
import { cssPath, documentOrder, hash } from './dom.js'
import { DEFAULT_MEASURE, inferScale } from './scale.js'
import { RULES, RULE_IDS } from './rules/index.js'
import { SEVERITY_RANK } from './types.js'
import type {
  AuditContext,
  AuditOptions,
  AuditResult,
  Finding,
  RawFinding,
  ResolvedOptions,
  Severity,
} from './types.js'

export const ENGINE_VERSION = '0.1.0'

/**
 * `aria-hidden` is deliberately *not* here. It hides a node from assistive
 * technology; it does not stop the node overflowing the viewport or dragging
 * the page's balance sideways, and those are the things being measured.
 */
const DEFAULT_IGNORE = ['[data-luku-ignore]', 'script', 'style', 'noscript', 'template']

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Identifies a *defect*, not an element.
 *
 * The question this answers is "would one edit fix all of these?" — because
 * that is the unit an agent or a developer acts on. Twelve nav links under the
 * tap-target size are one padding change, not twelve findings.
 *
 * Two things get normalised away. Measurements, because "67×28px" and
 * "159×20px" are the same defect at two sizes and keying on the exact numbers
 * means nothing ever merges. And quoted content snippets, for the same reason.
 * What remains is the rule, the shape of the complaint, and the element's class
 * signature — the best available proxy for "same component" until findings can
 * be traced back to source.
 */
function defectSignature(item: RawFinding): string {
  const shape = item.message.replace(/"[^"]*"/g, '"…"').replace(/[\d.]+/g, '#')
  const classes = (item.element.getAttribute('class') ?? '').trim()
  const identity = classes
    ? classes.split(/\s+/).sort().join(' ')
    : item.element.tagName.toLowerCase()
  return `${item.rule}|${identity}|${shape}`
}

function resolve(options: AuditOptions): ResolvedOptions {
  return {
    baseUnit: options.baseUnit ?? 0,
    scale: options.scale ?? [],
    measure: options.measure ?? DEFAULT_MEASURE,
    ignore: [...DEFAULT_IGNORE, ...(options.ignore ?? [])],
    rules: options.rules ?? null,
    experimental: options.experimental ?? false,
    maxPerRule: options.maxPerRule ?? 20,
    scaleInferred: !options.scale || options.scale.length === 0,
  }
}

function buildContext(root: HTMLElement, resolved: ResolvedOptions): AuditContext {
  const styles = new WeakMap<Element, CSSStyleDeclaration>()
  const rects = new WeakMap<Element, DOMRect>()
  const queries = new Map<string, HTMLElement[]>()
  const ignoreSelector = resolved.ignore.join(',')

  const style = (el: Element): CSSStyleDeclaration => {
    let cached = styles.get(el)
    if (!cached) {
      cached = getComputedStyle(el)
      styles.set(el, cached)
    }
    return cached
  }

  const rect = (el: Element): DOMRect => {
    let cached = rects.get(el)
    if (!cached) {
      cached = el.getBoundingClientRect()
      rects.set(el, cached)
    }
    return cached
  }

  const isIgnored = (el: Element): boolean => {
    try {
      return Boolean(el.closest(ignoreSelector))
    } catch {
      return false
    }
  }

  const elements = (selector: string): HTMLElement[] => {
    const cached = queries.get(selector)
    if (cached) return cached

    const out: HTMLElement[] = []
    const all = root.querySelectorAll<HTMLElement>(selector)
    for (let i = 0; i < all.length; i++) {
      const el = all[i]
      if (isIgnored(el)) continue

      // Everything inside an <svg> is drawing geometry, not layout. A <path>
      // has a bounding box and a computed style, so every geometric rule will
      // happily measure it and report that a bezier curve is 3.7px out of
      // alignment with its neighbours. The <svg> element itself is kept: it is
      // a real layout box that can overflow, clip, or carry a tap target.
      if (el.namespaceURI === SVG_NS && el.tagName.toLowerCase() !== 'svg') continue

      const s = style(el)
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue
      const r = rect(el)
      if (r.width <= 0 || r.height <= 0) continue
      out.push(el)
    }

    queries.set(selector, out)
    return out
  }

  const ctx: AuditContext = {
    root,
    options: resolved,
    scale: resolved.scale,
    baseUnit: resolved.baseUnit,
    isIgnored,
    elements,
    style,
    rect,
  }

  return ctx
}

/**
 * Audits a rendered subtree.
 *
 * @param root     defaults to `document.body`
 * @param options  omit `scale`/`baseUnit` to have them read off the page
 */
export function audit(root: HTMLElement = document.body, options: AuditOptions = {}): AuditResult {
  const resolved = resolve(options)
  const ctx = buildContext(root, resolved)

  if (resolved.scaleInferred) {
    const report = inferScale(ctx.elements('*'), ctx.style)
    resolved.scale = report.scale
    resolved.baseUnit = options.baseUnit ?? report.baseUnit
    ctx.scale = report.scale
    ctx.baseUnit = resolved.baseUnit
  } else if (resolved.baseUnit === 0) {
    resolved.baseUnit = 4
    ctx.baseUnit = 4
  }

  // Naming a rule is an explicit opt-in and overrides the experimental gate —
  // otherwise `--rules proximity` would silently run nothing.
  const active = resolved.rules
    ? RULES.filter((r) => resolved.rules!.includes(r.id))
    : RULES.filter((r) => !r.experimental || resolved.experimental)
  const raw: RawFinding[] = []
  const errors: Array<{ rule: string; message: string }> = []

  for (const rule of active) {
    try {
      const found = rule.run(ctx)
      for (const finding of found) raw.push(finding)
    } catch (error) {
      // A throwing rule must not take the report down with it, and must not
      // vanish either — a silently absent rule reads as a clean page.
      errors.push({ rule: rule.id, message: error instanceof Error ? error.message : String(error) })
    }
  }

  // Total order: severity, then registry order, then document position, then
  // message. Every tiebreak is deterministic, so two runs diff cleanly.
  const rank = new Map(RULE_IDS.map((id, i) => [id, i]))
  raw.sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (severity !== 0) return severity
    const byRule = (rank.get(a.rule) ?? 99) - (rank.get(b.rule) ?? 99)
    if (byRule !== 0) return byRule
    const byPosition = documentOrder(a.element, b.element)
    if (byPosition !== 0) return byPosition
    return a.message < b.message ? -1 : a.message > b.message ? 1 : 0
  })

  // Collapse identical defects before capping. A component rendered twelve
  // times produces twelve findings with a byte-identical message, which is one
  // bug with twelve instances — reporting it twelve times buries eleven other
  // rules under it. Dedupe must precede the cap: capping first would spend the
  // whole budget on repeats of a single defect and silently drop distinct ones.
  interface Group {
    item: RawFinding
    selector: string
    also: string[]
    boxes: Array<{ x: number; y: number; w: number; h: number }>
    count: number
  }

  const boxOf = (el: Element) => {
    const r = ctx.rect(el)
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    }
  }

  const groups = new Map<string, Group>()
  for (const item of raw) {
    const selector = cssPath(item.element, root)
    const signature = defectSignature(item)
    const existing = groups.get(signature)
    if (existing) {
      existing.count++
      if (existing.also.length < 3) existing.also.push(selector)
      if (existing.boxes.length < 24) existing.boxes.push(boxOf(item.element))
      continue
    }
    groups.set(signature, { item, selector, also: [], boxes: [], count: 1 })
  }

  const perRule = new Map<string, number>()
  const findings: Finding[] = []
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 }

  for (const [signature, group] of groups) {
    const { item, selector } = group
    const seen = perRule.get(item.rule) ?? 0
    if (seen >= resolved.maxPerRule) continue
    perRule.set(item.rule, seen + 1)

    findings.push({
      // Keyed on the deduped signature, so the id is stable no matter which
      // instance happened to come first in document order. The viewport is part
      // of the key: the same defect at 390px and at 1280px is two observations,
      // and without this they collapse into one and a multi-width report
      // silently loses rows.
      id: hash(`${signature}|${selector}|${window.innerWidth}`),
      rule: item.rule,
      severity: item.severity,
      message: item.message,
      hint: item.hint,
      selector,
      box: boxOf(item.element),
      ...(group.count > 1
        ? { occurrences: group.count, alsoAt: group.also, alsoBoxes: group.boxes }
        : {}),
      meta: item.meta,
    })
    counts[item.severity]++
  }

  return {
    version: ENGINE_VERSION,
    url: location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scale: resolved.scale,
    baseUnit: resolved.baseUnit,
    scaleInferred: resolved.scaleInferred,
    counts,
    findings,
    errors,
  }
}

export { RULES, RULE_IDS } from './rules/index.js'
// The colour maths is the most reusable thing here and the most valuable to
// test in isolation, so it is part of the public surface rather than internal.
export {
  parseColor,
  contrastRatio,
  requiredRatio,
  luminance,
  flatten,
  effectiveBackground,
  type Rgb,
  type Backdrop,
} from './color.js'
export type {
  AuditContext,
  AuditOptions,
  AuditResult,
  Finding,
  RawFinding,
  ResolvedOptions,
  Rule,
  Severity,
} from './types.js'
