import { describe, expect, it } from 'vitest'

import { formatMatchTitle, validateDifferentAthletes, validateWinner } from './matchRules'

describe('validateDifferentAthletes', () => {
  it('отклоняет одного и того же борца', () => {
    expect(validateDifferentAthletes({ athlete1: 1 }, 1)).toEqual(expect.any(String))
    expect(validateDifferentAthletes({ athlete1: { id: 1 } }, 1)).toEqual(expect.any(String))
  })

  it('пропускает разных и ещё не выбранных', () => {
    expect(validateDifferentAthletes({ athlete1: 1 }, 2)).toBe(true)
    expect(validateDifferentAthletes({ athlete1: undefined }, 2)).toBe(true)
  })
})

describe('validateWinner', () => {
  it('пустой победитель допустим', () => {
    expect(validateWinner({ athlete1: 1, athlete2: 2, resultType: 'normal' }, null)).toBe(true)
  })

  it('победитель — один из двух', () => {
    expect(validateWinner({ athlete1: 1, athlete2: 2, resultType: 'normal' }, 2)).toBe(true)
    expect(validateWinner({ athlete1: 1, athlete2: 2, resultType: 'normal' }, 3)).toEqual(expect.any(String))
  })

  it('в несостоявшемся матче победителя быть не может', () => {
    expect(validateWinner({ athlete1: 1, athlete2: 2, resultType: 'no_contest' }, 1)).toEqual(expect.any(String))
  })
})

describe('formatMatchTitle', () => {
  it('склеивает имена борцов', () => {
    expect(formatMatchTitle('Иванов', 'Петров')).toBe('Иванов vs Петров')
  })

  it('подставляет ? вместо неизвестного имени', () => {
    expect(formatMatchTitle('Иванов', undefined)).toBe('Иванов vs ?')
  })
})
