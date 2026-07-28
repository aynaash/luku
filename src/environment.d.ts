/**
 * The one Node-shaped global luku touches.
 *
 * Several components warn at development time — a second `emphasis="primary"`
 * in a group, a `Split` ratio that doesn't resolve — and every one of those
 * blocks is behind `process.env.NODE_ENV !== 'production'` so bundlers can drop
 * it. Declaring the shape here, rather than depending on `@types/node`, keeps
 * the published types free of Node's globals: this is a browser package, and a
 * consumer should not inherit `Buffer` and `__dirname` from importing it.
 *
 * Build-only. TypeScript never emits `.d.ts` inputs, so this file does not
 * reach `dist/` and cannot collide with a consumer's own `process` typings.
 */
declare var process: {
  env: {
    NODE_ENV?: string
    [key: string]: string | undefined
  }
}
