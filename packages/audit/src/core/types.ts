/**
 * @module core/types
 *
 * The engine's whole vocabulary. Rules are pure functions from a live DOM to a
 * list of raw findings; the runner turns those into serialisable ones.
 *
 * DETERMINISM IS THE CONTRACT
 * The consumer of this output is usually a machine — an agent loop, or a CI
 * diff. That means: no clocks, no randomness, no `Math.random`, no iteration
 * over unordered collections, and a total order on the output. Two runs against
 * the same rendered page at the same viewport must produce byte-identical JSON,
 * or the loop cannot tell "I fixed it" from "it moved".
 */

export type Severity = 'error' | 'warning' | 'info'

export const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

/** What a rule returns. Carries the live node; never leaves the page context. */
export interface RawFinding {
  rule: string
  severity: Severity
  /** One line stating the defect. Must name the measurement, not the vibe. */
  message: string
  /** What to change. Written for something that will act on it, not admire it. */
  hint?: string
  element: Element
  /** Machine-readable facts, so an agent doesn't have to parse `message`. */
  meta?: Record<string, string | number>
}

/** What leaves the page: no DOM references, JSON-safe, stably identified. */
export interface Finding {
  /** Stable across runs while the defect exists. Rule + path + salient facts. */
  id: string
  rule: string
  severity: Severity
  message: string
  hint?: string
  /** CSS path from the audit root, precise enough to re-find the node. */
  selector: string
  /**
   * How many elements exhibit this exact defect. Absent when it is 1. A
   * repeated component yields one finding with a count, not N findings.
   */
  occurrences?: number
  /** Up to three further selectors carrying the same defect. */
  alsoAt?: string[]
  /**
   * The element's box in *document* coordinates, so a full-page screenshot can
   * be annotated without re-querying the DOM. Deterministic: the audit runs on
   * an unscrolled page, so this is rect + scroll offset with scroll at zero.
   */
  box?: { x: number; y: number; w: number; h: number }
  /** Boxes for the other elements sharing this defect. */
  alsoBoxes?: Array<{ x: number; y: number; w: number; h: number }>
  meta?: Record<string, string | number>
}

export interface AuditOptions {
  /**
   * Grid unit in px. Omit to infer it from the page — which is almost always
   * what you want, because the tool has no business asserting your grid.
   */
  baseUnit?: number | null
  /**
   * The spacing scale in px. Omit to infer it from the values the page
   * actually uses; strays are then judged against the page's own system
   * rather than against an opinion shipped in this file.
   */
  scale?: number[] | null
  /** Comfortable characters-per-line band for body copy. */
  measure?: { min: number; max: number }
  /** Selectors to skip entirely — devtool overlays, third-party embeds. */
  ignore?: string[]
  /** Rule ids to run. Naming a rule runs it even when it is experimental. */
  rules?: string[] | null
  /** Include rules whose precision is still being worked on. Default false. */
  experimental?: boolean
  /** Cap per rule, so one systemic defect can't produce 400 findings. */
  maxPerRule?: number
}

export interface ResolvedOptions {
  baseUnit: number
  scale: number[]
  measure: { min: number; max: number }
  ignore: string[]
  rules: string[] | null
  experimental: boolean
  maxPerRule: number
  /** True when the scale came from the page rather than from the caller. */
  scaleInferred: boolean
}

export interface AuditContext {
  root: HTMLElement
  options: ResolvedOptions
  scale: number[]
  baseUnit: number
  isIgnored(el: Element): boolean
  /** Matching elements that are actually painted, in document order. */
  elements(selector: string): HTMLElement[]
  /** Cached computed style — rules read the same element many times over. */
  style(el: Element): CSSStyleDeclaration
  /** Cached rect. Reads are batched by rule, so this is a real saving. */
  rect(el: Element): DOMRect
}

export interface Rule {
  id: string
  title: string
  /** Why this is a defect. Shown to humans, and useful context for an agent. */
  rationale: string
  /**
   * Off by default because its precision is not yet good enough to trust.
   *
   * Measured against production sites, four rules produced 74% of all findings
   * on tailwindcss.com while the other ten stayed quiet — and a rule that fires
   * a hundred times on a well-built page teaches its user to mute the tool. They
   * still run when named explicitly or when `experimental` is set, so the work
   * to fix them is not thrown away.
   */
  experimental?: boolean
  run(ctx: AuditContext): RawFinding[]
}

export interface AuditResult {
  /** Engine version, so a stored report can be interpreted later. */
  version: string
  url: string
  viewport: { width: number; height: number }
  /** The scale used, and whether it was inferred. Findings are relative to it. */
  scale: number[]
  baseUnit: number
  scaleInferred: boolean
  counts: Record<Severity, number>
  findings: Finding[]
  /** Rules that threw, with the message. Never silently swallowed. */
  errors: Array<{ rule: string; message: string }>
}
