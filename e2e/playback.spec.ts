import { demoTitles, expect, test } from './fixtures.ts'

test.describe('navigation', () => {
  test('play starts at the head and next and previous follow the links', async ({ orbit }) => {
    await orbit.play()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await expect(orbit.page.locator('.badge')).toHaveText('Full track')
    await orbit.transport('Next song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Blinding Lights')
    await orbit.transport('Next song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Bohemian Rhapsody')
    await orbit.transport('Previous song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Blinding Lights')
    await expect(orbit.page.locator('.node[data-current="true"] .node__title')).toHaveText('Blinding Lights')
  })

  test('previous at the head and next at the tail explain why they stop', async ({ orbit }) => {
    await orbit.play()
    await expect(orbit.transport('Previous song')).toHaveAttribute('aria-disabled', 'true')
    await orbit.transport('Previous song').click({ force: true })
    await expect(orbit.toast('This is the first song')).toBeVisible()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await orbit.row('De Música Ligera').locator('.waypoint__main').click()
    await expect(orbit.transport('Next song')).toHaveAttribute('aria-disabled', 'true')
    await orbit.transport('Next song').click({ force: true })
    await expect(orbit.toast('This is the last song')).toBeVisible()
    await expect.poll(() => orbit.currentTitle()).toBe('De Música Ligera')
  })

  test('repeat all wraps around both ends', async ({ orbit }) => {
    await orbit.transport('Repeat off').click()
    await expect(orbit.transport('Repeat all')).toHaveAttribute('aria-pressed', 'true')
    await orbit.play()
    await orbit.transport('Previous song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('De Música Ligera')
    await orbit.transport('Next song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
  })

  test('advances when a song ends and stops after the tail', async ({ orbit }) => {
    await orbit.row('BIRDS OF A FEATHER').locator('.waypoint__main').click()
    await orbit.fakeFinish()
    await expect.poll(() => orbit.currentTitle()).toBe('De Música Ligera')
    await orbit.fakeFinish()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect.poll(() => orbit.currentTitle()).toBe('De Música Ligera')
  })

  test('repeat one replays the same song', async ({ orbit }) => {
    await orbit.transport('Repeat off').click()
    await orbit.transport('Repeat all').click()
    await expect(orbit.transport('Repeat one')).toBeVisible()
    await orbit.play()
    await orbit.fakeFinish()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
  })

  test('shuffle plays every song once without changing the list order', async ({ orbit }) => {
    await orbit.play()
    await orbit.transport('Shuffle').click()
    await expect(orbit.transport('Shuffle')).toHaveAttribute('aria-pressed', 'true')
    const seen = new Set<string>([String(await orbit.currentTitle())])
    for (let i = 0; i < demoTitles.length - 1; i++) {
      await orbit.transport('Next song').click()
      await expect.poll(async () => seen.has(String(await orbit.currentTitle()))).toBe(false)
      seen.add(String(await orbit.currentTitle()))
    }
    expect([...seen].sort()).toEqual([...demoTitles].sort())
    expect(await orbit.titles()).toEqual(demoTitles)
  })

  test('clicking a node in the visualizer plays it', async ({ orbit }) => {
    await orbit.page.locator('.chain .node').nth(4).getByRole('button').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Levitating')
  })

  test('pause and resume keep the same song', async ({ orbit }) => {
    await orbit.play()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await orbit.play()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await orbit.play()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
  })
})

test.describe('fallbacks', () => {
  test.use({ mocks: { resolve: 'quota' } })

  test('plays the preview when the YouTube quota is exhausted', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the start/ }).click()
    await orbit.row('Karma Police').locator('.waypoint__main').click()
    await expect(orbit.page.locator('.badge')).toHaveText('30 s preview')
    await expect(orbit.toast(/30 s preview/)).toContainText('quota')
  })
})

test.describe('unavailable songs', () => {
  test('skips a song that cannot be played anywhere', async ({ orbit }) => {
    await orbit.search('nobody')
    await orbit.result('Silent Track').getByRole('button', { name: /at the start/ }).click()
    await orbit.play()
    await expect(orbit.toast('Could not play “Silent Track”')).toBeVisible()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await expect(orbit.row('Silent Track').locator('.waypoint__status')).toHaveText('Unavailable')
  })
})
