import { expect, test } from './fixtures.ts'

test.describe('landing times', () => {
  test.beforeEach(async ({ page, orbit }) => {
    await page.clock.install({ time: new Date('2026-10-06T15:00:00') })
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
  })

  test('shows when every song will play and when the flight plan lands', async ({ page, orbit }) => {
    await expect(page.locator('.queue__landing')).toBeHidden()
    await expect(orbit.row('Blinding Lights').locator('.waypoint__eta')).toBeHidden()
    await orbit.play()
    await expect(orbit.row('Blinding Lights').locator('.waypoint__eta')).toHaveText('15:06')
    await expect(orbit.row('Bohemian Rhapsody').locator('.waypoint__eta')).toHaveText('15:09')
    await expect(orbit.row('Get Lucky').locator('.waypoint__eta')).toBeHidden()
    await expect(page.locator('.queue__landing')).toHaveText('Lands at 15:34')
  })

  test('updates after a change to the flight plan and hides while paused', async ({ page, orbit }) => {
    await orbit.play()
    await expect(page.locator('.queue__landing')).toHaveText('Lands at 15:34')
    await orbit.rowAction('Blinding Lights', /Remove Blinding Lights/)
    await expect(orbit.row('Bohemian Rhapsody').locator('.waypoint__eta')).toHaveText('15:06')
    await expect(page.locator('.queue__landing')).toHaveText('Lands at 15:30')
    await orbit.page.locator('.play').click()
    await expect(page.locator('.queue__landing')).toBeHidden()
  })

  test('does not land while repeating all', async ({ page, orbit }) => {
    await orbit.play()
    await orbit.transport('Repeat off').click()
    await expect(page.locator('.queue__landing')).toBeHidden()
    await expect(orbit.row('Blinding Lights').locator('.waypoint__eta')).toHaveText('15:06')
  })
})
