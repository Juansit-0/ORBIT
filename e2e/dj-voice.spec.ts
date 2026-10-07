import { expect, test } from './fixtures.ts'

declare global {
  interface Window {
    orbitSpoken?: string[]
  }
}

test.describe('DJ voice', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.orbitSpoken = []
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        window.orbitSpoken?.push(utterance.text)
      }
    })
  })

  test('is off by default and announces the next song during a mix once turned on', async ({ page, orbit }) => {
    await orbit.openMenu('Settings')
    const voice = page.getByRole('switch', { name: /Announce the next song/ })
    await expect(voice).not.toBeChecked()
    await expect(voice).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.locator('.dj-chip').click()
    await orbit.openMenu('Settings')
    await expect(voice).toBeEnabled()
    await page.locator('label[for="setting-dj-voice"]').click()
    await expect(voice).toBeChecked()
    await page.keyboard.press('Escape')
    await orbit.play()
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.playing ?? false)).toBe(true)
    await page.locator('.range--seek').fill(String(369000 - 7000))
    await expect.poll(() => page.evaluate(() => window.orbitSpoken ?? [])).toEqual(['Up next, Blinding Lights by The Weeknd.'])
  })

  test('stays silent while the voice is off', async ({ page, orbit }) => {
    await page.locator('.dj-chip').click()
    await orbit.play()
    await expect.poll(() => page.evaluate(() => window.orbitFakePlayer?.playing ?? false)).toBe(true)
    await page.locator('.range--seek').fill(String(369000 - 7000))
    await expect(page.locator('.dj-chip')).toHaveAttribute('data-mixing', 'true')
    expect(await page.evaluate(() => window.orbitSpoken ?? [])).toEqual([])
  })
})
