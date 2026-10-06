import { demoTitles, expect, test } from './fixtures.ts'

test.describe('keyboard', () => {
  test('shortcuts control playback and focus', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Space')
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => orbit.currentTitle()).toBe('Blinding Lights')
    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await page.keyboard.press('s')
    await expect(orbit.transport('Shuffle')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('r')
    await expect(orbit.transport('Repeat all')).toBeVisible()
    await page.keyboard.press('m')
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible()
    await page.keyboard.press('Shift+?')
    await expect(page.locator('#shortcuts')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('/')
    await expect(page.locator('#search-input')).toBeFocused()
  })

  test('typing in search does not trigger shortcuts', async ({ orbit }) => {
    await orbit.page.locator('#search-input').fill('')
    await orbit.page.locator('#search-input').pressSequentially('rs m')
    await expect(orbit.transport('Shuffle')).toHaveAttribute('aria-pressed', 'false')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
  })
})

test.describe('persistence', () => {
  test('keeps the flight plan, current song and modes after a reload', async ({ orbit }) => {
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await orbit.rowAction('Get Lucky', /Move Get Lucky down/)
    await orbit.row('Levitating').locator('.waypoint__main').click()
    await orbit.transport('Repeat off').click()
    const before = await orbit.titles()
    await orbit.page.reload()
    await expect(orbit.rows().first()).toBeVisible()
    expect(await orbit.titles()).toEqual(before)
    await expect(orbit.row('Levitating')).toHaveAttribute('aria-current', 'true')
    await expect(orbit.transport('Repeat all')).toBeVisible()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
  })
})

test.describe('mobile @mobile', () => {
  test('tabs switch between the three panels @mobile', async ({ orbit }) => {
    const { page } = orbit
    await expect(page.locator('#panel-now')).toBeVisible()
    await expect(page.locator('#panel-queue')).toBeHidden()
    await page.getByRole('button', { name: 'Flight plan' }).click()
    await expect(page.locator('#panel-queue')).toBeVisible()
    expect(await orbit.titles()).toEqual(demoTitles)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.locator('#search-input')).toBeVisible()
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '2')
    await page.getByRole('button', { name: 'Flight plan' }).click()
    expect((await orbit.titles())[1]).toBe('Karma Police')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('removes and reorders without hover @mobile', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('button', { name: 'Flight plan' }).click()
    await orbit.row('Dreams').getByRole('button', { name: /Remove Dreams/ }).click()
    await orbit.row('Get Lucky').getByRole('button', { name: /Move Get Lucky down/ }).click()
    expect((await orbit.titles()).slice(0, 2)).toEqual(['Blinding Lights', 'Get Lucky'])
  })
})
