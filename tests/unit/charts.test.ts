import { describe, expect, it } from 'vitest'
import { countryFromLocale } from '../../src/services/chartsService.ts'

describe('countryFromLocale', () => {
  it('uses the region of the browser language', () => {
    expect(countryFromLocale('es-CO')).toBe('co')
    expect(countryFromLocale('en_GB')).toBe('gb')
    expect(countryFromLocale('pt-BR')).toBe('br')
  })

  it('falls back to the US chart', () => {
    expect(countryFromLocale('es')).toBe('us')
    expect(countryFromLocale('zh-Hant-TW')).toBe('us')
    expect(countryFromLocale(undefined)).toBe('us')
  })
})
