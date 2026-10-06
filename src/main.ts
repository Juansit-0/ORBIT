import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/dock.css'
import './styles/cinema.css'
import { PlayerApp } from './app/PlayerApp.ts'
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
import { YouTubePlayer } from './player/YouTubePlayer.ts'
import { resolveVideoIds } from './services/resolveService.ts'
import { mountScene } from './scene/mountScene.ts'
import { loadLibrary, loadPlaylist, loadPrefs, savePrefs } from './services/storage.ts'
import { mountToasts } from './ui/components/toast.ts'
import { el } from './ui/dom.ts'
import { icon } from './ui/icons.ts'
import { Masthead } from './ui/Masthead.ts'
import { MobileTabs } from './ui/MobileTabs.ts'
import { Monitor } from './ui/Monitor.ts'
import { NodeVisualizer } from './ui/NodeVisualizer.ts'
import { NowPlaying } from './ui/NowPlaying.ts'
import { QueuePanel } from './ui/QueuePanel.ts'
import { LeftRail } from './ui/LeftRail.ts'
import { LibraryMenu } from './ui/LibraryMenu.ts'
import { LyricsPanel } from './ui/LyricsPanel.ts'
import { SearchPanel } from './ui/SearchPanel.ts'
import { mountOrbitCursor } from './ui/OrbitCursor.ts'
import { CinemaMode } from './ui/CinemaMode.ts'
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
  const search = new SearchPanel(app)
  const lyrics = new LyricsPanel(app)
  const rail = new LeftRail(search.root, lyrics.root)
  const now = new NowPlaying(app)
  lyrics.onActiveLine((text) => now.setKaraoke(text))
  const liveChip = createLiveSoundChip(reactor)
  if (liveChip) now.tags.append(liveChip)
  const libraryMenu = new LibraryMenu(app)
  const queue = new QueuePanel(app, libraryMenu.button)
  const visualizer = new NodeVisualizer(app)
  const tabs = new MobileTabs(shell)
  const help = createShortcutHelp()
  const toggleLyrics = () => {
    if (rail.tab === 'lyrics' && rail.root.offsetParent !== null) {
      rail.show('search')
      return
    }
    tabs.show('search')
    rail.show('lyrics')
  }
  now.lyricsButton.addEventListener('click', toggleLyrics)
  rail.onChange((tab) => now.lyricsButton.setAttribute('aria-pressed', String(tab === 'lyrics')))
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
  })
  const cinemaButton = el('button', {
    class: 'icon-button',
    attrs: { type: 'button', 'aria-label': 'Player mode', title: 'Player mode (O)' },
  }, [icon('cinema')])
  cinemaButton.addEventListener('click', () => cinema.enter(true))
  cinema.onChange(() => now.resetHover())
  masthead.actions.append(cinemaButton, now.volumeControl, sleepMenu.button, settings.button, help.button)

  shell.append(masthead.root, rail.root, now.root, visualizer.root, queue.root, monitor.root, tabs.root)
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
  root.append(shell, help.panel, sleepMenu.panel, libraryMenu.panel, settings.panel)
  mountOrbitCursor()
  mountToasts(document.body)
  mountScene(now.stage, playback, (scene) => {
    now.onCoverReveal((shown) => scene.setCoverShown(shown))
    scene.setAudio(() => reactor.features())
  })
  bindShortcuts(
    app,
    {
      focusSearch: () => {
        tabs.show('search')
        rail.show('search')
        search.focus()
      },
      toggleLyrics,
      toggleCinema: () => cinema.toggle(),
      focusFilter: () => {
        tabs.show('queue')
        queue.focusFilter()
      },
    },
    help.panel,
  )
}
