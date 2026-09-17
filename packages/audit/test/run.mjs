/**
 * Test suite. No framework — the project has zero runtime dependencies and the
 * assertions here are simple enough that a harness would be more code than the
 * tests.
 *
 *   node test/run.mjs            offline: colour maths + fixture audits
 *   node test/run.mjs --live     also audits the calibration corpus
 *
 * WHAT THIS IS FOR
 * Every case in the regression section is a bug that a real website found and
 * that hand-written fixtures did not. Four sites produced five such bugs — an
 * invented grey backdrop, an unparsed colour space, SVG geometry treated as
 * layout, ids colliding across viewports, and a race against client-rendered
 * content. The suite exists so none of them can come back quietly.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`)
  } else {
    failed++
    failures.push(name)
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}${detail ? `\n      ${detail}` : ''}\n`)
  }
}

function group(title) {
  process.stdout.write(`\n\x1b[1m${title}\x1b[0m\n`)
}

/** Runs the CLI and returns the parsed JSON report. */
function audit(target, extra = []) {
  const result = spawnSync(
    'node',
    [`${DIR}/dist/cli.js`, target, '--json', '--fail-on', 'never', '--quiet', ...extra],
    { cwd: DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  if (!result.stdout) throw new Error(`no output for ${target}: ${result.stderr?.slice(0, 400)}`)
  return JSON.parse(result.stdout)
}

const has = (report, needle) => report.findings.some((f) => f.message.includes(needle))
const byRule = (report, rule) => report.findings.filter((f) => f.rule === rule)

/* ── colour maths ─────────────────────────────────────────────────────────── */

group('Colour conversion (CSS Color 4 reference values)')
{
  const { parseColor, contrastRatio } = await import(`${DIR}/dist/core.js`).then(
    (m) => m,
    // core.js is a browser bundle; parseColor is internal, so fall back to a
    // dedicated bundle when it isn't re-exported.
    () => ({}),
  )

  if (typeof parseColor === 'function') {
    const rgb = (s) => {
      const c = parseColor(s)
      return c ? [Math.round(c.r), Math.round(c.g), Math.round(c.b)] : null
    }
    const eq = (a, b) => a && a.every((v, i) => Math.abs(v - b[i]) <= 1)

    check('oklab(1 0 0) is white', eq(rgb('oklab(1 0 0)'), [255, 255, 255]))
    check('lab(54.291 80.805 69.891) is sRGB red (D50)', eq(rgb('lab(54.291 80.805 69.891)'), [255, 0, 0]))
    check('oklch(0.62796 0.25768 29.234) is sRGB red', eq(rgb('oklch(0.62796 0.25768 29.234)'), [255, 0, 0]))
    check('hsl(120 100% 50%) is green', eq(rgb('hsl(120 100% 50%)'), [0, 255, 0]))
    check('color(display-p3 1 0 0) parses', rgb('color(display-p3 1 0 0)') !== null)
    check('none keyword does not produce NaN', rgb('oklch(0.7 none 0)')?.every(Number.isFinite))
    check(
      'white vs black is exactly 21:1',
      Math.abs(contrastRatio(parseColor('oklab(1 0 0)'), parseColor('lab(0 0 0)')) - 21) < 0.01,
    )
  } else {
    check('colour maths exported from dist/core.js', false, 'parseColor is not exported')
  }
}

/* ── fixtures ─────────────────────────────────────────────────────────────── */

group('Fixtures')
{
  const messy = audit('fixtures/messy.html', ['--widths', '390,1280'])
  const fixed = audit('fixtures/fixed.html', ['--widths', '390,1280'])

  check('messy.html reports errors', messy.summary.error > 0, `got ${messy.summary.error}`)
  check('messy.html catches the overflow', byRule(messy, 'overflow').length > 0)
  check('messy.html catches the skipped heading level', has(messy, 'jumps from h2 to h4'))
  check('messy.html catches the suppressed focus ring', byRule(messy, 'focus-visible').length > 0)
  check('messy.html catches the clipped paragraph', byRule(messy, 'clipped-text').length > 0)
  check('messy.html catches the two filled actions', byRule(messy, 'competing-emphasis').length > 0)
  check('messy.html catches the detached heading', byRule(messy, 'heading-attachment').length > 0)

  check('fixed.html has no errors', fixed.summary.error === 0, `got ${fixed.summary.error}`)
  check('fixed.html has no warnings', fixed.summary.warning === 0, `got ${fixed.summary.warning}`)
  check(
    'fixed.html focus ring is accepted when replaced',
    byRule(fixed, 'focus-visible').length === 0,
    'a :focus-visible replacement must silence the rule',
  )
}

/* ── regressions found by real sites ──────────────────────────────────────── */

group('Regressions (each case is a bug a live site found)')
{
  const r = audit('fixtures/regressions.html', ['--widths', '1280'])

  check(
    '[1] h1 containing only <img alt> is not "empty"',
    !has(r, 'Empty h'),
    'accessible name must include descendant alt text',
  )

  // `.wire-link` is #4d6b3e on #f2efe0 — 5.27:1, comfortably passing. It must
  // produce no contrast finding at all. (The earlier filter used
  // `selector.includes('a')`, which matches the "a" in "main".)
  const wire = r.findings.filter((f) => f.rule === 'contrast' && /\ba$/.test(f.selector))
  check(
    '[2] a 1px gradient underline is not treated as the backdrop',
    wire.length === 0,
    `link reported at ${wire.map((f) => `${f.meta.ratio}:1`).join(', ')}`,
  )

  check(
    '[3] OKLCH text on OKLCH background is measured, not skipped',
    byRule(r, 'contrast').some((f) => f.meta.ratio > 1 && f.meta.ratio < 4.5),
    'modern colour spaces must parse',
  )

  check(
    '[4] no finding points inside SVG geometry',
    !r.findings.some((f) => /\bpath\b|\bg:nth|\bcircle\b/.test(f.selector)),
    r.findings.filter((f) => /path|g:nth/.test(f.selector)).map((f) => f.selector)[0] ?? '',
  )

  const repeated = r.findings.find((f) => f.occurrences && f.occurrences > 4)
  check(
    '[5] a repeated component is one finding with a count',
    Boolean(repeated),
    'twelve identical tiles must not produce twelve findings',
  )

  const uncertain = r.findings.filter((f) => f.meta && f.meta.backdrop === 'image')
  check(
    '[6] a covering gradient is an admitted unknown, never an error',
    uncertain.length > 0 && uncertain.every((f) => f.severity === 'info'),
    `got ${uncertain.length} image-backdrop findings`,
  )

  check('every finding carries a box for the visual report', r.findings.every((f) => f.box))
}

group('Determinism')
{
  const a = audit('fixtures/messy.html', ['--widths', '390,1280'])
  const b = audit('fixtures/messy.html', ['--widths', '390,1280'])
  check('two runs are byte-identical', JSON.stringify(a) === JSON.stringify(b))
  check(
    'ids are unique across viewports',
    a.findings.length === new Set(a.findings.map((f) => f.id)).size,
    'the same defect at two widths must not collapse to one id',
  )
  const rank = { error: 0, warning: 1, info: 2 }
  check(
    'findings are worst-first within each viewport',
    a.findings.every((f, i) => {
      if (i === 0) return true
      const prev = a.findings[i - 1]
      if (prev.url !== f.url || prev.width !== f.width) return true
      return rank[prev.severity] <= rank[f.severity]
    }),
  )
}

/* ── live corpus ──────────────────────────────────────────────────────────── */

if (LIVE) {
  group('Calibration corpus (live)')
  // Sites built by people who know what they are doing. A rule that is loud
  // here is wrong about something; the ceilings are regression guards, not
  // quality targets.
  const CORPUS = [
    { url: 'https://news.ycombinator.com', maxFindings: 25 },
    { url: 'https://vercel.com', maxFindings: 45 },
    { url: 'https://tailwindcss.com', maxFindings: 80 },
  ]

  for (const site of CORPUS) {
    try {
      const report = audit(site.url, ['--widths', '390,1280', '--timeout', '60000'])
      check(
        `${site.url} stays under ${site.maxFindings} findings`,
        report.findings.length <= site.maxFindings,
        `got ${report.findings.length}`,
      )
      check(
        `${site.url} has no impossible 1.00:1 contrast claims`,
        !byRule(report, 'contrast').some((f) => f.meta.ratio === 1 && f.meta.backdrop !== 'image'),
        'a 1.00:1 reading on visible text means the backdrop walk failed',
      )
      check(`${site.url} had no rule throw`, report.ruleErrors.length === 0)
    } catch (error) {
      check(`${site.url} audited`, false, error.message)
    }
  }
} else {
  process.stdout.write('\n\x1b[2m  (corpus skipped — run with --live to audit real sites)\x1b[0m\n')
}

/* ── result ───────────────────────────────────────────────────────────────── */

process.stdout.write(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`)
if (failed > 0) {
  process.stdout.write(`\nFailed:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`)
  process.exit(1)
}
