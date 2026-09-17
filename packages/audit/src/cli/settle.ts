/**
 * @module cli/settle
 *
 * Wait until the page has finished becoming itself.
 *
 * THE PROBLEM THIS FIXES
 * `load` fires when the initial resources are done, which on any client-rendered
 * app is long before the content exists. Auditing at that moment races the data
 * fetch: measured against hersitech.com, an entire writing list appeared in one
 * run and was absent in the next, taking five real findings with it. A linter
 * that audits half the page is worse than none, because the half it missed reads
 * as clean.
 *
 * WHY NOT `networkidle`
 * Playwright offers it and it is the obvious choice, but it waits for *all*
 * network activity to stop — so analytics beacons, long-poll connections and
 * open websockets make it hang until the timeout on a large share of real sites.
 * DOM quiescence asks the question we actually care about: has the rendered
 * result stopped changing?
 *
 * THE DETERMINISM TRADE
 * Quiescence is time-based, so this is the one genuinely non-deterministic step
 * in the pipeline. It is still the right call: the alternative is auditing
 * whatever happened to have arrived, which is *content* nondeterminism, and that
 * is far worse than timing nondeterminism. Net stability goes up, not down —
 * the three-run agreement on a live site is what this buys.
 */
import type { Page } from 'playwright-core'

export interface SettleOptions {
  /** Wait for this selector before anything else. */
  waitFor?: string
  /** How long the DOM must be quiet before it counts as settled. */
  quietMs: number
  /** Ceiling on the whole routine. */
  maxMs: number
  /** Scroll the page to trigger lazy-loaded and intersection-revealed content. */
  scroll: boolean
  onProgress?: (message: string) => void
}

export async function settle(page: Page, options: SettleOptions): Promise<void> {
  const { waitFor, quietMs, maxMs, scroll } = options

  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { timeout: maxMs, state: 'attached' })
    } catch {
      options.onProgress?.(`  --wait-for "${waitFor}" never matched; auditing anyway`)
    }
  }

  if (scroll) {
    // Lazy images and IntersectionObserver reveals never fire for content below
    // the fold, so a full-page audit at scroll 0 sees placeholders where the
    // real layout will be. Walk down, then return to the top — the audit reads
    // `window.scrollY` for its boxes and must run from a known position.
    await page.evaluate(async () => {
      const step = Math.max(400, window.innerHeight * 0.9)
      const limit = document.documentElement.scrollHeight
      for (let y = 0; y < limit; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      }
      window.scrollTo(0, 0)
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
  }

  // Images that are still decoding change layout the moment they land.
  await page
    .evaluate(
      (cap) =>
        Promise.race([
          Promise.all(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map((img) => new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }) })),
          ).then(() => undefined),
          new Promise((r) => setTimeout(() => r(undefined), cap)),
        ]),
      Math.min(maxMs, 5000),
    )
    .catch(() => {})

  const quiet = await page.evaluate(
    ({ quietMs, maxMs }) =>
      new Promise<boolean>((resolve) => {
        const start = Date.now()
        let timer: number

        const finish = (settled: boolean) => {
          observer.disconnect()
          clearTimeout(timer)
          resolve(settled)
        }

        const bump = () => {
          clearTimeout(timer)
          if (Date.now() - start > maxMs) return finish(false)
          timer = setTimeout(() => finish(true), quietMs) as unknown as number
        }

        const observer = new MutationObserver(bump)
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        })
        bump()
      }),
    { quietMs, maxMs },
  )

  if (!quiet) {
    options.onProgress?.(`  DOM never went quiet within ${maxMs}ms; auditing the current state`)
  }

  // Fonts change glyph advance, which changes every measure. Do this last: the
  // settle steps above can introduce new @font-face rules.
  await page.evaluate(() => document.fonts?.ready?.then(() => undefined) ?? Promise.resolve()).catch(() => {})
}
