import { demoTitles, expect, test, type OrbitPage } from './fixtures.ts'

async function openLibrary(orbit: OrbitPage): Promise<void> {
  await orbit.page.locator('.library__button').click()
  await expect(orbit.page.locator('#library')).toBeVisible()
}

async function create(orbit: OrbitPage, name: string): Promise<void> {
  await openLibrary(orbit)
  await orbit.page.locator('#new-playlist').fill(name)
  await orbit.page.locator('#library').getByRole('button', { name: 'Create' }).click()
}

test.describe('playlists', () => {
  test('creates an empty playlist and keeps the original untouched', async ({ orbit }) => {
    const { page } = orbit
    await expect(page.locator('.library__button')).toHaveText('My flight plan')
    await create(orbit, 'Road trip')
    await expect(page.locator('.library__button')).toHaveText('Road trip')
    await expect(page.getByText('The flight plan is empty')).toBeVisible()
    await expect(page.locator('.dock__pointers')).toHaveText('head = null, tail = null')
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the end/ }).click()
    expect(await orbit.titles()).toEqual(['Karma Police'])
    await openLibrary(orbit)
    await page.getByRole('menuitemradio', { name: /My flight plan/ }).click()
    expect(await orbit.titles()).toEqual(demoTitles)
    await openLibrary(orbit)
    await expect(page.getByRole('menuitemradio', { name: /Road trip/ })).toContainText('1 song')
  })

  test('validates names', async ({ orbit }) => {
    const { page } = orbit
    await create(orbit, '   ')
    await expect(page.locator('#library .library__error')).toHaveText('Give the playlist a name.')
    await page.locator('#new-playlist').fill('my flight PLAN')
    await page.locator('#library').getByRole('button', { name: 'Create' }).click()
    await expect(page.locator('#library .library__error')).toHaveText('A playlist named “My flight plan” already exists.')
    await expect(page.locator('#new-playlist')).toHaveAttribute('aria-invalid', 'true')
  })

  test('renames a playlist inline', async ({ orbit }) => {
    const { page } = orbit
    await openLibrary(orbit)
    await page.getByRole('button', { name: 'Rename My flight plan' }).click()
    const input = page.getByRole('textbox', { name: 'New name for My flight plan' })
    await input.fill('Class demo')
    await input.press('Enter')
    await expect(page.locator('.library__button')).toHaveText('Class demo')
  })

  test('deletes only after confirming and never the last playlist', async ({ orbit }) => {
    const { page } = orbit
    await openLibrary(orbit)
    await expect(page.getByRole('button', { name: 'Delete My flight plan' })).toBeDisabled()
    await page.keyboard.press('Escape')
    await create(orbit, 'Temporary')
    await openLibrary(orbit)
    await page.getByRole('button', { name: 'Delete Temporary' }).click()
    await expect(page.getByRole('button', { name: 'Confirm delete Temporary' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm delete Temporary' }).click()
    await expect(page.locator('.library__button')).toHaveText('My flight plan')
    expect(await orbit.titles()).toEqual(demoTitles)
  })

  test('switching playlists stops the song from the previous one', async ({ orbit }) => {
    await orbit.play()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await create(orbit, 'Quiet')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect(orbit.page.locator('.lens')).toHaveAttribute('data-state', 'empty')
    await expect(orbit.page.locator('.mast').getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  test('remembers playlists and the active one after a reload', async ({ orbit }) => {
    await create(orbit, 'Saved')
    await orbit.search('coldplay')
    await orbit.result('Clocks').getByRole('button', { name: /at the start/ }).click()
    await orbit.page.reload()
    await expect(orbit.page.locator('.library__button')).toHaveText('Saved')
    expect(await orbit.titles()).toEqual(['Clocks'])
    await openLibrary(orbit)
    await expect(orbit.page.getByRole('menuitemradio')).toHaveCount(2)
  })
})
