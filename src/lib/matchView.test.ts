import { describe, expect, it } from 'vitest'

import { getMatchOutcome } from './matchView'

const base = { score1: 2, score2: 1, winnerName: 'Иван' }

describe('getMatchOutcome', () => {
  it('обычный матч: победитель и счёт', () => {
    expect(getMatchOutcome({ ...base, resultType: 'normal' })).toEqual({
      headline: 'Победил Иван',
      score: '2:1',
    })
  })

  it('травма и дисквалификация помечаются в заголовке', () => {
    expect(getMatchOutcome({ ...base, resultType: 'injury' }).headline).toBe('Травма. Победил Иван')
    expect(getMatchOutcome({ ...base, resultType: 'dq' }).headline).toBe('Дисквалификация. Победил Иван')
  })

  it('несостоявшийся матч без счёта и победителя', () => {
    expect(getMatchOutcome({ ...base, resultType: 'no_contest' })).toEqual({
      headline: 'Матч не состоялся',
      score: null,
    })
  })

  it('результат ещё не внесён', () => {
    expect(
      getMatchOutcome({ resultType: 'normal', score1: null, score2: undefined, winnerName: null }),
    ).toEqual({ headline: 'Победитель не внесён', score: null })
  })
})
