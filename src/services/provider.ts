export type Provider = 'youtube' | 'youtubeMusic' | 'spotify'
export type ServiceId = Provider | 'apple' | 'deezer'
export type ServiceStatus = 'ready' | 'setup' | 'soon'

export interface Service {
  id: ServiceId
  name: string
  line: string
  status: ServiceStatus
  note: string
}

export const PROVIDER_NAMES: Record<Provider, string> = {
  youtube: 'YouTube',
  youtubeMusic: 'YouTube Music',
  spotify: 'Spotify',
}

export function isProvider(value: unknown): value is Provider {
  return value === 'youtube' || value === 'youtubeMusic' || value === 'spotify'
}

export function services(spotifyReady: boolean): Service[] {
  return [
    { id: 'youtube', name: 'YouTube', line: 'Full songs, free, no account.', status: 'ready', note: '' },
    { id: 'youtubeMusic', name: 'YouTube Music', line: 'Prefers the official audio of each song. No account.', status: 'ready', note: '' },
    {
      id: 'spotify',
      name: 'Spotify Premium',
      line: 'Link your Premium account and play from Spotify.',
      status: spotifyReady ? 'ready' : 'setup',
      note: 'Spotify is not set up on this copy of Orbit yet.',
    },
    { id: 'apple', name: 'Apple Music', line: 'Link your Apple Music subscription.', status: 'soon', note: 'Coming soon. Apple Music needs a developer key that Orbit does not have yet.' },
    { id: 'deezer', name: 'Deezer', line: 'Link your Deezer account.', status: 'soon', note: 'Coming soon. Deezer is not accepting new apps right now.' },
  ]
}
