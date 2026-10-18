import { describe, expect, it } from 'vitest'

import { matchesAthleteSearch } from './athleteSearch'

const athlete = { name: 'Артём Тайнов', nameEn: 'Artem Taynov' }

describe('matchesAthleteSearch', () => {
  it('пустой запрос подходит всем', () => {
    expect(matchesAthleteSearch(athlete, '')).toBe(true)
    expect(matchesAthleteSearch(athlete, '   ')).toBe(true)
  })

  it('находит по кириллице и по латинице', () => {
    expect(matchesAthleteSearch(athlete, 'тайн')).toBe(true)
    expect(matchesAthleteSearch(athlete, 'taynov')).toBe(true)
  })

  it('не различает регистр, «ё» и «е»', () => {
    expect(matchesAthleteSearch(athlete, 'АРТЕМ')).toBe(true)
    expect(matchesAthleteSearch(athlete, 'artem')).toBe(true)
  })

  it('слова в любом порядке', () => {
    expect(matchesAthleteSearch(athlete, 'тайнов артём')).toBe(true)
  })

  it('все слова запроса должны найтись', () => {
    expect(matchesAthleteSearch(athlete, 'артём иванов')).toBe(false)
  })

  it('нет латинского имени — ищем только по русскому', () => {
    expect(matchesAthleteSearch({ name: 'Иван Тестов', nameEn: null }, 'тест')).toBe(true)
    expect(matchesAthleteSearch({ name: 'Иван Тестов' }, 'test')).toBe(false)
  })
})
