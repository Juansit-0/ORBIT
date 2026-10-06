import { expect, test } from './fixtures.ts'

test.describe('interface details', () => {
  test('the vinyl setting is off by default, spins the cover and is remembered', async ({ orbit }) => {
    const { page } = orbit
    await expect(page.locator('html')).toHaveAttribute('data-vinyl', 'false')
    await page.getByRole('button', { name: 'Settings' }).click()
    const toggle = page.getByRole('switch', { name: /Spin the cover like a vinyl/ })
    await expect(toggle).not.toBeChecked()
    await page.locator('label[for="setting-vinyl"]').click()
    await expect(toggle).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-vinyl', 'true')
    await page.keyboard.press('Escape')
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the start/ }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-vinyl', 'true')
  })

  test('a spark travels along the link when skipping songs', async ({ orbit }) => {
    await orbit.play()
    await orbit.transport('Next song').click()
    await expect(orbit.page.locator('.dock .spark--next')).toHaveCount(1)
    await orbit.transport('Previous song').click()
    await expect(orbit.page.locator('.dock .spark--prev')).toHaveCount(1)
    await expect(orbit.page.locator('.dock .spark')).toHaveCount(0, { timeout: 4000 })
  })

  test('the orbital cursor follows the mouse and grows over controls', async ({ orbit }) => {
    const { page } = orbit
    await page.mouse.move(700, 300)
    await expect(page.locator('.cursor')).toHaveAttribute('data-visible', 'true')
    const play = await page.locator('.play').boundingBox()
    if (!play) throw new Error('missing play button')
    await page.mouse.move(play.x + play.width / 2, play.y + play.height / 2)
    await expect(page.locator('.cursor')).toHaveAttribute('data-active', 'true')
  })

  test('the liquid progress canvas sits under the seek control', async ({ orbit }) => {
    await expect(orbit.page.locator('.seek__bar canvas.liquid')).toBeAttached()
    await orbit.play()
    await expect(orbit.page.getByRole('slider', { name: 'Seek' })).toBeEnabled()
  })
})
