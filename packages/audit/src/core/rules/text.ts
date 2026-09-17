/**
 * @module core/rules/text
 *
 * Rules about reading. Both depend on rendered state that no source linter can
 * see: the real glyph advance after the webfont loaded, and the background that
 * actually ended up behind the text.
 */
import {
  contrastRatio,
  effectiveBackground,
  flatten,
  isUnmeasurableText,
  parseColor,
  requiredRatio,
} from '../color.js'
import { ownText, round, snippet } from '../dom.js'
import { HEADLINE_MEASURE_MAX, HEADLINE_MIN_FONT_PX, estimateMeasure } from '../scale.js'
import type { RawFinding, Rule } from '../types.js'

/* ───────────────────────────────── measure ───────────────────────────────── */

const TEXT_BLOCK = 'p,li,blockquote,dd,figcaption,td,h1,h2,h3,h4,h5,h6'

export const measure: Rule = {
  id: 'measure',
  title: 'Line length',
  rationale:
    'Past ~80 characters the eye loses the return sweep and re-reads lines; the ' +
    'cost is highest for dyslexic readers and anyone using magnification. A ' +
    'max-width class asserts the measure — this checks it is actually binding ' +
    'once the real typeface has loaded.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const el of ctx.elements(TEXT_BLOCK)) {
      const text = ownText(el)
      if (text.length < 100) continue

      const style = ctx.style(el)
      const fontSize = parseFloat(style.fontSize)
      if (!Number.isFinite(fontSize) || fontSize <= 0) continue

      const width =
        el.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
      const chars = estimateMeasure(width, fontSize)
      if (chars === 0) continue

      // A single-line block has no return sweep to lose.
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.4
      if (el.clientHeight < lineHeight * 1.5) continue

      const isHeadline = /^H[1-6]$/.test(el.tagName) || fontSize >= HEADLINE_MIN_FONT_PX
      const limit = isHeadline ? HEADLINE_MEASURE_MAX : ctx.options.measure.max

      if (chars > limit) {
        out.push({
          rule: 'measure',
          severity: isHeadline ? 'info' : 'warning',
          message: `~${chars} characters per line${isHeadline ? ' in a headline' : ''} — past the ${limit}ch limit.`,
          hint: isHeadline
            ? 'Cap the headline around 20–30 characters per line so it reads as one gesture rather than a paragraph set large.'
            : `Constrain this block to about ${ctx.options.measure.max}ch (roughly ${Math.round(ctx.options.measure.max * fontSize * 0.5)}px at this size).`,
          element: el,
          meta: { chars, limit, fontSize: round(fontSize), widthPx: round(width) },
        })
        continue
      }

      // A narrow measure is only a *choice* when there was room for a wider
      // one. On a phone every column is under 45ch, and saying so is noise.
      const roomToBeWider = window.innerWidth >= 768
      if (!isHeadline && roomToBeWider && chars < ctx.options.measure.min && text.length > 400) {
        out.push({
          rule: 'measure',
          severity: 'info',
          message: `~${chars} characters per line — under the ${ctx.options.measure.min}ch floor for a ${text.length}-character block.`,
          hint: 'A column this narrow breaks the rhythm of fixations; widen it or move the text out of the narrow container.',
          element: el,
          meta: { chars, floor: ctx.options.measure.min },
        })
      }
    }

    return out
  },
}

/* ──────────────────────────────── contrast ───────────────────────────────── */

/**
 * `div` belongs here despite looking wrong. A great deal of real markup puts
 * text directly inside one, and leaving it out was a silent blind spot — a
 * twelve-tile component with unreadable labels produced no findings at all.
 * The `ownText` guard below is what makes it safe: a wrapper div holds no text
 * of its own and is never measured.
 */
const TEXT_NODE_SELECTOR =
  'p,span,a,li,h1,h2,h3,h4,h5,h6,button,label,dt,dd,figcaption,blockquote,td,th,summary,strong,em,small,div'

export const contrast: Rule = {
  id: 'contrast',
  title: 'Text contrast',
  rationale:
    'WCAG AA needs 4.5:1 for body text and 3:1 for large text, measured against the ' +
    'composited background — not the one declared on the same element. Translucent ' +
    'surfaces over a section colour are where this fails and where declared-colour ' +
    'checkers pass it.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const el of ctx.elements(TEXT_NODE_SELECTOR)) {
      const text = ownText(el)
      if (text.length < 3) continue

      const style = ctx.style(el)
      // Gradient-clipped text has no measurable colour; a naive read reports a
      // 1:1 failure on copy that is perfectly legible.
      if (isUnmeasurableText(style)) continue

      const fg = parseColor(style.color)
      if (!fg) continue

      const backdrop = effectiveBackground(el, (e) => ctx.style(e))
      const bg = backdrop.color
      const composited = fg.a < 1 ? flatten(fg, bg) : fg

      const ratio = contrastRatio(composited, bg)
      const fontSize = parseFloat(style.fontSize)
      const weight = Number(style.fontWeight) || 400
      const required = requiredRatio(fontSize, weight)

      if (ratio < required) {
        // A background image sits between this text and the colour measured, so
        // the number is a lower bound on confidence, not a verdict. Report it —
        // text on imagery is a real risk — but never as an error, and say why.
        const severity = backdrop.uncertain
          ? 'info'
          : ratio < required - 1
            ? 'error'
            : 'warning'

        out.push({
          rule: 'contrast',
          severity,
          message: backdrop.uncertain
            ? `Text sits on a background image; measured ${ratio.toFixed(2)}:1 against the colour behind it, which may not be what is painted. "${snippet(el, 24)}"`
            : `Contrast ${ratio.toFixed(2)}:1 — AA needs ${required}:1 at ${Math.round(fontSize)}px/${weight}. "${snippet(el, 28)}"`,
          hint: backdrop.uncertain
            ? 'Check this one by eye, or put a scrim between the text and the image so the contrast becomes a decision rather than a coincidence.'
            : ratio < 3
              ? 'Raise the text colour or put an opaque layer between the text and its backdrop.'
              : `Darken the text or lighten the surface; ${required}:1 is ${round(((required - ratio) / ratio) * 100, 0)}% more separation than you have.`,
          element: el,
          meta: {
            ratio: Number(ratio.toFixed(2)),
            required,
            fontSize: round(fontSize),
            weight,
            color: style.color,
            ...(backdrop.uncertain ? { backdrop: 'image' } : {}),
          },
        })
      }
    }

    return out
  },
}

/* ─────────────────────────────── clipped-text ────────────────────────────── */

export const clippedText: Rule = {
  id: 'clipped-text',
  title: 'Clipped text',
  rationale:
    'Content cut off by a fixed height or a hidden overflow is invisible with no ' +
    'indication that anything is missing. It appears when real copy meets a box ' +
    'sized against placeholder copy, which is every card a generator ever wrote.',
  run(ctx) {
    const out: RawFinding[] = []

    for (const el of ctx.elements(TEXT_BLOCK + ',div,span,td,th,dd,dt')) {
      const text = ownText(el)
      if (text.length < 8) continue

      const style = ctx.style(el)
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip'
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip'
      if (!clipsX && !clipsY) continue

      const ellipsis = style.textOverflow === 'ellipsis'
      const lineClamp = style.getPropertyValue('-webkit-line-clamp')
      const clamped = Boolean(lineClamp && lineClamp !== 'none')

      const overX = clipsX && el.scrollWidth > el.clientWidth + 1
      const overY = clipsY && el.scrollHeight > el.clientHeight + 1
      if (!overX && !overY) continue

      const hidden = overY ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
      const announced = ellipsis || clamped

      out.push({
        rule: 'clipped-text',
        severity: announced ? 'info' : 'error',
        message: `${Math.round(hidden)}px of text is cut off ${overY ? 'below' : 'past'} the box${
          announced ? ' (truncation is signposted)' : ' with no ellipsis or other signal'
        }. "${snippet(el, 24)}"`,
        hint: announced
          ? 'Intentional truncation — check the full value is reachable another way (a title attribute, a detail view).'
          : 'Let the box grow, wrap the text, or add text-overflow: ellipsis / line-clamp so the reader knows there is more.',
        element: el,
        meta: {
          hiddenPx: Math.round(hidden),
          axis: overY ? 'block' : 'inline',
          signposted: announced ? 1 : 0,
        },
      })
    }

    return out
  },
}

/* ──────────────────────────────── type-scale ─────────────────────────────── */

/** Two steps closer than this are not two steps. */
const MIN_STEP_RATIO = 1.1

export const typeScale: Rule = {
  id: 'type-scale',
  title: 'Indistinguishable type steps',
  rationale:
    'Hierarchy comes from a *visible* difference between levels. Two sizes 5% apart ' +
    'cost you a step in the scale and buy nothing — the reader cannot tell them ' +
    'apart, so the page has fewer levels than the code thinks it has.',
  run(ctx) {
    const users = new Map<number, { count: number; sample: Element }>()

    for (const el of ctx.elements(TEXT_BLOCK + ',span,a,button,label,strong,em,small')) {
      if (ownText(el).length < 2) continue
      const size = Math.round(parseFloat(ctx.style(el).fontSize) * 10) / 10
      if (!Number.isFinite(size) || size <= 0) continue
      const entry = users.get(size)
      if (entry) entry.count++
      else users.set(size, { count: 1, sample: el })
    }

    // A size used once is a one-off, which `repetition` already covers; a step
    // in the scale is something the page leans on.
    const sizes = [...users.entries()]
      .filter(([, entry]) => entry.count >= 2)
      .map(([size, entry]) => ({ size, ...entry }))
      .sort((a, b) => a.size - b.size)

    const out: RawFinding[] = []
    for (let i = 1; i < sizes.length; i++) {
      const smaller = sizes[i - 1]
      const larger = sizes[i]
      const ratio = larger.size / smaller.size
      if (ratio >= MIN_STEP_RATIO) continue

      out.push({
        rule: 'type-scale',
        severity: 'info',
        message: `${smaller.size}px and ${larger.size}px are ${Math.round((ratio - 1) * 100)}% apart — too close to read as different levels.`,
        hint: `Collapse them into one step, or open the gap to at least ${MIN_STEP_RATIO}× (${round(smaller.size * MIN_STEP_RATIO)}px).`,
        element: larger.sample,
        meta: {
          smaller: smaller.size,
          larger: larger.size,
          ratio: Number(ratio.toFixed(3)),
          usedBy: larger.count,
        },
      })
    }

    return out
  },
}
