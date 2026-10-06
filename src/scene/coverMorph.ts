import { dominantColors, type CoverPalette } from './palette.ts'

export interface CoverSample {
  grid: number
  colors: Float32Array
  palette: CoverPalette
}

export interface MorphTargets {
  positions: Float32Array
  colors: Float32Array
}

export function buildTargets(count: number, sample: { grid: number; colors: ArrayLike<number> }): MorphTargets {
  const positions = new Float32Array(count * 2)
  const colors = new Float32Array(count * 3)
  const { grid } = sample
  const cells = grid * grid
  const step = 2 / grid
  for (let i = 0; i < count; i++) {
    const cell = Math.floor((i * cells) / Math.max(1, count)) % cells
    const x = cell % grid
    const y = Math.floor(cell / grid)
    const jitter = ((i * 7919) % 97) / 97
    positions[i * 2] = -1 + (x + 0.25 + jitter * 0.5) * step
    positions[i * 2 + 1] = 1 - (y + 0.25 + (1 - jitter) * 0.5) * step
    colors[i * 3] = sample.colors[cell * 3] ?? 0
    colors[i * 3 + 1] = sample.colors[cell * 3 + 1] ?? 0
    colors[i * 3 + 2] = sample.colors[cell * 3 + 2] ?? 0
  }
  return { positions, colors }
}

export function sampleCover(url: string, grid = 96): Promise<CoverSample> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = grid
        canvas.height = grid
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('No 2d context')
        context.drawImage(image, 0, 0, grid, grid)
        const data = context.getImageData(0, 0, grid, grid).data
        const colors = new Float32Array(grid * grid * 3)
        for (let i = 0; i < grid * grid; i++) {
          colors[i * 3] = (data[i * 4] ?? 0) / 255
          colors[i * 3 + 1] = (data[i * 4 + 1] ?? 0) / 255
          colors[i * 3 + 2] = (data[i * 4 + 2] ?? 0) / 255
        }
        resolve({ grid, colors, palette: dominantColors(data) })
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Cover could not be read'))
      }
    }
    image.onerror = () => reject(new Error('Cover failed to load'))
    image.src = url.replace(/\/\d+x\d+bb\./, '/200x200bb.')
  })
}
