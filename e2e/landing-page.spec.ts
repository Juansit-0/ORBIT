import { expect, test } from '@playwright/test'

test.describe('landing page', () => {
  test('scrolls with the mouse wheel and keeps the orbit beside the chapters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await page.mouse.move(400, 400)
    await page.mouse.wheel(0, 1400)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800)
    const stage = await page.locator('.stage').boundingBox()
    expect(stage?.y ?? -1).toBeGreaterThanOrEqual(-1)
    expect(stage?.y ?? 99).toBeLessThan(2)
  })

  test('explains the list with a working demo', async ({ page }) => {
    await page.goto('/')
    const demo = page.locator('.chain-demo')
    await expect(demo.locator('.chain-demo__node')).toHaveCount(3)
    await demo.getByRole('button', { name: 'Insert at 2' }).click()
    await expect(demo.locator('.chain-demo__node')).toHaveCount(4)
    await expect(demo.locator('.chain-demo__node').nth(1)).toContainText('Levitating')
    await expect(demo.locator('.chain-demo__log')).toContainText('insertAt(2, "Levitating")')
    await demo.getByRole('button', { name: 'Next' }).click()
    await expect(demo.locator('.chain-demo__pointer')).toHaveText('size 4 · current → Levitating')
    await demo.getByRole('button', { name: 'Remove current' }).click()
    await expect(demo.locator('.chain-demo__node')).toHaveCount(3)
    await expect(demo.locator('.chain-demo__pointer')).toHaveText('size 3 · current → Blinding Lights')
    await demo.getByRole('button', { name: 'Previous' }).click()
    await demo.getByRole('button', { name: 'Previous' }).click()
    await expect(demo.locator('.chain-demo__log')).toContainText('is the HEAD: prev is null')
  })

  test('the orbit links jump to each section and the services are honest', async ({ page }) => {
    await page.goto('/')
    await page.locator('.sat', { hasText: 'Auto DJ' }).click()
    await expect(page.locator('.sat', { hasText: 'Auto DJ' })).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.services__row', { hasText: 'Apple Music' })).toContainText('Coming soon')
    await expect(page.locator('.services__row', { hasText: 'Deezer' })).toContainText('Coming soon')
    await expect(page.locator('.plan__lands')).toHaveText(/^Lands at \d\d:\d\d$/)
    await expect(page.getByRole('link', { name: 'Open Orbit' })).toHaveCount(3)
    await expect(page.locator('.services__row', { hasText: 'Apple Music' })).not.toHaveAttribute('href')
    await expect(page.getByRole('link', { name: 'Start, no account with YouTube Music' })).toHaveAttribute('href', '/app/?service=youtubeMusic')
  })
})
