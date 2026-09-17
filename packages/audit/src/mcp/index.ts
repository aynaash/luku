/**
 * @module mcp
 *
 * `luku-audit-mcp` — the audit engine as tools an agent can call mid-task.
 *
 * THE POINT
 * A model writing UI has no feedback signal for composition. Screenshots miss
 * 4px, and "looks good" is not a gradient. These three tools give it one:
 * audit, edit, audit again, and `compare_audits` says whether the edit actually
 * helped or merely moved the problem.
 *
 * OUTPUT IS TUNED FOR CONTEXT, NOT FOR BEAUTY
 * A 200-finding JSON dump would cost more context than the file being fixed.
 * So: findings group by rule, the hint is printed once per rule rather than
 * once per finding (hints are the longest strings and they repeat verbatim),
 * and `info` collapses to counts unless asked for. Selectors are never
 * abbreviated — they are the actionable payload.
 */
import { ENGINE_VERSION } from '../core/index.js'
import { RULES, RULE_IDS } from '../core/rules/index.js'
import { run, type PageFinding, type RunResult } from '../cli/driver.js'
import { summarise, type Summary } from '../cli/report.js'
import { serve, type ToolDefinition, type ToolResult } from './protocol.js'
import type { Severity } from '../core/types.js'

/* ───────────────────────────── snapshot store ────────────────────────────── */

interface Snapshot {
  id: string
  url: string
  widths: number[]
  findings: PageFinding[]
  summary: Summary
}

const snapshots = new Map<string, Snapshot>()
let counter = 0
const MAX_SNAPSHOTS = 20

function store(url: string, widths: number[], result: RunResult, summary: Summary): string {
  const id = `a${++counter}`
  snapshots.set(id, { id, url, widths, findings: result.findings, summary })
  // Oldest first — Map preserves insertion order, so this is deterministic.
  while (snapshots.size > MAX_SNAPSHOTS) {
    const oldest = snapshots.keys().next().value
    if (oldest === undefined) break
    snapshots.delete(oldest)
  }
  return id
}

/* ──────────────────────────────── formatting ─────────────────────────────── */

function countByRule(findings: PageFinding[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const finding of findings) counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1)
  // Registry order, so the most severe class of problem reads first.
  return [...counts.entries()].sort(
    (a, b) => RULE_IDS.indexOf(a[0]) - RULE_IDS.indexOf(b[0]) || a[0].localeCompare(b[0]),
  )
}

function formatBand(findings: PageFinding[], severity: Severity, perRule: number): string[] {
  const band = findings.filter((f) => f.severity === severity)
  if (band.length === 0) return []

  const lines = [`${severity.toUpperCase()} (${band.length})`]

  for (const [rule] of countByRule(band)) {
    const items = band.filter((f) => f.rule === rule)
    lines.push(`  ${rule} ×${items.length}`)

    // Hints are the longest string in a finding and usually repeat verbatim
    // across a rule, so hoisting one is the biggest context saving available.
    // But only when they genuinely are identical — `spacing-scale` names a
    // different nearest step each time, and hoisting the first would attach a
    // measurement to findings it isn't true of.
    const hints = new Set(items.map((f) => f.hint ?? ''))
    const shared = hints.size === 1 ? items[0].hint : undefined
    if (shared) lines.push(`    fix: ${shared}`)

    for (const item of items.slice(0, perRule)) {
      const repeats =
        item.occurrences && item.occurrences > 1 ? ` (${item.occurrences} elements)` : ''
      lines.push(`    @${item.width} ${item.selector}${repeats}`)
      lines.push(`      ${item.message}`)
      if (!shared && item.hint) lines.push(`      fix: ${item.hint}`)
    }
    if (items.length > perRule) lines.push(`    …and ${items.length - perRule} more`)
  }

  return lines
}

function formatAudit(
  url: string,
  result: RunResult,
  summary: Summary,
  snapshotId: string,
  detail: 'summary' | 'full',
): string {
  const perRule = detail === 'full' ? 20 : 3
  const lines: string[] = []

  const scales = new Map<string, string>()
  for (const page of result.pages) {
    if (page.scale.length === 0) continue
    scales.set(
      `${page.scale.join(' ')}|${page.baseUnit}`,
      `scale ${page.scale.join(' ')} (base ${page.baseUnit}px${page.scaleInferred ? ', inferred from the page' : ''})`,
    )
  }

  lines.push(`${url} · ${summary.widths.join(',')}px · ${summary.pages} page${summary.pages === 1 ? '' : 's'}`)
  for (const description of scales.values()) lines.push(description)
  lines.push(
    `${summary.error} error · ${summary.warning} warning · ${summary.info} info · snapshot ${snapshotId}`,
  )
  lines.push('')

  if (result.findings.length === 0) {
    lines.push('No findings. Composition is clean at these widths.')
    return lines.join('\n')
  }

  lines.push(...formatBand(result.findings, 'error', perRule))
  lines.push(...formatBand(result.findings, 'warning', perRule))

  const info = result.findings.filter((f) => f.severity === 'info')
  if (info.length > 0) {
    if (detail === 'full') {
      lines.push(...formatBand(result.findings, 'info', perRule))
    } else {
      const breakdown = countByRule(info)
        .map(([rule, n]) => `${rule} ×${n}`)
        .join(', ')
      lines.push(`INFO (${info.length}): ${breakdown}`)
      lines.push('  Call again with detail:"full" to see these.')
    }
  }

  if (result.ruleErrors.length > 0) {
    lines.push('')
    lines.push(`Rules that threw: ${result.ruleErrors.map((e) => `${e.rule} (${e.message})`).join(', ')}`)
  }

  lines.push('')
  lines.push(
    `Next: make the edits, then call audit_page again and compare_audits with before:"${snapshotId}".`,
  )

  return lines.join('\n')
}

/* ────────────────────────────────── tools ────────────────────────────────── */

const TOOLS: ToolDefinition[] = [
  {
    name: 'audit_page',
    title: 'Audit rendered composition',
    description:
      'Render a URL or local HTML file in a real browser and report layout, rhythm, ' +
      'hierarchy, contrast and accessibility defects found in the rendered DOM and ' +
      'CSSOM. Catches problems that exist only after layout — padding measured against ' +
      'the sibling gap, contrast against the composited background, line length in ' +
      'rendered characters, text clipped by a fixed height, a suppressed focus ring. ' +
      'Framework-agnostic and deterministic: the same render always produces the same ' +
      'findings. Use it after writing or changing any UI, then use compare_audits to ' +
      'confirm the change actually helped.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'A URL (http://localhost:3000) or a path to an HTML file.',
        },
        widths: {
          type: 'array',
          items: { type: 'number' },
          description: 'Viewport widths to audit. Default [390, 1280] — phone and desktop.',
        },
        rules: {
          type: 'array',
          items: { type: 'string', enum: RULE_IDS },
          description: 'Restrict to these rules. Omit to run all of them.',
        },
        ignore: {
          type: 'array',
          items: { type: 'string' },
          description: 'CSS selectors whose subtrees should be skipped.',
        },
        crawl: {
          type: 'number',
          description: 'Follow same-origin links this many levels deep. Default 0.',
        },
        maxPages: { type: 'number', description: 'Cap on pages visited when crawling. Default 20.' },
        waitFor: {
          type: 'string',
          description:
            'CSS selector to wait for before auditing. Use when content arrives from a ' +
            'client-side fetch and you know what marks it as ready.',
        },
        settleMs: {
          type: 'number',
          description: 'Milliseconds the DOM must be quiet before auditing. Default 700.',
        },
        experimental: {
          type: 'boolean',
          description:
            'Also run rules whose precision is still being tuned (spacing-scale, ' +
            'proximity, alignment, tap-target). They are noisy on real sites — off by default.',
        },
        detail: {
          type: 'string',
          enum: ['summary', 'full'],
          description:
            'summary (default) lists errors and warnings and collapses info to counts. ' +
            'full lists everything — more thorough, considerably more context.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'compare_audits',
    title: 'Compare two audits',
    description:
      'Diff two snapshots returned by audit_page and report what was fixed, what is new, ' +
      'and what remains. This is how to verify an edit actually improved the page rather ' +
      'than moving the problem somewhere else — finding ids are stable across runs, so ' +
      'the comparison is exact rather than a count.',
    inputSchema: {
      type: 'object',
      properties: {
        before: { type: 'string', description: 'Snapshot id from the earlier audit_page call.' },
        after: { type: 'string', description: 'Snapshot id from the later audit_page call.' },
      },
      required: ['before', 'after'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_rules',
    title: 'List audit rules',
    description:
      'The rule registry with the reasoning behind each rule. Useful for deciding what ' +
      'to check, and for understanding what a finding is actually claiming.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

/* ──────────────────────────────── handlers ───────────────────────────────── */

function asNumbers(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback
  const out = value.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return out.length > 0 ? out : fallback
}

function asStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out = value.filter((v): v is string => typeof v === 'string')
  return out.length > 0 ? out : null
}

async function auditPage(args: Record<string, unknown>): Promise<ToolResult> {
  const url = typeof args.url === 'string' ? args.url.trim() : ''
  if (!url) throw new Error('`url` is required — a URL or a path to an HTML file.')

  const rules = asStrings(args.rules)
  const unknown = rules?.filter((r) => !RULE_IDS.includes(r)) ?? []
  if (unknown.length > 0) {
    throw new Error(`Unknown rule(s): ${unknown.join(', ')}. Known rules: ${RULE_IDS.join(', ')}`)
  }

  const widths = asNumbers(args.widths, [390, 1280])
  const detail = args.detail === 'full' ? 'full' : 'summary'

  const result = await run({
    entry: url,
    widths,
    height: 900,
    crawl: Number(args.crawl) > 0 ? Number(args.crawl) : 0,
    maxPages: Number(args.maxPages) > 0 ? Number(args.maxPages) : 20,
    timeout: 30000,
    waitFor: typeof args.waitFor === 'string' ? args.waitFor : undefined,
    settleMs: Number(args.settleMs) > 0 ? Number(args.settleMs) : 700,
    autoScroll: true,
    audit: {
      rules,
      experimental: args.experimental === true,
      ignore: asStrings(args.ignore) ?? [],
      maxPerRule: detail === 'full' ? 20 : 10,
    },
    // Progress goes to stderr; stdout is protocol frames only.
    onProgress: (message) => process.stderr.write(`[luku-audit-mcp] ${message}\n`),
  })

  const summary = summarise(result, widths)
  const id = store(url, widths, result, summary)

  return { content: [{ type: 'text', text: formatAudit(url, result, summary, id, detail) }] }
}

async function compareAudits(args: Record<string, unknown>): Promise<ToolResult> {
  const before = snapshots.get(String(args.before))
  const after = snapshots.get(String(args.after))

  if (!before || !after) {
    const known = [...snapshots.keys()]
    throw new Error(
      `Unknown snapshot id. Known: ${known.length > 0 ? known.join(', ') : '(none — run audit_page first)'}`,
    )
  }

  const beforeIds = new Set(before.findings.map((f) => f.id))
  const afterIds = new Set(after.findings.map((f) => f.id))

  const fixed = before.findings.filter((f) => !afterIds.has(f.id))
  const introduced = after.findings.filter((f) => !beforeIds.has(f.id))
  const remaining = after.findings.filter((f) => beforeIds.has(f.id))

  const weigh = (items: PageFinding[]) =>
    items.reduce((sum, f) => sum + (f.severity === 'error' ? 3 : f.severity === 'warning' ? 2 : 1), 0)

  const delta = weigh(introduced) - weigh(fixed)
  const verdict =
    delta < 0 ? 'improved' : delta > 0 ? 'regressed' : fixed.length > 0 ? 'traded' : 'unchanged'

  const summarizeGroup = (items: PageFinding[]) =>
    items.length === 0
      ? 'none'
      : countByRule(items)
          .map(([rule, n]) => `${rule} ×${n}`)
          .join(', ')

  const lines = [
    `${before.id} → ${after.id}   verdict: ${verdict}`,
    `  before: ${before.summary.error}E ${before.summary.warning}W ${before.summary.info}I`,
    `  after:  ${after.summary.error}E ${after.summary.warning}W ${after.summary.info}I`,
    '',
    `fixed (${fixed.length}): ${summarizeGroup(fixed)}`,
    `new (${introduced.length}): ${summarizeGroup(introduced)}`,
    `remaining (${remaining.length}): ${summarizeGroup(remaining)}`,
  ]

  if (introduced.length > 0) {
    lines.push('', 'Newly introduced:')
    for (const finding of introduced.slice(0, 10)) {
      lines.push(`  [${finding.severity}] @${finding.width} ${finding.selector}`)
      lines.push(`    ${finding.message}`)
    }
    if (introduced.length > 10) lines.push(`  …and ${introduced.length - 10} more`)
  }

  if (verdict === 'unchanged' && remaining.length > 0) {
    lines.push('', 'Nothing changed. Either the edit did not land, or the page was not rebuilt.')
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

async function listRules(): Promise<ToolResult> {
  const text = RULES.map((rule) => `${rule.id} — ${rule.title}\n  ${rule.rationale}`).join('\n\n')
  return { content: [{ type: 'text', text }] }
}

/* ─────────────────────────────────── main ────────────────────────────────── */

serve({
  info: { name: 'luku-audit', version: ENGINE_VERSION },
  tools: TOOLS,
  call: async (name, args) => {
    if (name === 'audit_page') return auditPage(args)
    if (name === 'compare_audits') return compareAudits(args)
    if (name === 'list_rules') return listRules()
    throw new Error(`Unknown tool: ${name}`)
  },
})
