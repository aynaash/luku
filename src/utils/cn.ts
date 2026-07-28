/**
 * @module design/utils/cn
 *
 * Re-exported so the design folder has no import that points outward except
 * `react`, `clsx` and `tailwind-merge`. Drop the folder into another Next app
 * and it compiles unchanged.
 *
 * `twMerge` matters here: every primitive accepts `className`, and the merge is
 * what makes a caller's `max-w-3xl` actually beat the token's `max-w-5xl`
 * instead of losing to source order.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type { ClassValue }
