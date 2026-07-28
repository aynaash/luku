/**
 * @module design/devtools/checklist
 *
 * PURPOSE
 * Answer the ten questions of a design critique against the live page, with
 * evidence rather than opinion.
 *
 * DESIGN PRINCIPLE
 * A critique checklist is the most useful design artefact there is, and the least
 * used — because running it means stopping, looking, and being honest, and the
 * questions are subjective enough that it's easy to answer them all "yes". Most
 * of them, though, have a measurable proxy. "Is spacing consistent?" is a count
 * of off-scale values. "Is there enough whitespace?" is an occupancy ratio. "Does
 * it work on mobile?" is, most often, whether anything overflows horizontally.
 *
 * WHAT THIS IS NOT
 * A verdict on whether a page is well designed. Each item states the specific
 * thing it measured, and several questions have no honest proxy at all — those
 * report `unknown` and say what you'd need to look at yourself, rather than
 * inventing a number. A checklist that guesses is worse than one that abstains,
 * because a green tick you didn't earn stops you looking.
 */
import type { Finding, RuleContext, RuleId } from './types.js'

export type CritiqueStatus = 'pass' | 'warn' | 'fail' | 'unknown'

export interface CritiqueItem {
  id: string
  /** The critique question, as a designer would ask it. */
  question: string
  status: CritiqueStatus
  /** What was actually measured — never a restatement of the question. */
  evidence: string
  /** Rules whose findings feed this item, so the panel can jump to them. */
  rules: RuleId[]
}

const OCCUPANCY_CELL = 24
/** Above this share of a section covered by content, the page reads as crowded. */
const CROWDED = 0.72
/** Characters of body copy per heading, above which scanning gets hard. */
const SCAN_LIMIT = 1400

export function runCritique(findings: Finding[], ctx: RuleContext): CritiqueItem[] {
  const by = (rule: RuleId) => findings.filter((f) => f.rule === rule)
  const doc = ctx.root

  return [
    focalPoint(by, doc),
    alignment(by),
    spacing(by),
    typography(by, doc),
    whitespace(doc, ctx),
    scannability(doc),
    grouping(by),
    readability(by, doc),
    primaryAction(by, doc),
    responsive(doc),
  ]
}

/* ── 1 ─────────────────────────────────────────────────────────────────────── */

function focalPoint(by: (r: RuleId) => Finding[], doc: HTMLElement): CritiqueItem {
  const anchors = doc.querySelectorAll('[data-design-anchor]').length
  const issues = by('missing-anchor')

  if (anchors === 0) {
    return {
      id: 'focal-point',
      question: 'Is there one obvious focal point?',
      status: 'unknown',
      evidence:
        'No <Anchor> declared anywhere, so dominance can only be judged by eye. ' +
        'Wrap the element the page should be entered through.',
      rules: ['missing-anchor'],
    }
  }

  const conflicts = issues.filter((f) => f.message.includes('anchors'))
  return {
    id: 'focal-point',
    question: 'Is there one obvious focal point?',
    status: conflicts.length > 0 ? 'fail' : 'pass',
    evidence:
      conflicts.length > 0
        ? `${conflicts.length} region${conflicts.length === 1 ? '' : 's'} declare more than one anchor — two focal points is the same as none.`
        : `${anchors} anchor${anchors === 1 ? '' : 's'} declared, at most one per region.`,
    rules: ['missing-anchor'],
  }
}

/* ── 2 ─────────────────────────────────────────────────────────────────────── */

function alignment(by: (r: RuleId) => Finding[]): CritiqueItem {
  const n = by('grid-alignment').length
  return {
    id: 'alignment',
    question: 'Is the content aligned to a grid?',
    status: n === 0 ? 'pass' : n <= 3 ? 'warn' : 'fail',
    evidence:
      n === 0
        ? 'Every audited edge lands on the 4px base grid.'
        : `${n} element${n === 1 ? '' : 's'} with padding off the 4px base grid.`,
    rules: ['grid-alignment'],
  }
}

/* ── 3 ─────────────────────────────────────────────────────────────────────── */

function spacing(by: (r: RuleId) => Finding[]): CritiqueItem {
  const n = by('inconsistent-spacing').length
  return {
    id: 'spacing',
    question: 'Is spacing consistent?',
    status: n === 0 ? 'pass' : n <= 3 ? 'warn' : 'fail',
    evidence:
      n === 0
        ? 'All gaps and margins are steps on the rhythm scale.'
        : `${n} gap or margin value${n === 1 ? '' : 's'} outside the rhythm scale.`,
    rules: ['inconsistent-spacing'],
  }
}

/* ── 4 ─────────────────────────────────────────────────────────────────────── */

function typography(by: (r: RuleId) => Finding[], doc: HTMLElement): CritiqueItem {
  const broken = by('heading-hierarchy').length
  const roles = new Set(
    Array.from(doc.querySelectorAll('[data-design-role]')).map((el) => el.getAttribute('data-design-role')),
  )

  if (broken > 0) {
    return {
      id: 'typography',
      question: 'Does typography communicate importance?',
      status: 'fail',
      evidence: `${broken} outline defect${broken === 1 ? '' : 's'} — the visual and semantic hierarchies disagree.`,
      rules: ['heading-hierarchy', 'repetition'],
    }
  }

  return {
    id: 'typography',
    question: 'Does typography communicate importance?',
    status: roles.size >= 3 ? 'pass' : 'warn',
    evidence:
      roles.size >= 3
        ? `Outline is intact and uses ${roles.size} distinct type roles, so levels are distinguishable.`
        : `Outline is intact but only ${roles.size} type role${roles.size === 1 ? '' : 's'} in use — levels may be hard to tell apart.`,
    rules: ['heading-hierarchy', 'repetition'],
  }
}

/* ── 5 ─────────────────────────────────────────────────────────────────────── */

/**
 * Occupancy: rasterise each section into 24px cells, mark the cells covered by a
 * leaf content box, and report the share left empty. Leaves only — counting
 * containers would mark every cell and always report zero whitespace.
 */
function whitespace(doc: HTMLElement, ctx: RuleContext): CritiqueItem {
  const sections = Array.from(doc.querySelectorAll<HTMLElement>('section,[data-design="section"]')).filter(
    (s) => !ctx.isIgnored(s) && s.getBoundingClientRect().height > 240,
  )

  if (sections.length === 0) {
    return {
      id: 'whitespace',
      question: 'Is there enough whitespace?',
      status: 'unknown',
      evidence: 'No sections tall enough to measure.',
      rules: [],
    }
  }

  const crowded: string[] = []
  let worst = 0

  for (const section of sections) {
    const bounds = section.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) continue

    const cols = Math.max(1, Math.ceil(bounds.width / OCCUPANCY_CELL))
    const rows = Math.max(1, Math.ceil(bounds.height / OCCUPANCY_CELL))
    const filled = new Set<number>()

    const leaves = Array.from(section.querySelectorAll<HTMLElement>('*')).filter((el) => {
      if (ctx.isIgnored(el)) return false
      if (el.querySelector('*')) return false // containers don't count as content
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (style.position === 'fixed') return false
      return (el.textContent?.trim().length ?? 0) > 0 || el.tagName === 'IMG' || el.tagName === 'SVG'
    })

    for (const leaf of leaves) {
      const r = leaf.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) continue
      const c0 = Math.max(0, Math.floor((r.left - bounds.left) / OCCUPANCY_CELL))
      const c1 = Math.min(cols - 1, Math.floor((r.right - bounds.left) / OCCUPANCY_CELL))
      const r0 = Math.max(0, Math.floor((r.top - bounds.top) / OCCUPANCY_CELL))
      const r1 = Math.min(rows - 1, Math.floor((r.bottom - bounds.top) / OCCUPANCY_CELL))
      for (let y = r0; y <= r1; y++) {
        for (let x = c0; x <= c1; x++) filled.add(y * cols + x)
      }
    }

    const occupancy = filled.size / (cols * rows)
    worst = Math.max(worst, occupancy)
    if (occupancy > CROWDED) crowded.push(`${describeSection(section)} ${Math.round(occupancy * 100)}%`)
  }

  return {
    id: 'whitespace',
    question: 'Is there enough whitespace?',
    status: crowded.length === 0 ? 'pass' : crowded.length === 1 ? 'warn' : 'fail',
    evidence:
      crowded.length === 0
        ? `Densest section is ${Math.round(worst * 100)}% covered by content — comfortably under the ${Math.round(CROWDED * 100)}% crowding threshold.`
        : `Crowded: ${crowded.join(', ')} (threshold ${Math.round(CROWDED * 100)}%).`,
    rules: [],
  }
}

/* ── 6 ─────────────────────────────────────────────────────────────────────── */

function scannability(doc: HTMLElement): CritiqueItem {
  const headings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6').length
  const bodyChars = Array.from(doc.querySelectorAll('p,li'))
    .reduce((sum, el) => sum + (el.textContent?.trim().length ?? 0), 0)

  if (bodyChars < 400) {
    return {
      id: 'scannability',
      question: 'Can users scan the page quickly?',
      status: 'unknown',
      evidence: 'Too little body copy to judge — scanning is not a concern at this length.',
      rules: [],
    }
  }

  if (headings === 0) {
    return {
      id: 'scannability',
      question: 'Can users scan the page quickly?',
      status: 'fail',
      evidence: `${bodyChars.toLocaleString()} characters of body copy with no headings to break it up.`,
      rules: ['heading-hierarchy'],
    }
  }

  const perHeading = Math.round(bodyChars / headings)
  return {
    id: 'scannability',
    question: 'Can users scan the page quickly?',
    status: perHeading <= SCAN_LIMIT ? 'pass' : 'warn',
    evidence: `${headings} headings over ${bodyChars.toLocaleString()} characters — ~${perHeading.toLocaleString()} per heading (limit ${SCAN_LIMIT.toLocaleString()}).`,
    rules: ['heading-hierarchy'],
  }
}

/* ── 7 ─────────────────────────────────────────────────────────────────────── */

function grouping(by: (r: RuleId) => Finding[]): CritiqueItem {
  const n = by('proximity').length
  return {
    id: 'grouping',
    question: 'Are related items grouped together?',
    status: n === 0 ? 'pass' : n <= 2 ? 'warn' : 'fail',
    evidence:
      n === 0
        ? 'No proximity inversions — every group is tighter inside than the space around it.'
        : `${n} group${n === 1 ? '' : 's'} spaced as widely inside as out, so the grouping reads backwards.`,
    rules: ['proximity'],
  }
}

/* ── 8 ─────────────────────────────────────────────────────────────────────── */

function readability(by: (r: RuleId) => Finding[], doc: HTMLElement): CritiqueItem {
  const n = by('reading-width').length + by('line-length').length
  const contrast = by('contrast').length
  const blocks = doc.querySelectorAll('p,li').length

  if (blocks === 0) {
    return {
      id: 'readability',
      question: 'Is body text easy to read?',
      status: 'unknown',
      evidence: 'No body text blocks on the page.',
      rules: ['reading-width', 'line-length', 'contrast'],
    }
  }

  const status: CritiqueStatus = n === 0 && contrast === 0 ? 'pass' : n + contrast <= 2 ? 'warn' : 'fail'
  const parts: string[] = []
  if (n > 0) parts.push(`${n} block${n === 1 ? '' : 's'} past the 80ch limit`)
  if (contrast > 0) parts.push(`${contrast} below WCAG AA contrast`)

  return {
    id: 'readability',
    question: 'Is body text easy to read?',
    status,
    evidence:
      parts.length === 0
        ? `All ${blocks} text blocks sit inside the 45–80ch band and meet AA contrast.`
        : parts.join('; ') + '.',
    rules: ['reading-width', 'line-length', 'contrast'],
  }
}

/* ── 9 ─────────────────────────────────────────────────────────────────────── */

function primaryAction(by: (r: RuleId) => Finding[], doc: HTMLElement): CritiqueItem {
  const primaries = doc.querySelectorAll('[data-design-emphasis="primary"]').length
  const conflicts = by('multiple-primary').length

  if (primaries === 0) {
    return {
      id: 'primary-action',
      question: 'Is the primary action obvious?',
      status: doc.querySelector('[data-design="cta"]') ? 'fail' : 'unknown',
      evidence: doc.querySelector('[data-design="cta"]')
        ? 'Actions exist but none is marked primary — nothing is recommended.'
        : 'No <CTA> elements on the page; emphasis cannot be judged.',
      rules: ['multiple-primary'],
    }
  }

  const groups = doc.querySelectorAll('[data-design="cta-group"]').length
  return {
    id: 'primary-action',
    question: 'Is the primary action obvious?',
    status: conflicts > 0 ? 'fail' : 'pass',
    evidence:
      conflicts > 0
        ? `${conflicts} competing primary action${conflicts === 1 ? '' : 's'} — the recommended path is ambiguous.`
        : `${primaries} primary action${primaries === 1 ? '' : 's'} across ${groups} scoped group${groups === 1 ? '' : 's'}, none competing.`,
    rules: ['multiple-primary'],
  }
}

/* ── 10 ────────────────────────────────────────────────────────────────────── */

/**
 * Only horizontal overflow is genuinely testable at the current width — the
 * commonest and most damaging responsive bug. Whether the layout is *good* at
 * other widths needs the viewport actually resized, so this says so rather than
 * pretending otherwise.
 */
function responsive(doc: HTMLElement): CritiqueItem {
  const root = document.documentElement
  const overflow = root.scrollWidth - root.clientWidth

  const wide = Array.from(doc.querySelectorAll<HTMLElement>('*'))
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.right > root.clientWidth + 1 && getComputedStyle(el).position !== 'fixed'
    })
    .slice(0, 3)

  if (overflow > 1) {
    return {
      id: 'responsive',
      question: 'Does the layout work on mobile and desktop?',
      status: 'fail',
      evidence: `Page scrolls ${Math.round(overflow)}px horizontally at ${root.clientWidth}px wide${
        wide.length > 0 ? ` — first offender: <${wide[0].tagName.toLowerCase()}>` : ''
      }.`,
      rules: [],
    }
  }

  return {
    id: 'responsive',
    question: 'Does the layout work on mobile and desktop?',
    status: 'warn',
    evidence: `No horizontal overflow at ${root.clientWidth}px. Other widths are not tested — resize and re-scan to check them.`,
    rules: [],
  }
}

/* ── helpers ───────────────────────────────────────────────────────────────── */

function describeSection(el: HTMLElement): string {
  return el.id ? `#${el.id}` : (el.getAttribute('aria-label') ?? el.tagName.toLowerCase())
}
