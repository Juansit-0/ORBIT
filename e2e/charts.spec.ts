import { expect, test } from './fixtures.ts'

test.describe('top charts', () => {
  test('shows the top ten when the search is empty and expands to the full chart', async ({ page, orbit }) => {
    await page.locator('#search-input').focus()
    const charts = page.locator('.results--charts .result')
    await expect(charts).toHaveCount(10)
    await expect(charts.first().locator('.result__rank')).toHaveText('1')
    await expect(page.locator('#charts-heading')).toHaveText('Top charts · US')
    await page.getByRole('button', { name: 'Show all 12' }).click()
    await expect(charts).toHaveCount(12)
    await orbit.result('Chart Song 3').getByRole('button', { name: /at the end/ }).click()
    await page.keyboard.press('Escape')
    expect((await orbit.titles()).at(-1)).toBe('Chart Song 3')
  })

  test('plays a chart song right away and returns when the field is cleared', async ({ page, orbit }) => {
    await page.locator('#search-input').focus()
    await orbit.result('Chart Song 1').getByRole('button', { name: /Play Chart Song 1 by Chart Artist now/ }).click()
    await expect.poll(() => orbit.currentTitle()).toBe('Chart Song 1')
    await orbit.search('radiohead')
    await expect(page.locator('.results--charts')).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(page.locator('.results--charts .result')).toHaveCount(10)
  })

  test.describe('when the chart fails', () => {
    test.use({ mocks: { resolve: 'ok', charts: 'flaky' } })

    test('explains it and retries', async ({ page, orbit }) => {
      await expect(orbit.rows().first()).toBeAttached()
      await page.locator('#search-input').focus()
      await expect(page.getByText('The charts could not be loaded.')).toBeVisible()
      await page.locator('.finder__charts').getByRole('button', { name: 'Try again' }).click()
      await expect(page.locator('.results--charts .result')).toHaveCount(10)
    })
  })

  test('appears in the search tab on phones @mobile', async ({ page, orbit }) => {
    await expect(orbit.queue).toBeAttached()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.locator('.results--charts .result')).toHaveCount(10)
  })
})
