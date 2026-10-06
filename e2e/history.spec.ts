import { demoTitles, expect, test } from './fixtures.ts'

test.describe('undo and redo', () => {
  test('undo is disabled until something changes', async ({ orbit }) => {
    await expect(orbit.page.locator('.mast').getByRole('button', { name: 'Undo' })).toBeDisabled()
    await expect(orbit.page.locator('.mast').getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  test('the toast restores a removed song at the same position', async ({ orbit }) => {
    await orbit.rowAction('Dreams', /Remove Dreams/)
    expect(await orbit.titles()).not.toContain('Dreams')
    await orbit.toast('Removed “Dreams”').getByRole('button', { name: 'Undo' }).click()
    expect(await orbit.titles()).toEqual(demoTitles)
    expect(await orbit.nodeTitles()).toEqual(demoTitles)
  })

  test('keyboard undo and redo replay an insert at the same position', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.insertAt('Karma Police', '4')
    await orbit.page.locator('body').click({ position: { x: 5, y: 5 } })
    await orbit.page.keyboard.press('ControlOrMeta+z')
    expect(await orbit.titles()).toEqual(demoTitles)
    await expect(orbit.toast('Undid: Insert “Karma Police” at 4')).toBeVisible()
    await orbit.page.keyboard.press('ControlOrMeta+Shift+z')
    expect((await orbit.titles())[3]).toBe('Karma Police')
    await expect(orbit.page.locator('.dock__size')).toHaveText('size 9')
  })

  test('undoes several operations in reverse order', async ({ orbit }) => {
    await orbit.rowAction('Get Lucky', /Move Get Lucky down/)
    await orbit.rowAction('Levitating', /Remove Levitating/)
    await orbit.search('coldplay')
    await orbit.result('Clocks').getByRole('button', { name: /at the start/ }).click()
    const undo = orbit.page.locator('.mast').getByRole('button', { name: 'Undo' })
    await undo.click()
    await undo.click()
    await undo.click()
    await expect.poll(() => orbit.titles()).toEqual(demoTitles)
    await expect(undo).toBeDisabled()
    await expect(orbit.page.locator('.mast').getByRole('button', { name: 'Redo' })).toBeEnabled()
  })

  test('undoing the add of the playing song moves playback on', async ({ orbit }) => {
    await orbit.search('radiohead')
    await orbit.result('Karma Police').getByRole('button', { name: /at the start/ }).click()
    await orbit.row('Karma Police').locator('.waypoint__main').click()
    await expect.poll(() => orbit.currentTitle()).toBe('Karma Police')
    await orbit.page.locator('.mast').getByRole('button', { name: 'Undo' }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    expect(await orbit.titles()).toEqual(demoTitles)
  })

  test('rapid keyboard undos are all applied', async ({ orbit }) => {
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await orbit.rowAction('Get Lucky', /Remove Get Lucky/)
    await orbit.rowAction('Levitating', /Remove Levitating/)
    await orbit.page.locator('body').click({ position: { x: 5, y: 5 } })
    await orbit.page.keyboard.press('ControlOrMeta+z')
    await orbit.page.keyboard.press('ControlOrMeta+z')
    await orbit.page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => orbit.titles()).toEqual(demoTitles)
  })

  test('a new change clears the redo branch', async ({ orbit }) => {
    await orbit.rowAction('Dreams', /Remove Dreams/)
    await orbit.page.locator('.mast').getByRole('button', { name: 'Undo' }).click()
    await orbit.rowAction('Bohemian Rhapsody', /Remove Bohemian Rhapsody/)
    await expect(orbit.page.locator('.mast').getByRole('button', { name: 'Redo' })).toBeDisabled()
  })
})
