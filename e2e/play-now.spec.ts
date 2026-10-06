import { demoTitles, expect, test } from './fixtures.ts'

test.describe('play without queueing', () => {
  test('plays a search result without adding it to the flight plan', async ({ orbit }) => {
    const { page } = orbit
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /Play Karma Police by Radiohead now/ }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await expect(page.getByRole('button', { name: 'Not in your flight plan. Add to plan' })).toBeVisible()
    expect(await orbit.titles()).toEqual(demoTitles)
    await expect(page.locator('.dock__size')).toHaveText('size 8')
    await expect(page.locator('.waypoint[data-playing="true"]')).toHaveCount(0)
  })

  test('adds the playing song to the plan and can undo it', async ({ orbit }) => {
    const { page } = orbit
    await orbit.search('coldplay')
    await orbit.result('Clocks').getByRole('button', { name: /Play Clocks/ }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Clocks')
    await page.getByRole('button', { name: /Add to plan/ }).click()
    await expect(page.locator('.plan-tag')).toBeHidden()
    expect((await orbit.titles()).at(-1)).toBe('Clocks')
    await expect(orbit.row('Clocks')).toHaveAttribute('aria-current', 'true')
    await expect(orbit.row('Clocks')).toHaveAttribute('data-playing', 'true')
    await expect(page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await page.locator('.mast').getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => orbit.titles()).toEqual(demoTitles)
  })

  test('next goes back to the song that was playing in the plan', async ({ orbit }) => {
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Dreams')
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /Play Karma Police/ }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await expect(orbit.row('Dreams')).toHaveAttribute('aria-current', 'true')
    await expect(orbit.row('Dreams')).toHaveAttribute('data-playing', 'false')
    await expect(orbit.transport('Next song')).toHaveAttribute('title', 'Back to your flight plan')
    await orbit.page.locator('.deck').getByRole('button', { name: 'Next song' }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Dreams')
    await expect(orbit.page.locator('.plan-tag')).toBeHidden()
  })

  test('stops at the end of a song that is not in the plan', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /Play Karma Police/ }).click()
    await orbit.fakeFinish()
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    expect(await orbit.titles()).toEqual(demoTitles)
  })

  test('removing songs from the plan does not interrupt it', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /Play Karma Police/ }).click()
    await orbit.rowAction('Get Lucky', /Remove Get Lucky/)
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
  })
})
