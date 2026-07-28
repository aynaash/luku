/**
 * @module design/utils/polymorphic
 *
 * PURPOSE
 * Types for the `as` prop, so a layout primitive can render the semantically
 * correct element without the library guessing.
 *
 * WHY THIS MATTERS FOR A COMPOSITION ENGINE
 * Layout and semantics are orthogonal. `<Stack>` is a visual rhythm decision;
 * whether it's a `<ul>`, a `<section>` or a `<div>` is an accessibility decision.
 * Coupling them would force callers to abandon the primitive the moment they need
 * a list — which is exactly when they most need consistent rhythm.
 */
import type { ElementType, ComponentPropsWithoutRef, ReactNode } from 'react'

export type AsProp<T extends ElementType> = { as?: T }

/** Props of `T` minus anything the primitive itself owns. */
export type PolymorphicProps<T extends ElementType, Own> = Own &
  AsProp<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof Own | 'as'>

export interface BaseProps {
  children?: ReactNode
  className?: string
}
