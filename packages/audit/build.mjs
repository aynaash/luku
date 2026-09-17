import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

const shared = { bundle: true, format: 'esm', target: 'es2022', logLevel: 'info' }

// 1. The engine, as an IIFE we inject into a page. Zero deps by construction —
//    if this bundle ever pulls in a node builtin, the build fails here.
await build({
  ...shared,
  entryPoints: ['src/core/index.ts'],
  outfile: 'dist/core.global.js',
  format: 'iife',
  globalName: '__LUKU_AUDIT__',
  platform: 'browser',
  minify: true,
})

// 2. The same engine as an ESM library, for anyone driving their own browser.
await build({
  ...shared,
  entryPoints: ['src/core/index.ts'],
  outfile: 'dist/core.js',
  platform: 'browser',
})

// 3. The CLI. playwright-core stays external and is loaded lazily, so the
//    engine is usable without a browser dependency anywhere in the tree.
await build({
  ...shared,
  entryPoints: ['src/cli/index.ts'],
  outfile: 'dist/cli.js',
  platform: 'node',
  external: ['playwright-core', 'playwright'],
  banner: { js: '#!/usr/bin/env node' },
})

// 3b. The MCP server. Same engine, third shell, still no runtime dependency
//     beyond the browser driver — the JSON-RPC transport is ~150 lines.
await build({
  ...shared,
  entryPoints: ['src/mcp/index.ts'],
  outfile: 'dist/mcp.js',
  platform: 'node',
  external: ['playwright-core', 'playwright'],
  banner: { js: '#!/usr/bin/env node' },
})

// 4. Types for the engine, so anyone driving their own browser gets them.
//    Invoked through node directly rather than through `npx` + a shell, which
//    is both faster and free of the argument-escaping caveat.
await new Promise((resolveTypes, rejectTypes) => {
  const tsc = spawn(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--emitDeclarationOnly'], {
    stdio: 'inherit',
  })
  tsc.on('exit', (code) => (code === 0 ? resolveTypes(undefined) : rejectTypes(new Error('tsc failed'))))
})

// tsc mirrors the src tree; the package entry points at dist/core.d.ts.
await writeFile('dist/core.d.ts', "export * from './core/index.js'\n")

console.log('\nbuilt core.global.js · core.js · core.d.ts · cli.js · mcp.js')
