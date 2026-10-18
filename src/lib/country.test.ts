import { describe, expect, it } from 'vitest'

import { getCountryName } from './country'

describe('getCountryName', () => {
  it('возвращает русское название по ISO-коду', () => {
    expect(getCountryName('GE')).toBe('Грузия')
  })

  it('не зависит от регистра и пробелов', () => {
    expect(getCountryName(' ge ')).toBe('Грузия')
  })

  it('неизвестный или невалидный код возвращает как есть', () => {
    expect(getCountryName('QQ')).toBe('QQ')
    expect(getCountryName('')).toBe('')
    expect(getCountryName('грузия')).toBe('ГРУЗИЯ')
  })
})
