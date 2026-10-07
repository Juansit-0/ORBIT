import { expect, test } from './fixtures.ts'

test.describe('surprise me', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.25
    })
  })

  test('plays a random chart song without adding it, and can add it from the toast', async ({ page, orbit }) => {
    await page.locator('#search-input').focus()
    await expect(page.locator('.results--charts .result')).toHaveCount(10)
    await page.getByRole('button', { name: 'Surprise me' }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Chart Song 4')
    await expect(page.locator('#panel-search')).toHaveAttribute('data-open', 'false')
    expect(await orbit.titles()).not.toContain('Chart Song 4')
    const toast = orbit.toast('Surprise: “Chart Song 4”')
    await expect(toast).toBeVisible()
    await toast.getByRole('button', { name: 'Add to plan' }).click()
    await expect.poll(async () => (await orbit.titles()).at(-1)).toBe('Chart Song 4')
  })

  test('is in the command palette', async ({ page, orbit }) => {
    await expect(orbit.rows().first()).toBeAttached()
    await page.keyboard.press('Control+k')
    await page.locator('.palette__input').fill('surprise')
    await page.keyboard.press('Enter')
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
  })
})
