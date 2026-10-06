import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import { PlayerApp } from './app/PlayerApp.ts'
import { Playlist } from './core/Playlist.ts'
import { demoPlaylist } from './data/demoPlaylist.ts'
import { FakePlayer } from './player/FakePlayer.ts'
import { PlaybackController } from './player/PlaybackController.ts'
import type { PlayerAdapter } from './player/PlayerAdapter.ts'
import { PreviewPlayer } from './player/PreviewPlayer.ts'
import { YouTubePlayer } from './player/YouTubePlayer.ts'
import { resolveVideoId } from './services/resolveService.ts'
import { loadPlaylist } from './services/storage.ts'
import { mountToasts } from './ui/components/toast.ts'
import { el } from './ui/dom.ts'
import { Masthead } from './ui/Masthead.ts'
import { MobileTabs } from './ui/MobileTabs.ts'
import { NowPlaying } from './ui/NowPlaying.ts'
import { QueuePanel } from './ui/QueuePanel.ts'
import { SearchPanel } from './ui/SearchPanel.ts'

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

  const shell = el('div', { class: 'app' })
  const masthead = new Masthead(app)
  const search = new SearchPanel(app)
  const now = new NowPlaying(app, videoHost)
  const queue = new QueuePanel(app)
  const tabs = new MobileTabs(shell)

  shell.append(masthead.root, search.root, now.root, queue.root, tabs.root)
  root.append(shell)
  mountToasts(document.body)
}
