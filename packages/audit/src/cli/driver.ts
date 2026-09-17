/**
 * @module cli/driver
 *
 * Drives a real browser, because these rules need real layout. jsdom and
 * happy-dom have no layout engine — `getBoundingClientRect` returns zeros
 * there, which would silently turn every geometric rule into a no-op.
 *
 * playwright-core is loaded lazily and has no bundled browser: it drives the
 * Chrome already on the machine. That keeps `npm i` small and keeps the engine
 * itself usable with no browser dependency at all.
 */
import { existsSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { AuditOptions, AuditResult, Finding } from '../core/types.js'
import type { Shot } from './visual.js'
import { settle } from './settle.js'
import { SEVERITY_RANK } from '../core/types.js'
import { RULE_IDS } from '../core/rules/index.js'

export interface PageFinding extends Finding {
  url: string
  width: number
}

export interface PageReport {
  url: string
  width: number
  scale: number[]
  baseUnit: number
  scaleInferred: boolean
}

export interface RunOptions {
  entry: string
  widths: number[]
  height: number
  crawl: number
  maxPages: number
  timeout: number
  audit: AuditOptions
  /** Capture a full-page screenshot per page and width, for the visual report. */
  screenshots?: boolean
  /** Wait for this selector before auditing — for content you know arrives late. */
  waitFor?: string
  /** Milliseconds the DOM must be quiet before the page counts as settled. */
  settleMs: number
  /** Scroll the page first, to trigger lazy and intersection-revealed content. */
  autoScroll: boolean
  onProgress?: (message: string) => void
}

export interface RunResult {
  findings: PageFinding[]
  pages: PageReport[]
  shots: Shot[]
  ruleErrors: Array<{ url: string; rule: string; message: string }>
}

const CORE_BUNDLE = resolvePath(dirname(fileURLToPath(import.meta.url)), 'core.global.js')

const CHROME_CANDIDATES = [
  process.env.LUKU_CHROME,
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean) as string[]

async function loadPlaywright() {
  for (const pkg of ['playwright-core', 'playwright']) {
    try {
      return (await import(/* @vite-ignore */ pkg)) as typeof import('playwright-core')
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'No browser driver found. Install one:\n\n' +
      '  npm i -D playwright-core     # uses the Chrome already on this machine\n' +
      '  npm i -D playwright          # downloads its own browsers\n',
  )
}

async function launch() {
  const { chromium } = await loadPlaywright()

  // Prefer the system Chrome — nothing to download, and it is the engine the
  // author's users are actually running.
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    /* fall through to an explicit path */
  }

  for (const path of CHROME_CANDIDATES) {
    if (!existsSync(path)) continue
    try {
      return await chromium.launch({ executablePath: path, headless: true })
    } catch {
      /* try the next candidate */
    }
  }

  // Last resort: a browser playwright downloaded for itself.
  return await chromium.launch({ headless: true })
}

/** Accepts a URL, or a path to a local HTML file. */
export function normaliseEntry(entry: string): string {
  if (/^https?:\/\//i.test(entry) || entry.startsWith('file://')) return entry
  const path = resolvePath(process.cwd(), entry)
  if (!existsSync(path)) throw new Error(`Not a URL and not a file that exists: ${entry}`)
  return pathToFileURL(path).href
}

export async function run(options: RunOptions): Promise<RunResult> {
  if (!existsSync(CORE_BUNDLE)) {
    throw new Error(`Engine bundle missing at ${CORE_BUNDLE}. Run \`npm run build\` first.`)
  }

  const entry = normaliseEntry(options.entry)
  const browser = await launch()
  const findings: PageFinding[] = []
  const pages: PageReport[] = []
  const shots: Shot[] = []
  const ruleErrors: RunResult['ruleErrors'] = []

  try {
    const context = await browser.newContext({
      viewport: { width: options.widths[0], height: options.height },
      // Pinned so text metrics don't drift with the host's locale or DPI.
      deviceScaleFactor: 1,
      locale: 'en-US',
      reducedMotion: 'reduce',
    })

    const queue: string[] = [entry]
    const visited = new Set<string>()
    const depth = new Map<string, number>([[entry, 0]])

    while (queue.length > 0 && visited.size < options.maxPages) {
      const url = queue.shift()!
      if (visited.has(url)) continue
      visited.add(url)

      const page = await context.newPage()
      try {
        await page.goto(url, { waitUntil: 'load', timeout: options.timeout })

        // Settle once before the width loop. Without this the *first* width
        // audited pays for the cold fetch alone: measured against a live site,
        // a cold run missed six findings at 390px that every warm run caught,
        // purely because 390px happened to go first.
        await settle(page, {
          waitFor: options.waitFor,
          quietMs: options.settleMs,
          maxMs: Math.min(options.timeout, 15000),
          scroll: options.autoScroll,
          onProgress: options.onProgress,
        })

        for (const width of options.widths) {
          await page.setViewportSize({ width, height: options.height })
          // Settle per width, not once per page: a responsive layout can mount
          // entirely different components at 390px than it did at 1280px, and
          // those have their own data to fetch.
          await settle(page, {
            waitFor: options.waitFor,
            quietMs: options.settleMs,
            maxMs: Math.min(options.timeout, 15000),
            scroll: options.autoScroll,
            onProgress: options.onProgress,
          })
          await page.addScriptTag({ path: CORE_BUNDLE })

          const result = (await page.evaluate((auditOptions) => {
            const engine = (globalThis as unknown as { __LUKU_AUDIT__: { audit: Function } })
              .__LUKU_AUDIT__
            return engine.audit(document.body, auditOptions)
          }, options.audit as never)) as AuditResult

          options.onProgress?.(
            `${url} @ ${width}px — ${result.counts.error}E ${result.counts.warning}W ${result.counts.info}I`,
          )

          pages.push({
            url,
            width,
            scale: result.scale,
            baseUnit: result.baseUnit,
            scaleInferred: result.scaleInferred,
          })
          for (const finding of result.findings) findings.push({ ...finding, url, width })
          for (const error of result.errors) ruleErrors.push({ url, ...error })

          if (options.screenshots) {
            const size = await page.evaluate(() => ({
              w: document.documentElement.scrollWidth,
              h: document.documentElement.scrollHeight,
            }))
            // JPEG, not PNG: a full-page capture of a long marketing site runs to
            // several megabytes as PNG, and the report embeds it as base64.
            const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 })
            shots.push({
              url,
              width,
              image: buffer.toString('base64'),
              documentWidth: size.w,
              documentHeight: size.h,
            })
          }
        }

        if (options.crawl > 0 && (depth.get(url) ?? 0) < options.crawl && !url.startsWith('file:')) {
          await page.setViewportSize({ width: options.widths[0], height: options.height })
          const links = await sameOriginLinks(page)
          for (const link of links) {
            if (visited.has(link) || depth.has(link)) continue
            depth.set(link, (depth.get(url) ?? 0) + 1)
            queue.push(link)
          }
        }
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  // Deterministic across the whole run, and worst-first within each viewport.
  // Sorting on the id hash alone was deterministic but scattered the errors
  // among the trivia, which made the raw JSON array useless to read in order.
  findings.sort(
    (a, b) =>
      a.url.localeCompare(b.url) ||
      a.width - b.width ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      RULE_IDS.indexOf(a.rule) - RULE_IDS.indexOf(b.rule) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )

  return { findings, pages, shots, ruleErrors }
}

async function sameOriginLinks(page: import('playwright-core').Page): Promise<string[]> {
  return page.evaluate(() => {
    const origin = location.origin
    const out = new Set<string>()
    for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
      const href = (anchor as HTMLAnchorElement).href
      try {
        const url = new URL(href)
        if (url.origin !== origin) continue
        if (!/^https?:$/.test(url.protocol)) continue
        // Fragments and query strings are the same page for layout purposes.
        url.hash = ''
        url.search = ''
        out.add(url.href)
      } catch {
        /* skip unparseable hrefs */
      }
    }
    return Array.from(out).sort()
  })
}
