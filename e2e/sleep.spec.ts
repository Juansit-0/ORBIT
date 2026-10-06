import { expect, test } from './fixtures.ts'

test.describe('sleep timer', () => {
  test('stops at the end of the current song', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.getByRole('button', { name: 'Sleep timer' }).click()
    await page.getByRole('menuitemradio', { name: 'End of this song' }).click()
    await expect(page.locator('.sleep__badge')).toHaveText('end')
    await orbit.fakeFinish()
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await expect(page.locator('.sleep__badge')).toBeHidden()
  })

  test('fades out and pauses when the countdown ends', async ({ page, orbit }) => {
    await page.clock.install()
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
    await orbit.play()
    await page.getByRole('button', { name: 'Sleep timer' }).click()
    await page.getByRole('menuitemradio', { name: '15 minutes' }).click()
    await expect(page.locator('.sleep__badge')).toHaveText('15m')
    await page.clock.runFor(14 * 60000 + 56000)
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.volume ?? 100)).toBeLessThan(80)
    await page.clock.runFor(6000)
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.volume)).toBe(80)
    await expect(page.locator('.sleep__badge')).toBeHidden()
  })

  test('can be turned off from the menu', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('button', { name: 'Sleep timer' }).click()
    await page.getByRole('menuitemradio', { name: '30 minutes' }).click()
    await expect(page.getByRole('button', { name: /Sleep timer, 30m left/ })).toBeVisible()
    await page.getByRole('button', { name: /Sleep timer/ }).click()
    await expect(page.getByRole('menuitemradio', { name: '30 minutes' })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('menuitemradio', { name: 'Off' }).click()
    await expect(page.locator('.sleep__badge')).toBeHidden()
  })
})
