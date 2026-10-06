import { expect, test } from './fixtures.ts'

test.describe('lyrics', () => {
  test('shows synced lyrics for the current song and follows playback', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('tab', { name: 'Lyrics' }).click()
    await expect(page.getByText('No song in orbit')).toBeVisible()
    await orbit.play()
    await expect(page.locator('.lyric').first()).toHaveText('Get Lucky line one')
    await expect(page.locator('.lyric--active')).toHaveText('Get Lucky line one')
    await page.locator('.lyric', { hasText: 'line four' }).click()
    await expect(page.locator('.lyric--active')).toHaveText('Get Lucky line four')
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.positionMs ?? 0)).toBeGreaterThanOrEqual(12000)
    await expect(page.locator('.lyric--break')).toHaveAttribute('aria-label', 'Instrumental break at 0:08')
  })

  test('switches lyrics when the song changes', async ({ orbit }) => {
    await orbit.play()
    await orbit.page.keyboard.press('l')
    await expect(orbit.page.locator('#pane-lyrics')).toBeVisible()
    await orbit.transport('Next song').click()
    await expect(orbit.page.locator('.lyric').first()).toHaveText('Blinding Lights line one')
    await expect(orbit.page.locator('.lyrics__song')).toHaveText('Blinding Lights · The Weeknd')
  })

  test('handles plain, missing and failing lyrics', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('.deck__lyrics').click()
    await orbit.row('Levitating').locator('.waypoint__main').click()
    await expect(page.getByText('These lyrics are not time-synced.')).toBeVisible()
    await expect(page.getByText('I know a galaxy')).toBeVisible()
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await expect(page.getByText('No lyrics found')).toBeVisible()
    await orbit.row('Viva La Vida').locator('.waypoint__main').click()
    await expect(page.getByText('Lyrics are unavailable')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('tabs are keyboard accessible', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('tab', { name: 'Search' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Lyrics' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Lyrics' })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('#search-input')).toBeVisible()
  })

  test('opens lyrics from the now playing view on phones @mobile', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.locator('.deck__lyrics').click()
    await expect(page.locator('#pane-lyrics')).toBeVisible()
    await expect(page.locator('.lyric').first()).toHaveText('Get Lucky line one')
  })
})
