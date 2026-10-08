import { readJson, writeJson } from './storage.ts'

export const SPOTIFY_SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state']
const TOKEN_KEY = 'orbit:v1:spotify'
const PENDING_KEY = 'orbit:v1:spotify-pending'
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface SpotifyAuthDeps {
  clientId: string
  redirectUri: string
  fetcher?: typeof fetch
  now?: () => number
  random?: (bytes: number) => Uint8Array
  digest?: (data: Uint8Array) => Promise<ArrayBuffer>
  storage?: { read: (key: string) => unknown; write: (key: string, value: unknown) => void }
}

export class SpotifyAuthError extends Error {
  readonly kind: 'denied' | 'state' | 'exchange' | 'expired'

  constructor(kind: 'denied' | 'state' | 'exchange' | 'expired', message: string) {
    super(message)
    this.name = 'SpotifyAuthError'
    this.kind = kind
  }
}

export function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function createVerifier(random: (bytes: number) => Uint8Array): string {
  return Array.from(random(64), (byte) => VERIFIER_CHARS[byte % VERIFIER_CHARS.length]).join('')
}

export async function challengeFor(verifier: string, digest: (data: Uint8Array) => Promise<ArrayBuffer>): Promise<string> {
  return base64Url(new Uint8Array(await digest(new TextEncoder().encode(verifier))))
}

export class SpotifyAuth {
  private readonly deps: Required<SpotifyAuthDeps>

  constructor(deps: SpotifyAuthDeps) {
    this.deps = {
      fetcher: (input, init) => fetch(input, init),
      now: () => Date.now(),
      random: (bytes) => crypto.getRandomValues(new Uint8Array(bytes)),
      digest: (data) => crypto.subtle.digest('SHA-256', new Uint8Array(data)),
      storage: { read: (key) => readJson<unknown>(key), write: (key, value) => writeJson(key, value) },
      ...deps,
    }
  }

  get tokens(): SpotifyTokens | null {
    const value = this.deps.storage.read(TOKEN_KEY) as Partial<SpotifyTokens> | null
    if (!value || typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string' || typeof value.expiresAt !== 'number') return null
    return value as SpotifyTokens
  }

  get linked(): boolean {
    return this.tokens !== null
  }

  async authorizeUrl(): Promise<string> {
    const verifier = createVerifier(this.deps.random)
    const state = base64Url(this.deps.random(16))
    this.deps.storage.write(PENDING_KEY, { verifier, state })
    const url = new URL(AUTHORIZE_URL)
    url.search = new URLSearchParams({
      client_id: this.deps.clientId,
      response_type: 'code',
      redirect_uri: this.deps.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: await challengeFor(verifier, this.deps.digest),
      scope: SPOTIFY_SCOPES.join(' '),
      state,
    }).toString()
    return url.toString()
  }

  async completeRedirect(params: URLSearchParams): Promise<boolean> {
    const code = params.get('code')
    const error = params.get('error')
    if (!code && !error) return false
    const pending = this.deps.storage.read(PENDING_KEY) as { verifier?: string; state?: string } | null
    this.deps.storage.write(PENDING_KEY, null)
    if (error) throw new SpotifyAuthError('denied', error)
    if (!pending?.verifier || pending.state !== params.get('state')) throw new SpotifyAuthError('state', 'The Spotify sign in could not be verified.')
    await this.requestTokens({
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: this.deps.redirectUri,
      client_id: this.deps.clientId,
      code_verifier: pending.verifier,
    })
    return true
  }

  async accessToken(): Promise<string> {
    const tokens = this.tokens
    if (!tokens) throw new SpotifyAuthError('expired', 'Spotify is not linked.')
    if (tokens.expiresAt - this.deps.now() > 60000) return tokens.accessToken
    const fresh = await this.requestTokens({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: this.deps.clientId }, tokens.refreshToken)
    return fresh.accessToken
  }

  signOut(): void {
    this.deps.storage.write(TOKEN_KEY, null)
  }

  private async requestTokens(body: Record<string, string>, previousRefresh?: string): Promise<SpotifyTokens> {
    let response: Response
    try {
      response = await this.deps.fetcher(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
      })
    } catch {
      throw new SpotifyAuthError('exchange', 'Spotify could not be reached.')
    }
    if (!response.ok) {
      if (previousRefresh) this.signOut()
      throw new SpotifyAuthError(previousRefresh ? 'expired' : 'exchange', 'Spotify did not accept the sign in.')
    }
    const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }
    if (!data.access_token) throw new SpotifyAuthError('exchange', 'Spotify did not return a token.')
    const tokens: SpotifyTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? previousRefresh ?? '',
      expiresAt: this.deps.now() + (data.expires_in ?? 3600) * 1000,
    }
    this.deps.storage.write(TOKEN_KEY, tokens)
    return tokens
  }
}
