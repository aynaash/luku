# Changelog

## 0.1.0

First public release. Extracted from the ContextBytes web app, where it had been
running as an internal `design/` folder, with no changes to component behaviour.

- Layers: `tokens` `utils` `spacing` `layout` `typography` `composition` `patterns` `hooks` `devtools`
- `<DesignInspector />` — eleven rules over the rendered DOM, plus the Critique checklist
- ESM-only, one file per module, `'use client'` directives preserved
- Root and per-layer entry points (`luku`, `luku/layout`, `luku/patterns`, …)
- `luku/theme.css` ships defaults for the six CSS custom properties the components read
