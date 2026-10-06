import { test as base, expect, type Locator, type Page } from '@playwright/test'

export const searchResults = [
  {
    id: 'e2e-1',
    title: 'Karma Police',
    artist: 'Radiohead',
    album: 'OK Computer',
    artworkUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    durationMs: 264000,
    previewUrl: 'https://example.com/karma.m4a',
  },
  {
    id: 'e2e-2',
    title: 'Clocks',
    artist: 'Coldplay',
    album: 'A Rush of Blood to the Head',
    artworkUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    durationMs: 307000,
    previewUrl: 'https://example.com/clocks.m4a',
  },
  {
    id: 'e2e-3',
    title: 'Silent Track',
    artist: 'Nobody',
    album: 'Nothing',
    artworkUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    durationMs: 200000,
  },
]

export const demoTitles = [
  'Get Lucky',
  'Blinding Lights',
  'Bohemian Rhapsody',
  'Dreams',
  'Levitating',
  'Viva La Vida',
  'BIRDS OF A FEATHER',
  'De Música Ligera',
]

export interface ApiMocks {
  resolve: 'ok' | 'quota' | 'not_found'
}

export const test = base.extend<{ mocks: ApiMocks; orbit: OrbitPage }>({
  mocks: [{ resolve: 'ok' }, { option: true }],
  orbit: async ({ page, mocks }, use) => {
    await page.route('**/api/search**', async (route) => {
      const term = new URL(route.request().url()).searchParams.get('term') ?? ''
      if (term.includes('fail')) return route.fulfill({ status: 502, json: { error: 'upstream_error' } })
      if (term.includes('zzzz')) return route.fulfill({ json: { songs: [] } })
      return route.fulfill({ json: { songs: searchResults } })
    })
    await page.route('**/api/resolve**', async (route) => {
      const title = new URL(route.request().url()).searchParams.get('title') ?? ''
      if (mocks.resolve === 'quota') return route.fulfill({ status: 429, json: { error: 'quota' } })
      if (mocks.resolve === 'not_found' || title === 'Silent Track') {
        return route.fulfill({ status: 404, json: { error: 'not_found' } })
      }
      return route.fulfill({ json: { videoId: `vid-${title.replace(/\W+/g, '-')}` } })
    })
    await page.route('**/api/lyrics**', async (route) => {
      const title = new URL(route.request().url()).searchParams.get('title') ?? ''
      if (title === 'Dreams') return route.fulfill({ status: 404, json: { error: 'not_found' } })
      if (title === 'Levitating') return route.fulfill({ json: { synced: [], plain: 'If you wanna run away with me\nI know a galaxy', instrumental: false } })
      if (title === 'Viva La Vida') return route.fulfill({ status: 502, json: { error: 'upstream_error' } })
      return route.fulfill({
        json: {
          synced: [
            { timeMs: 0, text: `${title} line one` },
            { timeMs: 4000, text: `${title} line two` },
            { timeMs: 8000, text: '' },
            { timeMs: 12000, text: `${title} line four` },
            { timeMs: 30000, text: `${title} line five` },
          ],
          plain: null,
          instrumental: false,
        },
      })
    })
    await page.goto('/')
    await expect(page.locator('.waypoint').first()).toBeAttached()
    await use(new OrbitPage(page))
  },
})

export { expect }

export class OrbitPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  get queue(): Locator {
    return this.page.locator('#panel-queue')
  }

  rows(): Locator {
    return this.page.locator('.waypoint:not([data-exiting])')
  }

  row(title: string): Locator {
    return this.rows().filter({ has: this.page.locator('.waypoint__title', { hasText: new RegExp(`^${title}$`) }) })
  }

  async titles(): Promise<string[]> {
    return this.page.locator('.waypoint:not([data-exiting]) .waypoint__title').allTextContents()
  }

  async nodeTitles(): Promise<string[]> {
    return this.page.locator('.chain .node__title').allTextContents()
  }

  async currentTitle(): Promise<string | null> {
    return this.page.locator('.deck__title').getAttribute('aria-label')
  }

  async search(term: string): Promise<void> {
    await this.page.locator('#search-input').fill(term)
    await this.page.locator('#search-input').press('Enter')
  }

  result(title: string): Locator {
    return this.page.locator('.result').filter({ has: this.page.locator('.result__title', { hasText: new RegExp(`^${title}$`) }) })
  }

  async insertAt(title: string, position: string): Promise<void> {
    const result = this.result(title)
    if (!(await result.locator('.insert').isVisible())) await result.getByRole('button', { name: /at a position/ }).click()
    await result.locator('.insert__input').fill(position)
    await result.getByRole('button', { name: 'Insert', exact: true }).click()
  }

  async rowAction(title: string, name: RegExp): Promise<void> {
    const row = this.row(title)
    await row.hover()
    await row.getByRole('button', { name }).click()
  }

  transport(name: string): Locator {
    return this.page.locator('.deck').getByRole('button', { name, exact: true })
  }

  async play(): Promise<void> {
    await this.page.locator('.play').click()
  }

  async fakeFinish(): Promise<void> {
    await expect(this.page.locator('.play')).toHaveAttribute('aria-label', 'Pause')
    await expect.poll(() => this.page.evaluate(() => window.orbitFakePlayer?.playing ?? false)).toBe(true)
    await this.page.evaluate(() => window.orbitFakePlayer?.finish())
  }

  toast(text: string | RegExp): Locator {
    return this.page.locator('.toast').filter({ hasText: text })
  }
}
