import { describe, expect, it } from 'vitest'

import { computeAthleteStats } from './athleteStats'

const match = (over: Partial<Parameters<typeof computeAthleteStats>[1][number]>) => ({
  athlete1: 1,
  athlete2: 2,
  winner: 1,
  hand: 'right' as const,
  resultType: 'normal' as const,
  ...over,
})

describe('computeAthleteStats', () => {
  it('раздельно считает правую и левую руку', () => {
    const stats = computeAthleteStats(1, [
      match({}),
      match({ hand: 'left', winner: 2 }),
      match({ athlete1: 2, athlete2: 1, winner: 1 }),
    ])
    expect(stats.right).toEqual({ matches: 2, wins: 2 })
    expect(stats.left).toEqual({ matches: 1, wins: 0 })
  })

  it('пропускает несостоявшиеся матчи и чужие матчи', () => {
    const stats = computeAthleteStats(1, [
      match({ resultType: 'no_contest', winner: null }),
      match({ athlete1: 3, athlete2: 2 }),
    ])
    expect(stats.right.matches).toBe(0)
  })

  it('понимает связи, пришедшие объектами', () => {
    const stats = computeAthleteStats(1, [match({ athlete1: { id: 1 }, winner: { id: 1 } })])
    expect(stats.right).toEqual({ matches: 1, wins: 1 })
  })
})
