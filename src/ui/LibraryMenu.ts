import type { PlayerApp } from '../app/PlayerApp.ts'
import { MAX_NAME_LENGTH, type LibraryEntry } from '../core/PlaylistLibrary.ts'
import { encodePlan, exportPlan, parseImport } from '../services/planCodec.ts'
import { showToast } from './components/toast.ts'
import { el, setText } from './dom.ts'
import { plural } from './format.ts'
import { icon } from './icons.ts'

const CONFIRM_MS = 3500

export class LibraryMenu {
  readonly button: HTMLButtonElement
  readonly panel: HTMLElement
  private readonly app: PlayerApp
  private readonly label: HTMLElement
  private readonly list: HTMLElement
  private readonly createInput: HTMLInputElement
  private readonly createError: HTMLElement
  private readonly linkField: HTMLInputElement
  private renaming: string | null = null
  private confirming: string | null = null
  private confirmTimer: number | undefined

  constructor(app: PlayerApp) {
    this.app = app
    this.label = el('span', { class: 'library__name' })
    this.button = el('button', {
      class: 'library__button',
      attrs: { type: 'button', popovertarget: 'library', 'aria-haspopup': 'dialog' },
    }, [this.label, icon('down', 'icon library__chevron')])
    this.list = el('ul', { class: 'library__list', attrs: { 'aria-label': 'Playlists' } })
    this.createInput = el('input', {
      class: 'library__input',
      attrs: { id: 'new-playlist', type: 'text', placeholder: 'New playlist name', maxlength: MAX_NAME_LENGTH + 10, autocomplete: 'off' },
    })
    this.createError = el('p', { class: 'library__error', attrs: { role: 'alert' } })
    const createForm = el('form', { class: 'library__create', attrs: { novalidate: true } }, [
      el('label', { class: 'visually-hidden', text: 'New playlist name', attrs: { for: 'new-playlist' } }),
      this.createInput,
      el('button', { class: 'button button--primary button--small', attrs: { type: 'submit' } }, [icon('plus'), el('span', { text: 'Create' })]),
      this.createError,
    ])
    this.linkField = el('input', { class: 'library__input library__link', attrs: { type: 'text', readonly: true, hidden: true, 'aria-label': 'Share link' } })
    const fileInput = el('input', { attrs: { type: 'file', accept: 'application/json,.json', hidden: true, 'aria-hidden': 'true', tabindex: -1 } })
    const tool = (glyph: Parameters<typeof icon>[0], label: string, run: () => void) => {
      const button = el('button', { class: 'chip library__tool', attrs: { type: 'button' } }, [icon(glyph), el('span', { text: label })])
      button.addEventListener('click', run)
      return button
    }
    const tools = el('div', { class: 'library__tools' }, [
      tool('share', 'Share link', () => void this.share()),
      tool('download', 'Export', () => this.exportFile()),
      tool('upload', 'Import', () => fileInput.click()),
      fileInput,
      this.linkField,
    ])
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      fileInput.value = ''
      if (file) void this.importFile(file)
    })
    this.panel = el('div', { class: 'library', attrs: { id: 'library', popover: 'auto', role: 'dialog', 'aria-labelledby': 'library-title' } }, [
      el('p', { class: 'library__title', text: 'Playlists', attrs: { id: 'library-title' } }),
      this.list,
      createForm,
      tools,
    ])
    createForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const result = this.app.createPlaylist(this.createInput.value)
      if (result.ok) {
        this.createInput.value = ''
        this.setError(this.createInput, this.createError, '')
        this.panel.hidePopover()
        this.button.focus()
      } else {
        this.setError(this.createInput, this.createError, result.error)
      }
    })
    this.createInput.addEventListener('input', () => this.setError(this.createInput, this.createError, ''))
    this.panel.addEventListener('toggle', (event) => {
      if ((event as ToggleEvent).newState === 'open') {
        this.renaming = null
        this.confirming = null
        this.render()
        this.list.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
      }
    })
    app.library.subscribe(() => this.render())
    app.playlist.subscribe(() => this.renderButton())
    this.render()
  }

  private async share(): Promise<void> {
    const songs = this.app.playlist.list.toArray()
    if (songs.length === 0) {
      showToast({ tone: 'info', title: 'Nothing to share yet', detail: 'Add songs to this playlist first.' })
      return
    }
    const url = `${location.origin}${location.pathname}?plan=${encodePlan(this.app.library.active.name, songs)}`
    try {
      await navigator.clipboard.writeText(url)
      this.linkField.hidden = true
      showToast({ tone: 'success', title: 'Share link copied', detail: `Anyone who opens it gets \u201c${this.app.library.active.name}\u201d with ${songs.length} songs.` })
    } catch {
      this.linkField.value = url
      this.linkField.hidden = false
      this.linkField.focus()
      this.linkField.select()
      showToast({ tone: 'info', title: 'Copy the link from the playlist menu', detail: 'The browser did not allow copying it automatically.' })
    }
  }

  private exportFile(): void {
    const name = this.app.library.active.name
    const blob = new Blob([exportPlan(name, this.app.playlist.list.toArray())], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `orbit-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'playlist'}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    showToast({ tone: 'success', title: `Exported \u201c${name}\u201d`, detail: link.download })
  }

  private async importFile(file: File): Promise<void> {
    if (file.size > 2_000_000) {
      showToast({ tone: 'error', title: 'That file is too large', detail: 'Orbit playlists are small JSON files.' })
      return
    }
    const plan = parseImport(await file.text())
    if (!plan) {
      showToast({ tone: 'error', title: 'This is not an Orbit playlist', detail: 'Choose a file exported from Orbit.' })
      return
    }
    this.app.importPlaylist(plan.name, plan.songs, 'file')
    this.panel.hidePopover()
  }

  private setError(input: HTMLInputElement, output: HTMLElement, message: string): void {
    setText(output, message)
    if (message) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
  }

  private renderButton(): void {
    const active = this.app.library.active
    setText(this.label, active.name)
    this.button.setAttribute('aria-label', `Playlist: ${active.name}. Change playlist`)
  }

  private render(): void {
    this.renderButton()
    const entries = this.app.library.list()
    this.list.replaceChildren(...entries.map((entry) => this.renderEntry(entry, entries.length)))
  }

  private renderEntry(entry: LibraryEntry, total: number): HTMLElement {
    const active = entry.id === this.app.library.activeId
    const count = active ? this.app.playlist.size : entry.snapshot.songs.length
    if (this.renaming === entry.id) return this.renderRename(entry)
    const pick = el('button', {
      class: 'library__pick',
      attrs: { type: 'button', role: 'menuitemradio', 'aria-checked': String(active) },
    }, [
      el('span', { class: 'library__dot', attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'library__entry-name', text: entry.name }),
      el('span', { class: 'library__count', text: plural(count, 'song') }),
    ])
    pick.addEventListener('click', () => {
      this.app.switchPlaylist(entry.id)
      this.panel.hidePopover()
      this.button.focus()
    })
    const rename = el('button', {
      class: 'icon-button icon-button--small',
      attrs: { type: 'button', 'aria-label': `Rename ${entry.name}`, title: 'Rename' },
    }, [icon('pencil')])
    rename.addEventListener('click', () => {
      this.renaming = entry.id
      this.render()
    })
    const confirming = this.confirming === entry.id
    const remove = el('button', {
      class: `icon-button icon-button--small icon-button--danger library__delete${confirming ? ' library__delete--confirm' : ''}`,
      attrs: {
        type: 'button',
        'aria-label': confirming ? `Confirm delete ${entry.name}` : `Delete ${entry.name}`,
        title: total === 1 ? 'Keep at least one playlist' : confirming ? 'Click again to delete' : 'Delete',
        disabled: total === 1,
      },
    }, confirming ? [el('span', { text: 'Delete?' })] : [icon('trash')])
    remove.addEventListener('click', () => {
      if (!confirming) {
        this.confirming = entry.id
        window.clearTimeout(this.confirmTimer)
        this.confirmTimer = window.setTimeout(() => {
          this.confirming = null
          this.render()
        }, CONFIRM_MS)
        this.render()
        this.list.querySelector<HTMLElement>('.library__delete--confirm')?.focus()
        return
      }
      window.clearTimeout(this.confirmTimer)
      this.confirming = null
      this.app.deletePlaylist(entry.id)
    })
    return el('li', { class: 'library__entry', attrs: { 'data-active': String(active) } }, [pick, rename, remove])
  }

  private renderRename(entry: LibraryEntry): HTMLElement {
    const input = el('input', {
      class: 'library__input',
      attrs: { type: 'text', value: entry.name, 'aria-label': `New name for ${entry.name}`, maxlength: MAX_NAME_LENGTH + 10 },
    })
    const error = el('p', { class: 'library__error', attrs: { role: 'alert' } })
    const form = el('form', { class: 'library__rename', attrs: { novalidate: true } }, [
      input,
      el('button', { class: 'button button--primary button--small', text: 'Save', attrs: { type: 'submit' } }),
      el('button', { class: 'button button--quiet button--small', text: 'Cancel', attrs: { type: 'button' } }),
      error,
    ])
    const close = () => {
      this.renaming = null
      this.render()
      this.list.querySelector<HTMLElement>(`[aria-label="Rename ${CSS.escape(this.app.library.list().find((e) => e.id === entry.id)?.name ?? '')}"]`)?.focus()
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const result = this.app.renamePlaylist(entry.id, input.value)
      if (result.ok) close()
      else this.setError(input, error, result.error)
    })
    form.querySelector('button[type="button"]')?.addEventListener('click', close)
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    })
    input.addEventListener('input', () => this.setError(input, error, ''))
    requestAnimationFrame(() => {
      input.focus()
      input.select()
    })
    return el('li', { class: 'library__entry library__entry--editing' }, [form])
  }
}
