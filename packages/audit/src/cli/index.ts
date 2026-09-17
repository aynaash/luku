/**
 * @module cli
 *
 * `luku-audit <url|file>` — render, audit, report, exit non-zero.
 *
 * The default output is for a person; `--json` is for everything else. The
 * exit code is what makes this usable in an agent loop and in CI without
 * either of them having to parse anything.
 */
import { writeFile } from 'node:fs/promises'
import { ENGINE_VERSION } from '../core/index.js'
import { RULES, RULE_IDS } from '../core/rules/index.js'
import { run } from './driver.js'
import { summarise, toJson, toText } from './report.js'
import { buildVisualReport } from './visual.js'
import type { Severity } from '../core/types.js'

interface Args {
  entry?: string
  widths: number[]
  height: number
  crawl: number
  maxPages: number
  rules: string[] | null
  ignore: string[]
  baseUnit: number | null
  scale: number[] | null
  maxPerRule: number
  failOn: Severity | 'never'
  json: boolean
  out?: string
  timeout: number
  quiet: boolean
  experimental: boolean
  waitFor?: string
  settleMs: number
  autoScroll: boolean
  visual?: string
  help: boolean
  listRules: boolean
}

const HELP = `
  luku-audit — deterministic composition linter for rendered UI

  USAGE
    luku-audit <url|file> [options]

  EXAMPLES
    luku-audit http://localhost:3000
    luku-audit ./out/index.html --json
    luku-audit http://localhost:3000 --crawl 2 --out report.json
    luku-audit http://localhost:3000 --widths 390 --fail-on warning

  OPTIONS
    --widths <list>      viewport widths, comma separated   (default 390,1280)
    --height <px>        viewport height                    (default 900)
    --crawl <depth>      follow same-origin links this deep (default 0)
    --max-pages <n>      cap on pages visited               (default 20)
    --rules <list>       run only these rules
    --ignore <selector>  skip a subtree; repeatable
    --base-unit <px>     assert a grid instead of inferring it
    --scale <list>       assert a spacing scale in px instead of inferring it
    --max-per-rule <n>   findings kept per rule per page    (default 20)
    --wait-for <sel>     wait for this selector before auditing
    --settle <ms>        DOM must be quiet this long first    (default 700)
    --no-scroll          skip the pre-scroll that triggers lazy content
    --visual <file>      annotated screenshots as a self-contained HTML report
    --experimental       also run rules whose precision is still being tuned
    --fail-on <level>    error | warning | info | never     (default error)
    --json               write the report as JSON to stdout
    --out <file>         write the report as JSON to a file
    --timeout <ms>       per-page navigation timeout        (default 30000)
    --quiet              suppress progress output
    --list-rules         print the rule registry and exit
    --help

  The spacing scale is read off the page unless you pass --scale, so a finding
  means "this value disagrees with the rest of your own page".
`

function parse(argv: string[]): Args {
  const args: Args = {
    widths: [390, 1280],
    height: 900,
    crawl: 0,
    maxPages: 20,
    rules: null,
    ignore: [],
    baseUnit: null,
    scale: null,
    maxPerRule: 20,
    failOn: 'error',
    json: false,
    timeout: 30000,
    quiet: false,
    experimental: false,
    settleMs: 700,
    autoScroll: true,
    help: false,
    listRules: false,
  }

  const numbers = (value: string) =>
    value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true
        break
      case '--list-rules':
        args.listRules = true
        break
      case '--json':
        args.json = true
        break
      case '--experimental':
        args.experimental = true
        break
      case '--wait-for':
        args.waitFor = next()
        break
      case '--settle':
        args.settleMs = Number(next())
        break
      case '--no-scroll':
        args.autoScroll = false
        break
      case '--visual':
        args.visual = next() ?? 'luku-report.html'
        break
      case '--quiet':
      case '-q':
        args.quiet = true
        break
      case '--widths':
        args.widths = numbers(next() ?? '')
        break
      case '--height':
        args.height = Number(next())
        break
      case '--crawl':
        args.crawl = Number(next() ?? 1) || 1
        break
      case '--max-pages':
        args.maxPages = Number(next())
        break
      case '--rules':
        args.rules = (next() ?? '').split(',').map((r) => r.trim()).filter(Boolean)
        break
      case '--ignore':
        args.ignore.push(next() ?? '')
        break
      case '--base-unit':
        args.baseUnit = Number(next())
        break
      case '--scale':
        args.scale = numbers(next() ?? '')
        break
      case '--max-per-rule':
        args.maxPerRule = Number(next())
        break
      case '--fail-on':
        args.failOn = (next() ?? 'error') as Args['failOn']
        break
      case '--out':
        args.out = next()
        break
      case '--timeout':
        args.timeout = Number(next())
        break
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
        if (!args.entry) args.entry = arg
    }
  }

  return args
}

function shouldFail(failOn: Args['failOn'], counts: { error: number; warning: number; info: number }) {
  if (failOn === 'never') return false
  if (failOn === 'error') return counts.error > 0
  if (failOn === 'warning') return counts.error + counts.warning > 0
  return counts.error + counts.warning + counts.info > 0
}

async function main() {
  let args: Args
  try {
    args = parse(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`)
    process.exit(2)
  }

  if (args.help) {
    process.stdout.write(HELP)
    return
  }

  if (args.listRules) {
    for (const rule of RULES) {
      const tag = rule.experimental ? '  [experimental — off by default]' : ''
      process.stdout.write(`${rule.id}${tag}\n  ${rule.title}\n  ${rule.rationale}\n\n`)
    }
    return
  }

  if (!args.entry) {
    process.stderr.write('Nothing to audit. Pass a URL or an HTML file, or --help.\n')
    process.exit(2)
  }

  if (args.rules) {
    const unknown = args.rules.filter((r) => !RULE_IDS.includes(r))
    if (unknown.length > 0) {
      process.stderr.write(
        `Unknown rule${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}\nKnown: ${RULE_IDS.join(', ')}\n`,
      )
      process.exit(2)
    }
  }

  const wantsStdoutJson = args.json && !args.out
  const log = (message: string) => {
    if (!args.quiet && !wantsStdoutJson) process.stderr.write(`${message}\n`)
  }

  try {
    const result = await run({
      entry: args.entry,
      widths: args.widths.length > 0 ? args.widths : [390, 1280],
      height: args.height,
      crawl: args.crawl,
      maxPages: args.maxPages,
      timeout: args.timeout,
      screenshots: Boolean(args.visual),
      waitFor: args.waitFor,
      settleMs: args.settleMs,
      autoScroll: args.autoScroll,
      audit: {
        rules: args.rules,
        experimental: args.experimental,
        ignore: args.ignore,
        baseUnit: args.baseUnit,
        scale: args.scale,
        maxPerRule: args.maxPerRule,
      },
      onProgress: log,
    })

    const summary = summarise(result, args.widths)
    const json = toJson(result, summary, ENGINE_VERSION)

    if (args.out) {
      await writeFile(args.out, `${json}\n`, 'utf8')
      log(`wrote ${args.out}`)
    }
    if (args.visual) {
      await writeFile(args.visual, buildVisualReport(result.shots, result.findings, ENGINE_VERSION), 'utf8')
      log(`wrote ${args.visual}`)
    }
    if (wantsStdoutJson) process.stdout.write(`${json}\n`)
    else if (!args.out || !args.json) process.stdout.write(toText(result, summary))

    process.exit(shouldFail(args.failOn, summary) ? 1 : 0)
  } catch (error) {
    process.stderr.write(`\n${(error as Error).message}\n`)
    process.exit(2)
  }
}

void main()
