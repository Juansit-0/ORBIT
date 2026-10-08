import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { challengeFor, createVerifier, SpotifyAuth, SpotifyAuthError } from '../../src/services/spotifyAuth.ts'

const digest = (data: Uint8Array) => crypto.subtle.digest('SHA-256', new Uint8Array(data))

function memory() {
  const values = new Map<string, unknown>()
  return { values, read: (key: string) => values.get(key) ?? null, write: (key: string, value: unknown) => void values.set(key, value) }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function setup(fetcher = vi.fn(), now = () => 1000) {
  const storage = memory()
  const auth = new SpotifyAuth({
    clientId: 'client',
    redirectUri: 'http://127.0.0.1:5199/app/',
    fetcher,
    now,
    random: (bytes) => new Uint8Array(bytes).map((_, i) => i * 7),
    digest,
    storage,
  })
  return { auth, storage, fetcher }
}

describe('PKCE', () => {
  it('builds the S256 challenge as unpadded base64url of the SHA-256 hash', async () => {
    const verifier = 'dBjftJeZ4CVP-mJ92K9N2Ezve-bzm4Ce-r2cY7KlkbE'
    const expected = createHash('sha256').update(verifier).digest('base64url')
    const challenge = await challengeFor(verifier, digest)
    expect(challenge).toBe(expected)
    expect(challenge).not.toMatch(/[=+/]/)
  })

  it('creates a 64 character verifier from the allowed alphabet', () => {
    const verifier = createVerifier((bytes) => crypto.getRandomValues(new Uint8Array(bytes)))
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]{64}$/)
  })
})

describe('SpotifyAuth', () => {
  it('sends the user to Spotify with the PKCE challenge and scopes', async () => {
    const { auth } = setup()
    const url = new URL(await auth.authorizeUrl())
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('client_id')).toBe('client')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5199/app/')
    expect(url.searchParams.get('scope')).toContain('streaming')
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  it('exchanges the code from the redirect for tokens', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600 }))
    const { auth } = setup(fetcher)
    const state = new URL(await auth.authorizeUrl()).searchParams.get('state') as string
    expect(await auth.completeRedirect(new URLSearchParams({ code: 'c', state }))).toBe(true)
    expect(auth.tokens).toEqual({ accessToken: 'a1', refreshToken: 'r1', expiresAt: 1000 + 3600000 })
    const body = new URLSearchParams(fetcher.mock.calls[0]?.[1]?.body as string)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code_verifier')).toHaveLength(64)
  })

  it('ignores normal page loads and rejects a wrong state or a denial', async () => {
    const { auth } = setup()
    expect(await auth.completeRedirect(new URLSearchParams())).toBe(false)
    await auth.authorizeUrl()
    await expect(auth.completeRedirect(new URLSearchParams({ code: 'c', state: 'other' }))).rejects.toMatchObject({ kind: 'state' })
    await expect(auth.completeRedirect(new URLSearchParams({ error: 'access_denied' }))).rejects.toBeInstanceOf(SpotifyAuthError)
  })

  it('refreshes the access token shortly before it expires and keeps the refresh token', async () => {
    let time = 1000
    const fetcher = vi.fn().mockResolvedValue(json({ access_token: 'a2', expires_in: 3600 }))
    const { auth, storage } = setup(fetcher, () => time)
    storage.write('orbit:v1:spotify', { accessToken: 'a1', refreshToken: 'r1', expiresAt: 1000 + 3600000 })
    expect(await auth.accessToken()).toBe('a1')
    time = 1000 + 3600000 - 30000
    expect(await auth.accessToken()).toBe('a2')
    expect(auth.tokens?.refreshToken).toBe('r1')
    expect(new URLSearchParams(fetcher.mock.calls[0]?.[1]?.body as string).get('grant_type')).toBe('refresh_token')
  })

  it('unlinks when the refresh is refused and can sign out', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ error: 'invalid_grant' }, 400))
    const { auth, storage } = setup(fetcher, () => 10 ** 12)
    storage.write('orbit:v1:spotify', { accessToken: 'a1', refreshToken: 'r1', expiresAt: 0 })
    await expect(auth.accessToken()).rejects.toMatchObject({ kind: 'expired' })
    expect(auth.linked).toBe(false)
    await expect(auth.accessToken()).rejects.toMatchObject({ kind: 'expired' })
  })
})
