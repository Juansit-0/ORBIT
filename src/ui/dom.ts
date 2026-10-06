type Child = Node | string | null | undefined | false

interface ElementOptions {
  class?: string
  text?: string
  attrs?: Record<string, string | number | boolean | undefined>
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (options.class) node.className = options.class
  if (options.text !== undefined) node.textContent = options.text
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    if (value === undefined || value === false) continue
    node.setAttribute(name, value === true ? '' : String(value))
  }
  for (const [type, handler] of Object.entries(options.on ?? {})) {
    node.addEventListener(type, handler as EventListener)
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    node.append(child)
  }
  return node
}

export function setText(node: Element, value: string): void {
  if (node.textContent !== value) node.textContent = value
}

export function toggleAttr(node: Element, name: string, on: boolean): void {
  if (on) node.setAttribute(name, '')
  else node.removeAttribute(name)
}
