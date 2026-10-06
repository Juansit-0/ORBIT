import { expect, test } from './fixtures.ts'

test.describe('lyrics', () => {
  test('shows synced lyrics for the current song and follows playback', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('.deck__lyrics').click()
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

  test('opens under the title on the stage and closes again', async ({ orbit }) => {
    const { page } = orbit
    const chip = page.locator('.deck__lyrics')
    await expect(page.locator('#pane-lyrics')).toBeHidden()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    const pane = await page.locator('#pane-lyrics').boundingBox()
    const title = await page.locator('.deck__title').boundingBox()
    const controls = await page.locator('.deck__controls').boundingBox()
    if (!pane || !title || !controls) throw new Error('missing boxes')
    expect(pane.y).toBeGreaterThan(title.y)
    expect(pane.y + pane.height).toBeLessThanOrEqual(controls.y + 1)
    await page.keyboard.press('l')
    await expect(page.locator('#pane-lyrics')).toBeHidden()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  test('opens lyrics from the now playing view on phones @mobile', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.locator('.deck__lyrics').click()
    await expect(page.locator('#pane-lyrics')).toBeVisible()
    await expect(page.locator('.lyric').first()).toHaveText('Get Lucky line one')
  })
})
