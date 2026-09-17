/**
 * @module cli/report
 *
 * Two output modes, because there are two consumers. `--json` is the one that
 * matters: a flat, stably-ordered array an agent can diff between runs. The
 * pretty printer exists so a human can sanity-check what the agent is seeing.
 */
import type { Severity } from '../core/types.js'
import type { PageReport, RunResult } from './driver.js'

const useColor =
  process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== 'dumb'

const paint = (code: string) => (text: string) => (useColor ? `[${code}m${text}[0m` : text)

const dim = paint('2')
const bold = paint('1')
const red = paint('31')
const yellow = paint('33')
const blue = paint('34')
const green = paint('32')

const SEVERITY_PAINT: Record<Severity, (t: string) => string> = {
  error: red,
  warning: yellow,
  info: blue,
}

const MARK: Record<Severity, string> = { error: '✗', warning: '!', info: '·' }

export interface Summary {
  pages: number
  widths: number[]
  error: number
  warning: number
  info: number
}

export function summarise(result: RunResult, widths: number[]): Summary {
  const urls = new Set(result.pages.map((p) => p.url))
  const counts = { error: 0, warning: 0, info: 0 }
  for (const finding of result.findings) counts[finding.severity]++
  return { pages: urls.size, widths, ...counts }
}

export function toJson(result: RunResult, summary: Summary, version: string): string {
  // Deduplicated page metadata: the scale is a property of a page at a width.
  const seen = new Set<string>()
  const pages: PageReport[] = []
  for (const page of result.pages) {
    const key = `${page.url}|${page.width}`
    if (seen.has(key)) continue
    seen.add(key)
    pages.push(page)
  }

  return JSON.stringify(
    {
      tool: '@luku/audit',
      version,
      summary,
      pages,
      findings: result.findings,
      ruleErrors: result.ruleErrors,
    },
    null,
    2,
  )
}

export function toText(result: RunResult, summary: Summary): string {
  const lines: string[] = []

  if (result.findings.length === 0) {
    lines.push('')
    lines.push(green('  No findings. Composition is clean.'))
  }

  // Group by url, then width, then rule — the order someone reads in.
  const byPage = new Map<string, typeof result.findings>()
  for (const finding of result.findings) {
    const key = `${finding.url}|${finding.width}`
    const bucket = byPage.get(key)
    if (bucket) bucket.push(finding)
    else byPage.set(key, [finding])
  }

  for (const [key, findings] of byPage) {
    const [url, width] = key.split('|')
    const page = result.pages.find((p) => p.url === url && String(p.width) === width)

    lines.push('')
    lines.push(bold(`  ${shorten(url)}`) + dim(`  @${width}px`))
    if (page && page.scaleInferred && page.scale.length > 0) {
      lines.push(
        dim(`  scale inferred from page: ${page.scale.join(' ')} · base unit ${page.baseUnit}px`),
      )
    }
    lines.push('')

    // Findings arrive severity-first, which is right for JSON but reads badly
    // as text — the same rule reappears four times. Grouping by rule while
    // keeping first-seen order puts the worst rule at the top and says each
    // rule's name once.
    const byRule = new Map<string, typeof findings>()
    for (const finding of findings) {
      const bucket = byRule.get(finding.rule)
      if (bucket) bucket.push(finding)
      else byRule.set(finding.rule, [finding])
    }

    for (const [rule, items] of byRule) {
      lines.push(dim(`  ${rule}`))
      for (const finding of items) {
        const colour = SEVERITY_PAINT[finding.severity]
        const repeats = finding.occurrences && finding.occurrences > 1 ? ` ×${finding.occurrences}` : ''
        lines.push(`    ${colour(MARK[finding.severity])} ${finding.message}${dim(repeats)}`)
        if (finding.hint) lines.push(dim(`      → ${finding.hint}`))
        lines.push(dim(`      ${finding.selector}`))
      }
    }
  }

  if (result.ruleErrors.length > 0) {
    lines.push('')
    lines.push(red('  Rules that threw:'))
    for (const error of result.ruleErrors) {
      lines.push(`    ${error.rule}: ${error.message}`)
    }
  }

  lines.push('')
  lines.push(
    '  ' +
      [
        red(`${summary.error} error`),
        yellow(`${summary.warning} warning`),
        blue(`${summary.info} info`),
      ].join(dim(' · ')) +
      dim(`   ${summary.pages} page${summary.pages === 1 ? '' : 's'} × ${summary.widths.join(', ')}px`),
  )
  lines.push('')

  return lines.join('\n')
}

function shorten(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') return parsed.pathname.split('/').slice(-2).join('/')
    return parsed.host + parsed.pathname
  } catch {
    return url
  }
}
