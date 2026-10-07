const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'

const PATHS = {
  play: '<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10.1-6.4a.8.8 0 0 0 0-1.4L9.2 4.9A.8.8 0 0 0 8 5.6Z" fill="currentColor"/>',
  pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor"/>',
  next: `<path d="M5.5 6.3v11.4a.7.7 0 0 0 1.1.6l8.2-5.7a.7.7 0 0 0 0-1.2L6.6 5.7a.7.7 0 0 0-1.1.6Z" fill="currentColor"/><path ${STROKE} d="M18.5 5.5v13"/>`,
  previous: `<path d="M18.5 6.3v11.4a.7.7 0 0 1-1.1.6l-8.2-5.7a.7.7 0 0 1 0-1.2l8.2-5.7a.7.7 0 0 1 1.1.6Z" fill="currentColor"/><path ${STROKE} d="M5.5 5.5v13"/>`,
  shuffle: `<path ${STROKE} d="M3.5 7h2.8c1.9 0 3 .8 4 2.3l3.4 5.4c1 1.5 2.1 2.3 4 2.3h2.8M3.5 17h2.8c1.3 0 2.2-.4 3-1.2M14.7 8.2c.8-.8 1.7-1.2 3-1.2h2.8M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>`,
  repeat: `<path ${STROKE} d="M4 11.5V10a3 3 0 0 1 3-3h13M17 4l3 3-3 3M20 12.5V14a3 3 0 0 1-3 3H4M7 20l-3-3 3-3"/>`,
  repeatOne: `<path ${STROKE} d="M4 11.5V10a3 3 0 0 1 3-3h13M17 4l3 3-3 3M20 12.5V14a3 3 0 0 1-3 3H4M7 20l-3-3 3-3M11.2 10.6l1.3-.9v4.6"/>`,
  search: `<circle ${STROKE} cx="10.8" cy="10.8" r="6.3"/><path ${STROKE} d="m15.5 15.5 4.5 4.5"/>`,
  close: `<path ${STROKE} d="M6 6l12 12M18 6 6 18"/>`,
  trash: `<path ${STROKE} d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10.2 11v5.5M13.8 11v5.5"/>`,
  toFirst: `<path ${STROKE} d="M5 4.5h14M12 20V9M7.5 13 12 8.5l4.5 4.5"/>`,
  toLast: `<path ${STROKE} d="M5 19.5h14M12 4v11M7.5 11l4.5 4.5 4.5-4.5"/>`,
  insert: `<path ${STROKE} d="M4 5.5h16M4 18.5h16M4 12h10M11 8.5l3.5 3.5-3.5 3.5M18 12h2"/>`,
  up: `<path ${STROKE} d="m6.5 14.5 5.5-5.5 5.5 5.5"/>`,
  down: `<path ${STROKE} d="m6.5 9.5 5.5 5.5 5.5-5.5"/>`,
  grip: '<g fill="currentColor"><circle cx="9" cy="6.5" r="1.4"/><circle cx="15" cy="6.5" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="17.5" r="1.4"/><circle cx="15" cy="17.5" r="1.4"/></g>',
  volume: `<path ${STROKE} d="M4 9.5h3.2L12 5.5v13l-4.8-4H4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5ZM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>`,
  mute: `<path ${STROKE} d="M4 9.5h3.2L12 5.5v13l-4.8-4H4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5ZM16 9.5l5 5M21 9.5l-5 5"/>`,
  keyboard: `<rect ${STROKE} x="2.5" y="6" width="19" height="12" rx="2.5"/><path ${STROKE} d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>`,
  check: `<path ${STROKE} d="m5 12.5 4.5 4.5L19 7.5"/>`,
  alert: `<path ${STROKE} d="M12 8.5v4.5M12 16.4h.01M10.3 4.2 2.9 17.4A2 2 0 0 0 4.6 20.4h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/>`,
  info: `<circle ${STROKE} cx="12" cy="12" r="8.5"/><path ${STROKE} d="M12 11v5M12 8h.01"/>`,
  orbit: `<circle ${STROKE} cx="12" cy="12" r="3.2"/><ellipse ${STROKE} cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-24 12 12)"/>`,
  undo: `<path ${STROKE} d="M9 14.5 4.5 10 9 5.5M4.5 10h10a5 5 0 0 1 0 10H11"/>`,
  redo: `<path ${STROKE} d="m15 14.5 4.5-4.5L15 5.5M19.5 10h-10a5 5 0 0 0 0 10H13"/>`,
  lyrics: `<path ${STROKE} d="M4 6h12M4 10h16M4 14h9M4 18h12M18 14.5v5.2M18 19.7a1.8 1.8 0 1 1-1.8-1.8H18"/>`,
  moon: `<path ${STROKE} d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z"/>`,
  pencil: `<path ${STROKE} d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10v4ZM13.5 6.5l4 4"/>`,
  plus: `<path ${STROKE} d="M12 5v14M5 12h14"/>`,
  settings: `<circle ${STROKE} cx="12" cy="12" r="3"/><path ${STROKE} d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>`,
  wave: `<path ${STROKE} d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>`,
  playSmall: '<path d="M8.5 6.2v11.6a.7.7 0 0 0 1.07.6l9.1-5.8a.7.7 0 0 0 0-1.2l-9.1-5.8a.7.7 0 0 0-1.07.6Z" fill="currentColor"/>',
  cinema: `<path ${STROKE} d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/><circle ${STROKE} cx="12" cy="12" r="2.6"/>`,
  next2: `<path ${STROKE} d="M4 7h9M4 12h6M4 17h9M15 9l4 3-4 3"/>`,
  share: `<path ${STROKE} d="M8.6 13.4 15.4 17M15.4 7 8.6 10.6M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>`,
  download: `<path ${STROKE} d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>`,
  upload: `<path ${STROKE} d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>`,
  dj: `<circle ${STROKE} cx="10" cy="12" r="6.5"/><circle cx="10" cy="12" r="1.6" fill="currentColor"/><path ${STROKE} d="M18.5 4.5v9.2l-2.6 2.6"/>`,
  more: '<circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/>',
  music: `<path ${STROKE} d="M9 18.5V6.2l10-2v12.3M9 18.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9 10l10-2"/>`,
} as const

export type IconName = keyof typeof PATHS

export function icon(name: IconName, className = 'icon'): SVGSVGElement {
  const template = document.createElement('template')
  template.innerHTML = `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`
  return template.content.firstElementChild as SVGSVGElement
}
