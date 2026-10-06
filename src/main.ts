import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/dock.css'
import { PlayerApp } from './app/PlayerApp.ts'
import { Playlist } from './core/Playlist.ts'
import { demoPlaylist } from './data/demoPlaylist.ts'
import { FakePlayer } from './player/FakePlayer.ts'
import { PlaybackController } from './player/PlaybackController.ts'
import type { PlayerAdapter } from './player/PlayerAdapter.ts'
import { bindMediaSession } from './player/mediaSession.ts'
import { PreviewPlayer } from './player/PreviewPlayer.ts'
import { SleepTimer } from './player/SleepTimer.ts'
import { YouTubePlayer } from './player/YouTubePlayer.ts'
import { resolveVideoId } from './services/resolveService.ts'
import { mountScene } from './scene/mountScene.ts'
import { loadPlaylist, loadPrefs, savePrefs } from './services/storage.ts'
import { mountToasts } from './ui/components/toast.ts'
import { el } from './ui/dom.ts'
import { Masthead } from './ui/Masthead.ts'
import { MobileTabs } from './ui/MobileTabs.ts'
import { NodeVisualizer } from './ui/NodeVisualizer.ts'
import { NowPlaying } from './ui/NowPlaying.ts'
import { QueuePanel } from './ui/QueuePanel.ts'
import { LeftRail } from './ui/LeftRail.ts'
import { LyricsPanel } from './ui/LyricsPanel.ts'
import { SearchPanel } from './ui/SearchPanel.ts'
import { SleepMenu } from './ui/SleepMenu.ts'
import { bindShortcuts, createShortcutHelp } from './ui/shortcuts.ts'

const root = document.querySelector<HTMLDivElement>('#app')

if (root) {
  const playlist = new Playlist()
  const saved = loadPlaylist()
  if (saved) playlist.restore(saved)
  else for (const song of demoPlaylist) playlist.addLast(song)

  const videoHost = el('div')
  const fake = import.meta.env.VITE_PLAYER === 'fake'
  const fakePlayer = fake ? new FakePlayer() : null
  const full: PlayerAdapter = fakePlayer ?? new YouTubePlayer(videoHost)
  const preview: PlayerAdapter = fakePlayer ?? new PreviewPlayer()
  const playback = new PlaybackController(playlist, { full, preview, resolve: resolveVideoId })
  const app = new PlayerApp(playlist, playback)
  playback.setVolume(loadPrefs().volume)
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
  const now = new NowPlaying(app, videoHost)
  const queue = new QueuePanel(app)
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
  masthead.actions.append(now.volumeControl, sleepMenu.button, help.button)

  shell.append(masthead.root, rail.root, now.root, visualizer.root, queue.root, tabs.root)
  root.append(shell, help.panel, sleepMenu.panel)
  mountToasts(document.body)
  mountScene(now.stage, playlist, playback)
  bindShortcuts(
    app,
    {
      focusSearch: () => {
        tabs.show('search')
        rail.show('search')
        search.focus()
      },
      toggleLyrics,
      focusFilter: () => {
        tabs.show('queue')
        queue.focusFilter()
      },
    },
    help.panel,
  )
}
