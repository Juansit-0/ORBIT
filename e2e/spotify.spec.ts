import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

async function mockSpotify(page: Page, product: 'premium' | 'free' | 'blocked') {
  const calls = { token: 0, search: [] as string[] }
  await page.route('https://accounts.spotify.com/authorize**', async (route) => {
    const url = new URL(route.request().url())
    const back = new URL(url.searchParams.get('redirect_uri') as string)
    back.search = new URLSearchParams({ code: 'good-code', state: url.searchParams.get('state') ?? '' }).toString()
    await route.fulfill({ status: 302, headers: { location: back.toString() } })
  })
  await page.route('https://accounts.spotify.com/api/token', async (route) => {
    calls.token += 1
    await route.fulfill({ json: { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 } })
  })
  await page.route('https://api.spotify.com/v1/me', async (route) => {
    if (product === 'blocked') return route.fulfill({ status: 403, json: { error: { status: 403 } } })
    return route.fulfill({ json: { display_name: 'Juan', product } })
  })
  await page.route('https://api.spotify.com/v1/search**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') ?? ''
    calls.search.push(query)
    await route.fulfill({ json: { tracks: { items: [{ uri: `spotify:track:${encodeURIComponent(query).slice(0, 12)}`, duration_ms: 369000 }] } } })
  })
  return calls
}

test.describe('Spotify', () => {
  test.use({ provider: null })

  test('links a Premium account and plays through Spotify', async ({ page, orbit }) => {
    const calls = await mockSpotify(page, 'premium')
    await page.locator('[data-service="spotify"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-provider', 'spotify')
    expect(calls.token).toBe(1)
    await expect(page).toHaveURL(/\/app\/$/)
    await orbit.play()
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.loaded ?? '')).toMatch(/^spotify:track:/)
    expect(calls.search[0]).toBe('track:Get Lucky artist:Daft Punk')
    await expect(page.locator('.badge')).toHaveText('On Spotify')
    await expect(page.locator('.monitor')).toBeHidden()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-provider', 'spotify')
    await orbit.openMenu('Unlink Spotify')
    await expect(page.getByRole('heading', { name: 'How do you want to listen?' })).toBeVisible()
  })

  test('explains that Premium is needed and offers the other services', async ({ page, orbit }) => {
    expect(orbit).toBeTruthy()
    await mockSpotify(page, 'free')
    await page.locator('[data-service="spotify"]').click()
    await expect(page.getByText('Spotify Premium is needed')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How do you want to listen?' })).toBeVisible()
    await page.locator('[data-service="youtube"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-provider', 'youtube')
  })

  test('explains when the account is not on the development list', async ({ page, orbit }) => {
    expect(orbit).toBeTruthy()
    await mockSpotify(page, 'blocked')
    await page.locator('[data-service="spotify"]').click()
    await expect(page.getByText('This Spotify account is not on the list yet')).toBeVisible()
  })
})
