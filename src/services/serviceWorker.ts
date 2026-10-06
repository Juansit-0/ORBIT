export function registerServiceWorker(enabled: boolean): void {
  if (!enabled || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
