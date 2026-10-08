import { expect, test } from './fixtures.ts'

test.describe('choosing a music service', () => {
  test.use({ provider: null })

  test('asks first, explains the services that are coming, and remembers the choice', async ({ page, orbit }) => {
    expect(orbit).toBeTruthy()
    await expect(page.getByRole('heading', { name: 'How do you want to listen?' })).toBeVisible()
    await page.locator('[data-service="apple"]').click()
    await expect(page.getByText('Coming soon. Apple Music needs a developer key')).toBeVisible()
    await page.locator('[data-service="deezer"]').click()
    await expect(page.getByText('Coming soon. Deezer is not accepting new apps')).toBeVisible()
    await expect(page.locator('#panel-now')).toHaveCount(0)
    await page.locator('[data-service="youtube"]').click()
    await expect(page.locator('.waypoint').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('.waypoint').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How do you want to listen?' })).toHaveCount(0)
  })

  test('plays through YouTube Music with the official audio flavor and can change service', async ({ page, orbit }) => {
    const flavors: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/resolve')) flavors.push(new URL(request.url()).searchParams.get('flavor') ?? 'video')
    })
    await page.locator('[data-service="youtubeMusic"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-provider', 'youtubeMusic')
    await orbit.play()
    await expect.poll(() => flavors).toContain('music')
    await orbit.openMenu(/Listening with YouTube Music/)
    await expect(page.getByRole('heading', { name: 'How do you want to listen?' })).toBeVisible()
  })
})
