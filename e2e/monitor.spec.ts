import { expect, test } from './fixtures.ts'

test.describe('video monitor', () => {
  test('shows the video in the monitor while a full track plays, at least 200 by 200', async ({ orbit }) => {
    const monitor = orbit.page.locator('.monitor')
    await expect(monitor).toBeHidden()
    await orbit.play()
    await expect(monitor).toBeVisible()
    await expect(monitor).toContainText('Playing from YouTube · Get Lucky')
    const box = await orbit.page.locator('.monitor__video').boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(200)
    expect(box?.height).toBeGreaterThanOrEqual(200)
    await expect(orbit.page.locator('.lens')).toHaveAttribute('data-state', 'cover')
  })

  test('hides the monitor during previews', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the start/ }).click()
    await orbit.row('Karma Police').locator('.waypoint__main').click()
    await expect(orbit.page.locator('.badge')).toHaveText('Full track')
    await orbit.page.evaluate(() => window.orbitFakePlayer?.fail())
    await expect(orbit.page.locator('.badge')).toHaveText('30 s preview')
    await expect(orbit.page.locator('.monitor')).toBeHidden()
  })

  test('keeps the cover visible without the particle scene', async ({ orbit }) => {
    await orbit.play()
    await orbit.page.waitForTimeout(2600)
    await expect(orbit.page.locator('.lens')).toHaveAttribute('data-cover', 'shown')
  })

  test('places the monitor over the cover on phones @mobile', async ({ orbit }) => {
    await orbit.play()
    const monitor = orbit.page.locator('.monitor__video')
    await expect(monitor).toBeVisible()
    const video = await monitor.boundingBox()
    const lens = await orbit.page.locator('.lens').boundingBox()
    if (!video || !lens) throw new Error('missing boxes')
    expect(Math.abs(video.x + video.width / 2 - (lens.x + lens.width / 2))).toBeLessThan(3)
    expect(Math.abs(video.y + video.height / 2 - (lens.y + lens.height / 2))).toBeLessThan(3)
    expect(video.width).toBeGreaterThanOrEqual(200)
    await orbit.page.getByRole('button', { name: 'Flight plan' }).click()
    await expect(orbit.page.locator('.monitor')).toBeHidden()
  })
})
