import { demoTitles, expect, test, type OrbitPage } from './fixtures.ts'

async function reachTheEnd(orbit: OrbitPage): Promise<void> {
  await orbit.row('De Música Ligera').locator('.waypoint__main').click()
  await orbit.fakeFinish()
  await expect(orbit.toast('You reached the end of the flight plan')).toBeVisible()
}

test.describe('radio', () => {
  test('keeps playing similar songs without touching the flight plan', async ({ orbit }) => {
    const { page } = orbit
    await reachTheEnd(orbit)
    await orbit.toast('You reached the end of the flight plan').getByRole('button', { name: 'Start radio' }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await expect(page.getByRole('button', { name: 'Radio on. Stop radio' })).toBeVisible()
    expect(await orbit.titles()).toEqual(demoTitles)
    await orbit.fakeFinish()
    await expect.poll(() => orbit.currentTitle()).toBe('Clocks')
    await orbit.fakeFinish()
    await expect(orbit.toast('The radio ran out of songs')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Radio on. Stop radio' })).toBeHidden()
  })

  test('stops from its chip or when you pick another song', async ({ orbit }) => {
    const { page } = orbit
    await reachTheEnd(orbit)
    await orbit.toast('You reached the end of the flight plan').getByRole('button', { name: 'Start radio' }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await page.getByRole('button', { name: 'Radio on. Stop radio' }).click()
    await expect(orbit.toast('Radio off')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Radio on. Stop radio' })).toBeHidden()
    await reachTheEnd(orbit)
    await orbit.toast('You reached the end of the flight plan').getByRole('button', { name: 'Start radio' }).click()
    await expect(page.getByRole('button', { name: 'Radio on. Stop radio' })).toBeVisible()
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await expect(page.getByRole('button', { name: 'Radio on. Stop radio' })).toBeHidden()
    await orbit.fakeFinish()
    await expect.poll(() => orbit.currentTitle()).toBe('Levitating')
  })

  test('is not offered when turned off in settings', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('label[for="setting-radio"]').click()
    await page.keyboard.press('Escape')
    await orbit.row('De Música Ligera').locator('.waypoint__main').click()
    await orbit.fakeFinish()
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect(orbit.toast('You reached the end of the flight plan')).toHaveCount(0)
  })
})
