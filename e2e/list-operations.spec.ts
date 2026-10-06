import { demoTitles, expect, test } from './fixtures.ts'

test.describe('adding songs', () => {
  test('starts with the demo flight plan and shows head and tail', async ({ orbit }) => {
    expect(await orbit.titles()).toEqual(demoTitles)
    expect(await orbit.nodeTitles()).toEqual(demoTitles)
    await expect(orbit.page.locator('.dock__pointers')).toHaveText('head = Get Lucky, tail = De Música Ligera')
    await expect(orbit.page.locator('.dock__size')).toHaveText('size 8')
  })

  test('adds a song at the start', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the start/ }).click()
    expect((await orbit.titles())[0]).toBe('Karma Police')
    await expect(orbit.toast('Added “Karma Police”')).toContainText('Position 1 of 9')
    await expect(orbit.page.locator('.dock__pointers')).toContainText('head = Karma Police')
  })

  test('adds a song at the end', async ({ orbit }) => {
    await orbit.search('coldplay')
    await orbit.result('Clocks').getByRole('button', { name: /at the end/ }).click()
    expect((await orbit.titles()).at(-1)).toBe('Clocks')
    await expect(orbit.toast('Added “Clocks”')).toContainText('Position 9 of 9')
    await expect(orbit.page.locator('.dock__pointers')).toContainText('tail = Clocks')
  })

  test('inserts a song at an exact position', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '3')
    const titles = await orbit.titles()
    expect(titles[2]).toBe('Karma Police')
    expect(titles[1]).toBe('Blinding Lights')
    expect(titles[3]).toBe('Bohemian Rhapsody')
    expect(titles).toHaveLength(9)
  })

  test('inserting at size + 1 appends to the tail', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '9')
    expect((await orbit.titles()).at(-1)).toBe('Karma Police')
  })

  for (const value of ['0', '10', '-1', '2.5', '']) {
    test(`rejects position "${value}" without changing the list`, async ({ orbit }) => {
      await orbit.search('radiohead')
      await orbit.insertAt('Karma Police', value)
      const error = orbit.result('Karma Police').locator('.insert__error')
      await expect(error).toBeVisible()
      await expect(error).toHaveText(value === '' ? 'Enter a position number.' : 'Choose a position from 1 to 9.')
      await expect(orbit.result('Karma Police').locator('.insert__input')).toHaveAttribute('aria-invalid', 'true')
      expect(await orbit.titles()).toEqual(demoTitles)
    })
  }

  test('allows the same song twice as separate nodes', async ({ orbit }) => {
    await orbit.search('coldplay')
    const add = orbit.result('Clocks').getByRole('button', { name: /at the end/ })
    await add.click()
    await add.click()
    await expect(orbit.toast('Added “Clocks” again')).toBeVisible()
    expect((await orbit.titles()).filter((title) => title === 'Clocks')).toHaveLength(2)
  })

  test('cancelling an insert keeps the list unchanged', async ({ orbit }) => {
    await orbit.search('radiohead')
    const result = orbit.result('Karma Police')
    await result.getByRole('button', { name: /at a position/ }).click()
    await result.locator('.insert__input').press('Escape')
    await expect(result.locator('.insert')).toBeHidden()
    expect(await orbit.titles()).toEqual(demoTitles)
  })
})

test.describe('searching', () => {
  test('shows empty and error states', async ({ orbit }) => {
    await orbit.search('zzzz')
    await expect(orbit.page.getByText('No songs match “zzzz”')).toBeVisible()
    await orbit.search('fail')
    await expect(orbit.page.getByText('Search is unavailable')).toBeVisible()
    await expect(orbit.page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('asks for at least two characters', async ({ orbit }) => {
    await orbit.page.locator('#search-input').fill('a')
    await expect(orbit.page.getByText('Type at least 2 characters to search.')).toBeVisible()
  })
})

test.describe('removing songs', () => {
  test('removes a song that is not playing', async ({ orbit }) => {
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await expect(orbit.toast('Removed “Dreams”')).toContainText('It was at position 4.')
    expect(await orbit.titles()).toEqual(demoTitles.filter((title) => title !== 'Dreams'))
    expect(await orbit.nodeTitles()).not.toContain('Dreams')
  })

  test('removes the head and the tail', async ({ orbit }) => {
    await orbit.rowAction('Get Lucky', /Remove Get Lucky/)
    await orbit.rowAction('De Música Ligera', /Remove De Música Ligera/)
    await expect(orbit.page.locator('.dock__pointers')).toHaveText('head = Blinding Lights, tail = BIRDS OF A FEATHER')
    await expect(orbit.page.locator('.dock__size')).toHaveText('size 6')
  })

  test('removing the playing song continues with the next one', async ({ orbit }) => {
    await orbit.row('Levitating').locator('.waypoint__main').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Levitating')
    await orbit.rowAction('Levitating', /Remove Levitating/)
    await expect(orbit.toast('Removed “Levitating”')).toContainText('Viva La Vida')
    await expect.poll(() => orbit.currentTitle()).toBe('Viva La Vida')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
  })

  test('removing the playing tail moves to the previous song', async ({ orbit }) => {
    await orbit.row('De Música Ligera').locator('.waypoint__main').click()
    await orbit.rowAction('De Música Ligera', /Remove De Música Ligera/)
    await expect.poll(() => orbit.currentTitle()).toBe('BIRDS OF A FEATHER')
  })

  test('removing every song stops playback and shows the empty state', async ({ orbit }) => {
    await orbit.play()
    for (const title of demoTitles) await orbit.rowAction(title, new RegExp(`Remove ${title}`))
    await expect(orbit.page.getByText('The flight plan is empty')).toBeVisible()
    await expect(orbit.page.locator('.dock__pointers')).toHaveText('head = null, tail = null')
    await expect(orbit.page.locator('.play')).toHaveAttribute('aria-label', 'Play')
    await expect(orbit.page.locator('.lens')).toHaveAttribute('data-state', 'empty')
    await orbit.transport('Next song').click({ force: true })
    await expect(orbit.toast('Nothing to skip to')).toBeVisible()
  })

  test('removes the focused song with the Delete key', async ({ orbit }) => {
    await orbit.row('Dreams').locator('.waypoint__main').focus()
    await orbit.page.keyboard.press('Delete')
    expect(await orbit.titles()).not.toContain('Dreams')
    await expect(orbit.row('Levitating').locator('.waypoint__main')).toBeFocused()
  })
})

test.describe('reordering', () => {
  test('moves songs with the arrow buttons', async ({ orbit }) => {
    await orbit.rowAction('Get Lucky', /Move Get Lucky down/)
    expect((await orbit.titles()).slice(0, 2)).toEqual(['Blinding Lights', 'Get Lucky'])
    await expect(orbit.row('Blinding Lights').getByRole('button', { name: /Move Blinding Lights up/ })).toBeDisabled()
  })

  test('moves the focused song with Alt and the arrow keys', async ({ orbit }) => {
    await orbit.row('Dreams').locator('.waypoint__main').focus()
    await orbit.page.keyboard.press('Alt+ArrowUp')
    await orbit.page.keyboard.press('Alt+ArrowUp')
    expect((await orbit.titles()).slice(0, 3)).toEqual(['Get Lucky', 'Dreams', 'Blinding Lights'])
  })

  test('drags a song to a new position', async ({ orbit }) => {
    const handle = orbit.row('Blinding Lights').locator('.waypoint__pos')
    const target = orbit.row('Levitating')
    const from = await handle.boundingBox()
    const to = await target.boundingBox()
    if (!from || !to) throw new Error('missing boxes')
    await orbit.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await orbit.page.mouse.down()
    await orbit.page.mouse.move(from.x + from.width / 2, to.y + to.height / 2 + 6, { steps: 12 })
    await orbit.page.mouse.up()
    expect((await orbit.titles()).slice(0, 5)).toEqual(['Get Lucky', 'Bohemian Rhapsody', 'Dreams', 'Levitating', 'Blinding Lights'])
    expect(await orbit.nodeTitles()).toEqual(await orbit.titles())
  })

  test('keeps the current song while reordering', async ({ orbit }) => {
    await orbit.row('Dreams').locator('.waypoint__main').click()
    await orbit.rowAction('Dreams', /Move Dreams up/)
    await expect(orbit.row('Dreams')).toHaveAttribute('aria-current', 'true')
    await expect.poll(() => orbit.currentTitle()).toBe('Dreams')
  })

  test('filters the flight plan without changing it', async ({ orbit }) => {
    await orbit.page.locator('#queue-filter').fill('queen')
    await expect(orbit.rows().filter({ visible: true })).toHaveCount(1)
    await orbit.page.locator('#queue-filter').fill('nothing matches')
    await expect(orbit.page.getByText('No songs in the flight plan match this filter.')).toBeVisible()
    await orbit.page.locator('#queue-filter').fill('')
    expect(await orbit.titles()).toEqual(demoTitles)
  })
})
