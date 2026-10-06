import type { Song } from '../core/types.ts'

export const SONG_MIME = 'application/x-orbit-song'

export interface DropOptions {
  zone: HTMLElement
  items: () => HTMLElement[]
  axis: 'x' | 'y'
  onDrop: (index: number, song: Song) => void
}

export function dropIndex(centers: number[], pointer: number): number {
  let index = 0
  for (const center of centers) if (pointer > center) index += 1
  return index
}

function readSong(data: DataTransfer | null): Song | null {
  try {
    const raw = data?.getData(SONG_MIME)
    if (!raw) return null
    const song = JSON.parse(raw) as Song
    return typeof song.id === 'string' && typeof song.title === 'string' ? song : null
  } catch {
    return null
  }
}

export function startSongDrag(event: DragEvent, song: Song, image: HTMLElement | null): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(SONG_MIME, JSON.stringify(song))
  event.dataTransfer.setData('text/plain', `${song.title} — ${song.artist}`)
  event.dataTransfer.effectAllowed = 'copy'
  if (image) event.dataTransfer.setDragImage(image, 24, 24)
  document.documentElement.dataset.dragging = 'song'
}

export function endSongDrag(): void {
  delete document.documentElement.dataset.dragging
}

export function enableDropInsert(options: DropOptions): void {
  const { zone, items, axis, onDrop } = options
  const marker = document.createElement('div')
  marker.className = `drop-marker drop-marker--${axis}`
  marker.setAttribute('aria-hidden', 'true')
  let index = -1

  const hide = () => {
    marker.remove()
    zone.removeAttribute('data-drop-active')
    index = -1
  }

  zone.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes(SONG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    const visible = items().filter((item) => !item.hidden && item.isConnected)
    const rects = visible.map((item) => item.getBoundingClientRect())
    const pointer = axis === 'y' ? event.clientY : event.clientX
    index = dropIndex(rects.map((rect) => (axis === 'y' ? rect.top + rect.height / 2 : rect.left + rect.width / 2)), pointer)
    const host = zone.getBoundingClientRect()
    let position: number
    if (rects.length === 0) position = axis === 'y' ? 8 : 8
    else if (index >= rects.length) {
      const last = rects[rects.length - 1] as DOMRect
      position = axis === 'y' ? last.bottom - host.top + 1 : last.right - host.left + 4
    } else {
      const next = rects[index] as DOMRect
      position = axis === 'y' ? next.top - host.top - 1 : next.left - host.left - 4
    }
    marker.style.setProperty('--at', `${position + (axis === 'y' ? zone.scrollTop : zone.scrollLeft)}px`)
    if (!marker.isConnected) zone.append(marker)
    zone.dataset.dropActive = 'true'
  })

  zone.addEventListener('dragleave', (event) => {
    if (event.relatedTarget instanceof Node && zone.contains(event.relatedTarget)) return
    hide()
  })

  zone.addEventListener('drop', (event) => {
    const song = readSong(event.dataTransfer)
    const at = index
    hide()
    endSongDrag()
    if (!song || at < 0) return
    event.preventDefault()
    onDrop(at, song)
  })
}
