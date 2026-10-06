import { expect, test } from './fixtures.ts'

test.describe('explain mode', () => {
  test('is off by default and adds nothing to the interface', async ({ orbit }) => {
    const { page } = orbit
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '3')
    await expect(page.locator('.dock__explain')).toBeHidden()
    await expect(page.locator('.dock')).not.toHaveAttribute('data-explaining', 'true')
    await expect(page.locator('.link__path--explained')).toHaveCount(0)
    await orbit.openMenu('Settings')
    await expect(page.getByRole('switch', { name: /Explain list operations/ })).not.toBeChecked()
  })

  test('plays the pointer changes of an insert step by step', async ({ orbit }) => {
    const { page } = orbit
    await orbit.openMenu('Settings')
    await page.locator('label[for="setting-explain"]').click()
    await page.keyboard.press('Escape')
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '3')
    const line = page.locator('.dock__explain')
    await expect(line).toHaveText(/1\/5\s+insertAt\(2\)/)
    await expect(line).toHaveText(/new\.prev = “Blinding Lights”/, { timeout: 4000 })
    await expect(line).toHaveText(/“Blinding Lights”\.next = new/, { timeout: 4000 })
    await expect(page.locator('.link__path--explained')).toHaveCount(1)
    await expect(line).toHaveText(/“Bohemian Rhapsody”\.prev = new/, { timeout: 4000 })
    await expect(line).toBeHidden({ timeout: 6000 })
    await expect(page.locator('.dock__now')).toBeVisible()
  })

  test('explains removing the head and is remembered', async ({ orbit }) => {
    const { page } = orbit
    await orbit.openMenu('Settings')
    await page.locator('label[for="setting-explain"]').click()
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(orbit.rows().first()).toBeAttached()
    await orbit.rowAction('Get Lucky', /Remove Get Lucky/)
    await expect(page.locator('.dock__explain')).toHaveText(/remove\(“Get Lucky”\) · O\(1\) at the head/)
    await expect(page.locator('.dock__explain')).toHaveText(/head = “Blinding Lights”/, { timeout: 4000 })
    await expect(page.locator('.node__tag--explained')).toHaveText('HEAD')
  })
})
