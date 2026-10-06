import { expect, test } from './fixtures.ts'

test.describe('linked list panel', () => {
  test.use({ listShown: false })

  test('is hidden by default and the player gets the space', async ({ orbit }) => {
    const { page } = orbit
    await expect(page.locator('.dock')).toBeHidden()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('switch', { name: /Show linked list/ })).not.toBeChecked()
    await expect(page.getByRole('switch', { name: /Explain list operations/ })).toBeHidden()
  })

  test('shows from settings together with the explain option, and is remembered', async ({ orbit }) => {
    const { page } = orbit
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('label[for="setting-list"]').click()
    await expect(page.locator('.dock')).toBeVisible()
    await expect(page.getByRole('switch', { name: /Explain list operations/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(page.locator('.dock')).toBeVisible()
    await expect(page.locator('.dock__size')).toHaveText('size 8')
  })

  test('toggles with V and from the command palette', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('v')
    await expect(page.locator('.dock')).toBeVisible()
    await expect(orbit.toast('Linked list shown')).toBeVisible()
    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.type('linked')
    await expect(page.getByRole('option').first()).toContainText('Hide linked list')
    await page.keyboard.press('Enter')
    await expect(page.locator('.dock')).toBeHidden()
  })

  test('explains nothing while the panel is hidden', async ({ orbit }) => {
    const { page } = orbit
    await page.evaluate(() => localStorage.setItem('orbit:v1:prefs', JSON.stringify({ volume: 80, explain: true, showList: false })))
    await page.reload()
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await expect(page.locator('.dock[data-explaining]')).toHaveCount(0)
  })
})
