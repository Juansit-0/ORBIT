import { expect, test } from './fixtures.ts'

test.describe('sound reactive planet', () => {
  test('offers live sound and explains when sharing is not started', async ({ orbit }) => {
    const { page } = orbit
    await page.evaluate(() => {
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        configurable: true,
        value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      })
    })
    const chip = page.locator('.deck__live')
    await expect(chip).toBeVisible()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await chip.click()
    await expect(orbit.toast('Live sound was not started')).toBeVisible()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  test('reports when the shared tab has no audio', async ({ orbit }) => {
    const { page } = orbit
    await page.evaluate(() => {
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        configurable: true,
        value: async () => {
          const canvas = document.createElement('canvas')
          return canvas.captureStream()
        },
      })
    })
    await page.locator('.deck__live').click()
    await expect(orbit.toast('No audio was shared')).toBeVisible()
  })

  test('is not offered on touch screens @mobile', async ({ orbit }) => {
    await expect(orbit.page.locator('.deck__live')).toHaveCount(0)
  })
})
