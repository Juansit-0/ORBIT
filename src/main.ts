import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/dock.css'
import './styles/cinema.css'
import { PlayerApp } from './app/PlayerApp.ts'
import { Radio } from './app/Radio.ts'
import { AudioReactor } from './audio/AudioReactor.ts'
import { Playlist } from './core/Playlist.ts'
import { PlaylistLibrary } from './core/PlaylistLibrary.ts'
import { demoPlaylist } from './data/demoPlaylist.ts'
import { FakePlayer } from './player/FakePlayer.ts'
import { PlaybackController } from './player/PlaybackController.ts'
import type { PlayerAdapter } from './player/PlayerAdapter.ts'
import { bindMediaSession } from './player/mediaSession.ts'
import { PreviewPlayer } from './player/PreviewPlayer.ts'
import { SleepTimer } from './player/SleepTimer.ts'
import { VolumeFader } from './player/VolumeFader.ts'
import { YouTubePlayer } from './player/YouTubePlayer.ts'
import { resolveVideoIds } from './services/resolveService.ts'
import { mountScene } from './scene/mountScene.ts'
import { lookupSongs } from './services/lookupService.ts'
import { decodePlan } from './services/planCodec.ts'
import { PlayHistory } from './services/history.ts'
import { loadLibrary, loadPlaylist, loadPrefs, savePrefs } from './services/storage.ts'
import { showToast } from './ui/components/toast.ts'
import { mountToasts } from './ui/components/toast.ts'
import { el } from './ui/dom.ts'
import { icon } from './ui/icons.ts'
import { Masthead } from './ui/Masthead.ts'
import { MobileTabs } from './ui/MobileTabs.ts'
import { Monitor } from './ui/Monitor.ts'
import { NodeVisualizer } from './ui/NodeVisualizer.ts'
import { NowPlaying } from './ui/NowPlaying.ts'
import { QueuePanel } from './ui/QueuePanel.ts'
import { LibraryMenu } from './ui/LibraryMenu.ts'
import { LyricsPanel } from './ui/LyricsPanel.ts'
import { MoreMenu } from './ui/MoreMenu.ts'
import { SearchPanel } from './ui/SearchPanel.ts'
import { mountOrbitCursor } from './ui/OrbitCursor.ts'
import { CinemaMode } from './ui/CinemaMode.ts'
import { CommandPalette } from './ui/CommandPalette.ts'
import { SettingsMenu } from './ui/SettingsMenu.ts'
import { SleepMenu } from './ui/SleepMenu.ts'
import { createLiveSoundChip } from './ui/LiveSoundChip.ts'
import { bindShortcuts, createShortcutHelp } from './ui/shortcuts.ts'

const root = document.querySelector<HTMLDivElement>('#app')

if (root) {
  const playlist = new Playlist()
  const savedLibrary = loadLibrary()
  if (!savedLibrary) {
    const saved = loadPlaylist()
    if (saved) playlist.restore(saved)
    else for (const song of demoPlaylist) playlist.addLast(song)
  }
  const library = new PlaylistLibrary(playlist, savedLibrary)

  const monitor = new Monitor()
  const fake = import.meta.env.VITE_PLAYER === 'fake'
  const fakePlayer = fake ? new FakePlayer() : null
  const full: PlayerAdapter = fakePlayer ?? new YouTubePlayer(monitor.host)
  const previewPlayer = fakePlayer ? null : new PreviewPlayer()
  const preview: PlayerAdapter = fakePlayer ?? (previewPlayer as PreviewPlayer)
  const playback = new PlaybackController(playlist, { full, preview, resolve: resolveVideoIds })
  const app = new PlayerApp(playlist, playback, library)
  const reactor = new AudioReactor(app, previewPlayer?.element ?? null)
  const prefs = loadPrefs()
  playback.setVolume(prefs.volume)
  const fader = new VolumeFader()
  playback.setFader(prefs.smoothVolume ? fader : null)
  document.documentElement.dataset.vinyl = String(prefs.vinyl)
  let savedVolume = playback.state.volume
  playback.subscribe((state) => {
    if (state.volume !== savedVolume) {
      savedVolume = state.volume
      savePrefs({ volume: state.volume })
    }
  })

  const shell = el('div', { class: 'app' })
  const masthead = new Masthead(app)
  const played = new PlayHistory()
  playback.subscribe((state) => {
    const song = state.song ?? (state.nodeId ? (playlist.current?.value ?? null) : null)
    played.observe({ song, playing: state.status === 'playing', currentMs: state.currentMs }, Date.now())
  })
  const search = new SearchPanel(app, played)
  const lyrics = new LyricsPanel(app)
  const now = new NowPlaying(app)
  now.mountLyrics(lyrics.root)
  lyrics.onActiveLine((text) => now.setKaraoke(text))
  const liveChip = createLiveSoundChip(reactor)
  if (liveChip) now.tags.append(liveChip)
  const libraryMenu = new LibraryMenu(app)
  const queue = new QueuePanel(app, libraryMenu.button)
  const visualizer = new NodeVisualizer(app)
  visualizer.setExplain(prefs.explain)
  let listShown = prefs.showList
  const applyList = (shown: boolean) => {
    listShown = shown
    document.documentElement.dataset.list = shown ? 'shown' : 'hidden'
    visualizer.setVisible(shown)
  }
  applyList(listShown)
  const tabs = new MobileTabs(shell)
  const help = createShortcutHelp()
  const toggleLyrics = () => {
    const shown = !(lyrics.shown && now.root.offsetParent !== null)
    tabs.show('now')
    lyrics.setShown(shown)
    now.lyricsButton.setAttribute('aria-pressed', String(shown))
  }
  now.lyricsButton.addEventListener('click', toggleLyrics)
  const sleep = new SleepTimer({
    now: () => Date.now(),
    setInterval: (callback, ms) => window.setInterval(callback, ms),
    clearInterval: (id) => window.clearInterval(id),
    getVolume: () => playback.state.volume,
    setVolume: (volume) => playback.setVolume(volume),
    pause: () => playback.pause(),
    stopAfterCurrent: (enabled) => playback.setStopAfterCurrent(enabled),
  })
  playback.onTrackEnd(() => sleep.songEnded())
  const sleepMenu = new SleepMenu(sleep)
  bindMediaSession(app)
  let radioEnabled = prefs.radio
  const radio = new Radio(app, () => radioEnabled)
  const radioChip = el('button', {
    class: 'chip deck__chip radio-chip',
    attrs: { type: 'button', hidden: true, 'aria-pressed': 'true', 'aria-label': 'Radio on. Stop radio', title: 'Stop radio' },
  }, [icon('wave'), el('span', { text: 'Radio' }), icon('close', 'icon radio-chip__stop')])
  radioChip.addEventListener('click', () => radio.stop())
  radio.onChange(() => (radioChip.hidden = !radio.active))
  now.tags.prepend(radioChip)
  let cinemaDelay = prefs.cinemaDelay
  let cinemaFullscreen = prefs.cinemaFullscreen
  const cinema = new CinemaMode(app, { delayMs: () => cinemaDelay, fullscreen: () => cinemaFullscreen })
  const settings = new SettingsMenu({
    vinyl: prefs.vinyl,
    onVinyl: (enabled) => {
      document.documentElement.dataset.vinyl = String(enabled)
      savePrefs({ vinyl: enabled })
    },
    cinemaDelay,
    onCinemaDelay: (delay) => {
      cinemaDelay = delay
      savePrefs({ cinemaDelay: delay })
    },
    cinemaFullscreen,
    onCinemaFullscreen: (enabled) => {
      cinemaFullscreen = enabled
      savePrefs({ cinemaFullscreen: enabled })
    },
    smoothVolume: prefs.smoothVolume,
    onSmoothVolume: (enabled) => {
      playback.setFader(enabled ? fader : null)
      savePrefs({ smoothVolume: enabled })
    },
    radio: radioEnabled,
    onRadio: (enabled) => {
      radioEnabled = enabled
      savePrefs({ radio: enabled })
      if (!enabled) radio.stop(false)
    },
    showList: listShown,
    onShowList: (enabled) => {
      applyList(enabled)
      savePrefs({ showList: enabled })
    },
    explain: prefs.explain,
    onExplain: (enabled) => {
      visualizer.setExplain(enabled)
      savePrefs({ explain: enabled })
    },
  })
  const cinemaButton = el('button', {
    class: 'icon-button',
    attrs: { type: 'button', 'aria-label': 'Player mode', title: 'Player mode (O)' },
  }, [icon('cinema')])
  cinemaButton.addEventListener('click', () => cinema.enter(true))
  cinema.onChange(() => now.resetHover())
  const more = new MoreMenu([
    { button: sleepMenu.button, label: 'Sleep timer', panel: sleepMenu.panel },
    { button: settings.button, label: 'Settings', panel: settings.panel },
    { button: help.button, label: 'Keyboard shortcuts', panel: help.panel },
  ])
  sleep.subscribe(() => more.setBadge(sleepMenu.badgeText))
  more.setBadge(sleepMenu.badgeText)
  masthead.actions.append(cinemaButton, now.volumeControl, more.button)

  shell.append(masthead.root, search.root, now.root, visualizer.root, queue.root, monitor.root, tabs.root)
  const compact = window.matchMedia('(max-width: 920px)')
  const placeMonitor = () => monitor.place(compact.matches ? now.lensRect() : null)
  playback.subscribe((state) => {
    monitor.setActive(state.source === 'full', state.song?.title ?? '')
    requestAnimationFrame(placeMonitor)
  })
  window.addEventListener('resize', placeMonitor)
  compact.addEventListener('change', placeMonitor)
  now.root.addEventListener('scroll', placeMonitor, { passive: true })
  new ResizeObserver(placeMonitor).observe(now.stage)
  const toggleList = () => {
    applyList(!listShown)
    settings.setShowList(listShown)
    savePrefs({ showList: listShown })
    showToast({ tone: 'info', title: listShown ? 'Linked list shown' : 'Linked list hidden', detail: listShown ? 'Press V to hide it again.' : 'Press V to show it again.' })
  }
  const palette = new CommandPalette(app, {
    toggleCinema: () => cinema.toggle(),
    toggleLyrics: () => toggleLyrics(),
    setSleep: (minutes) => sleep.set(minutes === null ? { kind: 'off' } : minutes === 'end' ? { kind: 'end-of-song' } : { kind: 'minutes', minutes }),
    focusSearch: () => {
      tabs.show('search')
      search.focus()
    },
    toggleList: () => toggleList(),
    listShown: () => listShown,
    recent: () => played.entries().map((entry) => entry.song),
  })
  root.append(shell, more.panel, help.panel, sleepMenu.panel, libraryMenu.panel, settings.panel, palette.dialog, queue.sheet.dialog)
  mountOrbitCursor()
  mountToasts(document.body)
  const sharedParam = new URLSearchParams(location.search).get('plan')
  if (sharedParam) {
    history.replaceState(null, '', location.pathname)
    const plan = decodePlan(sharedParam)
    if (!plan) {
      showToast({ tone: 'error', title: 'This share link is broken', detail: 'Ask for a new link.' })
    } else {
      lookupSongs(plan.ids)
        .then((songs) => {
          if (songs.length === 0) showToast({ tone: 'error', title: 'None of the shared songs were found' })
          else app.importPlaylist(plan.name, songs, 'link')
        })
        .catch(() => showToast({ tone: 'error', title: 'The shared playlist could not be loaded', detail: 'Check your connection and open the link again.' }))
    }
  }
  mountScene(now.stage, playback, (scene) => {
    now.onCoverReveal((shown) => scene.setCoverShown(shown))
    scene.setAudio(() => reactor.features())
  })
  bindShortcuts(
    app,
    {
      focusSearch: () => {
        tabs.show('search')
        search.focus()
      },
      toggleLyrics,
      toggleCinema: () => cinema.toggle(),
      togglePalette: () => palette.toggle(),
      toggleList: () => toggleList(),
      focusFilter: () => {
        tabs.show('queue')
        queue.focusFilter()
      },
    },
    help.panel,
  )
}
