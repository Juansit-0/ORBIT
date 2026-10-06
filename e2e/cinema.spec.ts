import { expect, test } from './fixtures.ts'

test.describe('player mode', () => {
  test('fades everything but the player after 20 s without interaction', async ({ page, orbit }) => {
    await page.clock.install()
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
    await orbit.play()
    await page.mouse.move(5, 5)
    await page.clock.runFor(15000)
    await expect(page.locator('html')).not.toHaveAttribute('data-cinema', 'true')
    await page.clock.runFor(6500)
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'true')
    await expect(page.locator('.rail--queue')).toHaveCSS('pointer-events', 'none')
    await expect(page.locator('.deck__title')).toBeVisible()
    await expect(page.locator('.play')).toBeVisible()
    await page.mouse.move(300, 300)
    await page.clock.runFor(500)
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'false')
  })

  test('does not start while paused', async ({ page, orbit }) => {
    await page.clock.install()
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
    await page.clock.runFor(30000)
    await expect(page.locator('html')).not.toHaveAttribute('data-cinema', 'true')
  })

  test('enters with O, leaves with Escape and when the music is paused', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('o')
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'true')
    await page.waitForTimeout(1300)
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'false')
    await page.locator('.mast').getByRole('button', { name: 'Player mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'true')
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('.play')?.click())
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'false')
  })

  test('can be turned off in settings and remembers the choice', async ({ page, orbit }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('label[for="cinema-delay-never"]').click()
    await expect(page.getByRole('radio', { name: 'Never' })).toBeChecked()
    await page.keyboard.press('Escape')
    await page.clock.install()
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
    await orbit.play()
    await page.mouse.move(5, 5)
    await page.clock.runFor(60000)
    await expect(page.locator('html')).not.toHaveAttribute('data-cinema', 'true')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('radio', { name: 'Never' })).toBeChecked()
  })

  test('keeps the video monitor visible @mobile', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.locator('.mast').getByRole('button', { name: 'Player mode' }).dispatchEvent('click')
    await expect(page.locator('html')).toHaveAttribute('data-cinema', 'true')
    await expect(page.locator('.monitor__video')).toBeVisible()
    const box = await page.locator('.monitor__video').boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(200)
  })
})
