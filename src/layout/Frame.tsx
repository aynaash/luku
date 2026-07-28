/**
 * @module design/layout/Frame
 *
 * PURPOSE
 * A fixed-proportion box for media, with an optional overlay scrim and content
 * anchored to a rule-of-thirds position.
 *
 * DESIGN PRINCIPLE
 * Fixed aspect ratios are what make a grid of mixed-source imagery read as one
 * system instead of a ransom note. The ratios offered are the ones with a reason
 * to exist: golden and 3:2 for editorial photography, 16:9 for video, 1:1 for
 * avatars and tiles, 21:9 for cinematic bands.
 *
 * WHY THE SCRIM IS BUILT IN
 * Text over an image is the most reliable way to ship a contrast failure — the
 * ratio depends on whichever pixels happen to sit behind the glyphs. A scrim
 * makes the effective background deterministic, which is the only way to make the
 * contrast a design decision rather than a coincidence.
 *
 * WHEN TO USE
 * Any image, video, or map that participates in a layout.
 *
 * WHEN NOT TO USE
 * For decorative background washes with no content — a plain div with a
 * background is lighter. And don't force a ratio onto content whose height is
 * driven by text; that's what clipping bugs are made of.
 *
 * RESPONSIVE BEHAVIOUR
 * The ratio holds at every width. For art direction that *changes* ratio across
 * breakpoints, render two Frames and toggle visibility — a single element cannot
 * animate between aspect ratios without layout shift.
 *
 * ACCESSIBILITY
 * Frame is a container, not an image: give the `<img>` inside it real alt text.
 * The scrim is `aria-hidden`. When overlaying text, keep the scrim strong enough
 * to hold 4.5:1 against the *lightest* region of the image, not the average.
 *
 * @example
 * <Frame ratio="cinema" scrim="heavy" anchor="bottomLeft">
 *   <img src="/reading-nook.png" alt="" className="h-full w-full object-cover" />
 *   <Quote>AI can summarize. Only you can understand.</Quote>
 * </Frame>
 */
import type { ReactNode } from 'react'
import { RADIUS, type Radius } from '../tokens/scale.js'
import { cn } from '../utils/cn.js'
import { THIRDS_POINTS, type ThirdsPoint } from '../utils/ratio.js'

export type FrameRatio = 'square' | 'photo' | 'golden' | 'video' | 'cinema' | 'portrait' | 'auto'
export type Scrim = 'none' | 'subtle' | 'medium' | 'heavy' | 'bottom' | 'edges'

const RATIO_CLASS: Record<FrameRatio, string> = {
  square: 'aspect-square',
  photo: 'aspect-[3/2]',
  golden: 'aspect-[1.618/1]',
  video: 'aspect-video',
  cinema: 'aspect-[21/9]',
  portrait: 'aspect-[4/5]',
  auto: '',
}

const SCRIM_CLASS: Record<Scrim, string> = {
  none: '',
  subtle: 'bg-black/20',
  medium: 'bg-black/40',
  heavy: 'bg-black/60',
  /** Gradient from the bottom — for captions sitting on the lower edge. */
  bottom: 'bg-gradient-to-t from-black/80 via-black/30 to-transparent',
  /** Fades into the page at top and bottom — for full-bleed cinematic bands. */
  edges:
    'bg-[linear-gradient(to_bottom,var(--background)_0%,transparent_18%,transparent_82%,var(--background)_100%)]',
}

export interface FrameProps {
  children: ReactNode
  ratio?: FrameRatio
  /** Darkening layer between the media and any overlaid content. */
  scrim?: Scrim
  radius?: Radius
  /**
   * Position overlaid content at a rule-of-thirds intersection instead of the
   * centre. Only affects children rendered via `overlay`.
   */
  anchor?: ThirdsPoint | 'center'
  /** Content drawn above the scrim. Media goes in `children`. */
  overlay?: ReactNode
  className?: string
}

export function Frame({
  children,
  ratio = 'photo',
  scrim = 'none',
  radius = 'md',
  anchor = 'center',
  overlay,
  className,
}: FrameProps) {
  const point = anchor === 'center' ? null : THIRDS_POINTS[anchor]

  return (
    <div
      data-design="frame"
      data-design-ratio={ratio}
      className={cn(
        'relative isolate overflow-hidden',
        RATIO_CLASS[ratio],
        RADIUS[radius],
        className,
      )}
    >
      <div className="absolute inset-0 [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>video]:h-full [&>video]:w-full [&>video]:object-cover">
        {children}
      </div>

      {scrim !== 'none' && (
        <div aria-hidden="true" className={cn('absolute inset-0 z-10', SCRIM_CLASS[scrim])} />
      )}

      {overlay && (
        <div
          data-design="frame-overlay"
          // Deliberately not `data-design-anchor` — that attribute means
          // "declared visual anchor" to the inspector, and a frame's overlay
          // position is a different concept entirely.
          data-design-anchor-point={anchor}
          className={cn(
            'absolute z-20 flex flex-col',
            point
              ? // Anchored to a thirds intersection: the element is sized by its
                // content and centred on the point.
                'max-w-[80%] -translate-x-1/2 -translate-y-1/2'
              : // Centred: fill the frame and centre within it. `max-w` here would
                // fight `inset-0` and pin the content to the left edge instead.
                'inset-0 items-center justify-center p-6 md:p-12',
          )}
          style={point ? { left: `${point.x}%`, top: `${point.y}%` } : undefined}
        >
          {overlay}
        </div>
      )}
    </div>
  )
}
