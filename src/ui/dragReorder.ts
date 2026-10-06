const DRAG_THRESHOLD = 4

export interface DragOptions {
  list: HTMLElement
  handleSelector: string
  itemSelector: string
  onDrop: (fromIndex: number, toIndex: number) => void
}

export function enableDragReorder(options: DragOptions): void {
  const { list, handleSelector, itemSelector, onDrop } = options

  list.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const handle = (event.target as Element).closest(handleSelector)
    const item = handle?.closest<HTMLElement>(itemSelector)
    if (!handle || !item) return
    const items = [...list.querySelectorAll<HTMLElement>(itemSelector)].filter((node) => !node.hidden)
    const fromIndex = items.indexOf(item)
    if (fromIndex === -1 || items.length < 2) return
    event.preventDefault()
    const pointerId = event.pointerId
    const startY = event.clientY
    const rects = items.map((node) => node.getBoundingClientRect())
    const itemRect = rects[fromIndex] as DOMRect
    const step = itemRect.height + (items.length > 1 ? Math.abs((rects[1] as DOMRect).top - (rects[0] as DOMRect).bottom) : 0)
    let dragging = false
    let toIndex = fromIndex
    try {
      ;(handle as HTMLElement).setPointerCapture(pointerId)
    } catch {
      void 0
    }

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const delta = moveEvent.clientY - startY
      if (!dragging && Math.abs(delta) < DRAG_THRESHOLD) return
      if (!dragging) {
        dragging = true
        list.dataset.dragging = 'true'
        item.dataset.dragged = 'true'
      }
      const minDelta = (rects[0] as DOMRect).top - itemRect.top
      const maxDelta = (rects[rects.length - 1] as DOMRect).top - itemRect.top
      const clamped = Math.min(maxDelta, Math.max(minDelta, delta))
      item.style.transform = `translateY(${clamped}px)`
      const center = itemRect.top + itemRect.height / 2 + clamped
      toIndex = rects.reduce(
        (count, rect, index) => (index !== fromIndex && center > rect.top + rect.height / 2 ? count + 1 : count),
        0,
      )
      items.forEach((node, index) => {
        if (node === item) return
        let shift = 0
        if (fromIndex < toIndex && index > fromIndex && index <= toIndex) shift = -step
        if (fromIndex > toIndex && index >= toIndex && index < fromIndex) shift = step
        node.style.transform = shift ? `translateY(${shift}px)` : ''
      })
    }

    const end = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      delete list.dataset.dragging
      delete item.dataset.dragged
      for (const node of items) node.style.transform = ''
      if (dragging && endEvent.type === 'pointerup' && toIndex !== fromIndex) {
        const realFrom = Number(item.dataset.position) - 1
        const target = items[toIndex]
        const realTo = target ? Number(target.dataset.position) - 1 : realFrom
        onDrop(realFrom, realTo)
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  })
}
