import { el } from '../dom.ts'
import { icon, type IconName } from '../icons.ts'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastOptions {
  tone?: ToastTone
  title: string
  detail?: string
  duration?: number
  action?: ToastAction
}

const TONE_ICON: Record<ToastTone, IconName> = { success: 'check', error: 'alert', info: 'info' }
const MAX_TOASTS = 4

let region: HTMLElement | null = null

export function mountToasts(host: HTMLElement): void {
  region = el('div', { class: 'toasts', attrs: { 'aria-live': 'polite', 'aria-relevant': 'additions' } })
  host.append(region)
}

function dismiss(toast: HTMLElement): void {
  if (!toast.isConnected || toast.dataset.leaving) return
  toast.dataset.leaving = 'true'
  toast.addEventListener('animationend', () => toast.remove(), { once: true })
  window.setTimeout(() => toast.remove(), 400)
}

export function showToast(options: ToastOptions): void {
  if (!region) return
  const tone = options.tone ?? 'info'
  const close = el('button', {
    class: 'toast__close',
    attrs: { type: 'button', 'aria-label': 'Dismiss notification' },
  }, [icon('close')])
  const action = options.action
    ? el('button', { class: 'toast__action', text: options.action.label, attrs: { type: 'button' } })
    : null
  const toast = el('div', { class: `toast toast--${tone}`, attrs: { role: tone === 'error' ? 'alert' : 'status' } }, [
    el('span', { class: 'toast__icon' }, [icon(TONE_ICON[tone])]),
    el('div', { class: 'toast__body' }, [
      el('p', { class: 'toast__title', text: options.title }),
      options.detail ? el('p', { class: 'toast__detail', text: options.detail }) : null,
      action,
    ]),
    close,
  ])
  action?.addEventListener('click', () => {
    options.action?.run()
    dismiss(toast)
  })
  close.addEventListener('click', () => dismiss(toast))
  region.append(toast)
  const toasts = region.querySelectorAll<HTMLElement>('.toast:not([data-leaving])')
  if (toasts.length > MAX_TOASTS) dismiss(toasts[0] as HTMLElement)
  let timer = window.setTimeout(() => dismiss(toast), options.duration ?? (tone === 'error' || action ? 6000 : 3800))
  toast.addEventListener('pointerenter', () => window.clearTimeout(timer))
  toast.addEventListener('pointerleave', () => {
    timer = window.setTimeout(() => dismiss(toast), 2000)
  })
}
