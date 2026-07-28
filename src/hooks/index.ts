/**
 * @module design/hooks
 *
 * The context-reading hooks (`useHierarchy`, `useEmphasisScope`, `useAnchorRegion`)
 * live beside the providers that own them in `design/composition` and are
 * re-exported from there — duplicating them here would make the root barrel's
 * star exports ambiguous, and TypeScript resolves that by silently dropping the
 * symbol.
 */
export { useElementSize, type ElementSize } from './useElementSize.js'
export {
  useBreakpoint,
  useMediaQuery,
  useReducedMotion,
  BREAKPOINTS,
  type BreakpointName,
} from './useBreakpoint.js'
export { useMeasureCheck, type MeasureReport } from './useMeasureCheck.js'
