import { demoTitles, expect, test } from './fixtures.ts'

test.describe('up next preview', () => {
  test('shows the next and previous nodes on hover and focus', async ({ orbit }) => {
    const { page } = orbit
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await orbit.transport('Next song').hover()
    await expect(page.locator('.peek')).toContainText('Up next · #5')
    await expect(page.locator('.peek')).toContainText('Levitating')
    await orbit.transport('Previous song').focus()
    await expect(page.locator('.peek')).toContainText('Previous · #3')
    await expect(page.locator('.peek')).toContainText('Bohemian Rhapsody')
    await expect(orbit.transport('Previous song')).toHaveAttribute('aria-describedby', 'peek')
  })

  test('says when the list ends', async ({ orbit }) => {
    await orbit.row('De Música Ligera').locator('.waypoint__main').click()
    await orbit.transport('Next song').hover()
    await expect(orbit.page.locator('.peek')).toContainText('End of the flight plan')
  })
})

test.describe('command palette', () => {
  test('opens with the keyboard and runs actions', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+k')
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    await expect(dialog).toBeVisible()
    await page.keyboard.type('shuf')
    await expect(dialog.getByRole('option').first()).toContainText('Shuffle on')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(orbit.transport('Shuffle')).toHaveAttribute('aria-pressed', 'true')
  })

  test('jumps to a song in the flight plan', async ({ orbit }) => {
    const { page } = orbit
    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.type('fleetwood')
    await expect(page.getByRole('option').first()).toContainText('Dreams')
    await page.keyboard.press('Enter')
    await expect.poll(() => orbit.currentTitle()).toBe('Dreams')
  })

  test('plays or adds songs from the catalog', async ({ orbit }) => {
    const { page } = orbit
    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.type('karma police')
    const result = page.getByRole('option', { name: /Karma Police/ })
    await expect(result).toBeVisible()
    await result.click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    expect(await orbit.titles()).toEqual(demoTitles)
    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.type('clocks')
    await expect(page.getByRole('option', { name: /Clocks/ })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.getByRole('option', { name: /Clocks/ }).click({ modifiers: ['Shift'] })
    expect((await orbit.titles()).at(-1)).toBe('Clocks')
  })

  test('moves with the arrows and closes with Escape', async ({ orbit }) => {
    const { page } = orbit
    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.palette__item[aria-selected="true"]')).toContainText('Next song')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden()
  })
})
