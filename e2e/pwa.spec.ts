import { expect, test } from './fixtures.ts'

test.describe('installable app', () => {
  test.use({ serviceWorkers: 'allow' })

  test('links a manifest with icons', async ({ page, orbit, request }) => {
    await expect(orbit.rows().first()).toBeAttached()
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBe('/manifest.webmanifest')
    const manifest = (await (await request.get(href as string)).json()) as { name: string; display: string; icons: { src: string; purpose?: string }[] }
    expect(manifest.name).toBe('Orbit')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true)
  })

  test('keeps working offline after the first visit', async ({ page, context, orbit }) => {
    await expect(orbit.rows().first()).toBeAttached()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    await context.setOffline(true)
    await page.reload()
    await expect(orbit.rows().first()).toBeVisible()
    await expect(page.locator('.deck__title')).toBeVisible()
    await context.setOffline(false)
  })
})
