export type Rgb = [number, number, number]

export interface CoverPalette {
  vivid: Rgb
  deep: Rgb
}

function toHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  return [hue, max === 0 ? 0 : delta / max, max]
}

export function dominantColors(data: ArrayLike<number>, bins = 12): CoverPalette {
  const weights = new Array<number>(bins).fill(0)
  const sums = Array.from({ length: bins }, () => [0, 0, 0])
  const deep = [0, 0, 0]
  let deepWeight = 0
  let fallback = [0, 0, 0]
  let count = 0
  for (let i = 0; i + 2 < data.length; i += 4) {
    const r = (data[i] ?? 0) / 255
    const g = (data[i + 1] ?? 0) / 255
    const b = (data[i + 2] ?? 0) / 255
    const alpha = data.length % 4 === 0 ? (data[i + 3] ?? 255) / 255 : 1
    if (alpha < 0.5) continue
    count += 1
    fallback = [fallback[0]! + r, fallback[1]! + g, fallback[2]! + b]
    const [hue, saturation, value] = toHsv(r, g, b)
    const vivid = saturation * value * saturation
    if (saturation > 0.2 && value > 0.25) {
      const bin = Math.min(bins - 1, Math.floor((hue / 360) * bins))
      weights[bin]! += vivid
      const sum = sums[bin]!
      sum[0]! += r * vivid
      sum[1]! += g * vivid
      sum[2]! += b * vivid
    }
    const darkness = (1 - value) * (0.4 + saturation)
    deep[0]! += r * darkness
    deep[1]! += g * darkness
    deep[2]! += b * darkness
    deepWeight += darkness
  }
  const average: Rgb = count > 0 ? [fallback[0]! / count, fallback[1]! / count, fallback[2]! / count] : [0.36, 0.66, 0.88]
  let best = -1
  for (let i = 0; i < bins; i++) if (best === -1 || weights[i]! > weights[best]!) best = i
  const bestWeight = best >= 0 ? weights[best]! : 0
  const vivid: Rgb =
    bestWeight > 0.0001
      ? [sums[best]![0]! / bestWeight, sums[best]![1]! / bestWeight, sums[best]![2]! / bestWeight]
      : average
  const deepColor: Rgb = deepWeight > 0 ? [deep[0]! / deepWeight, deep[1]! / deepWeight, deep[2]! / deepWeight] : average
  return { vivid, deep: deepColor }
}

export function blend(base: Rgb, tint: Rgb, amount: number, maxLightness = 0.82): Rgb {
  const mixed: Rgb = [
    base[0] + (tint[0] - base[0]) * amount,
    base[1] + (tint[1] - base[1]) * amount,
    base[2] + (tint[2] - base[2]) * amount,
  ]
  const lightness = 0.2126 * mixed[0] + 0.7152 * mixed[1] + 0.0722 * mixed[2]
  if (lightness <= maxLightness) return mixed
  const scale = maxLightness / lightness
  return [mixed[0] * scale, mixed[1] * scale, mixed[2] * scale]
}
