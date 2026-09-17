/**
 * @module cli/visual
 *
 * A self-contained HTML report: full-page screenshots with every finding drawn
 * on the actual render.
 *
 * WHY THIS EXISTS
 * `main > div > section:nth-of-type(4) > div:nth-of-type(2) > a` is precise and
 * unreadable. Nobody can hold nine levels of DOM in their head, and the whole
 * point of a composition tool is that the defects are *visual*. Boxing them on
 * the render turns every selector into "that thing, there".
 *
 * The file embeds its images, so it opens from disk with no server and can be
 * attached to a PR or handed to someone else.
 */
import type { PageFinding } from './driver.js'

export interface Shot {
  url: string
  width: number
  /** Full-page screenshot, base64 JPEG. */
  image: string
  /** Rendered document height, for scaling the overlay. */
  documentWidth: number
  documentHeight: number
}

const SEVERITY_COLOR: Record<string, string> = {
  error: '#e5484d',
  warning: '#f5a524',
  info: '#3b9eff',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildVisualReport(shots: Shot[], findings: PageFinding[], version: string): string {
  const panels = shots.map((shot, index) => {
    const mine = findings.filter((f) => f.url === shot.url && f.width === shot.width && f.box)

    const boxes = mine
      .flatMap((f, i) => {
        const all = [f.box!, ...(f.alsoBoxes ?? [])]
        return all.map(
          (b) =>
            `<div class="box ${f.severity}" data-f="${index}-${i}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>`,
        )
      })
      .join('')

    const rows = mine
      .map(
        (f, i) => `
      <li class="row ${f.severity}" data-f="${index}-${i}" tabindex="0">
        <div class="rowhead"><span class="dot"></span><code>${escapeHtml(f.rule)}</code>${
          f.occurrences && f.occurrences > 1 ? `<span class="count">×${f.occurrences}</span>` : ''
        }</div>
        <p class="msg">${escapeHtml(f.message)}</p>
        ${f.hint ? `<p class="hint">${escapeHtml(f.hint)}</p>` : ''}
        <code class="sel">${escapeHtml(f.selector)}</code>
      </li>`,
      )
      .join('')

    return `
    <section class="panel" data-panel="${index}">
      <header class="panelhead">
        <h2>${escapeHtml(shot.url)}</h2>
        <span class="w">${shot.width}px viewport · ${mine.length} finding${mine.length === 1 ? '' : 's'}</span>
      </header>
      <div class="split">
        <div class="stage">
          <div class="canvas" style="width:${shot.documentWidth}px;height:${shot.documentHeight}px">
            <img src="data:image/jpeg;base64,${shot.image}" width="${shot.documentWidth}" height="${shot.documentHeight}" alt="">
            ${boxes}
          </div>
        </div>
        <ol class="list">${rows || '<li class="empty">No findings at this width.</li>'}</ol>
      </div>
    </section>`
  })

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>luku-audit — visual report</title>
<style>
  :root { color-scheme: dark; --bg:#0d0d0f; --panel:#151518; --line:#26262b; --text:#e8e8ea; --muted:#8b8b93; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif; }
  header.top { padding:20px 24px; border-bottom:1px solid var(--line); display:flex;
               align-items:baseline; gap:12px; flex-wrap:wrap; }
  header.top h1 { margin:0; font-size:15px; font-weight:600; letter-spacing:-0.01em; }
  header.top .meta { color:var(--muted); font-size:12px; }
  .legend { margin-left:auto; display:flex; gap:14px; font-size:12px; color:var(--muted); }
  .legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; }

  .panel { border-bottom:1px solid var(--line); }
  .panelhead { padding:14px 24px; display:flex; align-items:baseline; gap:12px; }
  .panelhead h2 { margin:0; font-size:13px; font-weight:600; }
  .panelhead .w { color:var(--muted); font-size:12px; }

  .split { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:0; align-items:start; }
  @media (max-width:1000px) { .split { grid-template-columns:1fr; } }

  .stage { overflow:auto; max-height:82vh; background:#000; border-top:1px solid var(--line);
           border-right:1px solid var(--line); }
  .canvas { position:relative; transform-origin:0 0; }
  .canvas img { display:block; width:100%; height:auto; }

  .box { position:absolute; border:2px solid; border-radius:2px; pointer-events:none;
         transition:background-color .12s, box-shadow .12s; }
  .box.error   { border-color:#e5484d; background:rgba(229,72,77,.10); }
  .box.warning { border-color:#f5a524; background:rgba(245,165,36,.10); }
  .box.info    { border-color:#3b9eff; background:rgba(59,158,255,.08); }
  .box.on { background:rgba(255,255,255,.22); box-shadow:0 0 0 3px currentColor, 0 0 30px rgba(0,0,0,.8); z-index:5; }

  .list { list-style:none; margin:0; padding:0; max-height:82vh; overflow:auto;
          border-top:1px solid var(--line); }
  .row { padding:12px 18px; border-bottom:1px solid var(--line); cursor:pointer; outline:none; }
  .row:hover, .row:focus, .row.on { background:var(--panel); }
  .rowhead { display:flex; align-items:center; gap:8px; }
  .dot { width:8px; height:8px; border-radius:50%; flex:none; }
  .row.error .dot { background:#e5484d; } .row.warning .dot { background:#f5a524; }
  .row.info .dot { background:#3b9eff; }
  .rowhead code { font-size:11px; color:var(--muted); }
  .count { font-size:11px; color:var(--muted); background:#26262b; padding:1px 6px; border-radius:8px; }
  .msg { margin:6px 0 0; font-size:13px; }
  .hint { margin:5px 0 0; font-size:12px; color:var(--muted); }
  .sel { display:block; margin-top:7px; font-size:10.5px; color:#5c5c66; word-break:break-all; }
  .empty { padding:24px 18px; color:var(--muted); }
</style></head>
<body>
<header class="top">
  <h1>luku-audit</h1>
  <span class="meta">v${escapeHtml(version)} · ${findings.length} finding${findings.length === 1 ? '' : 's'} · click a finding to locate it</span>
  <span class="legend">
    <span><i style="background:#e5484d"></i>error</span>
    <span><i style="background:#f5a524"></i>warning</span>
    <span><i style="background:#3b9eff"></i>info</span>
  </span>
</header>
${panels.join('')}
<script>
  // Screenshots are captured at full document width; the stage is usually
  // narrower, so the overlay has to scale with the image rather than assume 1:1.
  function fit() {
    for (const canvas of document.querySelectorAll('.canvas')) {
      const img = canvas.querySelector('img')
      const natural = parseFloat(canvas.style.width)
      const scale = img.clientWidth / natural
      canvas.style.transform = 'scale(' + scale + ')'
      canvas.parentElement.style.height = (parseFloat(canvas.style.height) * scale) + 'px'
    }
  }
  addEventListener('resize', fit)
  addEventListener('load', fit)
  fit()

  const select = (key, scroll) => {
    for (const n of document.querySelectorAll('.on')) n.classList.remove('on')
    for (const n of document.querySelectorAll('[data-f="' + key + '"]')) n.classList.add('on')
    if (!scroll) return
    const box = document.querySelector('.box[data-f="' + key + '"]')
    if (box) box.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  for (const row of document.querySelectorAll('.row')) {
    const key = row.dataset.f
    row.addEventListener('mouseenter', () => select(key, false))
    row.addEventListener('click', () => select(key, true))
    row.addEventListener('focus', () => select(key, true))
  }
</script>
</body></html>`
}
