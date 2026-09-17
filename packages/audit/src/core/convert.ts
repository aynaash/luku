/**
 * @module core/convert
 *
 * Modern CSS colour spaces → sRGB.
 *
 * WHY THIS FILE EXISTS
 * A contrast checker that only parses `rgb()` and hex is quietly broken on a
 * large and growing share of the web. Measured on tailwindcss.com: 2,644
 * computed colours serialise as `rgb()` and 2,335 as `lab()`, plus ~150
 * `oklab()`. Tailwind v4 ships an OKLCH palette and Chrome serialises those
 * into CIE spaces in `getComputedStyle`, so nearly half the colours on the page
 * fail to parse. When they fail, the background walk falls through to its white
 * default and white-on-dark text is reported as white-on-white — a contrast of
 * exactly 1.00:1, which is impossible for text anyone can see.
 *
 * All of this is defined maths from CSS Color 4. None of it is approximation.
 */

/** Linear-light sRGB → gamma-encoded 0–255. */
function encode(channel: number): number {
  const v = channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, v * 255))
}

/**
 * OKLab → linear sRGB (Björn Ottosson's matrices).
 * `L` is 0–1 here, not 0–100.
 */
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** D50 reference white, which is the white point CSS `lab()` is defined against. */
const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585]

/**
 * Combined XYZ(D50) → linear sRGB, with the Bradford adaptation to D65 already
 * folded in. Doing the adaptation separately is a common source of a visible
 * cast; CSS Color 4 publishes this matrix pre-multiplied for that reason.
 */
const XYZ_D50_TO_LINEAR_SRGB = [
  [3.1341359569958707, -1.6173863321612538, -0.4906619460083532],
  [-0.978795502912089, 1.9161404349229392, 0.03344273116131949],
  [0.07195537988411677, -0.2289768264158322, 1.4053851325009488],
]

/** CIE Lab → sRGB. `L` is 0–100. */
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const e = 216 / 24389
  const k = 24389 / 27

  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  const fx3 = fx * fx * fx
  const fz3 = fz * fz * fz

  const xr = fx3 > e ? fx3 : (116 * fx - 16) / k
  const yr = L > k * e ? Math.pow((L + 16) / 116, 3) : L / k
  const zr = fz3 > e ? fz3 : (116 * fz - 16) / k

  const xyz = [xr * D50[0], yr * D50[1], zr * D50[2]]

  return [
    encode(
      XYZ_D50_TO_LINEAR_SRGB[0][0] * xyz[0] +
        XYZ_D50_TO_LINEAR_SRGB[0][1] * xyz[1] +
        XYZ_D50_TO_LINEAR_SRGB[0][2] * xyz[2],
    ),
    encode(
      XYZ_D50_TO_LINEAR_SRGB[1][0] * xyz[0] +
        XYZ_D50_TO_LINEAR_SRGB[1][1] * xyz[1] +
        XYZ_D50_TO_LINEAR_SRGB[1][2] * xyz[2],
    ),
    encode(
      XYZ_D50_TO_LINEAR_SRGB[2][0] * xyz[0] +
        XYZ_D50_TO_LINEAR_SRGB[2][1] * xyz[1] +
        XYZ_D50_TO_LINEAR_SRGB[2][2] * xyz[2],
    ),
  ]
}

/** Polar form → rectangular, shared by `lch()` and `oklch()`. */
export function polarToRectangular(chroma: number, hueDeg: number): [number, number] {
  const h = (hueDeg * Math.PI) / 180
  return [chroma * Math.cos(h), chroma * Math.sin(h)]
}

/** Linear-light Display P3 → sRGB. */
export function displayP3ToRgb(r: number, g: number, b: number): [number, number, number] {
  // The channels arrive gamma-encoded with the sRGB transfer function.
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]

  return [
    encode(1.2249401762805282 * lr - 0.2249401762805282 * lg + 0 * lb),
    encode(-0.04205697621401507 * lr + 1.0420569762140153 * lg + 0 * lb),
    encode(-0.019637550216017316 * lr - 0.07863604199181935 * lg + 1.0982735922078367 * lb),
  ]
}

/** HSL → sRGB. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + hue / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255
  }
  return [f(0), f(8), f(4)]
}

/**
 * Splits a modern colour function's arguments.
 *
 * Handles the slash-separated alpha and the `none` keyword, which CSS Color 4
 * allows in any component and which means "missing" — zero, for our purposes.
 */
export function splitComponents(input: string): { parts: string[]; alpha: number } {
  const [body, alphaPart] = input.split('/')
  const parts = body.trim().split(/\s+/).filter(Boolean)
  const alpha = alphaPart === undefined ? 1 : parseComponent(alphaPart.trim(), 1)
  return { parts, alpha }
}

/** `50%` → `scale * 0.5`; `none` → 0; anything else → its number. */
export function parseComponent(value: string, scale = 1): number {
  if (!value || value === 'none') return 0
  if (value.endsWith('%')) return (parseFloat(value) / 100) * scale
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}
