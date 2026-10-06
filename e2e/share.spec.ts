import { readFile } from 'node:fs/promises'
import { demoTitles, expect, test, type OrbitPage } from './fixtures.ts'

async function openLibrary(orbit: OrbitPage): Promise<void> {
  if (await orbit.page.locator('#library').isVisible()) return
  await orbit.page.locator('.library__button').click()
  await expect(orbit.page.locator('#library')).toBeVisible()
}

test.describe('sharing playlists', () => {
  test('copies a link that recreates the playlist elsewhere', async ({ orbit, context, page, browserName }) => {
    test.skip(browserName !== 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await openLibrary(orbit)
    await page.getByRole('button', { name: 'Share link' }).click()
    await expect(orbit.toast('Share link copied')).toContainText('7 songs')
    const link = await page.evaluate(() => navigator.clipboard.readText())
    expect(link).toContain('?plan=')
    await page.evaluate(() => localStorage.clear())
    await page.goto(link)
    await expect(orbit.toast('Opened shared playlist “My flight plan 2”')).toBeVisible()
    expect(await orbit.titles()).toEqual(demoTitles.filter((title) => title !== 'Dreams'))
    await expect(page.locator('.library__button')).toHaveText('My flight plan 2')
    expect(new URL(page.url()).search).toBe('')
  })

  test('explains a broken link', async ({ orbit, page }) => {
    await page.goto('/?plan=broken!!')
    await expect(orbit.toast('This share link is broken')).toBeVisible()
    expect(await orbit.titles()).toEqual(demoTitles)
  })

  test('exports and imports a playlist file', async ({ orbit, page }, testInfo) => {
    await openLibrary(orbit)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export' }).click()
    const file = await download
    expect(file.suggestedFilename()).toBe('orbit-my-flight-plan.json')
    const path = testInfo.outputPath('plan.json')
    await file.saveAs(path)
    const content = JSON.parse(await readFile(path, 'utf8'))
    expect(content.songs).toHaveLength(8)
    content.name = 'From a file'
    content.songs = content.songs.slice(0, 3)
    await openLibrary(orbit)
    await page.locator('#library input[type="file"]').setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(content)) })
    await expect(orbit.toast('Imported “From a file”')).toContainText('3 songs')
    expect(await orbit.titles()).toEqual(demoTitles.slice(0, 3))
    await expect(page.locator('.library__button')).toHaveText('From a file')
  })

  test('rejects files that are not Orbit playlists', async ({ orbit, page }) => {
    await openLibrary(orbit)
    await page.locator('#library input[type="file"]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
    await expect(orbit.toast('This is not an Orbit playlist')).toBeVisible()
    await expect(page.locator('.library__button')).toHaveText('My flight plan')
  })
})
