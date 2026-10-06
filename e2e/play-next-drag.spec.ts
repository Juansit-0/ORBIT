import { demoTitles, expect, test } from './fixtures.ts'

test.describe('play next', () => {
  test('inserts right after the song that is playing', async ({ orbit }) => {
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /Play Karma Police by Radiohead next/ }).click()
    const titles = await orbit.titles()
    expect(titles.slice(3, 5)).toEqual(['Dreams', 'Karma Police'])
    await expect(orbit.toast('“Karma Police” plays next')).toContainText('Position 5 of 9, right after “Dreams”')
    await orbit.transport('Next song').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
  })

  test('goes to the end when nothing is selected and can be undone', async ({ orbit }) => {
    await orbit.search('coldplay')
    await orbit.result('Clocks').getByRole('button', { name: /Play Clocks by Coldplay next/ }).click()
    expect((await orbit.titles()).at(-1)).toBe('Clocks')
    await orbit.page.locator('.mast').getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => orbit.titles()).toEqual(demoTitles)
  })
})

test.describe('drag from search', () => {
  test('drops a result between two songs of the flight plan', async ({ orbit }) => {
    await orbit.search('radiohead')
    const target = orbit.row('Bohemian Rhapsody')
    await orbit.result('Karma Police').dragTo(target, { targetPosition: { x: 120, y: 4 } })
    const titles = await orbit.titles()
    expect(titles.slice(1, 4)).toEqual(['Blinding Lights', 'Karma Police', 'Bohemian Rhapsody'])
    await expect(orbit.toast('Added “Karma Police”')).toContainText('Position 3 of 9')
  })

  test('drops a result at the end of the flight plan', async ({ orbit }) => {
    await orbit.search('coldplay')
    await orbit.result('Clocks').dragTo(orbit.row('De Música Ligera'), { targetPosition: { x: 120, y: 40 } })
    expect((await orbit.titles()).at(-1)).toBe('Clocks')
  })

  test('drops a result into the linked list dock', async ({ orbit }) => {
    await orbit.search('radiohead')
    const node = orbit.page.locator('.chain .node').nth(1)
    await orbit.result('Karma Police').dragTo(node, { targetPosition: { x: 2, y: 20 } })
    expect((await orbit.nodeTitles())[1]).toBe('Karma Police')
    expect(await orbit.titles()).toEqual(await orbit.nodeTitles())
  })

  test('drops into an empty flight plan', async ({ orbit }) => {
    const { page } = orbit
    await page.locator('.library__button').click()
    await page.locator('#new-playlist').fill('Empty')
    await page.locator('#library').getByRole('button', { name: 'Create' }).click()
    await orbit.search('radiohead')
    await orbit.result('Karma Police').dragTo(page.locator('.queue-body'))
    expect(await orbit.titles()).toEqual(['Karma Police'])
  })
})
