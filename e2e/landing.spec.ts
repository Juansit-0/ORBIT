import { expect, test } from '@playwright/test'

test.describe('landing', () => {
  test('introduces Orbit and opens the player', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByRole('link', { name: 'Open Orbit' }).first().click()
    await expect(page).toHaveURL(/\/app\/$/)
    await expect(page.locator('#panel-now')).toBeAttached()
  })

  test('sends old share links to the player', async ({ page }) => {
    await page.goto('/?plan=broken!!')
    await expect(page.getByText('This share link is broken')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/$/)
  })
})
