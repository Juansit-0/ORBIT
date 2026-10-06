import { expect, test, type OrbitPage } from './fixtures.ts'

async function swipe(orbit: OrbitPage, dx: number): Promise<void> {
  const stage = orbit.page.locator('.deck__stage')
  const box = await stage.boundingBox()
  if (!box) throw new Error('missing stage')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const base = { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true }
  await stage.dispatchEvent('pointerdown', { ...base, clientX: x, clientY: y })
  for (let i = 1; i <= 5; i++) await stage.dispatchEvent('pointermove', { ...base, clientX: x + (dx * i) / 5, clientY: y + 2 })
  await stage.dispatchEvent('pointerup', { ...base, clientX: x + dx, clientY: y + 2 })
}

async function longPress(orbit: OrbitPage, title: string): Promise<void> {
  const main = orbit.row(title).locator('.waypoint__main')
  const box = await main.boundingBox()
  if (!box) throw new Error('missing row')
  const base = { pointerType: 'touch', pointerId: 9, isPrimary: true, bubbles: true, clientX: box.x + 60, clientY: box.y + 20 }
  await main.dispatchEvent('pointerdown', base)
  await orbit.page.waitForTimeout(650)
  await main.dispatchEvent('pointerup', base)
}

test.describe('touch gestures @mobile', () => {
  test('swiping the cover skips songs @mobile', async ({ orbit }) => {
    await orbit.play()
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await swipe(orbit, -140)
    await expect.poll(() => orbit.currentTitle()).toBe('Blinding Lights')
    await swipe(orbit, 140)
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
    await swipe(orbit, -20)
    await expect.poll(() => orbit.currentTitle()).toBe('Get Lucky')
  })

  test('long pressing a song opens its actions @mobile', async ({ orbit }) => {
    const { page } = orbit
    await orbit.play()
    await page.getByRole('button', { name: 'Flight plan' }).click()
    await longPress(orbit, 'Dreams')
    const sheet = page.getByRole('dialog', { name: 'Song actions' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('position 4 of 8')
    await sheet.getByRole('button', { name: 'Play next' }).click()
    await expect(sheet).toBeHidden()
    expect((await orbit.titles()).slice(0, 2)).toEqual(['Get Lucky', 'Dreams'])
    await longPress(orbit, 'Levitating')
    await page.getByRole('dialog', { name: 'Song actions' }).getByRole('button', { name: 'Remove' }).click()
    expect(await orbit.titles()).not.toContain('Levitating')
  })
})
